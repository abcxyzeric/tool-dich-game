const fs = require('fs');
const path = require('path');

function deobfuscateFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  
  // Extract wsc_K
  const posK = code.indexOf('function wsc_K(){');
  const posKEnd = code.indexOf('return wsc_K();}', posK) + 'return wsc_K();}'.length;
  const kCode = code.slice(posK, posKEnd);

  // Extract wsc_J
  const posJ = code.indexOf('function wsc_J(');
  const posJEnd = code.indexOf(':S=o,S;}', posJ) + ':S=o,S;}'.length;
  const jCode = code.slice(posJ, posJEnd);

  // Extract IIFE
  const iifeStart = code.indexOf('(function(');
  const iifeEnd = code.indexOf('}(wsc_K,') + code.slice(code.indexOf('}(wsc_K,')).indexOf(');') + 2;
  const iifeCode = code.slice(iifeStart, iifeEnd);

  // Run in VM to get wsc_J function
  const setup = `
  ${kCode}
  ${jCode}
  ${iifeCode}
  module.exports = { wsc_J, wsc_K };
  `;
  const tmpPath = path.join(__dirname, 'tmp_eval.js');
  fs.writeFileSync(tmpPath, setup);
  const { wsc_J } = require(tmpPath);

  // Now find all calls to decoder: usually const wsc_... = wsc_J;
  // Let's find any call like \b[a-zA-Z0-9_]+\((0x[0-9a-fA-F]+)\)
  // Let's decode all strings in the table
  const total = 2000;
  const stringMap = {};
  for (let i = 0; i < total; i++) {
    try {
      const val = wsc_J(i);
      if (val) stringMap[i] = val;
    } catch (e) {}
  }
  fs.unlinkSync(tmpPath);
  return stringMap;
}

const strings = deobfuscateFile(path.join(__dirname, 'translationPrompts-B_R86Q2a.js'));
console.log('Decoded strings in translationPrompts:', Object.keys(strings).length);
fs.writeFileSync(path.join(__dirname, 'translationPrompts_strings.json'), JSON.stringify(strings, null, 2), 'utf8');

// Print interesting strings
for (const [k, v] of Object.entries(strings)) {
  if (v.length > 50 || v.includes('dịch') || v.includes('game') || v.includes('Ren') || v.includes('RPG')) {
    console.log(`\n--- [${k}] --- \n${v}`);
  }
}
