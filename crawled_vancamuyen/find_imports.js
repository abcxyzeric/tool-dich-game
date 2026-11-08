const fs = require('fs');

const code = fs.readFileSync('crawled_vancamuyen/GameStudioPage-BAlfuGG_.js', 'utf8');
const regex = /import\s*\{?[^}]*\}?\s*from\s*['"]([^'"]+)['"]/g;
let m;
const imports = new Set();
while ((m = regex.exec(code)) !== null) {
  imports.add(m[1]);
}
console.log('All imports in GameStudioPage:', Array.from(imports));
