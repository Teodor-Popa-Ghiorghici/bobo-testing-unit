/* A charm tells the truth about the bench it is read at (pure Node). The first act's numbers must not be quoted under the Underdeep. */
import { REGIONS, CHARMS } from './data.js';
import { charmText, zoneOf } from './charm_text.js';
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
const rg = id => REGIONS.find(r => r.id === id);
const t = (cid, rid) => charmText(CHARMS.find(c => c.id === cid), rg(rid));

ok(t('quick', 'cross').text === 'Focus costs 22 soul, not 33.', 'quick, first act');
ok(t('quick', 'bone').text === 'Focus costs 33 soul, not 50.', 'quick, Underdeep: ' + t('quick', 'bone').text);
ok(t('deep', 'bone').text.includes('66'), 'deep, Underdeep');
ok(t('grubsong', 'cross').text.includes(' 5 '), 'grubsong, first act');
ok(t('grubsong', 'bone').text.includes(' 3 '), 'grubsong, Underdeep: ' + t('grubsong', 'bone').text);
ok(t('ember', 'cross').notes.join('').includes('NO COLD'), 'ember says where it is no use');
ok(t('ember', 'forge').notes.join('') === 'THE COLD IS HERE.', 'ember in the forge');
ok(t('lens', 'deep').notes.join('') === 'THE DARK IS HERE.', 'lens in the Deepnest');
ok(t('lens', 'green').notes.join('').includes('NOTHING IS DARK'), 'lens where it is light');
ok(t('ward', 'cross').notes.join('').includes('UNDERDEEP'), 'ward where a larva takes one');
ok(t('ward', 'court').notes.join('').includes('3 MASKS'), 'ward in the Pale Court');
ok(zoneOf(rg('court')).dark && zoneOf(rg('court')).cold, 'court is dark and cold (the hall)');
ok(!zoneOf(rg('cross')).cold, 'the Crossway is not cold');
/* every charm reads, in every zone, as a sentence that names no number it cannot keep */
REGIONS.forEach(r => CHARMS.forEach(c => { const x = charmText(c, r); ok(x.text && x.text.length < 170, c.id + ' in ' + r.id); }));
console.log(bad ? bad + ' FAILED' : 'sweeper charm text: ok');
process.exit(bad ? 1 : 0);
