const https = require('https');
const fs = require('fs');
const path = require('path');

const files = [
  'StudioShell-BYJUGv-Z.js',
  'hooks-BgmdOTqW.js',
  'index-Dm85RQRE.js',
  'MediaSettings-k3CdGkjr.js',
  'types-BlOPlxGo.js',
  'Table-_7E7Ievy.js',
  'ellipsis-D7r-FJHB.js',
  'jszip.min-BicEhpjz.js',
  'watermark-feFDqZfa.js',
  'file-plus-corner-cqqAVdtY.js',
  'ban-Dz5o39GL.js',
  'Pagination-BBz4fsaN.js',
  'index-DzIa7A7g.js',
  'index-CRjl850f.js',
  'image-off-C6t2P8Zo.js',
  'list-checks-Z5i9Fpba.js',
  'image-CNmgTZth.js',
  'settings-D4ZmKkoo.js',
  'index-DBZbfSj9.css'
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
  console.log('Finished downloading all GameStudio UI dependencies!');
})();
