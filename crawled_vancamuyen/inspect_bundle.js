const fs = require('fs');

const filePath = 'crawled_vancamuyen/index-main.js';
console.log('Reading file...');
const content = fs.readFileSync(filePath, 'utf8');
console.log('File length:', content.length);

const keywords = [
  'rpg', 'renpy', 'rpy', 'rpgmaker', 'dịch game', 'dich game', 
  'visual novel', 'CommonEvents', 'MapInfos', 'translate', 'translation',
  'tool', ' công cụ'
];

for (const kw of keywords) {
  const regex = new RegExp(kw, 'gi');
  const matches = content.match(regex);
  console.log(`Keyword "${kw}": ${matches ? matches.length : 0} matches`);
}

// Find occurrences of renpy or rpgmaker in context
function findContext(keyword, max = 5) {
  console.log(`\n--- Samples for "${keyword}": ---`);
  let index = 0;
  let count = 0;
  const lower = content.toLowerCase();
  const kwLower = keyword.toLowerCase();
  while ((index = lower.indexOf(kwLower, index)) !== -1 && count < max) {
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 200);
    console.log(`[#${count + 1} at ${index}]:\n` + content.substring(start, end).replace(/\n/g, ' '));
    index += kwLower.length;
    count++;
  }
}

findContext('renpy', 5);
findContext('rpgmaker', 5);
findContext('dịch game', 5);
findContext('dich game', 5);
findContext('rpy', 5);
