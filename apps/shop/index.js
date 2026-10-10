import { Cos, COS_CATS } from '../../kernel/cos.js';
import { DAVE_LINES, DAVE_BROKE, DAVE_SECRET, makeHoverTalk } from './lines.js';
import { drawDave, drawThumb, GOOSE_ROOM } from './thumbs.js';
import { DAVE_GOOSE_LAND, DAVE_GOOSE_POKE, DAVE_GOOSE_HONK } from './lines_goose.js';
import { gifts } from '../gifts_scope.js';
import { perches, sitter, stepSitter, arrival, sitFrame, ARRIVE, honkPlan } from '../goose_life.js';
import { playHonk } from '../goose_voice.js';

/* what a card's button says, and what pressing it does, by what kind of shelf it is on (kernel/cos.js COS_CATS) */
const KIND = {
  look:   { have: 'EQUIP',              eq: 'EQUIPPED' },
  stock:  { have: null,                 eq: 'EQUIPPED' },         /* the pot equipped is the garden's default pot */
  wall:   { have: 'SET AS BACKGROUND',  eq: 'IN USE' },
  unlock: { have: null,                 eq: null }
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const locked = it => !!(it.reward || it.earn);

export default {
  id: 'shop',
  title: 'CRAZY DAVE\'S  --  EVERYTHING MUST GO SOMEWHERE',
  width: 640,
  height: 480,
  resizable: true,
  /* an app that sends you here can ask for its own shelf: ctx.openWindow('shop', { tab: 'crayon' }) */
  mount(root, ctx, args) {
    let cat = (args && COS_CATS[args.tab]) ? args.tab : 'frame';
    let bubbleEl = null, gridEl = null, footEl = null, daveCv = null;
    let bob = 0, raf = null, talkT = 0;

    const top = document.createElement('div');
    top.className = 'shoptop';
    const dv = document.createElement('div');
    dv.className = 'shopdave';
    daveCv = document.createElement('canvas');
    /* one shop in twenty, once Thea has given you a goose, it drops onto Dave's head (apps/goose_life.js) and the picture of him is taller to hold it */
    const sit = gifts().has('goose') && perches() ? sitter() : null;
    daveCv.width = 48; daveCv.height = sit ? 48 + GOOSE_ROOM : 48;
    if (sit) daveCv.style.height = (daveCv.height * 2) + 'px';
    dv.appendChild(daveCv);
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'shopbubble';
    top.appendChild(dv);
    top.appendChild(bubbleEl);

    const tabs = document.createElement('div');
    tabs.className = 'shoptabs';
    const keys = Object.keys(COS_CATS);
    keys.forEach(k => {
      const t = document.createElement('div');
      t.className = 'shoptab' + (k === cat ? ' on' : '');
      t.textContent = COS_CATS[k].label;
      t.addEventListener('mousedown', ev => {
        ev.stopPropagation();
        cat = k;
        if (window.Snd) window.Snd.click();
        tabs.querySelectorAll('.shoptab').forEach((n, i) => n.classList.toggle('on', keys[i] === k));
        fill();
      });
      tabs.appendChild(t);
    });

    gridEl = document.createElement('div');
    gridEl.className = 'shopgrid';
    footEl = document.createElement('div');
    footEl.className = 'shopfoot';

    root.className = 'shoproot';
    root.appendChild(top);
    root.appendChild(tabs);
    root.appendChild(gridEl);
    root.appendChild(footEl);

    const say = txt => { if (bubbleEl) bubbleEl.textContent = txt; };
    const hoverTalk = makeHoverTalk();       /* one hover in ten, Dave says something crazy instead of what the card is (lines.js) */
    say(pick(DAVE_LINES));

    function foot() {
      if (!footEl) return;
      footEl.innerHTML = '';
      const l = document.createElement('span');
      l.textContent = 'YOU HAVE ' + window.Economy.balance() + ' SUN';
      /* the pictures you have bought are all in one folder on the desktop; a button on the shelf opens it */
      if (cat === 'wall' && window.Cos.owned('wall').length) {
        const open = document.createElement('span');
        open.className = 'shopopen'; open.textContent = 'OPEN THE BACKDROPS FOLDER';
        open.addEventListener('mousedown', ev => { ev.stopPropagation(); if (window.Snd) window.Snd.click(); say('THEY ARE ALL IN THERE. OPEN ONE, RIGHT-CLICK, BACKGROUND STYLE: FILL, FIT, STRETCH, CENTRE, TILE. I HAVE OPINIONS ABOUT TILE.'); ctx.openWindow('folder', { path: window.Cos.backdropsDir }).catch(() => {}); });
        footEl.appendChild(l); footEl.appendChild(open);
      } else footEl.appendChild(l);
      const r = document.createElement('span');
      r.className = 'r';
      const n = keys.reduce((a, k) => a + window.Cos.owned(k).length, 0);
      const tot = keys.reduce((a, k) => a + window.Cos.shelf(k).length, 0);
      r.textContent = n + ' / ' + tot + ' OWNED';
      footEl.appendChild(r);
    }

    /* the words on a card's button for this item, now */
    function buttonText(c, owned, eq) {
      if (!owned) return COS_CATS[c].list.some(x => x.earn) && false ? 'LOCKED' : 'BUY';
      const kind = KIND[COS_CATS[c].kind];
      if (eq && kind.eq) return kind.eq;
      if (kind.have) return kind.have;
      return 'IN ' + COS_CATS[c].appName;
    }
    const isEq = (c, id) => {
      const k = COS_CATS[c].kind;
      return (k === 'look' || k === 'stock' || k === 'wall') && c !== 'seed' && window.Cos.equipped(c) === id;
    };

    function fill() {
      if (!gridEl) return;
      window.Cos.hover(null, null);
      gridEl.innerHTML = '';
      const list = window.Cos.shelf(cat);
      if (!list.length) {
        /* a shelf with nothing on it says why (the BACKDROPS are pictures a blackout has dealt you: kernel/cos.js) instead of being a blank grid */
        const e = document.createElement('div'); e.className = 'shopempty';
        const b = document.createElement('b'); b.textContent = 'NOTHING ON THIS SHELF YET';
        e.appendChild(b);
        e.appendChild(document.createTextNode(cat === 'wall' ? 'THE BACKDROPS ARE PICTURES THE BOTTLE SHOWS YOU WHEN YOU PASS OUT. EACH ONE YOU HAVE SEEN COMES ONTO THIS SHELF. I CANNOT SELL WHAT YOU HAVE NOT SEEN.' : 'I HAD SOMETHING HERE. I SOLD IT. COME BACK.'));
        gridEl.appendChild(e);
      }
      list.forEach(it => {
        const owned = window.Cos.has(cat, it.id);
        const eq = isEq(cat, it.id);
        const card = document.createElement('div');
        card.className = 'shopcard' + (eq ? ' eq' : owned ? ' owned' : '') +
          (it.reward ? (owned ? ' earned' : ' reward') : '') + (it.earn ? (owned ? ' earned' : ' locked') : '') +
          (!locked(it) && !owned && window.Economy.balance() < it.price ? ' broke' : '');

        const cv = document.createElement('canvas');
        cv.width = 116; cv.height = 60;
        drawThumb(cv, cat, it);

        const nm = document.createElement('div');
        nm.className = 'nm';
        nm.textContent = it.secret && !owned ? '???' : it.name;

        const pr = document.createElement('div');
        pr.className = 'pr';
        pr.textContent = locked(it) ? (owned ? 'EARNED' : 'NOT SOLD') : owned ? 'OWNED' : (it.price === 0 ? 'FREE' : it.price + ' SUN');

        const bt = document.createElement('div');
        bt.className = 'bt';
        bt.textContent = locked(it) && !owned ? 'EARN IT' : buttonText(cat, owned, eq);

        card.appendChild(cv); card.appendChild(nm); card.appendChild(pr);
        /* a reward says which trophy gives it, on the card: the only thing Dave cannot be bargained with over */
        if (locked(it)) {
          const T = window.Trophies, d = T && T.get(it.reward || it.earn), rw = document.createElement('div');
          rw.className = 'rw'; rw.textContent = it.secret && it.reward && !owned ? 'A SECRET TROPHY' : (owned ? 'FOR ' : 'EARN ') + (d ? T.plainName(d) : 'A TROPHY');
          card.appendChild(rw);
        }
        card.appendChild(bt);
        /* no title attribute: the browser would pop up a second box that says again what Dave is already saying */

        card.addEventListener('mouseenter', () => {
          if (it.secret && !owned) { say(pick(DAVE_SECRET)); return; }       /* a secret says nothing of itself, and the crazy lines are not drawn for it */
          { const talk = hoverTalk(cat, it); say(talk.text); if (talk.crazy) { try { window.Trophies && window.Trophies.emit('system', 'crazy', {}); } catch (e) { /* never into the shop */ } } }
          if (cat === 'frame' || cat === 'cursor' || cat === 'scheme') window.Cos.hover(cat, it.id);
        });
        card.addEventListener('mouseleave', () => { window.Cos.hover(null, null); });
        card.addEventListener('mousedown', ev => { ev.stopPropagation(); press(it, owned); });
        gridEl.appendChild(card);
      });
      foot();
    }

    function press(it, owned) {
      const c = COS_CATS[cat];
      if (!owned && locked(it)) {
        /* not for sale at any price: the trophy that gives it is opened in the ledger */
        const T = window.Trophies, tid = it.reward || it.earn, d = T && T.get(tid);
        if (it.secret && it.reward) { say(pick(DAVE_SECRET)); if (window.Snd) window.Snd.deny && window.Snd.deny(); return; }       /* a secret reward's trophy is a secret too: the ledger is not opened on it */
        say('THAT ONE IS NOT FOR SALE. I HAVE NEVER BEEN ABLE TO SELL IT. YOU HAVE TO EARN IT' + (d ? ': ' + T.plainName(d) + '.' : '.'));
        if (window.Snd) window.Snd.deny && window.Snd.deny();
        if (T && T.openLedger) T.openLedger(tid);
        return;
      }
      if (!owned) {
        if (window.Economy.balance() < it.price) {
          say(pick(DAVE_BROKE));
          if (window.Snd && window.Snd.deny) window.Snd.deny();
          return;
        }
        if (window.Cos.buy(cat, it.id)) {
          if (window.Snd && window.Snd.purchase) window.Snd.purchase();
          say(daveThanks(cat, it));
          if (c.kind === 'look' || c.kind === 'wall') window.Cos.equip(cat, it.id);
          if (cat === 'seed' || cat === 'pot') window.dispatchEvent(new Event('garden-stock-refresh'));
          fill(); foot();
        }
        return;
      }
      if (cat === 'seed') { say('YOU\'VE GOT THOSE. PLANT THEM. THAT\'S THE NEXT BIT.'); if (window.Snd) window.Snd.click(); return; }
      if (c.kind === 'unlock') {
        if (window.Snd) window.Snd.click();
        say(unlockHint(cat, it));
        ctx.openWindow(c.app).catch(() => {});
        return;
      }
      window.Cos.equip(cat, it.id);
      if (window.Snd) window.Snd.click();
      say(c.kind === 'wall' ? 'THERE. YOUR DESKTOP IS A PICTURE NOW. THE FILE IS IN THE BACKDROPS FOLDER ON THE DESKTOP, WHERE YOU CAN PICK HOW IT FITS.' : 'THERE. LOOK AT YOU.');
      fill();
    }

    function unlockHint(c, it) {
      if (c === 'crayon') return it.kind === 'layer' ? 'OPEN DRAW. THE LAYERS ARE ON THE LEFT, UNDER THE TOOLS.' : 'OPEN DRAW. THE ' + it.name + ' IS ON THE LEFT, UNDER THE OTHER TOOLS.';
      if (c === 'garage') return 'OPEN THE GARAGE, PICK AN INSTRUMENT FOR A TRACK. THEY ARE IN THE PICKER NOW: ' + it.inst.map(i => i.toUpperCase()).join(', ') + '.';
      if (c === 'solitaire') return 'OPEN SOLITAIRE. THE ' + ({ back: 'BACK', table: 'TABLE', win: 'WIN' }[it.sub] || 'THING') + ' BUTTON ON THE BAR CYCLES THROUGH WHAT YOU OWN.';
      if (c === 'drink') return 'OPEN THE BOTTLE. THE DRINK BUTTON CHANGES WHAT YOU ARE POURING. ' + (it.strength > 1.5 ? 'GO CAREFULLY.' : '');
      if (it.id === 'pet') return 'OPEN THE ELEPHANT AND PRESS GO OUTSIDE. THEN STAND BACK.';
      return 'OPEN THE ELEPHANT. THE WARDROBE IS THE BUTTON.';
    }

    function daveThanks(c, it) {
      if (it.joke) return 'YOU ACTUALLY BOUGHT IT. I HAVE TO CLOSE THE SHOP. I HAVE TO GO AND LIE DOWN.';
      if (c === 'seed') return 'SEEDS! IN A POT! I\'VE HEARD OF IT!';
      if (c === 'frame') return 'IT\'S ON THE MACHINE ALREADY. DON\'T ASK HOW. ASK LATER.';
      if (c === 'wall') return 'ON THE DESKTOP. EVERY PICTURE YOU BUY LIVES IN THE BACKDROPS FOLDER: OPEN ONE AND PICK FILL, FIT, STRETCH, CENTRE OR TILE.';
      if (c === 'drink') return it.strength === 0 ? 'JUICE! GOOD FOR YOU! DISGUSTING!' : 'ONE BOTTLE, FULL. THE BUTTON IS IN THE BOTTLE. DRINK RESPONSIBLY. OR AT ALL.';
      if (c === 'crayon' || c === 'garage') return 'IT\'S IN THE APP ALREADY. I SNUCK IT IN WHILE YOU WERE LOOKING AT THE PRICE.';
      if (c === 'elephant') return it.id === 'pet' ? 'HE\'S OUT. HE\'S OUT! I TOLD HIM NOT TO. HE NEVER LISTENS.' : 'HE LOOKS WONDERFUL. HE ALWAYS DID. NOW IT\'S OFFICIAL.';
      return 'SOLD. NO REFUNDS. NO RECEIPTS. GESTURES ONLY.';
    }

    fill();

    let lastT = performance.now(), landed = false;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      bob += 0.06;
      let perch = null;
      if (sit) {
        const plan = stepSitter(sit, dt);
        if (plan) { playHonk(plan); if (Math.random() < 0.35) say(pick(DAVE_GOOSE_HONK)); }
        if (!landed && sit.t >= ARRIVE) { landed = true; say(pick(DAVE_GOOSE_LAND)); talkT = 0; playHonk(honkPlan()); sit.honk.open = 0.5; }
        const k = arrival(sit);
        perch = { name: sitFrame(sit), flip: false, by: -6 + (2 + GOOSE_ROOM + 6) * k };
      }
      drawDave(daveCv, bob, perch);
      talkT++;
      if (talkT > 900) { talkT = 0; say(pick(DAVE_LINES)); }
    };
    raf = requestAnimationFrame(loop);
    /* a poke at Dave, with a goose on him, is answered by the goose */
    if (sit) daveCv.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      if (!landed) return;
      say(pick(DAVE_GOOSE_POKE)); talkT = 0; playHonk(honkPlan()); sit.honk.open = 0.6;
    });

    /* a purchase made somewhere else (the garden's bench, a locked tool in the crayon) turns up here at once */
    this._onEcon = () => fill();
    window.Economy.onChange(this._onEcon);
    this._onCos = () => { if (document.body.contains(root)) fill(); else window.removeEventListener('cos-changed', this._onCos); };
    window.addEventListener('cos-changed', this._onCos);

    /* asked for another shelf by a second click (the elephant sends you to his, a scheme menu to the schemes) */
    this._onAgain = ev => {
      const d = ev.detail, i = d && d.appId === 'shop' && d.args && d.args.tab ? keys.indexOf(d.args.tab) : -1;
      if (i >= 0) tabs.querySelectorAll('.shoptab')[i].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    };
    window.addEventListener('app-reopen', this._onAgain);

    /* the loop re-arms itself every frame, so cancel whichever id is current, not the first */
    this._stop = () => cancelAnimationFrame(raf);
  },
  unmount() {
    if (this._stop) { this._stop(); this._stop = null; }
    window.removeEventListener('cos-changed', this._onCos);
    window.removeEventListener('app-reopen', this._onAgain);
    window.Cos.hover(null, null);
  }
};
