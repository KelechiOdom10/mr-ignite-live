export interface Template {
  name: string;
  params: Record<string, string>;
  start: number;
  end: number;
}

function findTemplateEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") {
      depth++;
      i++;
    } else if (text[i] === "}" && text[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let linkDepth = 0;
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === "{{") depth++;
    else if (two === "}}") depth--;
    else if (two === "[[") linkDepth++;
    else if (two === "]]") linkDepth--;
    if (body[i] === "|" && depth === 0 && linkDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += body[i];
  }
  parts.push(current);
  return parts;
}

export function parseTemplateAt(text: string, start: number): Template | null {
  const end = findTemplateEnd(text, start);
  if (end < 0) return null;
  const [rawName = "", ...rest] = splitTopLevel(text.slice(start + 2, end - 2));
  const params: Record<string, string> = {};
  let positional = 1;
  for (const part of rest) {
    const eq = part.indexOf("=");
    const braceBeforeEq = part.indexOf("{{");
    if (eq >= 0 && (braceBeforeEq < 0 || eq < braceBeforeEq)) {
      params[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
    } else {
      params[String(positional++)] = part.trim();
    }
  }
  return { name: rawName.trim(), params, start, end };
}

export function findTemplates(text: string, name: string): Template[] {
  const found: Template[] = [];
  const re = new RegExp(`\\{\\{\\s*${name}\\s*[|}]`, "g");
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const t = parseTemplateAt(text, m.index);
    if (t) found.push(t);
  }
  return found;
}

export function stripMarkup(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}
