const fs = require('fs');
const path = require('path');
const { w_b, w_a } = require('./decoder.js');

const s = fs.readFileSync('crawled_vancamuyen/index-main.js', 'utf8');

// Find all chunk names or file names
const chunkRegex = /assets\/[A-Za-z0-9_-]+\.js/g;
// But wait, the chunk names are stored in w_b calls!
// Let's decode all w_aak / w_b calls across the whole file or find all decoded strings!

console.log('Total strings in table:', w_a().length);

// Let's decode every single string in the table!
const decodedStrings = [];
for (let i = 0x0; i < 0x6000; i++) {
  try {
    const val = w_b(i);
    if (val && typeof val === 'string' && val.length > 0) {
      decodedStrings.push({ index: i, val });
    }
  } catch (e) {
    // ignore
  }
}

console.log('Decoded total strings:', decodedStrings.length);

// Filter strings relevant to game, rpg, renpy, dich, translate, etc.
const keywords = ['rpg', 'renpy', 'rpy', 'game', 'dịch', 'dich', 'translate', 'novel', 'commonevents', 'map', 'json', 'vn', 'vancamuyen'];

const matches = decodedStrings.filter(item => {
  const lower = item.val.toLowerCase();
  return keywords.some(k => lower.includes(k));
});

console.log(`Found ${matches.length} matching strings:`);
matches.forEach(m => {
  console.log(`[0x${m.index.toString(16)}]: ${m.val}`);
});

// Also find all chunk files:
const chunks = decodedStrings.filter(item => item.val.startsWith('assets/') && item.val.endsWith('.js'));
console.log('\n--- Found JS Chunk files: ---');
chunks.forEach(c => console.log(c.val));
