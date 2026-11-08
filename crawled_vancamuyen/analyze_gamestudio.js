const fs = require('fs');
const path = require('path');

// Let's decode all strings from GameStudioPage and write a full dump of game translation features
const code = fs.readFileSync(path.join(__dirname, 'GameStudioPage-BAlfuGG_.js'), 'utf8');

const posK = code.indexOf('function wsc_K(){');
const posKEnd = code.indexOf('return wsc_K();}', posK) + 'return wsc_K();}'.length;
const kCode = code.slice(posK, posKEnd);

const posJ = code.indexOf('function wsc_J(');
const posJEnd = code.indexOf(':S=o,S;}', posJ) + ':S=o,S;}'.length;
const jCode = code.slice(posJ, posJEnd);

const iifeStart = code.indexOf('(function(');
const iifeEnd = code.indexOf('}(wsc_K,') + code.slice(code.indexOf('}(wsc_K,')).indexOf(');') + 2;
const iifeCode = code.slice(iifeStart, iifeEnd);

const setup = `
${kCode}
${jCode}
${iifeCode}
module.exports = { wsc_J, wsc_K };
`;
const tmpPath = path.join(__dirname, 'tmp_eval_gs.js');
fs.writeFileSync(tmpPath, setup);
const { wsc_J } = require(tmpPath);
fs.unlinkSync(tmpPath);

// Replace all decoder calls like wsc_... ( 0x... ) in code to produce a human-readable snippet
const map = {};
for (let i = 0; i < 2000; i++) {
  try {
    const s = wsc_J(i);
    if (s) map[i] = s;
  } catch(e) {}
}

fs.writeFileSync(path.join(__dirname, 'GameStudio_strings.json'), JSON.stringify(map, null, 2), 'utf8');
console.log('Saved GameStudio_strings.json, total strings:', Object.keys(map).length);

// Let's inspect export and import formats
const exportFeatures = Object.values(map).filter(v => 
  /renpy|rpg|tl\/|wolf|xunity|zip|csv|export|import|bảo vệ|mã điều khiển|kiểm tra an toàn/i.test(v)
);
console.log('\n--- Key Features Detected: ---');
exportFeatures.forEach(f => console.log('- ' + f));
