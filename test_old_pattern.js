const oldPattern = /^(\s*)([a-zA-Z0-9_\-\.]+)?(\s*(?:_\()?)(["'])(.*?)(?<!\\)\4(\)?.*)$/;
console.log('        "Take shortcut":'.match(oldPattern));
