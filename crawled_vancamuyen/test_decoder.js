const fs = require('fs');

const s = fs.readFileSync('crawled_vancamuyen/index-main.js', 'utf8');

// The rotation IIFE is at the beginning:
// (function(a,b){ ... }(w_a,0xc607a));
const iifeStart = s.indexOf('(function(a,b){');
const iifeEnd = s.indexOf('}(w_a,0xc607a));') + '}(w_a,0xc607a));'.length;
const iifeCode = s.slice(iifeStart, iifeEnd);

// w_a is from posA to posAEnd + 'return w_a();}'.length
const posA = s.indexOf('function w_a(){');
const posAEnd = s.indexOf('return w_a();}', posA) + 'return w_a();}'.length;
const waCode = s.slice(posA, posAEnd);

// w_b is from posB to end of w_b
const posB = s.indexOf('function w_b(');
const searchEnd = ':d=h,d;}';
const posBEnd = s.indexOf(searchEnd, posB) + searchEnd.length;
const wbCode = s.slice(posB, posBEnd);

console.log('Extracted wa length:', waCode.length);
console.log('Extracted iife length:', iifeCode.length);
console.log('Extracted wb length:', wbCode.length);

const fullSetup = `
${waCode}
${wbCode}
${iifeCode}
module.exports = { w_b, w_a };
`;

fs.writeFileSync('crawled_vancamuyen/decoder.js', fullSetup);
console.log('Saved decoder.js, testing require...');

const path = require('path');
const decoderPath = path.resolve(__dirname, 'decoder.js');
const { w_b } = require(decoderPath);
console.log('Testing w_b(0x188e):', w_b(0x188e));
console.log('Testing w_b(0x29b2):', w_b(0x29b2));
console.log('Testing w_b(0x44c1):', w_b(0x44c1));
