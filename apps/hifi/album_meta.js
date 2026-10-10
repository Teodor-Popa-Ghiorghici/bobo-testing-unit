/* WHAT AN ALBUM SAYS ABOUT ITSELF, kept apart from what its discs say. The ALBUMS view groups the discs by their album tag; that grouping is worked out each time and is not stored
   anywhere, so to change how an album is shown (its title, its artist, its year, its genre, its picture) without touching the discs in it, what is written over it is kept here, by the
   album's own key (shelf.js `albums`: the folded name of the album tag): { name, artist, year, genre, cover }. A disc keeps its own tags, its own picture and its own place: nothing
   here ever writes to one. Pure but for the storage (`io` is a localStorage-like); node apps/hifi/album_meta_check.js holds it. */
export const KEY = 'templeos.stack.albums.v1';
export const LIMITS = { name: 60, artist: 60, genre: 30 };
const FIELDS = ['name', 'artist', 'year', 'genre'];

export function load(io) {
  try { const v = JSON.parse((io || localStorage).getItem(KEY)); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}
export function save(meta, io) { try { (io || localStorage).setItem(KEY, JSON.stringify(meta)); return true; } catch (e) { return false; } }

/* what is allowed in a field */
export function clean(field, v) {
  v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  if (field === 'year') { const y = v.replace(/\D/g, '').slice(0, 4); return y && +y >= 1000 ? y : ''; }
  return v.slice(0, LIMITS[field] || 60);
}

/* the album as it is shown: the one worked out from its discs, with what has been written over it laid on top. An empty field is not an override: it shows what the discs say. */
export function dress(a, meta) {
  const m = meta && meta[a.key];
  if (!m) return a;
  return Object.assign({}, a, {
    name: m.name || a.name, artist: m.artist || a.artist, year: m.year || a.year, genre: m.genre || '', coverKey: m.cover || null,
    edited: true, derived: { name: a.name, artist: a.artist, year: a.year }
  });
}

/* a new book with `fields` ({ name, artist, year, genre, cover }) written over album `key`. A field equal to what the discs say, or empty, is left out, so an album that is
   changed back is not "edited" any more. `derived` is what the discs say ({ name, artist, year }). `cover` is a vault key, or null for the discs' own picture. */
export function patch(meta, key, fields, derived) {
  const out = Object.assign({}, meta), cur = Object.assign({}, out[key] || {}), d = derived || {};
  FIELDS.forEach(f => {
    if (!(f in fields)) return;
    const v = clean(f, fields[f]);
    if (!v || v === String(d[f] == null ? '' : d[f])) delete cur[f]; else cur[f] = v;
  });
  if ('cover' in fields) { if (fields.cover) cur.cover = fields.cover; else delete cur.cover; }
  if (Object.keys(cur).length) out[key] = cur; else delete out[key];
  return out;
}
export const isEdited = (meta, key) => !!(meta && meta[key]);
export const coversOf = meta => Object.keys(meta || {}).map(k => meta[k].cover).filter(Boolean);

/* the order they are shown in: albums with a name first (by the name shown, in the machine's folding), the loose discs last */
export function arrange(list, fold) {
  return list.slice().sort((a, b) => (a.loose ? 1 : 0) - (b.loose ? 1 : 0) || fold(a.name).localeCompare(fold(b.name)));
}
