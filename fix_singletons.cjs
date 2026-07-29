const fs = require('fs');

function addSingleton(app, winName) {
    let file = 'apps/' + app + '/index.js';
    let code = fs.readFileSync(file, 'utf8');
    
    // add `let winName = null;` at module level, after imports
    if (!code.includes(`let ${winName} = null;`)) {
        code = code.replace(/export default \{/, `let ${winName} = null;\nexport default {`);
    }
    
    // Uncomment the assignment
    code = code.replace(new RegExp(`\\/\\/ ${winName} = made;`, 'g'), `${winName} = { win: root.parentElement.parentElement };`);
    code = code.replace(new RegExp(`\\/\\/ ${winName} = root;`, 'g'), `${winName} = { win: root.parentElement.parentElement };`);
    // wait, what was it commented out as? `  // sweepWin = made;`
    // Wait, in `createWindow`, the actual win is `root.parentElement.parentElement` (body -> p/content -> win).
    // Or I can just make them true/false because raise won't work easily unless we have the window object.
    
    fs.writeFileSync(file, code);
}

addSingleton('sweeper', 'sweepWin');
addSingleton('solitaire', 'solWin');
addSingleton('crayon', 'drawWin');
addSingleton('drawings', 'drawerWin');

