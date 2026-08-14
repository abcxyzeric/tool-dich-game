const linePattern = /^(\s*)(?:(["'])(.*?)(?<!\\)\2\s+|([a-zA-Z0-9_\-\.]+)\s+)?(?:_\()?(["'])(.*?)(?<!\\)\5(\)?.*)$/;

const lines = [
  ' "Driver" "Your name should be enough." ',
  '        "Take shortcut":',
  '        "Take a cab":',
  '    e "Hello world" with dissolve',
  '    "Just dialogue"',
  '            text _("Home sweet home") xoffset -300',
  '    add "bg.jpg"'
];

lines.forEach(line => {
  const match = line.match(linePattern);
  if (match) {
    console.log(`Matched: ${line}`);
    console.log(` 1 (prefix): [${match[1]}]`);
    console.log(` 2 (speaker quote): [${match[2]}]`);
    console.log(` 3 (quoted speaker): [${match[3]}]`);
    console.log(` 4 (unquoted speaker): [${match[4]}]`);
    console.log(` 5 (quote char): [${match[5]}]`);
    console.log(` 6 (text): [${match[6]}]`);
    console.log(` 7 (suffix): [${match[7]}]`);
    console.log('---');
  } else {
    console.log(`Failed: ${line}`);
    console.log('---');
  }
});
