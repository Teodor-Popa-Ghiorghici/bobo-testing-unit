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

async function list(dir) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    // Get all entries to rebuild a tree for the requested dir
    const req = tx.objectStore(STORE_NAME).getAll();
    const reqKeys = tx.objectStore(STORE_NAME).getAllKeys();
    
    reqKeys.onsuccess = () => {
      const keys = reqKeys.result;
      const values = req.result;
      
      const prefix = dir.endsWith('/') ? dir : dir + '/';
      const results = new Map();
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key.startsWith(prefix) && key !== prefix) {
          const rest = key.substring(prefix.length);
          const parts = rest.split('/');
          const name = parts[0];
          const isDir = parts.length > 1;
          
          if (!results.has(name)) {
            if (isDir) {
              results.set(name, { name, type: 'folder' });
            } else {
              results.set(name, { name, type: values[i].type || 'file', app: values[i].app });
            }
          }
        }
      }
      resolve(Array.from(results.values()));
    };
    reqKeys.onerror = () => reject(reqKeys.error);
  });
}

async function remove(path) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Check if it's a directory by seeing if it has children
    const prefix = path.endsWith('/') ? path : path + '/';
    const reqKeys = store.getAllKeys();
    
    reqKeys.onsuccess = () => {
      const keys = reqKeys.result;
      let count = 0;
      let foundExact = false;
      
      for (const key of keys) {
        if (key === path) {
          store.delete(key);
          count++;
          foundExact = true;
        } else if (key.startsWith(prefix)) {
          store.delete(key);
          count++;
        }
      }
      
      // If we found something to delete, trigger style meter
      if (count > 0 && typeof Style !== 'undefined') {
        Style.hit({ name: path.split('/').pop() }, count);
      }
      
      resolve(count);
    };
    reqKeys.onerror = () => reject(reqKeys.error);
  });
}

export const fs = { read, write, list, remove };
export { initVFS };
