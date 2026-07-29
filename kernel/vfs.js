import { Style } from "./style.js";
const DB_NAME = 'TempleOS_VFS';
const STORE_NAME = 'files';

function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => reject(request.error);
  });
}

/* bump this whenever assets/seed.json's shape changes (new fields, new
   apps) so a browser that already seeded an older shape gets patched
   instead of silently keeping stale records forever */
const SEED_VERSION = 2;
const SEED_VERSION_KEY = 'templeos.vfs.seedVersion';

async function initVFS() {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const count = await new Promise((resolve, reject) => {
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  let seenVersion = 0;
  try { seenVersion = parseInt(localStorage.getItem(SEED_VERSION_KEY), 10) || 0; } catch (e) {}

  if (count === 0) {
    try {
      const res = await fetch('assets/seed.json');
      if (res.ok) {
        const seed = await res.json();
        const tx2 = db.transaction(STORE_NAME, 'readwrite');
        const store2 = tx2.objectStore(STORE_NAME);
        for (const item of seed) {
          store2.put({ type: item.type, content: item.content, src: item.src, app: item.app }, item.path);
        }
        await new Promise(r => { tx2.oncomplete = r; tx2.onerror = r; });
      }
    } catch (e) {
      console.error(e);
    }
  } else if (seenVersion < SEED_VERSION) {
    /* the tree already exists from an older seed shape. Only patch 'app'
       markers (they hold no user data, just which registry id to open) and
       add any brand-new seeded paths — never touch a path the user could
       have edited or uploaded over. */
    try {
      const res = await fetch('assets/seed.json');
      if (res.ok) {
        const seed = await res.json();
        const keysStore = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
        const existingKeys = new Set(await new Promise((resolve, reject) => {
          const req = keysStore.getAllKeys();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        }));
        const tx2 = db.transaction(STORE_NAME, 'readwrite');
        const store2 = tx2.objectStore(STORE_NAME);
        for (const item of seed) {
          if (item.type === 'app' || !existingKeys.has(item.path)) {
            store2.put({ type: item.type, content: item.content, src: item.src, app: item.app }, item.path);
          }
        }
        await new Promise(r => { tx2.oncomplete = r; tx2.onerror = r; });
      }
    } catch (e) {
      console.error(e);
    }
  }
  try { localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION)); } catch (e) {}
}

async function read(path) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(path);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function write(path, data) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(data, path);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* a directory listing only ever needs the records under its own prefix, so
   this walks a bounded IndexedDB key range instead of pulling every key AND
   every value (images, video vault keys, note bodies, everything) out of
   the whole store on every single call -- that full-store round trip is
   what made opening folders, `tree`, and any add/delete feel so heavy. */
async function list(dir) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const prefix = dir.endsWith('/') ? dir : dir + '/';
    const range = IDBKeyRange.bound(prefix, prefix + '\uFFFF', true, false);
    const results = new Map();

    const req = store.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) { resolve(Array.from(results.values())); return; }
      const key = cursor.key;
      const rest = key.substring(prefix.length);
      const parts = rest.split('/');
      const name = parts[0];
      const isDir = parts.length > 1;

      if (!results.has(name)) {
        if (isDir) {
          results.set(name, { name, type: 'folder' });
        } else {
          results.set(name, { name, type: cursor.value.type || 'file', app: cursor.value.app });
        }
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

async function remove(path) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const prefix = path.endsWith('/') ? path : path + '/';
    let count = 0;

    // the path itself (a file) plus everything under it (a folder's
    // children), found through bounded key ranges instead of a full
    // getAllKeys() scan of the entire VFS on every delete
    const getReq = store.get(path);
    getReq.onsuccess = () => {
      if (getReq.result !== undefined) { store.delete(path); count++; }

      const range = IDBKeyRange.bound(prefix, prefix + '\uFFFF', true, false);
      const cursorReq = store.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor) {
          if (count > 0 && typeof Style !== 'undefined') {
            Style.hit({ name: path.split('/').pop() }, count);
          }
          resolve(count);
          return;
        }
        cursor.delete();
        count++;
        cursor.continue();
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export const fs = { read, write, list, remove };
export { initVFS };
