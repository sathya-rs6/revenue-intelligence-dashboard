/**
 * Lightweight YAML parser — handles the subset needed for routing rule configs.
 * Supports: key-value pairs, nested objects, arrays (list items), quoted strings,
 * numbers, booleans, null, inline list items, compound conditions.
 */

function stripComments(line) {
  let inQuote = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (!inQuote && (ch === '"' || ch === "'")) { inQuote = true; quoteChar = ch; }
    else if (inQuote && ch === quoteChar)         { inQuote = false; }
    else if (!inQuote && ch === '#')              { return line.slice(0, i); }
  }
  return line;
}

function parseScalar(s) {
  s = s.trim();
  if (s === '' || s === 'null' || s === '~')  return null;
  if (s === 'true')                            return true;
  if (s === 'false')                           return false;
  if (!isNaN(s) && s !== '')                  return Number(s);
  if ((s[0] === '"'  && s.at(-1) === '"')  ||
      (s[0] === "'"  && s.at(-1) === "'"))     return s.slice(1, -1);
  return s;
}

function tokenize(text) {
  return text
    .split('\n')
    .map(raw => stripComments(raw))
    .filter(raw => raw.trim().length > 0)
    .map(raw => ({ indent: raw.search(/\S/), text: raw.trim() }));
}

export function parseYAML(text) {
  const lines = tokenize(text);
  let cursor = 0;

  function peek()    { return lines[cursor]; }
  function advance() { return lines[cursor++]; }

  function parseNode(minIndent) {
    if (cursor >= lines.length) return null;
    const first = peek();
    if (first.indent < minIndent) return null;

    return first.text.startsWith('- ') || first.text === '-'
      ? parseArray(first.indent)
      : parseMapping(first.indent);
  }

  function parseMapping(baseIndent) {
    const obj = {};
    while (cursor < lines.length) {
      const ln = peek();
      if (ln.indent !== baseIndent) break;
      if (ln.text.startsWith('- ')) break;
      advance();

      const ci = ln.text.indexOf(': ');
      if (ci >= 0) {
        const key = ln.text.slice(0, ci).trim();
        const val = ln.text.slice(ci + 2).trim();
        if (val) {
          obj[key] = parseScalar(val);
        } else {
          // Nested node on following lines
          obj[key] = (cursor < lines.length && peek().indent > baseIndent)
            ? parseNode(peek().indent)
            : null;
        }
      } else if (ln.text.endsWith(':')) {
        const key = ln.text.slice(0, -1).trim();
        obj[key] = (cursor < lines.length && peek().indent > baseIndent)
          ? parseNode(peek().indent)
          : null;
      }
    }
    return obj;
  }

  function parseArray(baseIndent) {
    const arr = [];
    while (cursor < lines.length) {
      const ln = peek();
      if (ln.indent !== baseIndent) break;
      if (!ln.text.startsWith('- ') && ln.text !== '-') break;
      advance();

      const after = ln.text.slice(2).trim(); // content after '- '

      if (!after) {
        // Item is purely on next lines
        arr.push(
          cursor < lines.length && peek().indent > baseIndent
            ? parseNode(peek().indent)
            : null
        );
        continue;
      }

      const ci = after.indexOf(': ');
      if (ci < 0 && !after.endsWith(':')) {
        // Scalar list item
        arr.push(parseScalar(after));
        continue;
      }

      // Mapping item — first key may be inline, rest are indented
      const obj = {};
      if (ci >= 0) {
        const k = after.slice(0, ci).trim();
        const v = after.slice(ci + 2).trim();
        obj[k] = v ? parseScalar(v) : null;
      } else if (after.endsWith(':')) {
        const k = after.slice(0, -1).trim();
        obj[k] = null;
      }

      // Collect additional key-value pairs at deeper indent
      while (cursor < lines.length && peek().indent > baseIndent) {
        const sub = peek();
        const sci = sub.text.indexOf(': ');
        if (sci >= 0) {
          const k = sub.text.slice(0, sci).trim();
          const v = sub.text.slice(sci + 2).trim();
          advance();
          if (v) {
            obj[k] = parseScalar(v);
          } else {
            obj[k] = cursor < lines.length && peek().indent > sub.indent
              ? parseNode(peek().indent)
              : null;
          }
        } else if (sub.text.endsWith(':')) {
          const k = sub.text.slice(0, -1).trim();
          advance();
          obj[k] = cursor < lines.length && peek().indent > sub.indent
            ? parseNode(peek().indent)
            : null;
        } else {
          break;
        }
      }
      arr.push(obj);
    }
    return arr;
  }

  try {
    return parseNode(0);
  } catch (e) {
    throw new Error(`YAML parse error: ${e.message}`);
  }
}
