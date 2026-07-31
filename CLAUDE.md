# TempleOS Module System

## The App Contract
Every app is a module with a default export shaped exactly like this:

```js
export default {
id: 'terminal', // matches the folder name
title: 'TERMINAL.EXE', // window title bar text
icon: 'assets/images/terminal.png',
width: 640,
height: 480,
resizable: true,

// Called when a window is opened. `root` is an empty <div> inside the window body.
mount(root, ctx) {},

// Called when the window closes. Must remove every timer, interval,
// requestAnimationFrame loop, and listener attached to window/document.
unmount() {}
};
```

## The ctx API
`ctx` is the only channel between an app and the rest of the system. An app must never import from kernel/, never touch document.body or window globals belonging to other apps, and never reach into another app's DOM.

```js
ctx.fs.read(path) // -> Promise<Blob|string|null>
ctx.fs.write(path, data) // -> Promise<void>
ctx.fs.list(dir) // -> Promise<string[]>
ctx.fs.remove(path) // -> Promise<void>
ctx.save(key, value) // -> Promise<void> app-scoped settings/progress
ctx.load(key) // -> Promise<any>
ctx.openWindow(appId) // launch another app
ctx.close() // close this app's own window
```

## CSS Variables from theme.css
Not all extracted yet, but typically `#FFFFFF`, `#AAAAAA`, `#555555`, `#FFFF55` etc. (Standard 16-color CGA/VGA palette).

## How to add a new app
1. Create `apps/<id>/index.js` obeying the contract.
2. (Optional) Create `apps/<id>/style.css` if it needs specific styles.
3. Add `<id>` to `kernel/registry.js`.
4. Update this `CLAUDE.md` with the new app description.

## Apps
- `placeholder`: `apps/placeholder/index.js` - A trivial app to test the window manager.
- `standbattle`: `apps/standbattle/index.js` - Stand Battle Arena, a JoJo's Bizarre Adventure roguelike combat prototype (see `docs/stand-battle-arena-spec.md`, ported from the jojo-roguelike repo). Playable Jotaro Kujo/Star Platinum vs. Morioh enemies and boss Yoshikage Kira/Killer Queen, across a 6-node Act 1 (Morioh) map. Implements the spec's Prototype milestone (§15 step 1): telegraphed enemy attacks, dodge (i-frames) vs. parry (tight counter window) as distinct mechanics, hit-stop/screen-shake/particle juice with a shake accessibility toggle, an effect-hook dispatcher (`hooks.js`), and a shared enemy attack-pattern module library (`ai.js`). Zero meta-progression by design; internal 384×216 canvas, integer-only upscale.
  Sprites (`sprite_player.js`/`sprite_enemy.js`/`sprite_boss.js`), a shared pose animator (`anim.js`, quantized/stepped so it still reads as hand-drawn frames rather than a tween), face expressions (`face.js`), a textured Morioh backdrop (`background.js`) and a beveled HUD with a combo counter (`hud.js`) all draw from an **extended palette** (`palette.js`, ~50 curated colours) via shared primitives (`draw.js`: staircase circles, ordered dithering, three-band shading) that go beyond the machine's base 16-colour/no-antialiasing rule below — an explicit, deliberate exception for this app's content, requested by the user for SNES-quality art; canvas smoothing stays off and everything still snaps to whole pixels. Sound is a real 3-layer SFX design with combo-pitch escalation (`audio.js`) plus a from-scratch adaptive chiptune engine (`music.js`, its own Web Audio gain bus wired to the machine's MUS knob, independent of the SFX bus) with explore/combat/tension intensity layers.

## Rules
- Apps never import from `kernel/`.
- Files stay under 300 lines (split into siblings in the app folder if needed).
