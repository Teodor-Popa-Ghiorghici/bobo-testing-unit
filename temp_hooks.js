## SNIPPET 4 — the five hooks

### 4.1 `deleteNode()` — the main scorer
`doDel()` in the terminal calls this too, so both delete paths are covered.

```javascript
  refreshViews();
  Snd.del();                                  // ← replace this line
  toast('DELETED ' + node.name);
```
becomes
```javascript
  refreshViews();
  Style.hit(node, node.type === 'folder' ? countFiles(node) : 1);
  toast('DELETED ' + node.name);
```

and add this helper next to `deleteNode`:

```javascript
/* a folder is worth what is inside it */
function countFiles(node) {
  if (!node || node.type !== 'folder') return 1;
  let n = 0;
  (node.children || []).forEach(c => { n += countFiles(c); });
  return Math.max(1, n);
}
```

### 4.2 `clearUploads()` — one action, many bodies

```javascript
async function clearUploads() {
  const n = uploadList.length;               // ← add
  uploadList.slice().forEach(u => {
    ...
  });
  ...
  refreshViews();
  if (n) Style.hit(null, n);                 // ← add, before the toast
  toast('ALL UPLOADS CLEARED. C:/ IS BACK TO STOCK.');
}
```

### 4.3 `powerOff()` — the run dies with the picture

```javascript
  Snd.thunk();
  Music.stop();
  Style.reset();                             // ← add
  CRT.on = false;
```

### 4.4 the MUS pot and the LOBBY switch — the layer rides with them

In `wirePanel()`'s `pot-mus` handler and in `setLobby()`, add a line beside the
existing `Music.sync();`:

```javascript
    Music.sync();
    Rage.sync();                             // ← add, both places
```

### 4.5 `powerOn()` — nothing to add
The meter is dormant after a reset and only reappears on the next delete. If you'd
rather it survive a power cycle, drop 4.3 and the `if (!CRT.on) this.reset()` line
inside `Style.frame()`.

---

## Testing without uploading thirty files
