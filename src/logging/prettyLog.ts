const prettyLog = (text: string): string => {
  const trimmed = text.trim();

  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return text;
  }

  try {
    JSON.parse(trimmed);
  } catch {
    return text;
  }

  const tokens = trimmed.match(/"(?:\\.|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g) ?? [];
  let depth = 0;
  let output = '';

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    const previous = tokens[index - 1];

    if (token === '{' || token === '[') {
      output += token;

      depth += 1;

      if (next !== '}' && next !== ']') {
        output += '\n' + '  '.repeat(depth);
      }

      continue;
    }

    if (token === '}' || token === ']') {
      depth -= 1;

      if (previous !== '{' && previous !== '[') {
        output += '\n' + '  '.repeat(depth);
      }

      output += token;

      continue;
    }

    if (token === ',') {
      output += ',\n' + '  '.repeat(depth);

      continue;
    }

    output += token === ':' ? ': ' : token;
  }

  return output;
};

export default prettyLog;
