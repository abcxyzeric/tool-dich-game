const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, 'GameStudioPage-BAlfuGG_.js'), 'utf8');

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
const tmpPath = path.join(__dirname, 'tmp_eval_gamestudio.js');
fs.writeFileSync(tmpPath, setup);
const { wsc_J } = require(tmpPath);
fs.unlinkSync(tmpPath);

const strings = [];
for (let i = 0; i < 3000; i++) {
  try {
    const val = wsc_J(i);
    if (val && typeof val === 'string') {
      strings.push({ i, val });
    }
  } catch (e) {}
}

console.log('Total strings:', strings.length);
const gameRelated = strings.filter(s => 
  /rpg|renpy|wolf|unity|rpy|json|csv|txt|game|thoại|dịch|export|import|mã điều khiển/i.test(s.val)
);

console.log('Found game related strings:', gameRelated.length);
gameRelated.forEach(s => {
  console.log(`[0x${s.i.toString(16)} / ${s.i}]: ${s.val}`);
});
