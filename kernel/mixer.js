/* Every music/ambience subsystem on this machine already runs its own
   Web Audio gain bus in isolation (the lobby, Magen's band, the Cook's
   radio, the garden's wind) -- this just gives each one a persisted
   multiplier and a small taskbar panel to work it from, the way a real
   volume mixer keeps one slider per application instead of one for
   everything at once. */
const KEY = 'templeos.mixer.v1';
const CHANNELS = [
  { id: 'lobby',  n: 'LOBBY MUSIC' },
  { id: 'magen',  n: 'MAGEN' },
  { id: 'cook',   n: 'THE COOK' },
  { id: 'garden', n: 'GARDEN' }
];

let st = {};
try {
  const raw = localStorage.getItem(KEY);
  if (raw) st = JSON.parse(raw) || {};
} catch (e) {}

export const Mixer = {
  get(ch) { return st[ch] == null ? 1 : st[ch]; },
  set(ch, v) {
    st[ch] = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    window.dispatchEvent(new CustomEvent('mixer-changed', { detail: { channel: ch } }));
  },
  channels: CHANNELS
};
window.Mixer = Mixer;

export const MixerUI = {
  box: null, panel: null,
  mount() {
    const bar = document.getElementById('taskbar');
    const sunbox = document.getElementById('sunbox');
    if (!bar || document.getElementById('mixerbox')) return;

    const box = document.createElement('div');
    box.id = 'mixerbox';
    box.title = 'MIXER. Per-app music and ambience volume.';
    box.textContent = '♫';
    bar.insertBefore(box, sunbox || document.getElementById('clock'));
    this.box = box;

    const panel = document.createElement('div');
    panel.id = 'mixerpanel';
    panel.style.display = 'none';
    document.getElementById('shell').appendChild(panel);
    this.panel = panel;

    CHANNELS.forEach(ch => {
      const row = document.createElement('div');
      row.className = 'mixrow';
      const lbl = document.createElement('span');
      lbl.className = 'mixlbl';
      lbl.textContent = ch.n;
      const rng = document.createElement('input');
      rng.type = 'range';
      rng.min = '0'; rng.max = '100'; rng.step = '1';
      rng.value = String(Math.round(Mixer.get(ch.id) * 100));
      rng.className = 'mixslider';
      const pct = document.createElement('span');
      pct.className = 'mixpct';
      pct.textContent = rng.value + '%';
      rng.addEventListener('input', () => {
        Mixer.set(ch.id, rng.value / 100);
        pct.textContent = rng.value + '%';
      });
      rng.addEventListener('mousedown', ev => ev.stopPropagation());
      row.appendChild(lbl); row.appendChild(rng); row.appendChild(pct);
      panel.appendChild(row);
    });

    box.addEventListener('mousedown', ev => {
      ev.stopPropagation();
      if (window.Snd) window.Snd.click();
      const on = panel.style.display === 'none';
      panel.style.display = on ? 'flex' : 'none';
      if (on) this.position();
    });
    document.addEventListener('mousedown', ev => {
      if (panel.style.display === 'none') return;
      if (ev.target === box || box.contains(ev.target) || panel.contains(ev.target)) return;
      panel.style.display = 'none';
    });
    window.addEventListener('resize', () => { if (panel.style.display !== 'none') this.position(); });
  },
  position() {
    if (!this.box || !this.panel) return;
    const r = this.box.getBoundingClientRect();
    const pw = this.panel.offsetWidth, ph = this.panel.offsetHeight;
    this.panel.style.left = Math.max(4, r.right - pw) + 'px';
    this.panel.style.top = Math.max(4, r.top - ph - 6) + 'px';
  }
};
window.MixerUI = MixerUI;
