const fs = require('fs');
const path = require('path');
const { w_b } = require('./decoder.js');

const files = [
  'translatePrompt-1QHrZMhk.js',
  'translationPrompts-B_R86Q2a.js',
  'translateDb-Du212EDH.js',
  'glossaryKeywords-CMVF4pid.js',
  'vietnameseBridge-D1My_Zyf.js',
  'importExportUtils-DQdEI7pQ.js',
  'TranslatePage-KABt24ry.js',
  'GameStudioPage-BAlfuGG_.js',
  'translateQueue-4M3VbCOW.js',
  'novelAppViLint-CId_mdLu.js'
];

for (const f of files) {
  const p = path.join(__dirname, f);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, 'utf8');
  console.log(`\n================== ${f} (${content.length} chars) ==================`);
  console.log('Sample text (first 600 chars):');
  console.log(content.slice(0, 600));
}
