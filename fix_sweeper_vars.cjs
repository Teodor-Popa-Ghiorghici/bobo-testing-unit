const fs = require('fs');

let code = fs.readFileSync('apps/sweeper/index.js', 'utf8');

const vars = `
const SWP_KEY = 'templeos.sweeper';
const SWEEP_LV = [
  { id: 'e', name: 'SHALLOWS',  c: 9,  r: 9,  m: 10, pay: 15,  par: 60 },
  { id: 'm', name: 'THE HIVE',  c: 16, r: 16, m: 40, pay: 60,  par: 240 },
  { id: 'h', name: 'THE DEEP',  c: 30, r: 16, m: 99, pay: 200, par: 600 }
];
const SWEEP_NUM = ['', '#7fb8ff', '#8fe8b0', '#ffffff', '#c3a6ff', '#ffc35c', '#ff9040', '#ff4d5e', '#b0202e'];

const Sweeper = {
  st: null,
  boot() {
    let raw = localStorage.getItem(SWP_KEY);
    this.st = raw ? JSON.parse(raw) : { best: {}, won: 0, played: 0, streak: 0, bestStreak: 0, lv: 'e' };
    if (!this.st.best || typeof this.st.best !== 'object') this.st.best = {};
  },
  save() { localStorage.setItem(SWP_KEY, JSON.stringify(this.st)); }
};
Sweeper.boot();

window.Sweeper = Sweeper;
`;

code = code.replace(/export default \{/, vars + '\nexport default {');
code = code.replace(/sweepWin && document\.body\.contains\(sweepWin\.win\)/g, 'sweepWin && document.body.contains(sweepWin.win)');
fs.writeFileSync('apps/sweeper/index.js', code);
