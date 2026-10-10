/* THE WORKSHOP: no goals, no tests, nothing to be right about. A program is written, run, saved to ::/Home/HolyC/NAME.HC (an ordinary .HC file: the editor opens
   it, RUN IT in its menu runs it), and INSTALLED: put on the desktop as an icon that opens it as a small app of its own (a record of the VFS with the program inside it;
   the icon opens HOLYC.EXE in its player, which is only the stage). Starting points are the TEMPLATES, and the reference card is always on the page. */
import { el, button, rich } from './tutor_ui.js';
import { TEMPLATES, REFERENCE } from './templates.js';
import { saved, installed, template } from './trophy_calls.js';
import { workshopFlags } from './buff_rules.js';
import { runProgram, seeded } from './engine.js';

const DIR = '::/Home/HolyC';
const clean = n => String(n || '').replace(/\.(HC|APP)$/i, '').replace(/[^A-Za-z0-9_ -]/g, '').trim().slice(0, 24);

export function makeWorkshop(host, o) {
  const panel = el('div', 'hc-coach hc-shop'), snd = o.snd, lab = o.lab, ctx = o.ctx;
  host.appendChild(panel);
  const W = { el: panel, name: 'MyApp', active: false };
  const changed = dir => { try { window.dispatchEvent(new CustomEvent('vfs-changed', { detail: { dir: dir } })); } catch (e) { /* no desktop to tell */ } };

  async function files() {
    try { return (await ctx.fs.list(DIR)).filter(f => /\.HC$/i.test(f.name)).map(f => f.name.replace(/\.HC$/i, '')).sort(); }
    catch (e) { return []; }
  }
  function render() {
    panel.innerHTML = '';
    const h = el('div', 'hc-ch2'); h.append(el('span', 'hc-chtitle', 'THE WORKSHOP')); panel.appendChild(h);
    const body = el('div', 'hc-cbody');
    body.appendChild(rich(el('p', 'hc-p'), 'Write anything. [SAVE] keeps it as an ordinary .HC file in HOME / HolyC. [INSTALL] puts it on the desktop as an app of its own.'));
    body.appendChild(el('div', 'hc-sub', 'START FROM'));
    const tpl = el('div', 'hc-tpls');
    TEMPLATES.forEach(t => tpl.appendChild(button(t.name, 'sm', () => { lab.load(t.code); W.fresh = true; template(t.name); lab.focus(); }, snd)));
    body.appendChild(tpl);
    body.appendChild(el('div', 'hc-sub', 'NAME'));
    const nm = el('input', 'hc-name'); nm.value = W.name; nm.maxLength = 24; nm.spellcheck = false;
    nm.addEventListener('input', () => { W.name = nm.value; }); nm.addEventListener('keydown', ev => ev.stopPropagation());
    body.appendChild(nm);
    const row = el('div', 'hc-row');
    row.append(button('SAVE', 'go', () => save(), snd, 'keep it in HOME / HolyC'), button('INSTALL ON DESKTOP', 'sm', () => install(), snd, 'make it an icon on the desktop that opens it as an app'));
    body.appendChild(row);
    body.appendChild(el('div', 'hc-sub', 'SAVED PROGRAMS'));
    W.listEl = el('div', 'hc-files'); body.appendChild(W.listEl);
    body.appendChild(el('div', 'hc-sub', 'REFERENCE'));
    const ref = el('div', 'hc-ref'); REFERENCE.forEach(r => { const d = el('div', 'hc-refrow'); d.append(el('b', '', r[0]), el('span', '', r[1])); ref.appendChild(d); });
    body.appendChild(ref);
    panel.appendChild(body);
    refreshList();
  }
  async function refreshList() {
    const names = await files(); W.listEl.innerHTML = '';
    if (!names.length) { W.listEl.appendChild(el('div', 'hc-none', 'NOTHING SAVED YET.')); return; }
    names.forEach(n => {
      const r = el('div', 'hc-file'); const open = el('span', 'hc-fname', n + '.HC');
      open.addEventListener('mousedown', async ev => { ev.stopPropagation(); snd.click(); const rec = await ctx.fs.read(DIR + '/' + n + '.HC'); if (rec && typeof rec.content === 'string') { lab.load(rec.content); W.name = n; render(); } });
      const del = button('X', 'sm del', async () => { try { await ctx.fs.trash(DIR + '/' + n + '.HC'); changed(DIR); ctx.toast(n + '.HC IS IN THE BIN.'); } catch (e) { ctx.toast(String(e.message || e)); } refreshList(); }, snd, 'to the bin');
      r.append(open, del); W.listEl.appendChild(r);
    });
  }
  async function save() {
    const name = clean(W.name) || 'MyApp'; W.name = name;
    try { await ctx.fs.write(DIR + '/' + name + '.HC', { type: 'code', content: lab.get() }); changed(DIR); ctx.toast('SAVED ' + name + '.HC IN HOME / HolyC.'); snd.step(); saved(); }
    catch (e) { ctx.toast('COULD NOT SAVE: ' + (e.message || e)); snd.error(); }
    refreshList();
  }
  async function install() {
    const name = clean(W.name) || 'MyApp'; W.name = name;
    if (!lab.get().trim()) { ctx.toast('WRITE A PROGRAM FIRST.'); snd.error(); return; }
    try {
      if (await ctx.fs.stat('::/' + name)) { ctx.toast(name + ' IS ALREADY ON THE DESKTOP. PICK ANOTHER NAME.'); snd.error(); return; }
      await ctx.fs.write('::/' + name, { type: 'app', app: 'holyc', args: { run: true, name: name }, content: lab.get() });
      changed('::'); snd.done(); ctx.toast(name + ' IS ON THE DESKTOP. IT OPENS AS AN APP.'); installed(name);
      noticed(lab.get());
      if (o.onInstall) o.onInstall(name);
    } catch (e) { ctx.toast('COULD NOT INSTALL: ' + (e.message || e)); snd.error(); }
  }
  /* the workshop notices a program written from a blank page that runs clean (kernel/buffs_core.js: said to nobody, shown by whatever it earns) */
  function noticed(src) {
    try {
      const R = o.HC ? runProgram(o.HC, src, { rand: seeded(7) }) : null, f = workshopFlags(src, TEMPLATES, !!(R && R.ok));
      const P = o.progress; if (!P || (!f.clock && !f.notes)) return;
      P.data.shop = P.data.shop || {}; if (f.clock) P.data.shop.clock = true; if (f.notes) P.data.shop.notes = true; P.save();
      if (window.Buffs) window.Buffs.sync(P.buffView());
    } catch (e) { /* the buffs are somebody else's business */ }
  }
  W.open = src => { W.active = true; if (src !== undefined) lab.load(src); lab.setBoard(false); render(); lab.editor.stopTyping(); lab.focus(); };
  W.close = () => { W.active = false; panel.innerHTML = ''; };
  W.setName = n => { W.name = clean(n) || 'MyApp'; };
  return W;
}
