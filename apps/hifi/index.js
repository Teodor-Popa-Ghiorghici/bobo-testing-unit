import { createWindow, raise } from '../../kernel/wm.js';
import { Snd } from '../../kernel/snd.js';
import { Cos } from '../../kernel/cos.js';
import { fs as vfs } from '../../kernel/vfs.js';
import { HIFI_DISCS, HFN, HFP, hifiPress, hifiTags } from './discs.js';

export default {
  id: 'hifi',
  title: 'HIFI',
  width: 320,
  height: 520,
  resizable: false,
  mount(root, _ctx) {
  const body = root;
      const wrap = document.createElement('div');
      wrap.className = 'gamepane hifipane';
      const cv = document.createElement('canvas');
      cv.width = 480; cv.height = 386;
      cv.className = 'gamecv hificv';
      cv.tabIndex = 0;
      wrap.appendChild(cv);

      /* the cassette slot: a file input nobody ever sees */
      const pick = document.createElement('input');
      pick.type = 'file'; pick.accept = 'audio/*'; pick.multiple = true; pick.style.display = 'none';
      const pickArt = document.createElement('input');
      pickArt.type = 'file'; pickArt.accept = 'image/jpeg,image/png,image/*'; pickArt.style.display = 'none';
      wrap.appendChild(pick); wrap.appendChild(pickArt);

      const bar = document.createElement('div');
      bar.className = 'appbar';
      const mk = t => { const b = document.createElement('button'); b.className = 'appbtn'; b.textContent = t; bar.appendChild(b); return b; };
      const bLoad = mk('LOAD'), bArt = mk('LABEL'), bSave = mk('SAVE'), bFlat = mk('FLAT');
      const info = document.createElement('span'); info.className = 'godword';
      bar.appendChild(info);
      body.appendChild(wrap); body.appendChild(bar);

      const g = cv.getContext('2d');
      if (!g) { info.textContent = 'NO CANVAS.'; return; }
      g.imageSmoothingEnabled = false;

      /* ---- the signal path ------------------------------------------------
         Everything below is a real node. The A/B button is the only thing
         that lies, and it lies by rerouting rather than by pretending. */
      Snd.wake();
      const ctx = Snd.ctx;
      if (!ctx) { info.textContent = 'NO AUDIO ON THIS MACHINE.'; return; }

      const EQ_BANDS = [
        { f: 80,    type: 'lowshelf',  label: '80' },
        { f: 160,   type: 'peaking',   label: '160', q: 1.1 },
        { f: 320,   type: 'peaking',   label: '320', q: 1.1 },
        { f: 640,   type: 'peaking',   label: '640', q: 1.1 },
        { f: 1300,  type: 'peaking',   label: '1k3', q: 1.1 },
        { f: 2600,  type: 'peaking',   label: '2k6', q: 1.1 },
        { f: 5200,  type: 'peaking',   label: '5k2', q: 1.1 },
        { f: 10000, type: 'highshelf', label: '10k' }
      ];
      const ROOMS = ['DRY', 'BOOTH', 'ROOM', 'HALL', 'PLATE'];

      const N = {};                                   /* every node, by name */
      N.pre    = ctx.createGain();
      N.join   = ctx.createGain();                    /* where EQ and bypass meet */
      N.eq = EQ_BANDS.map(b => {
        const f = ctx.createBiquadFilter();
        f.type = b.type; f.frequency.value = b.f; f.gain.value = 0;
        if (b.q) f.Q.value = b.q;
        return f;
      });
      for (let i = 0; i < N.eq.length - 1; i++) N.eq[i].connect(N.eq[i + 1]);
      N.eq[N.eq.length - 1].connect(N.join);

      N.bass  = ctx.createBiquadFilter(); N.bass.type = 'lowshelf';  N.bass.frequency.value = 90;  N.bass.gain.value = 0;
      N.loudL = ctx.createBiquadFilter(); N.loudL.type = 'lowshelf';  N.loudL.frequency.value = 120; N.loudL.gain.value = 0;
      N.loudH = ctx.createBiquadFilter(); N.loudH.type = 'highshelf'; N.loudH.frequency.value = 8000; N.loudH.gain.value = 0;
      N.join.connect(N.bass); N.bass.connect(N.loudL); N.loudL.connect(N.loudH);

      /* stereo width as a mid/side matrix: mid straight through, side scaled
         and put back in antiphase. Width 0 is mono, 1 is as recorded. */
      N.split = ctx.createChannelSplitter(2);
      N.midA = ctx.createGain(); N.midA.gain.value = 0.5;
      N.midB = ctx.createGain(); N.midB.gain.value = 0.5;
      N.sidA = ctx.createGain(); N.sidA.gain.value = 0.5;
      N.sidB = ctx.createGain(); N.sidB.gain.value = -0.5;
      N.mid  = ctx.createGain(); N.side = ctx.createGain();
      N.sidePos = ctx.createGain(); N.sidePos.gain.value = 1;
      N.sideNeg = ctx.createGain(); N.sideNeg.gain.value = -1;
      N.outL = ctx.createGain(); N.outR = ctx.createGain();
      N.merge = ctx.createChannelMerger(2);
      N.loudH.connect(N.split);
      N.split.connect(N.midA, 0); N.split.connect(N.midB, 1);
      N.split.connect(N.sidA, 0); N.split.connect(N.sidB, 1);
      N.midA.connect(N.mid); N.midB.connect(N.mid);
      N.sidA.connect(N.side); N.sidB.connect(N.side);
      N.side.connect(N.sidePos); N.side.connect(N.sideNeg);
      N.mid.connect(N.outL); N.sidePos.connect(N.outL);
      N.mid.connect(N.outR); N.sideNeg.connect(N.outR);
      N.outL.connect(N.merge, 0, 0); N.outR.connect(N.merge, 0, 1);

      N.pan = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      N.merge.connect(N.pan);

      N.conv = ctx.createConvolver();
      N.wet  = ctx.createGain(); N.wet.gain.value = 0;
      N.dry  = ctx.createGain(); N.dry.gain.value = 1;
      N.master = ctx.createGain(); N.master.gain.value = 0.7;
      N.pan.connect(N.dry); N.dry.connect(N.master);
      N.pan.connect(N.conv); N.conv.connect(N.wet); N.wet.connect(N.master);

      /* the meters tap the master, after everything, which is what a meter
         on a real face is looking at */
      N.an = ctx.createAnalyser(); N.an.fftSize = 2048; N.an.smoothingTimeConstant = 0.75;
      N.mSplit = ctx.createChannelSplitter(2);
      N.anL = ctx.createAnalyser(); N.anL.fftSize = 1024; N.anL.smoothingTimeConstant = 0;
      N.anR = ctx.createAnalyser(); N.anR.fftSize = 1024; N.anR.smoothingTimeConstant = 0;
      N.master.connect(N.an);
      N.master.connect(N.mSplit);
      N.mSplit.connect(N.anL, 0); N.mSplit.connect(N.anR, 1);
      N.master.connect(ctx.destination);

      /* the aesthetic layer: surface noise. It joins at the master, which is
         where the meters are listening, so it reads on the VU and pulls the
         phase meter apart exactly as real surface noise would. */
      N.texG = ctx.createGain(); N.texG.gain.value = 0; N.texG.connect(N.master);
      let texSrc = null;

      /* a room, made out of noise that decays */
      function impulse(secs, decay, bright) {
        const n = Math.max(1, Math.floor(ctx.sampleRate * secs));
        const b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const d = b.getChannelData(c);
          let lp = 0;
          for (let i = 0; i < n; i++) {
            const e = Math.pow(1 - i / n, decay);
            const white = Math.random() * 2 - 1;
            lp += (white - lp) * bright;                     /* darker tails sound like rooms */
            d[i] = lp * e;
          }
        }
        return b;
      }
      const IRS = {
        DRY:   null,
        BOOTH: impulse(0.28, 3.2, 0.55),
        ROOM:  impulse(0.85, 2.6, 0.36),
        HALL:  impulse(2.40, 2.0, 0.22),
        PLATE: impulse(1.60, 1.4, 0.72)
      };
      N.conv.buffer = IRS.ROOM;

      function surfaceNoise(kind) {
        if (texSrc) { try { texSrc.stop(); } catch (e) {} texSrc.disconnect(); texSrc = null; }
        if (kind === 'off') return;
        const secs = 4, n = ctx.sampleRate * secs;
        const b = ctx.createBuffer(2, n, ctx.sampleRate);
        for (let c = 0; c < 2; c++) {
          const d = b.getChannelData(c);
          if (kind === 'hiss') { let lp = 0; for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.42; d[i] = lp * 0.5; } }
          else {
            for (let i = 0; i < n; i++) d[i] = 0;
            const pops = Math.floor(secs * 42);
            for (let k = 0; k < pops; k++) {
              const at = Math.floor(Math.random() * (n - 400));
              const amp = (0.15 + Math.random() * 0.85) * (Math.random() < 0.08 ? 1 : 0.28);
              const len = 40 + Math.floor(Math.random() * 260);
              for (let i = 0; i < len; i++) d[at + i] += (Math.random() * 2 - 1) * amp * Math.pow(1 - i / len, 3);
            }
          }
        }
        const s = ctx.createBufferSource(); s.buffer = b; s.loop = true;
        s.connect(N.texG); s.start();
        texSrc = s;
      }

      /* ---- state ---------------------------------------------------------- */
      /* declared up here because the disc presses start before the loop does
         and need to know whether the window is still open */
      let alive = true, raf = null, last = 0;
      const SAVE = 'templeos.stack.v1';
      const S = {
        list: [], ix: -1, playing: false, voices: [],
        pos: 0, dur: 0, seekBase: 0, startedAt: 0,
        vol: 0.7, pre: 0, bal: 0, width: 1, speed: 1, room: 0, roomIx: 2,
        eqOn: true, bassBoost: false, loud: false, mono: false,
        texture: 'off', scan: true, style: 0, repeat: 0, shuffle: false,
        tray: 0, trayDir: 0, disc: 0, spin: 0, sheen: 0, touched: false,
        vuL: 0, vuR: 0, vuLv: 0, vuRv: 0, peakL: 0, peakR: 0, corr: 0,
        glow: 0, marquee: 0, drag: null, note: '', noteT: 0, loading: 0, xfaded: false,
        filter: '', sort: 0, scroll: 0
      };
      const eqGains = EQ_BANDS.map(() => 0);
      const say = t => { S.note = t; S.noteT = 3.2; };

      const store = () => { try { return JSON.parse(localStorage.getItem(SAVE) || '{}'); } catch (e) { return {}; } };
      const keyOf = t => (t.builtin ? 'b:' : 'f:') + t.name;

      function applyEQ() {
        N.eq.forEach((f, i) => f.gain.setTargetAtTime(eqGains[i], ctx.currentTime, 0.02));
      }
      function applyAll() {
        const t = ctx.currentTime;
        N.pre.gain.setTargetAtTime(Math.pow(10, S.pre / 20), t, 0.02);
        N.master.gain.setTargetAtTime(CRT.on ? S.vol : 0, t, 0.03);
        if (N.pan.pan) N.pan.pan.setTargetAtTime(S.bal, t, 0.02);
        const w = S.mono ? 0 : S.width;
        N.sidePos.gain.setTargetAtTime(w, t, 0.02);
        N.sideNeg.gain.setTargetAtTime(-w, t, 0.02);
        N.bass.gain.setTargetAtTime(S.bassBoost ? 7.5 : 0, t, 0.03);
        /* Fletcher-Munson in spirit: the quieter it is set, the more the ends
           are lifted, because that is where the ear gives up first */
        const lift = S.loud ? (1 - Math.min(1, S.vol)) * 9 + 2.5 : 0;
        N.loudL.gain.setTargetAtTime(lift, t, 0.03);
        N.loudH.gain.setTargetAtTime(lift * 0.65, t, 0.03);
        N.wet.gain.setTargetAtTime(S.roomIx === 0 ? 0 : S.room, t, 0.04);
        N.dry.gain.setTargetAtTime(S.roomIx === 0 ? 1 : 1 - S.room * 0.35, t, 0.04);
        N.texG.gain.setTargetAtTime(S.texture === 'off' ? 0 : (S.texture === 'hiss' ? 0.016 : 0.026), t, 0.05);
        S.voices.forEach(v => { try { v.src.playbackRate.setTargetAtTime(S.speed, t, 0.05); } catch (e) {} });
      }
      function routeEQ() {
        try { N.pre.disconnect(); } catch (e) {}
        if (S.eqOn) N.pre.connect(N.eq[0]); else N.pre.connect(N.join);
      }
      routeEQ();

      /* ---- the playlist ---------------------------------------------------- */
      /* peaks: one min/max pair per bucket, so the scrubber has a shape to
         draw the instant a track lands rather than after it has been played */
      function analysePeaks(buf, buckets) {
        const out = new Float32Array(buckets * 2);
        const ch = buf.numberOfChannels > 1 ? [buf.getChannelData(0), buf.getChannelData(1)] : [buf.getChannelData(0)];
        const per = Math.max(1, Math.floor(buf.length / buckets));
        for (let b = 0; b < buckets; b++) {
          let lo = 0, hi = 0;
          const s0 = b * per, s1 = Math.min(buf.length, s0 + per);
          for (let i = s0; i < s1; i += 2) {
            for (let c = 0; c < ch.length; c++) {
              const v = ch[c][i];
              if (v < lo) lo = v; if (v > hi) hi = v;
            }
          }
          out[b * 2] = lo; out[b * 2 + 1] = hi;
        }
        return out;
      }

      /* album art nobody drew: a deterministic abstraction per title, in the
         disc's own tint, so every record looks like itself every time */
      function makeArt(seedStr, tint) {
        const c = document.createElement('canvas'); c.width = 96; c.height = 96;
        const q = c.getContext('2d');
        let h = 2166136261;
        for (let i = 0; i < seedStr.length; i++) { h ^= seedStr.charCodeAt(i); h = Math.imul(h, 16777619); }
        const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
        const inks = { green: [HFP.green, HFP.lcdOn], cyan: [HFP.cyan, HFP.white], amber: [HFP.amber, HFP.red],
                       white: [HFP.white, HFP.brushHi], red: [HFP.red, HFP.amber] }[tint] || [HFP.amber, HFP.white];
        q.fillStyle = HFP.black; q.fillRect(0, 0, 96, 96);
        q.fillStyle = inks[0]; q.globalAlpha = 0.28; q.fillRect(0, 0, 96, 96); q.globalAlpha = 1;
        for (let i = 0; i < 14; i++) {
          q.fillStyle = i % 2 ? inks[1] : inks[0];
          const m = Math.floor(rnd() * 4);
          if (m === 0) q.fillRect(Math.floor(rnd() * 80), Math.floor(rnd() * 80), 8 + Math.floor(rnd() * 32), 6 + Math.floor(rnd() * 20));
          else if (m === 1) { q.beginPath(); q.arc(48, 48, 10 + i * 5, rnd() * 6, rnd() * 6 + 1.6); q.lineWidth = 3 + Math.floor(rnd() * 6); q.strokeStyle = q.fillStyle; q.stroke(); }
          else if (m === 2) for (let k = 0; k < 14; k++) q.fillRect(Math.floor(rnd() * 92), Math.floor(rnd() * 92), 4, 4);
          else q.fillRect(0, Math.floor(rnd() * 88), 96, 5);
        }
        return c;
      }

      function addTrack(t) {
        const saved = store()[keyOf(t)];
        t.eq = saved && saved.eq ? saved.eq.slice(0, EQ_BANDS.length) : EQ_BANDS.map(() => 0);
        /* built-ins carry a sleeve number so they land in the order they are
           declared, however the offline renders happen to finish */
        if (t.builtin) {
          let at = S.list.length;
          for (let i = 0; i < S.list.length; i++) {
            if (!S.list[i].builtin || S.list[i].sleeve > t.sleeve) { at = i; break; }
          }
          S.list.splice(at, 0, t);
          if (S.ix >= at) S.ix++;
        } else S.list.push(t);
        return t;
      }

      /* the five that come in the box, pressed one after another: five
         offline renders at once just makes all five of them late */
      S.loading = HIFI_DISCS.length;
      (function pressNext(i) {
        if (i >= HIFI_DISCS.length || !alive) return;
        const spec = HIFI_DISCS[i];
        hifiPress(spec, ctx.sampleRate).then(buf => {
          S.loading--;
          if (buf) {
            addTrack({ name: spec.name, artist: spec.artist, buf: buf, builtin: true, sleeve: i,
                       tint: spec.tint, art: makeArt(spec.name, spec.tint),
                       peaks: analysePeaks(buf, 480), dur: buf.duration });
            /* until somebody presses something, the machine sits on disc one */
            if (!S.touched) { S.ix = 0; loadDisc(0, false); }
          }
          setTimeout(() => pressNext(i + 1), 30);
        }).catch(() => { S.loading--; setTimeout(() => pressNext(i + 1), 30); });
      })(0);

      /* ---- the library on disk ---------------------------------------------
         A shelf of two hundred records is the case this has to survive, so
         nothing heavy is kept in the settings drawer: the audio lives in the
         vault under a key, and the record card carries only what the list and
         the scrubber need to draw before a note has been played. Decoding
         happens the first time you actually put a disc on. */
      const LIB_KEY = 'templeos.stack.lib.v1';
      const P64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      function peaksPack(p) {
        /* 240 buckets of min/max at one byte each: a shape, not a signal */
        const n = 240, out = new Uint8Array(n * 2), step = p.length / 2 / n;
        for (let i = 0; i < n; i++) {
          let lo = 0, hi = 0;
          for (let k = Math.floor(i * step); k < Math.floor((i + 1) * step) && k * 2 + 1 < p.length; k++) {
            if (p[k * 2] < lo) lo = p[k * 2];
            if (p[k * 2 + 1] > hi) hi = p[k * 2 + 1];
          }
          out[i * 2] = Math.round(Math.max(-1, lo) * 127) + 128;
          out[i * 2 + 1] = Math.round(Math.min(1, hi) * 127) + 128;
        }
        let s = '';
        for (let i = 0; i < out.length; i += 3) {
          const a = out[i], b = out[i + 1] || 0, c = out[i + 2] || 0;
          s += P64[a >> 2] + P64[((a & 3) << 4) | (b >> 4)] + P64[((b & 15) << 2) | (c >> 6)] + P64[c & 63];
        }
        return s;
      }
      function peaksUnpack(s) {
        if (!s) return null;
        const bytes = [];
        for (let i = 0; i < s.length; i += 4) {
          const a = P64.indexOf(s[i]), b = P64.indexOf(s[i + 1]), c = P64.indexOf(s[i + 2]), d = P64.indexOf(s[i + 3]);
          bytes.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
        }
        const n = 240, out = new Float32Array(n * 2);
        for (let i = 0; i < n * 2 && i < bytes.length; i++) out[i] = (bytes[i] - 128) / 127;
        return out;
      }
      function saveLibrary() {
        const recs = S.list.filter(t => !t.builtin && t.vault).map(t => ({
          name: t.name, artist: t.artist, vault: t.vault, tint: t.tint,
          dur: t.dur, eq: t.eq, art: t.artData || null, pk: t.pk || null
        }));
        try { localStorage.setItem(LIB_KEY, JSON.stringify(recs)); }
        catch (e) { say('THE SHELF IS FULL. NEWER DISCS MAY NOT COME BACK.'); }
      }
      async function loadLibrary() {
        let recs = [];
        try { recs = JSON.parse(localStorage.getItem(LIB_KEY) || '[]'); } catch (e) { return; }
        if (!recs.length) return;
        S.loading += recs.length;
        for (const r of recs) {
          S.loading--;
          if (!alive) return;
          const t = { name: r.name, artist: r.artist, vault: r.vault, tint: r.tint || 'amber',
                      dur: r.dur || 0, buf: null, builtin: false, pk: r.pk,
                      peaks: peaksUnpack(r.pk), art: null, artData: r.art || null };
          if (r.art) { const im = new Image(); im.onload = () => {
            const c = document.createElement('canvas'); c.width = 96; c.height = 96;
            c.getContext('2d').drawImage(im, 0, 0, 96, 96); t.art = c; }; im.src = r.art; }
          else t.art = makeArt(t.name, t.tint);
          const saved = store()[keyOf(t)];
          t.eq = (r.eq || (saved && saved.eq) || EQ_BANDS.map(() => 0)).slice(0, EQ_BANDS.length);
          S.list.push(t);
        }
        say(recs.length + ' DISC' + (recs.length > 1 ? 'S' : '') + ' BACK ON THE SHELF.');
      }
      /* a disc off the shelf is only decoded when somebody plays it */
      async function ensureBuf(t) {
        if (!t || t.buf) return t && t.buf;
        if (t.decoding) return null;
        t.decoding = true;
        try {
          const blob = await Vault.get(t.vault);
          if (!blob) { t.decoding = false; t.missing = true; say(t.name + ' IS NOT ON THE DISK ANY MORE.'); return null; }
          const ab = await blob.arrayBuffer();
          const buf = await new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej));
          t.buf = buf; t.dur = buf.duration;
          if (!t.peaks) { t.peaks = analysePeaks(buf, 480); t.pk = peaksPack(t.peaks); saveLibrary(); }
        } catch (e) { t.missing = true; say('COULD NOT READ ' + t.name); }
        t.decoding = false;
        return t.buf;
      }
      function forget(i) {
        const t = S.list[i];
        if (!t || t.builtin) { say('THE PRESSED DISCS DO NOT COME OFF THE SHELF.'); return; }
        if (t.vault) Vault.del(t.vault);
        S.list.splice(i, 1);
        if (S.ix === i) { stop(); S.ix = Math.min(i, S.list.length - 1); if (S.ix >= 0) loadDisc(S.ix, false); }
        else if (S.ix > i) S.ix--;
        saveLibrary();
        say('REMOVED ' + t.name);
      }

      /* ---- what the list is showing right now -------------------------------
         Two hundred discs will not fit in nine rows, so the panel shows a view
         of the shelf: filtered by the search box, ordered by whichever column
         you asked for, and scrolled. Everything that acts on "a row" acts on
         the real index this view maps back to. */
      function view() {
        const q = S.filter.trim().toUpperCase();
        let idx = S.list.map((t, i) => i);
        if (q) idx = idx.filter(i => (S.list[i].name + ' ' + S.list[i].artist).toUpperCase().indexOf(q) >= 0);
        const by = S.sort;
        if (by === 1) idx.sort((a, b) => S.list[a].name.localeCompare(S.list[b].name));
        else if (by === 2) idx.sort((a, b) => S.list[a].artist.localeCompare(S.list[b].artist) || S.list[a].name.localeCompare(S.list[b].name));
        else if (by === 3) idx.sort((a, b) => (S.list[a].dur || 0) - (S.list[b].dur || 0));
        return idx;
      }

      /* ---- importing ------------------------------------------------------- */
      const TINTS = ['green', 'cyan', 'amber', 'white', 'red'];
      function importFiles(files) {
        const arr = [].slice.call(files || []).filter(f => /^audio\//.test(f.type) || /\.(mp3|ogg|wav|m4a|flac|aac|opus|webm)$/i.test(f.name));
        if (!arr.length) { say('NOTHING IN THERE THIS MACHINE CAN PLAY.'); return; }
        S.trayDir = 1;                                   /* the tray comes out to receive it */
        say('READING ' + arr.length + ' FILE' + (arr.length > 1 ? 'S' : '') + '...');
        S.loading += arr.length;
        arr.forEach(f => {
          const fr = new FileReader();
          fr.onload = async () => {
            const ab = fr.result;
            const tags = hifiTags(ab.slice(0, Math.min(ab.byteLength, 1200000)));
            ctx.decodeAudioData(ab.slice(0), async buf => {
              S.loading--;
              const nm = (tags.title || f.name.replace(/\.[^.]+$/, '')).toUpperCase().slice(0, 40);
              const tint = TINTS[S.list.length % TINTS.length];
              const peaks = analysePeaks(buf, 480);
              const t = addTrack({ name: nm, artist: (tags.artist || 'IMPORTED').toUpperCase().slice(0, 34),
                                   buf: buf, builtin: false, tint: tint, art: makeArt(nm + f.size, tint),
                                   peaks: peaks, pk: peaksPack(peaks), dur: buf.duration });
              /* the file goes to the vault so the disc is still on the shelf
                 after the machine has been switched off */
              t.vault = await Vault.put(f);
              if (!t.vault) say('NO DISK — ' + t.name + ' LASTS UNTIL RELOAD.');
              if (tags.art) {
                const url = URL.createObjectURL(tags.art), im = new Image();
                im.onload = () => { const c = document.createElement('canvas'); c.width = 96; c.height = 96;
                  c.getContext('2d').drawImage(im, 0, 0, 96, 96); t.art = c; t.artData = c.toDataURL('image/jpeg', 0.7);
                  URL.revokeObjectURL(url); saveLibrary(); };
                im.onerror = () => URL.revokeObjectURL(url);
                im.src = url;
              }
              saveLibrary();
              say('LOADED ' + t.name);
              S.trayDir = -1;
              if (S.ix < 0) { S.ix = S.list.indexOf(t); loadDisc(S.ix, false); }
            }, () => { S.loading--; say('COULD NOT DECODE ' + f.name.toUpperCase()); S.trayDir = -1; });
          };
          fr.onerror = () => { S.loading--; say('COULD NOT READ ' + f.name.toUpperCase()); S.trayDir = -1; };
          fr.readAsArrayBuffer(f);
        });
      }

      /* ---- transport -------------------------------------------------------- */
      function killVoice(v, fade) {
        if (!v) return;
        const t = ctx.currentTime;
        try {
          v.gain.gain.cancelScheduledValues(t);
          v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
          v.gain.gain.linearRampToValueAtTime(0, t + fade);
          v.src.stop(t + fade + 0.02);
        } catch (e) {}
        setTimeout(() => { try { v.src.disconnect(); v.gain.disconnect(); } catch (e) {} }, (fade + 0.2) * 1000);
        const i = S.voices.indexOf(v); if (i >= 0) S.voices.splice(i, 1);
      }
      function startVoice(track, offset, fade) {
        const src = ctx.createBufferSource();
        src.buffer = track.buf;
        src.playbackRate.value = S.speed;
        const gn = ctx.createGain();
        gn.gain.setValueAtTime(fade > 0 ? 0.0001 : 1, ctx.currentTime);
        if (fade > 0) gn.gain.linearRampToValueAtTime(1, ctx.currentTime + fade);
        src.connect(gn); gn.connect(N.pre);
        src.start(ctx.currentTime, Math.max(0, Math.min(track.dur - 0.02, offset)));
        const v = { src: src, gain: gn, track: track, at: ctx.currentTime, off: offset, ended: false };
        src.onended = () => { v.ended = true; };
        S.voices.push(v);
        return v;
      }
      function curVoice() { return S.voices.length ? S.voices[S.voices.length - 1] : null; }

      function loadDisc(i, autoplay) {
        if (i < 0 || i >= S.list.length) return;
        const wasPlaying = S.playing || autoplay;
        S.voices.slice().forEach(v => killVoice(v, 0.12));
        S.ix = i;
        const t = S.list[i];
        if (!t.buf && !t.decoding) ensureBuf(t).then(() => { if (S.list[S.ix] === t) S.dur = t.dur; });
        S.dur = t.dur; S.seekBase = 0; S.pos = 0;
        for (let b = 0; b < EQ_BANDS.length; b++) eqGains[b] = t.eq[b] || 0;
        applyEQ();
        S.disc = 1;                                     /* the lift-and-drop */
        S.marquee = 0;
        if (wasPlaying) { setTimeout(() => play(), 260); } else S.playing = false;
      }
      function play() {
        const t = S.list[S.ix]; if (!t) return;
        if (ctx.state === 'suspended') ctx.resume();
        if (!t.buf) {                       /* off the shelf: read it, then start */
          if (!t.decoding) { say('READING ' + t.name + '...'); ensureBuf(t).then(b => { if (b && S.list[S.ix] === t) { S.dur = t.dur; play(); } }); }
          S.playing = false; return;
        }
        S.voices.slice().forEach(v => killVoice(v, 0.05));
        const v = startVoice(t, S.seekBase, 0.04);
        S.startedAt = ctx.currentTime; S.playing = true;
        S.xfaded = false;
        return v;
      }
      function pause() {
        S.seekBase = S.pos;
        S.voices.slice().forEach(v => killVoice(v, 0.05));
        S.playing = false;
      }
      function toggle() { if (!S.list.length) return; S.playing ? pause() : play(); }
      function stop() { S.voices.slice().forEach(v => killVoice(v, 0.05)); S.playing = false; S.seekBase = 0; S.pos = 0; }
      function seek(t) {
        if (!S.list.length) return;
        S.seekBase = Math.max(0, Math.min(S.dur - 0.05, t));
        S.pos = S.seekBase;
        if (S.playing) play(); 
      }
      function nextIx() {
        if (!S.list.length) return -1;
        if (S.shuffle) { if (S.list.length === 1) return S.ix; let n; do { n = Math.floor(Math.random() * S.list.length); } while (n === S.ix); return n; }
        return (S.ix + 1) % S.list.length;
      }
      function skip(d) {
        if (!S.list.length) return;
        const n = d > 0 ? nextIx() : (S.ix - 1 + S.list.length) % S.list.length;
        loadDisc(n, S.playing);
      }

      /* ---- drawing the face -------------------------------------------------
         Everything is fillRect where it can be. The knobs and the disc are the
         only arcs, and the disc steps in twenty-fourths of a turn so it strobes
         like a wheel under a striplight instead of gliding. */
      let hits = [];
      const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); };
      const TXT = (t, x, y, c, size, align) => {
        g.fillStyle = c; g.font = (size || 8) + 'px monospace';
        g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
        g.fillText(String(t), x | 0, y | 0); g.textAlign = 'left';
      };
      function bevel(x, y, w, h, face, lit, dark) {
        R(x, y, w, h, face);
        R(x, y, w, 1, lit); R(x, y, 1, h, lit);
        R(x, y + h - 1, w, 1, dark); R(x + w - 1, y, 1, h, dark);
      }
      function brushed(x, y, w, h) {
        bevel(x, y, w, h, HFP.panel, HFP.panelHi, HFP.black);
        for (let i = 2; i < h - 2; i += 3) R(x + 2, y + i, w - 4, 1, i % 6 ? HFP.case_ : HFP.panelHi);
      }
      function screw(x, y) {
        R(x - 2, y - 2, 5, 5, HFP.screw);
        R(x - 1, y - 1, 3, 3, HFP.brush);
        R(x - 1, y, 3, 1, HFP.black);
      }
      function unit(x, y, w, h, title) {
        bevel(x, y, w, h, HFP.case_, HFP.panelHi, HFP.black);
        brushed(x + 3, y + 3, w - 6, h - 6);
        screw(x + 8, y + 9); screw(x + w - 8, y + 9);
        screw(x + 8, y + h - 9); screw(x + w - 8, y + h - 9);
        if (title) TXT(title, x + 16, y + 12, HFP.brushHi, 7);
      }
      function led(x, y, on, col) {
        R(x - 2, y - 2, 5, 5, HFP.black);
        R(x - 1, y - 1, 3, 3, on ? col : HFP.screw);
        if (on) { g.globalAlpha = 0.35; R(x - 2, y - 2, 5, 5, col); g.globalAlpha = 1; }
      }
      function button(id, x, y, w, h, label, active, col) {
        bevel(x, y, w, h, active ? HFP.brush : HFP.case_, active ? HFP.brushHi : HFP.panel, HFP.black);
        TXT(label, x + w / 2, y + h / 2 + 3, active ? HFP.black : HFP.brushHi, 7, 'center');
        hits.push({ k: 'btn', id: id, x: x, y: y, w: w, h: h });
      }
      /* a pot with a tick ring, a detent at the middle and a dot that glows */
      function knob(id, cx, cy, r, frac, label, val, tint) {
        const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, a = a0 + (a1 - a0) * frac;
        for (let i = 0; i <= 10; i++) {
          const ta = a0 + (a1 - a0) * (i / 10), tr = r + 3;
          const on = (i / 10) <= frac + 0.001;
          R(cx + Math.cos(ta) * tr - 1, cy + Math.sin(ta) * tr - 1, 2, 2, on ? (tint || HFP.amber) : HFP.screw);
        }
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fillStyle = HFP.black; g.fill();
        g.beginPath(); g.arc(cx, cy, r - 1, 0, Math.PI * 2); g.fillStyle = HFP.brush; g.fill();
        g.beginPath(); g.arc(cx, cy, r - 3, 0, Math.PI * 2); g.fillStyle = HFP.panel; g.fill();
        for (let i = -r + 4; i < r - 3; i += 3) R(cx - r + 4, cy + i, (r - 4) * 2, 1, HFP.case_);
        const dx = Math.cos(a), dy = Math.sin(a);
        R(cx + dx * (r - 6) - 1, cy + dy * (r - 6) - 1, 3, 3, tint || HFP.amber);
        R(cx + dx * (r - 3) - 1, cy + dy * (r - 3) - 1, 2, 2, HFP.white);
        TXT(label, cx, cy + r + 11, HFP.brushHi, 7, 'center');
        if (val != null) TXT(val, cx, cy + r + 19, tint || HFP.amber, 7, 'center');
        hits.push({ k: 'knob', id: id, x: cx - r - 4, y: cy - r - 4, w: (r + 4) * 2, h: (r + 4) * 2, cx: cx, cy: cy });
      }

      /* seven segments, because a proper transport does not use a webfont */
      const SEG = { '0':0x3f,'1':0x06,'2':0x5b,'3':0x4f,'4':0x66,'5':0x6d,'6':0x7d,'7':0x07,
                    '8':0x7f,'9':0x6f,'-':0x40,' ':0x00,':':0x00 };
      function digit(ch, x, y, w, h, on, off) {
        const m = SEG[ch] == null ? 0 : SEG[ch], t = 2;
        const seg = [[x + t, y, w - 2 * t, t], [x + w - t, y + t, t, (h - 3 * t) / 2 + t / 2],
                     [x + w - t, y + h / 2 + t / 2, t, (h - 3 * t) / 2], [x + t, y + h - t, w - 2 * t, t],
                     [x, y + h / 2 + t / 2, t, (h - 3 * t) / 2], [x, y + t, t, (h - 3 * t) / 2 + t / 2],
                     [x + t, y + h / 2 - t / 2, w - 2 * t, t]];
        for (let i = 0; i < 7; i++) R(seg[i][0], seg[i][1], seg[i][2], seg[i][3], (m >> i) & 1 ? on : off);
        if (ch === ':') { R(x + w / 2 - 1, y + h * 0.28, 2, 2, on); R(x + w / 2 - 1, y + h * 0.66, 2, 2, on); }
      }
      const mmss = s => {
        if (!isFinite(s) || s < 0) s = 0;
        const m = Math.floor(s / 60), q = Math.floor(s % 60);
        return (m < 10 ? '0' : '') + m + ':' + (q < 10 ? '0' : '') + q;
      };

      /* ---- the disc ---------------------------------------------------------- */
      function drawDisc(cx, cy, rad, amp, bass) {
        const lift = S.disc;                              /* 1 = just changed, 0 = seated */
        const yy = cy - Math.sin(Math.min(1, lift) * Math.PI) * 14;
        /* the well it sits in */
        g.beginPath(); g.arc(cx, cy + 3, rad + 6, 0, Math.PI * 2); g.fillStyle = HFP.black; g.fill();
        R(cx - rad - 7, cy + 3, (rad + 7) * 2, rad + 10, HFP.black);
        const t = S.list[S.ix];
        const tint = { green: HFP.green, cyan: HFP.cyan, amber: HFP.amber, white: HFP.white, red: HFP.red }[t ? t.tint : 'amber'] || HFP.amber;

        /* radial spectrum, wrapped round the outside */
        if (S.style !== 2 && freq) {
          const bins = 64;
          for (let i = 0; i < bins; i++) {
            const f = freq[Math.floor(Math.pow(i / bins, 1.6) * 220) + 2] / 255;
            const a = (i / bins) * Math.PI * 2 - Math.PI / 2;
            const r0 = rad + 4, r1 = r0 + 2 + f * 13;
            for (let r = r0; r < r1; r += 2) {
              const px = cx + Math.cos(a) * r, py = yy + Math.sin(a) * r;
              R(px, py, 2, 2, r > r0 + (r1 - r0) * 0.7 ? HFP.white : tint);
            }
          }
        }
        /* the disc: stepped rotation, twenty-four positions to the turn */
        const stepA = Math.round(S.spin / (Math.PI * 2 / 24)) * (Math.PI * 2 / 24);
        g.save(); g.translate(cx, yy); g.rotate(stepA);
        g.beginPath(); g.arc(0, 0, rad, 0, Math.PI * 2); g.fillStyle = '#c8ccd4'; g.fill();
        /* data side: concentric rings, drawn as steps so they alias on purpose */
        for (let r = rad - 2; r > 16; r -= 3) {
          g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
          g.strokeStyle = r % 6 ? '#9aa0ad' : '#7b808c'; g.lineWidth = 1; g.stroke();
        }
        /* the sheen: one arc that sweeps, its width driven by how loud it is */
        const sw = 0.20 + amp * 0.85;
        g.globalAlpha = 0.16;
        g.beginPath(); g.arc(0, 0, rad * 0.60, S.sheen, S.sheen + sw);
        g.strokeStyle = '#ffffff'; g.lineWidth = rad * 0.80; g.stroke();
        g.globalAlpha = 0.34 + amp * 0.25;
        g.beginPath(); g.arc(0, 0, rad * 0.60, S.sheen + sw * 0.34, S.sheen + sw * 0.60);
        g.strokeStyle = '#ffffff'; g.lineWidth = rad * 0.82; g.stroke();
        g.globalAlpha = 1;
        /* prism edge, because a CD has one */
        g.beginPath(); g.arc(0, 0, rad - 1, S.sheen + sw, S.sheen + sw + 0.5);
        g.strokeStyle = 'rgba(120,255,200,0.55)'; g.lineWidth = 5; g.stroke();
        /* The art is printed on the disc, not stuck in the middle of it: it
           covers the whole face out to the rim and stops at the clamping
           ring, which is the one part of a disc that never carries ink. */
        if (t && t.art) {
          g.save();
          g.beginPath(); g.arc(0, 0, rad - 1, 0, Math.PI * 2);
          g.arc(0, 0, 11, 0, Math.PI * 2, true);            /* hole for the hub */
          g.clip('evenodd');
          g.drawImage(t.art, -rad, -rad, rad * 2, rad * 2);
          g.restore();
          /* a hint of the pressing still reads through the ink */
          g.globalAlpha = 0.16;
          for (let r = rad - 3; r > 13; r -= 4) {
            g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
            g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.stroke();
          }
          g.globalAlpha = 1;
        }
        /* the clamping ring and the hole */
        g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fillStyle = '#d7dbe2'; g.fill();
        g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.strokeStyle = '#8b909b'; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fillStyle = HFP.case_; g.fill();
        g.beginPath(); g.arc(0, 0, 4, 0, Math.PI * 2); g.fillStyle = HFP.black; g.fill();
        g.restore();
        /* the ring of light under it responds to bass */
        g.globalAlpha = 0.10 + bass * 0.5;
        g.beginPath(); g.arc(cx, cy + rad + 8, rad * 0.8, Math.PI, Math.PI * 2);
        g.fillStyle = tint; g.fill(); g.globalAlpha = 1;
      }

      /* ---- the tray ----------------------------------------------------------- */
      function drawTray(x, y, w, h) {
        bevel(x, y, w, h, HFP.black, HFP.case_, HFP.black);
        const open = S.tray;
        R(x + 2, y + 2, (w - 4) * open, h - 4, HFP.case_);
        if (open > 0.05) { R(x + 3, y + 4, (w - 6) * open, 2, HFP.brush);
          R(x + 3, y + h - 6, (w - 6) * open, 2, HFP.screw); }
        TXT(open > 0.5 ? 'DROP A FILE — OR PRESS LOAD DISC' : 'DISC TRAY', x + w / 2, y + h / 2 + 3,
            open > 0.5 ? HFP.amber : HFP.brush, 7, 'center');
        hits.push({ k: 'btn', id: 'tray', x: x, y: y, w: w, h: h });
      }

      /* ---- meters -------------------------------------------------------------
         The needle is a second-order thing with a spring and some friction, so
         it overshoots a transient and settles back. That lag is the whole
         reason an analogue meter reads as analogue. */
      function drawVU(x, y, w, h, val, peak, label) {
        bevel(x, y, w, h, HFP.lcd, HFP.black, HFP.panelHi);
        R(x + 2, y + 2, w - 4, h - 4, '#e8e2c8');                 /* the cream face */
        const cx = x + w / 2, cy = y + h - 6, rad = Math.min(w / 2 - 5, h - 16);
        for (let i = 0; i <= 10; i++) {
          const a = Math.PI * (1.20 + (i / 10) * 0.60);
          const hot = i > 7;
          R(cx + Math.cos(a) * rad - 1, cy + Math.sin(a) * rad - 1, 2, 2, hot ? '#c03020' : '#3a3630');
          if (i % 5 === 0) R(cx + Math.cos(a) * (rad - 4) - 1, cy + Math.sin(a) * (rad - 4) - 1, 2, 2, hot ? '#c03020' : '#3a3630');
        }
        TXT('VU', cx, y + h - 16, '#3a3630', 7, 'center');
        TXT(label, x + 4, y + 9, '#3a3630', 7);
        const a = Math.PI * (1.20 + Math.max(0, Math.min(1, val)) * 0.60);
        for (let r = 3; r < rad - 1; r++) R(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, '#201c18');
        R(cx - 2, cy - 2, 4, 4, '#201c18');
        const pa = Math.PI * (1.20 + Math.max(0, Math.min(1, peak)) * 0.60);
        R(cx + Math.cos(pa) * (rad - 1) - 1, cy + Math.sin(pa) * (rad - 1) - 1, 2, 2, '#c03020');
        if (val > 0.86) led(x + w - 7, y + 8, true, HFP.red);
      }

      function drawCorr(x, y, w, h) {
        bevel(x, y, w, h, HFP.black, HFP.case_, HFP.panelHi);
        TXT('PHASE', x + 4, y + 9, HFP.brushHi, 7);
        const bx = x + 4, bw = w - 8, by = y + 13, bh = 6;
        R(bx, by, bw, bh, HFP.case_);
        for (let i = 0; i <= 4; i++) R(bx + (bw - 1) * (i / 4), by - 2, 1, 2, HFP.brush);
        const p = (S.corr + 1) / 2;
        R(bx + Math.max(0, Math.min(bw - 3, (bw - 3) * p)), by, 3, bh, S.corr < -0.2 ? HFP.red : S.corr < 0.35 ? HFP.amber : HFP.green);
        TXT('-1', bx, by + bh + 8, HFP.brush, 7);
        TXT('+1', bx + bw, by + bh + 8, HFP.brush, 7, 'right');
        TXT(S.corr >= 0 ? '+' + S.corr.toFixed(2) : S.corr.toFixed(2), bx + bw / 2, by + bh + 8, HFP.cyan, 7, 'center');
      }

      /* ---- analyser ------------------------------------------------------------ */
      let freq = null, wave = null, waveL = null, waveR = null;
      function drawSpectrum(x, y, w, h) {
        R(x, y, w, h, HFP.black);
        for (let i = 0; i < w; i += 6) R(x + i, y, 1, h, '#0f1418');
        for (let i = 0; i < h; i += 6) R(x, y + i, w, 1, '#0f1418');
        if (!freq) return;
        const t = S.list[S.ix];
        const tint = { green: HFP.green, cyan: HFP.cyan, amber: HFP.amber, white: HFP.white, red: HFP.red }[t ? t.tint : 'amber'] || HFP.amber;
        const bars = 48, bw = Math.floor(w / bars);
        if (S.style === 0 || S.style === 1) {
          const mid = y + h / 2;
          for (let i = 0; i < bars; i++) {
            const lo = Math.floor(Math.pow(i / bars, 1.7) * 400) + 2;
            const hi = Math.max(lo + 1, Math.floor(Math.pow((i + 1) / bars, 1.7) * 400) + 2);
            let m = 0; for (let k = lo; k < hi && k < freq.length; k++) m = Math.max(m, freq[k]);
            const v = (m / 255) * (h / 2 - 2);
            const bx = x + i * bw + 1, ww = bw - 1;
            if (S.style === 0) {                       /* mirrored, top and bottom */
              for (let s = 0; s < v; s += 3) {
                const c = s > (h / 2) * 0.72 ? HFP.red : s > (h / 2) * 0.45 ? HFP.amber : tint;
                R(bx, mid - s - 2, ww, 2, c); R(bx, mid + s, ww, 2, c);
              }
              R(bx, mid - 1, ww, 1, HFP.case_);
            } else {                                   /* standing on the floor */
              for (let s = 0; s < v * 2; s += 3) {
                const c = s > h * 0.72 ? HFP.red : s > h * 0.45 ? HFP.amber : tint;
                R(bx, y + h - s - 3, ww, 2, c);
              }
            }
            /* peak hold: hangs, then falls */
            const pk = peakBar[i] = Math.max((peakBar[i] || 0) - 0.9, v);
            if (S.style === 0) { R(bx, mid - pk - 3, ww, 1, HFP.white); R(bx, mid + pk + 2, ww, 1, HFP.white); }
            else R(bx, y + h - pk * 2 - 4, ww, 1, HFP.white);
          }
        } else {                                       /* the scope, filling the pane */
          if (!wave) return;
          g.beginPath();
          for (let i = 0; i < w; i++) {
            const v = (wave[Math.floor(i / w * wave.length)] - 128) / 128;
            const py = y + h / 2 + v * (h / 2 - 3);
            if (i === 0) g.moveTo(x + i, py); else g.lineTo(x + i, py);
          }
          g.strokeStyle = tint; g.lineWidth = 2; g.stroke();
        }
      }
      const peakBar = [];

      function drawScope(x, y, w, h) {
        R(x, y, w, h, HFP.black);
        R(x, y + h / 2, w, 1, '#16303f');
        if (!wave) return;
        for (let i = 0; i < w; i += 2) {
          const v = (wave[Math.floor(i / w * wave.length)] - 128) / 128;
          const py = y + h / 2 + v * (h / 2 - 2);
          R(x + i, py - 1, 2, 2, HFP.cyan);
        }
      }

      /* the whole track's shape, and where in it we are */
      function drawScrub(x, y, w, h) {
        bevel(x, y, w, h, HFP.black, HFP.case_, HFP.panelHi);
        const t = S.list[S.ix];
        if (t && t.peaks) {
          const n = t.peaks.length / 2, mid = y + h / 2;
          for (let i = 0; i < w - 4; i++) {
            const b = Math.floor(i / (w - 4) * n);
            const lo = t.peaks[b * 2], hi = t.peaks[b * 2 + 1];
            const played = (i / (w - 4)) <= (S.dur ? S.pos / S.dur : 0);
            const a = Math.max(1, (hi - lo) * (h / 2 - 2));
            R(x + 2 + i, mid - a / 2, 1, a, played ? HFP.amber : HFP.panelHi);
          }
          const px = x + 2 + (w - 4) * (S.dur ? S.pos / S.dur : 0);
          R(px, y + 1, 1, h - 2, HFP.white);
        } else TXT('NO DISC', x + w / 2, y + h / 2 + 3, HFP.brush, 7, 'center');
        hits.push({ k: 'scrub', id: 'scrub', x: x, y: y, w: w, h: h });
      }

      /* ---- the display ---------------------------------------------------------- */
      function drawLCD(x, y, w, h) {
        bevel(x, y, w, h, HFP.lcd, HFP.black, HFP.panelHi);
        R(x + 2, y + 2, w - 4, h - 4, HFP.lcd);
        const t = S.list[S.ix];
        const title = t ? t.name : (S.loading ? 'PRESSING DISCS...' : 'NO DISC');
        /* marquee only when it will not fit, and it pauses at each end */
        g.save(); g.beginPath(); g.rect(x + 4, y + 4, w - 8, 12); g.clip();
        g.font = '9px monospace';
        const tw = g.measureText(title).width;
        let tx = x + 6;
        if (tw > w - 12) {
          const span = tw - (w - 12) + 16;
          const cyc = (S.marquee % (span * 2 + 60));
          tx = x + 6 - (cyc < 30 ? 0 : cyc < span + 30 ? cyc - 30 : cyc < span + 60 ? span : span * 2 + 60 - cyc);
        }
        TXT(title, tx, y + 14, HFP.lcdOn, 9);
        g.restore();
        TXT(t ? t.artist : '—', x + 6, y + 25, HFP.lcdDim, 7);

        const el = mmss(S.pos), tot = mmss(S.dur);
        let dx = x + 6;
        for (let i = 0; i < el.length; i++) { digit(el[i], dx, y + 30, 9, 16, HFP.lcdOn, '#12301f'); dx += el[i] === ':' ? 6 : 11; }
        TXT('/ ' + tot, dx + 4, y + 43, HFP.lcdDim, 7);

        const flags = [['PLAY', S.playing], ['EQ', S.eqOn], ['LOUD', S.loud], ['MONO', S.mono],
                       ['RPT', S.repeat > 0], ['SHF', S.shuffle]];
        let fx = x + 6;
        flags.forEach(f => { TXT(f[0], fx, y + h - 5, f[1] ? HFP.lcdOn : '#153f2a', 7); fx += f[0].length * 6 + 6; });
        TXT(Math.round(ctx.sampleRate / 100) / 10 + 'kHz', x + w - 6, y + h - 5, HFP.lcdDim, 7, 'right');
      }

      const SORTS = ['SHELF', 'TITLE', 'ARTIST', 'LENGTH'];
      function drawList(x, y, w, h) {
        bevel(x, y, w, h, HFP.black, HFP.case_, HFP.panelHi);
        const v = view();
        /* the search slot, and what it has narrowed the shelf down to */
        const sy = y + 3;
        bevel(x + 3, sy, w - 42, 11, HFP.lcd, HFP.black, HFP.panelHi);
        const q = S.filter ? S.filter.toUpperCase() : '';
        TXT(q || 'SEARCH', x + 7, sy + 9, q ? HFP.lcdOn : HFP.lcdDim, 7);
        if (S.searching) R(x + 8 + g.measureText(q).width, sy + 2, 1, 7, HFP.lcdOn);
        hits.push({ k: 'btn', id: 'search', x: x + 3, y: sy, w: w - 42, h: 11 });
        button('sort', x + w - 37, sy, 34, 11, SORTS[S.sort], S.sort > 0);

        TXT(S.filter ? v.length + '/' + S.list.length : 'DISCS  ' + S.list.length, x + 5, y + 24, HFP.brushHi, 7);
        if (S.loading) TXT('...' + S.loading, x + w - 5, y + 24, HFP.amber, 7, 'right');
        else if (S.drag && S.drag.k === 'row') TXT('DRAG TO REORDER', x + w - 5, y + 24, HFP.amber, 7, 'right');
        else TXT('DEL = REMOVE', x + w - 5, y + 24, HFP.screw, 7, 'right');

        const top = y + 28, rows = Math.floor((h - (top - y) - 3) / 11);
        const maxScroll = Math.max(0, v.length - rows);
        S.scroll = Math.max(0, Math.min(maxScroll, S.scroll));
        /* keep the disc that is playing in sight unless you are scrolling */
        const at = v.indexOf(S.ix);
        if (at >= 0 && !S.userScrolled) S.scroll = Math.max(0, Math.min(maxScroll, at - Math.floor(rows / 2)));
        for (let i = 0; i < rows && S.scroll + i < v.length; i++) {
          const n = v[S.scroll + i], t = S.list[n], yy = top + i * 11;
          const on = n === S.ix;
          if (on) R(x + 2, yy, w - 4, 10, HFP.panel);
          TXT((n + 1) + '.', x + 5, yy + 8, on ? HFP.white : HFP.brush, 7);
          g.save(); g.beginPath(); g.rect(x + 18, yy, w - 46, 10); g.clip();
          TXT(t.name, x + 18, yy + 8, t.missing ? HFP.red : on ? HFP.amber : HFP.brushHi, 7);
          g.restore();
          TXT(t.buf || t.builtin ? mmss(t.dur) : (t.decoding ? '...' : mmss(t.dur)),
              x + w - 5, yy + 8, on ? HFP.white : HFP.brush, 7, 'right');
          hits.push({ k: 'row', id: n, x: x + 2, y: yy, w: w - 4, h: 10 });
        }
        /* a thumb, so two hundred discs feel like a shelf and not a hole */
        if (v.length > rows) {
          const tr = h - (top - y) - 3, th = Math.max(8, tr * rows / v.length);
          R(x + w - 3, top, 2, tr, HFP.case_);
          R(x + w - 3, top + (tr - th) * (S.scroll / Math.max(1, maxScroll)), 2, th, HFP.brush);
        }
        if (!S.list.length) TXT('TRAY EMPTY', x + w / 2, y + h / 2, HFP.brush, 7, 'center');
        else if (!v.length) TXT('NOTHING MATCHES', x + w / 2, y + h / 2 + 8, HFP.brush, 7, 'center');
      }

      /* ---- one frame of the whole face -------------------------------------- */
      function draw() {
        hits = [];
        const t = S.list[S.ix];
        const tint = { green: HFP.green, cyan: HFP.cyan, amber: HFP.amber, white: HFP.white, red: HFP.red }[t ? t.tint : 'amber'] || HFP.amber;

        R(0, 0, 480, 386, HFP.black);
        /* the room behind the rack, lit by whatever the bass is doing */
        if (S.glow > 0.01) {
          const gr = g.createRadialGradient(240, 90, 10, 240, 150, 300);
          gr.addColorStop(0, tint); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g.globalAlpha = Math.min(0.30, S.glow * 0.34); g.fillStyle = gr; g.fillRect(0, 0, 480, 386); g.globalAlpha = 1;
        }

        /* ---------- unit one: the transport ---------- */
        unit(4, 4, 472, 142, 'HOLYTRON CDP-1  ·  COMPACT DISC / DVD TRANSPORT');
        drawDisc(66, 80, 44, ampNow, bassNow);
        drawLCD(128, 18, 200, 58);
        button('prev', 128, 80, 30, 20, '|<<', false);
        button('play', 160, 80, 38, 20, S.playing ? '||' : '>', S.playing, tint);
        button('stop', 200, 80, 28, 20, '[ ]', false);
        button('next', 230, 80, 30, 20, '>>|', false);
        button('shuffle', 262, 80, 32, 20, 'SHF', S.shuffle);
        button('repeat', 296, 80, 32, 20, S.repeat === 2 ? 'RP1' : 'RPT', S.repeat > 0);
        drawTray(128, 104, 200, 20);
        TXT(S.note || (t ? 'DISC ' + (S.ix + 1) + ' OF ' + S.list.length : 'LOAD A DISC TO BEGIN'),
            128, 138, S.note ? HFP.amber : HFP.brush, 7);
        drawList(336, 16, 136, 124);

        /* ---------- unit two: the amplifier ---------- */
        unit(4, 150, 472, 132, 'HOLYTRON IA-8  ·  INTEGRATED AMPLIFIER / GRAPHIC EQUALISER');
        for (let i = 0; i < EQ_BANDS.length; i++) {
          const v = eqGains[i];
          knob('eq' + i, 26 + i * 38, 192, 14, (v + 12) / 24, EQ_BANDS[i].label,
               (v > 0 ? '+' : '') + v.toFixed(1), tint);
        }
        knob('pre',   26, 248, 12, (S.pre + 12) / 24, 'TRIM', (S.pre > 0 ? '+' : '') + S.pre.toFixed(1));
        knob('vol',   64, 248, 12, S.vol, 'VOL', Math.round(S.vol * 100) + '');
        knob('bal',  102, 248, 12, (S.bal + 1) / 2, 'BAL', S.bal === 0 ? 'C' : (S.bal < 0 ? 'L' : 'R') + Math.round(Math.abs(S.bal) * 100));
        knob('width',140, 248, 12, S.width / 2, 'WIDTH', Math.round(S.width * 100) + '');
        knob('speed',178, 248, 12, (S.speed - 0.5) / 1.0, 'SPEED', S.speed.toFixed(2));
        knob('room', 216, 248, 12, S.room, 'ROOM', ROOMS[S.roomIx]);
        button('eqon',  236, 226, 44, 14, S.eqOn ? 'EQ  ON' : 'EQ BYP', S.eqOn);
        button('loud',  284, 226, 44, 14, 'LOUD', S.loud);
        button('bass',  236, 243, 44, 14, 'BASS+', S.bassBoost);
        button('mono',  284, 243, 44, 14, 'MONO', S.mono);
        button('tex',   236, 260, 44, 14, S.texture === 'off' ? 'NOISE' : S.texture.toUpperCase(), S.texture !== 'off');
        button('scan',  284, 260, 44, 14, 'CRT', S.scan);
        drawVU(338, 166, 64, 58, S.vuL, S.peakL, 'L');
        drawVU(406, 166, 64, 58, S.vuR, S.peakR, 'R');
        drawCorr(338, 228, 132, 46);

        /* ---------- unit three: the analyser ---------- */
        unit(4, 286, 472, 96, 'HOLYTRON SA-3  ·  REAL TIME SPECTRUM ANALYSER');
        drawSpectrum(12, 300, 340, 44);
        drawScope(12, 347, 340, 14);
        button('style', 358, 300, 112, 14, ['MIRRORED', 'BARGRAPH', 'SCOPE'][S.style], false);
        button('roomsel', 358, 318, 112, 14, 'ROOM: ' + ROOMS[S.roomIx], S.roomIx > 0);
        button('ab', 358, 336, 112, 14, 'A/B — HOLD TO BYPASS', false);
        TXT('PRE ' + (S.pre > 0 ? '+' : '') + S.pre.toFixed(1) + 'dB   ' + Math.round(S.speed * 100) + '%',
            358, 358, HFP.brush, 7);
        drawScrub(12, 364, 458, 14);

        /* the glass, if it is switched on */
        if (S.scan) {
          g.globalAlpha = 0.20;
          for (let y = 0; y < 386; y += 2) R(0, y, 480, 1, '#000000');
          g.globalAlpha = 1;
          const vg = g.createRadialGradient(240, 193, 120, 240, 193, 330);
          vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
          g.fillStyle = vg; g.fillRect(0, 0, 480, 386);
        }
      }

      /* ---- reading the meters --------------------------------------------- */
      let ampNow = 0, bassNow = 0;
      const fBuf = new Uint8Array(N.an.frequencyBinCount);
      const wBuf = new Uint8Array(N.an.fftSize);
      const lBuf = new Float32Array(N.anL.fftSize);
      const rBuf = new Float32Array(N.anR.fftSize);

      function meters(dt) {
        N.an.getByteFrequencyData(fBuf); freq = fBuf;
        N.an.getByteTimeDomainData(wBuf); wave = wBuf;
        let lo = 0; for (let i = 1; i < 10; i++) lo += fBuf[i];
        bassNow = Math.min(1, lo / (9 * 255));
        let peak = 0; for (let i = 0; i < wBuf.length; i += 8) peak = Math.max(peak, Math.abs(wBuf[i] - 128) / 128);
        ampNow = peak;
        S.glow += (bassNow - S.glow) * Math.min(1, dt * 6);

        const getF = (an, out) => { if (an.getFloatTimeDomainData) { an.getFloatTimeDomainData(out); return true; } return false; };
        let rmsL = 0, rmsR = 0, dot = 0, magL = 0, magR = 0;
        if (getF(N.anL, lBuf) && getF(N.anR, rBuf)) {
          for (let i = 0; i < lBuf.length; i++) {
            const a = lBuf[i], b = rBuf[i];
            rmsL += a * a; rmsR += b * b; dot += a * b; magL += a * a; magR += b * b;
          }
          rmsL = Math.sqrt(rmsL / lBuf.length); rmsR = Math.sqrt(rmsR / rBuf.length);
          const den = Math.sqrt(magL * magR);
          const c = den > 1e-9 ? dot / den : 1;
          S.corr += (c - S.corr) * Math.min(1, dt * 4);
        } else { rmsL = rmsR = ampNow * 0.7; }

        /* a needle is a mass on a spring: drive it, damp it, let it overshoot */
        const drive = (val, pos, vel) => {
          /* calibrated so an ordinary track sits around 0VU — three quarters
             across — rather than never leaving the peg */
          const target = Math.min(1.08, Math.pow(val * 7, 0.55));
          const k = 190, damp = 17;
          vel += (target - pos) * k * dt;
          vel -= vel * damp * dt;
          pos += vel * dt;
          if (pos < 0) { pos = 0; vel = 0; }
          return [pos, vel];
        };
        let a = drive(rmsL, S.vuL, S.vuLv); S.vuL = a[0]; S.vuLv = a[1];
        let b = drive(rmsR, S.vuR, S.vuRv); S.vuR = b[0]; S.vuRv = b[1];
        S.peakL = Math.max(S.peakL - dt * 0.22, S.vuL);
        S.peakR = Math.max(S.peakR - dt * 0.22, S.vuR);
      }

      /* ---- the loop ---------------------------------------------------------- */
      const XFADE = 1.6;
      function frame(ts) {
        if (!alive || !document.body.contains(cv)) { alive = false; teardown(); return; }
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;

        const v = curVoice();
        if (S.playing && v) S.pos = Math.min(S.dur, (ctx.currentTime - v.at) * S.speed + v.off);
        if (S.noteT > 0) { S.noteT -= dt; if (S.noteT <= 0) S.note = ''; }
        S.marquee += dt * 26;
        if (S.playing) { S.spin += dt * 3.4 * S.speed; S.sheen -= dt * 1.1; }
        S.disc = Math.max(0, S.disc - dt * 1.6);
        const wantTray = S.trayDir > 0 ? 1 : 0;
        S.tray += (wantTray - S.tray) * Math.min(1, dt * 5);
        if (S.trayDir > 0 && S.tray > 0.98) S.trayDir = 0;

        /* the crossfade into the next disc, started before this one runs out */
        if (S.playing && S.dur && !S.xfaded && S.repeat !== 2 && S.pos > S.dur - XFADE && S.list.length > 1) {
          S.xfaded = true;
          const n = nextIx();
          if (n >= 0 && n !== S.ix && S.list[n].buf) {
            const nt = S.list[n];
            for (let b2 = 0; b2 < EQ_BANDS.length; b2++) eqGains[b2] = nt.eq[b2] || 0;
            applyEQ();
            const old = curVoice();
            startVoice(nt, 0, XFADE * 0.8);
            if (old) killVoice(old, XFADE * 0.8);
            S.ix = n; S.dur = nt.dur; S.seekBase = 0; S.disc = 1; S.marquee = 0;
          }
        }
        /* the end of the last disc, or of a track on repeat-one */
        if (S.playing && S.dur && S.pos >= S.dur - 0.03) {
          if (S.repeat === 2) { S.seekBase = 0; play(); }
          else if (S.list.length <= 1) { if (S.repeat === 1) { S.seekBase = 0; play(); } else stop(); }
          else if (!S.xfaded) { skip(1); }
        }
        applyAll();
        meters(dt);
        draw();
      }

      function teardown() {
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        S.voices.slice().forEach(v => killVoice(v, 0.05));
        if (texSrc) { try { texSrc.stop(); } catch (e) {} texSrc = null; }
        try { N.master.disconnect(); } catch (e) {}
      }

      /* ---- hands on the front panel ------------------------------------------- */
      const KNOBS = {
        vol:   { get: () => S.vol,   set: v => S.vol = v,   min: 0, max: 1,   step: 0.02, detent: null },
        pre:   { get: () => S.pre,   set: v => S.pre = v,   min: -12, max: 12, step: 0.5, detent: 0 },
        bal:   { get: () => S.bal,   set: v => S.bal = v,   min: -1, max: 1,  step: 0.05, detent: 0 },
        width: { get: () => S.width, set: v => S.width = v, min: 0, max: 2,   step: 0.05, detent: 1 },
        speed: { get: () => S.speed, set: v => S.speed = v, min: 0.5, max: 1.5, step: 0.01, detent: 1 },
        room:  { get: () => S.room,  set: v => S.room = v,  min: 0, max: 1,   step: 0.02, detent: null }
      };
      for (let i = 0; i < EQ_BANDS.length; i++) {
        (function (b) {
          KNOBS['eq' + b] = { get: () => eqGains[b], set: v => { eqGains[b] = v; applyEQ(); }, min: -12, max: 12, step: 0.5, detent: 0 };
        })(i);
      }
      const nudge = (id, d) => {
        const k = KNOBS[id]; if (!k) return;
        let v = k.get() + d * k.step;
        v = Math.max(k.min, Math.min(k.max, v));
        if (k.detent != null && Math.abs(v - k.detent) < k.step * 0.9) v = k.detent;   /* the click at the middle */
        k.set(Math.round(v * 1000) / 1000);
      };
      const setFrac = (id, f) => {
        const k = KNOBS[id]; if (!k) return;
        let v = k.min + (k.max - k.min) * Math.max(0, Math.min(1, f));
        if (k.detent != null && Math.abs(v - k.detent) < (k.max - k.min) * 0.035) v = k.detent;
        k.set(Math.round(v / k.step) * k.step);
      };

      const at = ev => {
        const r = cv.getBoundingClientRect();
        return { x: (ev.clientX - r.left) * (cv.width / r.width), y: (ev.clientY - r.top) * (cv.height / r.height) };
      };
      const hitAt = p => { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i];
        if (p.x >= h.x && p.x <= h.x + h.w && p.y >= h.y && p.y <= h.y + h.h) return h; } return null; };

      function press(id) {
        if (id === 'play' || id === 'next' || id === 'prev' || id === 'stop') S.touched = true;
        switch (id) {
          case 'play': toggle(); Snd.tick && Snd.tick(); break;
          case 'stop': stop(); break;
          case 'prev': if (S.pos > 3) seek(0); else skip(-1); break;
          case 'next': skip(1); break;
          case 'shuffle': S.shuffle = !S.shuffle; say('SHUFFLE ' + (S.shuffle ? 'ON' : 'OFF')); break;
          case 'repeat': S.repeat = (S.repeat + 1) % 3; say(['REPEAT OFF', 'REPEAT ALL', 'REPEAT ONE'][S.repeat]); break;
          case 'tray': pick.click(); break;
          case 'eqon': S.eqOn = !S.eqOn; routeEQ(); say(S.eqOn ? 'EQUALISER IN CIRCUIT' : 'EQUALISER BYPASSED'); break;
          case 'loud': S.loud = !S.loud; say('LOUDNESS ' + (S.loud ? 'ON' : 'OFF')); break;
          case 'bass': S.bassBoost = !S.bassBoost; say('BASS BOOST ' + (S.bassBoost ? 'ON' : 'OFF')); break;
          case 'mono': S.mono = !S.mono; say(S.mono ? 'MONO SUM' : 'STEREO'); break;
          case 'scan': S.scan = !S.scan; break;
          case 'style': S.style = (S.style + 1) % 3; break;
          case 'tex': S.texture = S.texture === 'off' ? 'crackle' : S.texture === 'crackle' ? 'hiss' : 'off';
                      surfaceNoise(S.texture); say('SURFACE NOISE: ' + S.texture.toUpperCase()); break;
          case 'roomsel': S.roomIx = (S.roomIx + 1) % ROOMS.length;
                          N.conv.buffer = IRS[ROOMS[S.roomIx]] || IRS.ROOM; say('ROOM: ' + ROOMS[S.roomIx]); break;
        }
      }

      cv.addEventListener('mousedown', ev => {
        ev.stopPropagation(); cv.focus();
        const p = at(ev), h = hitAt(p);
        if (!h) return;
        if (h.k === 'btn') {
          if (h.id === 'search') { S.searching = true; say('TYPE TO SEARCH — ESC CLEARS'); return; }
          if (h.id === 'sort') { S.sort = (S.sort + 1) % 4; S.userScrolled = false; say('ORDER BY ' + SORTS[S.sort]); return; }
          if (h.id === 'ab') { const was = S.eqOn; S.eqOn = false; routeEQ();
            const up = () => { S.eqOn = was; routeEQ(); window.removeEventListener('mouseup', up); };
            window.addEventListener('mouseup', up); return; }
          press(h.id); return;
        }
        if (h.k === 'row') { S.drag = { k: 'row', from: h.id, moved: false }; return; }
        if (h.k === 'scrub') { seek((p.x - h.x - 2) / (h.w - 4) * S.dur); S.drag = { k: 'scrub', h: h }; return; }
        if (h.k === 'knob') { S.drag = { k: 'knob', id: h.id, y0: p.y, v0: KNOBS[h.id] ? KNOBS[h.id].get() : 0, h: h }; }
      });
      window.addEventListener('mousemove', ev => {
        if (!S.drag) return;
        const p = at(ev);
        if (S.drag.k === 'scrub') { seek((p.x - S.drag.h.x - 2) / (S.drag.h.w - 4) * S.dur); return; }
        if (S.drag.k === 'row') {
          const over = hitAt(p);
          if (!over || over.k !== 'row' || over.id === S.drag.from) return;
          const from = S.drag.from, to = over.id;
          const moving = S.list[from];
          S.list.splice(from, 1); S.list.splice(to, 0, moving);
          /* the playing disc keeps playing: follow it to its new index */
          if (S.ix === from) S.ix = to;
          else if (from < S.ix && to >= S.ix) S.ix--;
          else if (from > S.ix && to <= S.ix) S.ix++;
          S.drag.from = to; S.drag.moved = true;
          return;
        }
        const k = KNOBS[S.drag.id]; if (!k) return;
        const d = (S.drag.y0 - p.y) / 90;                  /* drag up to turn up */
        let v = S.drag.v0 + d * (k.max - k.min);
        v = Math.max(k.min, Math.min(k.max, v));
        if (k.detent != null && Math.abs(v - k.detent) < (k.max - k.min) * 0.03) v = k.detent;
        k.set(Math.round(v / k.step) * k.step);
      });
      window.addEventListener('mouseup', () => {
        if (S.drag && S.drag.k === 'row') {
          if (S.drag.moved) say('ORDER CHANGED.');
          else { S.touched = true; loadDisc(S.drag.from, true); }
        }
        S.drag = null;
      });
      cv.addEventListener('wheel', ev => {
        const p = at(ev), h = hitAt(p);
        if (h && h.k === 'knob') { ev.preventDefault(); nudge(h.id, ev.deltaY < 0 ? 1 : -1); return; }
        if (p.x > 336 && p.x < 472 && p.y > 16 && p.y < 140) {
          ev.preventDefault();
          S.userScrolled = true;
          S.scroll += ev.deltaY > 0 ? 2 : -2;
        }
      }, { passive: false });

      const EQ_PRESETS = {
        1: [0,0,0,0,0,0,0,0],                    2: [6,4.5,2,0,-1,0,2.5,4],
        3: [7,5,1,-2,-1.5,1,3,5],                4: [-2,-1,0,2,3.5,3,1.5,0],
        5: [4,3,0,-1,0,2,4,5.5],                 6: [0,0,-1,0,2,3,2,1],
        7: [8,6,2,-1,-2,-1,2,3],                 8: [-3,-2,0,1,2,2,3,4],
        9: [2,1,0,0,1,2,3,3]
      };
      const PRESET_NAME = { 1:'FLAT', 2:'LOUDNESS', 3:'BASS HEAVY', 4:'VOCAL', 5:'V-SHAPE',
                            6:'PRESENCE', 7:'CLUB', 8:'AIR', 9:'WARM TAPE' };

      cv.addEventListener('keydown', ev => {
        const k = ev.key;
        /* while the search slot has focus it takes the keys, so a title with
           an N or a 4 in it does not skip a track and load a preset */
        if (S.searching) {
          ev.preventDefault();
          if (k === 'Escape') { if (S.filter) { S.filter = ''; } else S.searching = false; S.userScrolled = false; return; }
          if (k === 'Enter') { S.searching = false; const v = view(); if (v.length) { S.touched = true; loadDisc(v[0], true); } return; }
          if (k === 'Backspace') { S.filter = S.filter.slice(0, -1); S.scroll = 0; S.userScrolled = false; return; }
          if (k.length === 1) { S.filter += k; S.scroll = 0; S.userScrolled = false; }
          return;
        }
        if (k === ' ' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') ev.preventDefault();
        if (k === '/' ) { ev.preventDefault(); S.searching = true; return; }
        if (k === 'Delete' || k === 'Backspace') { ev.preventDefault(); forget(S.ix); return; }
        if (k === ' ') { toggle(); return; }
        if (k === 'ArrowRight') { seek(S.pos + (ev.shiftKey ? 30 : 5)); return; }
        if (k === 'ArrowLeft')  { seek(S.pos - (ev.shiftKey ? 30 : 5)); return; }
        if (k === 'ArrowUp')    { setFrac('vol', Math.min(1, S.vol + 0.05)); return; }
        if (k === 'ArrowDown')  { setFrac('vol', Math.max(0, S.vol - 0.05)); return; }
        if (k === 'n' || k === 'N') { skip(1); return; }
        if (k === 'p' || k === 'P') { skip(-1); return; }
        if (k === 'b' || k === 'B') { press('eqon'); return; }
        if (k === 'm' || k === 'M') { press('mono'); return; }
        if (k === 'l' || k === 'L') { press('loud'); return; }
        if (k === 'v' || k === 'V') { press('style'); return; }
        if (k >= '1' && k <= '9') {
          const pre = EQ_PRESETS[k]; if (!pre) return;
          for (let i = 0; i < EQ_BANDS.length; i++) eqGains[i] = pre[i];
          applyEQ(); say('EQ PRESET ' + k + ' — ' + PRESET_NAME[k]);
        }
      });
      cv.addEventListener('keyup', ev => { if (ev.key === ' ') ev.preventDefault(); });

      /* ---- the buttons on the chin ------------------------------------------- */
      bLoad.addEventListener('click', () => { S.trayDir = 1; pick.click(); });
      pick.addEventListener('change', () => { importFiles(pick.files); pick.value = ''; cv.focus(); });
      bArt.addEventListener('click', () => { if (S.list.length) pickArt.click(); else say('LOAD A DISC FIRST.'); });
      pickArt.addEventListener('change', () => {
        const f = pickArt.files && pickArt.files[0]; pickArt.value = '';
        const t = S.list[S.ix]; if (!f || !t) return;
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => { const c = document.createElement('canvas'); c.width = 96; c.height = 96;
          const q = c.getContext('2d');
          const side = Math.min(im.width, im.height);
          q.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, 96, 96);
          t.art = c; t.artData = c.toDataURL('image/png'); URL.revokeObjectURL(url); saveLibrary(); say('LABEL PRINTED.'); };
        im.onerror = () => { URL.revokeObjectURL(url); say('THAT IS NOT A PICTURE THIS MACHINE KNOWS.'); };
        im.src = url;
        cv.focus();
      });
      bSave.addEventListener('click', () => {
        const t = S.list[S.ix]; if (!t) return;
        t.eq = eqGains.slice();
        const all = store(); all[keyOf(t)] = { eq: t.eq };
        try { localStorage.setItem(SAVE, JSON.stringify(all)); say('EQ SAVED WITH ' + t.name); }
        catch (e) { say('COULD NOT SAVE.'); }
        cv.focus();
      });
      bFlat.addEventListener('click', () => {
        for (let i = 0; i < EQ_BANDS.length; i++) eqGains[i] = 0;
        applyEQ(); say('EQ FLAT.'); cv.focus();
      });

      /* drag a file anywhere on the unit and the tray comes out to meet it */
      const stopEv = e => { e.preventDefault(); e.stopPropagation(); };
      wrap.addEventListener('dragover', e => { stopEv(e); S.trayDir = 1; });
      wrap.addEventListener('dragenter', e => { stopEv(e); S.trayDir = 1; });
      wrap.addEventListener('dragleave', e => { stopEv(e); if (!S.loading) S.trayDir = -1; });
      wrap.addEventListener('drop', e => {
        stopEv(e);
        const dt2 = e.dataTransfer;
        if (dt2 && dt2.files && dt2.files.length) importFiles(dt2.files); else S.trayDir = -1;
      });
      wrap.addEventListener('mousedown', () => setTimeout(() => cv.focus(), 0));
      setTimeout(() => cv.focus(), 40);

      loadLibrary();
      applyAll();
      raf = requestAnimationFrame(frame);
      const watch = setInterval(() => {
        if (document.body.contains(cv)) return;
        clearInterval(watch); alive = false; teardown();
      }, 900);
      info.textContent = 'SPACE · ARROWS · N/P · 1-9 EQ · B BYPASS · DROP FILES ON IT';
  }
};
