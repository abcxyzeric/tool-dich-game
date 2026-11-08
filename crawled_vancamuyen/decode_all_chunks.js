const fs = require('fs');
const path = require('path');

function deobfuscateFile(fileName) {
  const filePath = path.join(__dirname, fileName);
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

  const setup = `
  ${kCode}
  ${jCode}
  ${iifeCode}
  module.exports = { wsc_J, wsc_K };
  `;
  const tmpPath = path.join(__dirname, `tmp_${fileName}.js`);
  fs.writeFileSync(tmpPath, setup);
  const { wsc_J } = require(tmpPath);

  const stringMap = {};
  for (let i = 0; i < 4000; i++) {
    try {
      const val = wsc_J(i);
      if (val) stringMap[i] = val;
    } catch (e) {}
  }
  fs.unlinkSync(tmpPath);
  return stringMap;
}

const files = [
  'vietnameseBridge-D1My_Zyf.js',
  'translateQueue-4M3VbCOW.js',
  'translateDb-Du212EDH.js',
  'novelAppViLint-CId_mdLu.js',
  'GameStudioPage-BAlfuGG_.js'
];

for (const f of files) {
  try {
    const res = deobfuscateFile(f);
    console.log(`\n================== ${f} (${Object.keys(res).length} strings) ==================`);
    const interesting = Object.entries(res).filter(([k, v]) => 
      v.length > 20 || /rpg|renpy|game|dịch|json|token|queue|batch|lint/i.test(v)
    );
    interesting.slice(0, 15).forEach(([k, v]) => {
      console.log(`[${k}]: ${v.slice(0, 100)}`);
    });
  } catch (err) {
    console.error(`Error deobfuscating ${f}:`, err.message);
  }
}
