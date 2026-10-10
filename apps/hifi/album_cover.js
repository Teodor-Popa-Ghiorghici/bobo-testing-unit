/* An album's own picture (album_meta.js keeps its vault key), as a small url, made once. Kept apart from the rows and from the dialog because both of them need it. */
import { Vault } from '../../kernel/vault.js';
import { labelFrom } from './art.js';

const urls = new Map();
/* the picture now, or null and `cb(url)` when it is ready (and nothing at all if it is gone: the discs' own picture shows) */
export function coverUrl(key, cb) {
  if (urls.has(key)) return urls.get(key);
  Vault.get(key).then(b => (b ? labelFrom(b) : null)).then(P => { if (!P) return; const u = P.thumb.toDataURL(); urls.set(key, u); if (cb) cb(u); }).catch(() => { /* the picture is gone */ });
  return null;
}
export const forgetCover = key => { urls.delete(key); };
