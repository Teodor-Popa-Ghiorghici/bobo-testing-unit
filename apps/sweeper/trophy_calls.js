/* Where Dungeon Sweeper tells the trophies what happened (the list is trophies.js). One function for a win, one for a loss, one for the bench: index.js calls them and
   puts what comes back (the trophies earned this room) on the pay panel. Nothing in here can throw into the game. */
import { trophies } from '../trophy_scope.js';
import { parOf } from './pay.js';
import { REGIONS } from './data.js';

export const TR = trophies('sweeper');
const guard = f => { try { return f(); } catch (e) { return undefined; } };

/* o: { learntBefore, shadeFound, perfect, cleared (rooms), newSpells: [kinds], compass } */
export function won(S, secs, o) {
  guard(() => {
    const classic = S.classic, c = S.camp;
    if (classic) {
      TR.mark('wins', S.lv.id);
      if (S.lv.id === 'm') TR.streak('hiveWins', true);
      if (S.lv.id === 'h') TR.streak('deepWins', true);
    } else {
      TR.max('clearedRooms', o.cleared);
      if (o.under != null) TR.max('underRooms', o.under);
      (S.mods || []).forEach(m => { if (m !== 'cold') TR.mark('mods', m); });
      if (o.perfect) TR.mark('perfectRooms', S.node.id);
      (c.equipped || []).forEach(id => TR.mark('charmWins', id));
    }
    (o.newSpells || []).forEach(kind => TR.emit('learn', { kind: kind }));
    TR.emit('win', {
      classic: classic, lv: classic ? S.lv.id : null, node: S.node ? S.node.id : null, secs: secs, par: classic ? S.lv.par : parOf(S.node),
      flags: S.flagsPlaced, boss: !!(S.node && S.node.boss), maskLoss: S.maskLoss, hits: S.hits, spells: S.spells, learnt: o.learntBefore || 0,
      hpLeft: S.hp, mod: S.mod, mods: S.mods || [], act: S.node ? S.node.act : 0, charms: c ? c.equipped.slice() : [], webBlocks: S.webBlocks, shadeFound: !!o.shadeFound,
      shards: c ? c.shards : 0, perfect: !!o.perfect, owned: c ? c.owned.length : 0
    });
    if (o.compass) { TR.emit('compass', {}); TR.emit('bench', { owned: c.owned.length }); }
  });
}

export function lost(S) {
  guard(() => {
    if (S.classic) {
      if (S.lv.id === 'm') TR.streak('hiveWins', false);
      if (S.lv.id === 'h') TR.streak('deepWins', false);
    }
    TR.emit('lose', { classic: S.classic, clicks: S.clicks, lv: S.classic ? S.lv.id : null });
  });
}

/* SIT DOWN is the six regions of the descent: a bench in the Underdeep is another bench, not a seventh region */
export const rested = regionId => guard(() => { const r = REGIONS.find(x => x.id === regionId); if (r && (r.act || 1) === 1) TR.mark('benches', regionId); });
export const bought = camp => guard(() => TR.emit('bench', { owned: camp.owned.length }));

/* the trophies earned since the room began, as the rows of the pay panel */
export const earned = () => guard(() => TR.drain().map(id => TR.row(id)).filter(Boolean)) || [];
