const fs = require('fs');
let code = fs.readFileSync('kernel/vfs.js', 'utf8');

code = 'import { Style } from "./style.js";\n' + code;

const removeReplacement = `async function remove(path) {
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
}`;

code = code.replace(/async function remove\(path\) \{[\s\S]*?\}\n/m, removeReplacement + '\n');
fs.writeFileSync('kernel/vfs.js', code);
