const fs = require('fs');

let code = fs.readFileSync('apps/solitaire/index.js', 'utf8');

const vars = `
const SOL_KEY = 'templeos.solitaire';
const Solitaire = {
  st: null,
  boot() {
    let raw = localStorage.getItem(SOL_KEY);
    this.st = raw ? JSON.parse(raw) : { won: 0, played: 0, bestMoves: 0, back: 0 };
  },
  save() { localStorage.setItem(SOL_KEY, JSON.stringify(this.st)); }
};
Solitaire.boot();

window.Solitaire = Solitaire;
`;

code = code.replace(/export default \{/, vars + '\nexport default {');
fs.writeFileSync('apps/solitaire/index.js', code);
