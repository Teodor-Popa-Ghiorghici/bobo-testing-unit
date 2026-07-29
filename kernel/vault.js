/* ---- the disk under the disk ---------------------------------------------
   localStorage is a five megabyte drawer you have to serialise into strings,
   which is why videos and audio used to evaporate on reload. IndexedDB takes
   Blobs directly and runs to hundreds of megabytes, so anything big — an
   imported song, a video, a full-size picture — goes in here under a key, and
   only the key travels with the record that references it.
   ========================================================================== */
export const Vault = {
  db: null, ready: null, ok: false,
  open() {
    if (this.ready) return this.ready;
    this.ready = new Promise(res => {
      let req;
      try { req = indexedDB.open('templeos.vault', 1); } catch (e) { return res(null); }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs');
      };
      req.onsuccess = () => { this.db = req.result; this.ok = true; res(req.result); };
      req.onerror = () => res(null);
      req.onblocked = () => res(null);
      setTimeout(() => res(this.db), 4000);
    });
    return this.ready;
  },
  async tx(mode, fn) {
    const db = await this.open();
    if (!db) return null;
    return new Promise(res => {
      let t;
      try { t = db.transaction('blobs', mode); } catch (e) { return res(null); }
      const store = t.objectStore('blobs');
      let out = null;
      try { out = fn(store); } catch (e) { return res(null); }
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => res(null);
      t.onabort = () => res(null);
    });
  },
  key() { return 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); },
  async put(blob, key) {
    key = key || this.key();
    const r = await this.tx('readwrite', s => s.put(blob, key));
    return r === null && !this.ok ? null : key;
  },
  async get(key) { return key ? this.tx('readonly', s => s.get(key)) : null; },
  async del(key) { if (key) await this.tx('readwrite', s => s.delete(key)); },
  async keys() { return (await this.tx('readonly', s => s.getAllKeys())) || []; },
  /* a data: URL is a string; a Blob is not. Both go in, one comes out. */
  async putData(dataURL, key) {
    try {
      const b = await (await fetch(dataURL)).blob();
      return await this.put(b, key);
    } catch (e) { return null; }
  }
};
Vault.open();
window.Vault = Vault;

/* Object URLs minted from the vault, so the same blob is not re-wrapped on
   every repaint and nothing leaks when a window closes. */
export const VaultURL = {
  map: Object.create(null),
  async url(key) {
    if (!key) return null;
    if (this.map[key]) return this.map[key];
    const b = await Vault.get(key);
    if (!b) return null;
    try { this.map[key] = URL.createObjectURL(b); } catch (e) { return null; }
    return this.map[key];
  },
  drop(key) {
    if (!this.map[key]) return;
    try { URL.revokeObjectURL(this.map[key]); } catch (e) {}
    delete this.map[key];
  }
};
window.VaultURL = VaultURL;
