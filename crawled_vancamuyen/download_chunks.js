const https = require('https');
const fs = require('fs');
const path = require('path');

const files = [
  'TranslatePage-KABt24ry.js',
  'GameStudioPage-BAlfuGG_.js',
  'translatePrompt-1QHrZMhk.js',
  'translateQueue-4M3VbCOW.js',
  'translationPrompts-B_R86Q2a.js',
  'translateDb-Du212EDH.js',
  'GlossaryPanel-f0Tinh0B.js',
  'glossaryKeywords-CMVF4pid.js',
  'EntityWorkbench-DRUKnvyy.js',
  'vietnameseBridge-D1My_Zyf.js',
  'novelAppViLint-CId_mdLu.js',
  'importExportUtils-DQdEI7pQ.js',
  'AIRulesPage-jDLiiyf0.js',
  'CharacterTab-9b2wWnQ6.js',
  'RelationshipTab-PB42nQoD.js',
  'AutoWorkflowPanel-DRfre6x_.js'
];

const targetDir = path.resolve(__dirname);

async function download(file) {
  const url = 'https://vancamuyen.online/assets/' + file;
  const dest = path.join(targetDir, file);
  return new Promise((resolve) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.error('Failed to download:', file, res.statusCode);
        return resolve();
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        console.log('Downloaded:', file, '(' + fs.statSync(dest).size + ' bytes)');
        resolve();
      });
    }).on('error', (err) => {
      console.error('Error downloading', file, err.message);
      resolve();
    });
  });
}

(async () => {
  for (const f of files) {
    await download(f);
  }
  console.log('All downloads finished!');
})();
