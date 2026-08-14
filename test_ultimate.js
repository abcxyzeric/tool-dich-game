const linePattern = /^(\s*)((?:(["'])(.*?)(?<!\\)\3|([a-zA-Z0-9_\-\.]+))\s+)?(_\(\s*)?(["'])(.*?)(?<!\\)\7(\s*\)?.*)$/;

const lines = [
  ' "Driver" "Your name should be enough." ',
  '        "Take shortcut":',
  '        "Take a cab":',
  '    e "Hello world" with dissolve',
  '    "Just dialogue"',
  '            text _("Home sweet home") xoffset -300',
  '    add "bg.jpg"',
  '    text _( "Spaces inside" )',
  '$ var = "Code string"',
  'menu:',
  '    "Choice 1":'
];

lines.forEach(line => {
  const match = line.match(linePattern);
  if (match) {
    console.log(`Matched: ${line}`);
    console.log(` 1 (prefix): [${match[1]}]`);
    console.log(` 2 (speaker block): [${match[2]}]`);
    console.log(` 3 (speaker quote): [${match[3]}]`);
    console.log(` 4 (quoted speaker text): [${match[4]}]`);
    console.log(` 5 (unquoted speaker text): [${match[5]}]`);
    console.log(` 6 (translate marker): [${match[6]}]`);
    console.log(` 7 (dialogue quote): [${match[7]}]`);
    console.log(` 8 (dialogue text): [${match[8]}]`);
    console.log(` 9 (suffix): [${match[9]}]`);
    
    // Reconstruct test
    const safeTrans = "DỊCH";
    const recon = match[1] + (match[2]||'') + (match[6]||'') + match[7] + safeTrans + match[7] + match[9];
    console.log(` Reconstructed: ${recon}`);
    console.log('---');
  } else {
    console.log(`Failed: ${line}`);
    console.log('---');
  }
});
