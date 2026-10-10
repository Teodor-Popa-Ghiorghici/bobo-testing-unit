/* node apps/hifi/album_meta_check.js: what an album says about itself is kept apart from its discs. Dressing never changes the album it is given, a field equal to what the discs say is
   not an override, an emptied field goes back to the discs, a book with nothing in it is no book, and nothing here can reach a disc. */
import { KEY, load, save, clean, dress, patch, isEdited, coversOf, arrange } from './album_meta.js';

let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL: ' + m); } };
const mem = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };
const fold = s => String(s).toLowerCase();

const a = { key: 'blue', name: 'Blue', artist: 'Joni', year: 1971, idx: [3, 4, 5], loose: false };
const discs = JSON.stringify(a);
const d = { name: a.name, artist: a.artist, year: a.year };

/* an empty book dresses nothing */
ok(dress(a, {}) === a, 'no book, no change (same object)');
ok(dress(a, null) === a, 'a missing book is no book');

/* writing over every field */
let b = patch({}, 'blue', { name: 'BLUE (REMASTER)', artist: 'JONI MITCHELL', year: '2021', genre: 'folk', cover: 'vabc' }, d);
ok(isEdited(b, 'blue'), 'edited after a patch');
const x = dress(a, b);
ok(x.name === 'BLUE (REMASTER)' && x.artist === 'JONI MITCHELL' && x.year === '2021' && x.genre === 'folk' && x.coverKey === 'vabc', 'every field is laid over: ' + JSON.stringify(x));
ok(x.key === 'blue' && x.idx === a.idx, 'the key and the discs of the album are the same (the grouping is not changed)');
ok(JSON.stringify(a) === discs, 'dress does not touch the album it is given');
ok(x.derived.name === 'Blue', 'what the discs say is still known');

/* a field equal to what the discs say is no override; an empty one is gone */
b = patch(b, 'blue', { name: 'Blue', artist: '', year: String(d.year) }, d);
const y = dress(a, b);
ok(y.name === 'Blue' && y.artist === 'Joni' && y.year === 1971, 'back to the discs: ' + JSON.stringify(y));
ok(y.genre === 'folk' && y.coverKey === 'vabc', 'the fields not mentioned stay');
b = patch(b, 'blue', { genre: '', cover: null }, d);
ok(!isEdited(b, 'blue') && Object.keys(b).length === 0, 'a book with nothing left in it has no entry');

/* other albums are never touched */
let two = patch(patch({}, 'blue', { name: 'X' }, d), 'kind of blue', { cover: 'v1' }, { name: 'Kind of Blue' });
ok(Object.keys(two).length === 2, 'two albums, two entries');
two = patch(two, 'blue', { name: '' }, d);
ok(!two.blue && two['kind of blue'].cover === 'v1', 'one put back leaves the other');
ok(coversOf(two).join() === 'v1', 'the pictures in use');

/* what is allowed in a field */
ok(clean('year', ' 19a71x ') === '1971', 'year: digits only');
ok(clean('year', '12') === '', 'year: not a year');
ok(clean('year', '20211') === '2021', 'year: four digits at most');
ok(clean('name', '  a   b  ') === 'a b', 'name: spaces folded');
ok(clean('name', 'x'.repeat(200)).length === 60, 'name: kept to its limit');
ok(clean('genre', 'g'.repeat(99)).length === 30, 'genre: kept to its limit');

/* storage: round trip, and a damaged book is an empty one */
const io = mem();
ok(save({ blue: { name: 'N' } }, io) && load(io).blue.name === 'N', 'round trip');
io.setItem(KEY, '{not json'); ok(Object.keys(load(io)).length === 0, 'a damaged book is empty');
io.setItem(KEY, '[1,2]'); ok(Object.keys(load(io)).length === 0, 'an array is not a book');
ok(Object.keys(load({ getItem: () => { throw new Error('no storage'); } })).length === 0, 'no storage: an empty book');

/* the order they are shown in follows the name shown, the loose discs last */
const list = [{ name: 'Zed', loose: false }, { name: 'NO ALBUM', loose: true }, { name: 'alpha', loose: false }];
ok(arrange(list, fold).map(q => q.name).join() === 'alpha,Zed,NO ALBUM', 'order: ' + arrange(list, fold).map(q => q.name).join());

console.log(bad ? bad + ' FAILED' : 'album_meta_check: ok');
process.exit(bad ? 1 : 0);
