const fs = require('fs');
const path = require('path');

function inspectCode(fileName, pattern) {
  const code = fs.readFileSync(path.join(__dirname, fileName), 'utf8');
  console.log(`\n--- Inspecting ${fileName} for ${pattern} ---`);
  let idx = 0;
  while ((idx = code.indexOf(pattern, idx)) !== -1) {
    console.log(code.slice(Math.max(0, idx - 100), Math.min(code.length, idx + 300)));
    idx += pattern.length;
    break; // just 1 match
  }
}

inspectCode('importExportUtils-DQdEI7pQ.js', 'renpy');
inspectCode('importExportUtils-DQdEI7pQ.js', 'rpgmaker');
inspectCode('importExportUtils-DQdEI7pQ.js', 'tl/vietnamese');
inspectCode('translateDb-Du212EDH.js', 'tGame');
