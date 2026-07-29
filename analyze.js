const fs = require('fs');

const content = fs.readFileSync('templeos(7).html', 'utf-8');
const lines = content.split('\n');

let inStyle = false;
let inScript = false;
let inHtml = true;

let styleLines = [];
let scriptLines = [];
let htmlLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('<style>')) inStyle = true;
  if (line.includes('</style>')) inStyle = false;
  
  if (line.includes('<script>')) inScript = true;
  if (line.includes('</script>')) inScript = false;
  
  if (inStyle) styleLines.push({line: i+1, content: line});
  else if (inScript) scriptLines.push({line: i+1, content: line});
  else htmlLines.push({line: i+1, content: line});
}

console.log(`Total lines: ${lines.length}`);
console.log(`Style lines: ${styleLines.length}`);
console.log(`Script lines: ${scriptLines.length}`);

// Let's write the scripts to a separate file so we can analyze them.
fs.writeFileSync('scripts_only.js', scriptLines.map(l => l.content).join('\n'));
fs.writeFileSync('styles_only.css', styleLines.map(l => l.content).join('\n'));
fs.writeFileSync('html_only.html', htmlLines.map(l => l.content).join('\n'));

