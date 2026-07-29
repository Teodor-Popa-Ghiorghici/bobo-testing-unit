const fs = require('fs');

const idList = ['sweeper', 'solitaire', 'crayon', 'drawings', 'elephant', 'magen', 'cook', 'display', 'about'];
const apps = [
  { name: 'MINESWEEPER', id: 'sweeper' },
  { name: 'SOLITAIRE', id: 'solitaire' },
  { name: 'CRAYON', id: 'crayon' },
  { name: 'DRAWINGS', id: 'drawings' },
  { name: 'ELEPHANT', id: 'elephant' },
  { name: 'MAGEN', id: 'magen' },
  { name: 'COOK', id: 'cook' },
  { name: 'DISPLAY SETTINGS', id: 'display' },
  { name: 'ABOUT', id: 'about' }
];

let wm = fs.readFileSync('kernel/registry.js', 'utf8');

// replace the end of registry exports
let add = "";
for (let id of idList) {
    if (!wm.includes(id + ': () =>')) {
        add += `  ${id}: () => import('../apps/${id}/index.js'),\n`;
    }
}
wm = wm.replace(/hifi: \(\) => import\('\.\.\/apps\/hifi\/index\.js'\),/, "hifi: () => import('../apps/hifi/index.js'),\n" + add);

fs.writeFileSync('kernel/registry.js', wm);

let desk = fs.readFileSync('kernel/desktop.js', 'utf8');
let listAdds = "";
let elseAdds = "";
for (let a of apps) {
    if (!desk.includes("item.name === '" + a.name + "'")) {
        listAdds += `    list.push({ name: '${a.name}', type: 'app' });\n`;
        elseAdds += `        } else if (item.name === '${a.name}') {\n          openWindow('${a.id}').catch(console.error);\n`;
    }
}

desk = desk.replace(/list\.push\(\{ name: 'HIFI', type: 'app' \}\);/, "list.push({ name: 'HIFI', type: 'app' });\n" + listAdds);
desk = desk.replace(/\s*\} else if \(item.name === 'HIFI'\) \{\s*openWindow\('hifi'\)\.catch\(console\.error\);/, 
  `} else if (item.name === 'HIFI') {\n          openWindow('hifi').catch(console.error);\n` + elseAdds);

fs.writeFileSync('kernel/desktop.js', desk);
