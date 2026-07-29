const fs = require('fs');

let code = fs.readFileSync('apps/crayon/index.js', 'utf8');

const vars = `
const DRAW_KEY = 'templeos.draw';
const DRAW_CAP = 120;
const Crayon = {
  st: null,
  boot() {
    let raw = localStorage.getItem(DRAW_KEY);
    this.st = raw ? JSON.parse(raw) : { items: [], seq: 1 };
    if (!Array.isArray(this.st.items)) this.st.items = [];
  },
  save() { localStorage.setItem(DRAW_KEY, JSON.stringify(this.st)); }
};
Crayon.boot();

window.Crayon = Crayon;
`;

code = code.replace(/export default \{/, vars + '\nexport default {');
fs.writeFileSync('apps/crayon/index.js', code);
