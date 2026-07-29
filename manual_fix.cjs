const fs = require('fs');

function fix(id, find, replace) {
  let file = 'apps/' + id + '/index.js';
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(find, replace);
  fs.writeFileSync(file, code);
}

fix('sweeper', '    }\n  });\n  sweepWin = made;', '    }\n  // sweepWin = made;');
fix('magen', "const root = document.createElement('div');", "const _rootEl = document.createElement('div');");
fix('magen', "body.appendChild(root);", "body.appendChild(_rootEl);");
fix('magen', /document\.body\.contains\(root\)/g, "document.body.contains(_rootEl)");
fix('magen', '    }\n  });\n  }\n};', '    }\n  }\n};');
fix('cook', '    }\n  });\n  cookWin = made;', '    }\n  // cookWin = made;');
fix('elephant', '    }\n  });\n  }\n};', '    }\n  }\n};');
fix('solitaire', '    }\n  });\n  soliWin = made;', '    }\n  // soliWin = made;');
fix('crayon', '  let cv, g, root, sizeBtns = [], toolBtns = [], swatchEls = [];', '  let cv, g, _rootEl, sizeBtns = [], toolBtns = [], swatchEls = [];');
fix('crayon', 'root = document.createElement', '_rootEl = document.createElement');
fix('crayon', 'body.appendChild(root);', 'body.appendChild(_rootEl);');
fix('crayon', '    }\n  });\n  crayonWin = made;', '    }\n  // crayonWin = made;');
fix('drawings', '    }\n  });\n  drawerWin = made;', '    }\n  // drawerWin = made;');
fix('display', '    }\n  });\n  }\n};', '    }\n  }\n};');

