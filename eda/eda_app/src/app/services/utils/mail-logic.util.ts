/**
 * Conditional / loop blocks for mail templates. A block is fenced by `""CODE` (own line) and
 * `CODE""` (own line); inside:
 *
 *   - `if` / `elif` / `else` / `end` lines pick which text is emitted.
 *   - `for <item> in <path>` / `end` repeats its body once per element of the array found at
 *     `<path>` (e.g. `p1.value.breakdown`), binding `<item>` to that element (`{label, value}`).
 *     `for <item>, <idx> in <path>` also binds a 1-based index.
 *
 * `${…}` tokens found *inside* a CODE block are resolved against this same context (so `for`
 * bodies can read their loop variable, and `if`/`for` can use the built-in `now` clock below). A
 * token whose path isn't found in the context is left untouched — this is how plain `${pN...}`
 * tokens, substituted by the caller *before* this module ever sees the text, pass through
 * unharmed when they land inside a CODE block too.
 *
 * Built-in: `now.date` / `now.time` / `now.datetime` — today's date, caught fresh on every render.
 *
 *   ""CODE
 *   if p1.value > 1000000
 *     Excelente mes: ${p1.value}
 *   elif p1.value > 500000
 *     Mes correcto
 *   else
 *     Ojo, ventas bajas
 *   end
 *
 *   Informe del ${now.date}
 *   for row in p1.value.breakdown
 *     <tr><td>${row.label}</td><td>${row.value}h</td></tr>
 *   end
 *   CODE""
 *
 * Conditions: `<operand> <op> <operand>` with `> < >= <= == != contains`, joined by `and` / `or`.
 * Operands are numbers, "quoted strings", true/false/null, or context paths (`p1.value`,
 * `p1.top.label`, `row.value`, …).
 *
 * One `""CODE` fence per region; nest with nested `if`/`for`, not nested fences.
 * Kept dependency-free and identical on the backend (eda_api) on purpose.
 */

export type MailLogicCtx = Record<string, any>;

type Node =
  | { t: 'text'; v: string }
  | { t: 'if'; branches: { cond: string | null; body: Node[] }[] }
  | { t: 'for'; varName: string; indexName: string | null; listPath: string; body: Node[] };

const BLOCK_RE = /[ \t]*""CODE[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*CODE""[ \t]*/g;

export function hasMailLogic(text: string): boolean {
  return !!text && text.indexOf('""CODE') >= 0;
}

/** `pN` object exposed to `""CODE` conditions: `.value` (total / single KPI value), `.average`,
 * `.count`, `.top` / `.bottom` `{label, value}`, `.breakdown` `[{label, value}]`, `.title`. */
export function buildKpiCtxNode(title: string, items: { label: string; value: number }[]): any {
  const total = (items || []).reduce((s, it) => s + (Number(it.value) || 0), 0);
  const top = items?.length ? items.reduce((a, b) => (b.value > a.value ? b : a)) : null;
  const bottom = items?.length ? items.reduce((a, b) => (b.value < a.value ? b : a)) : null;
  return {
    title: title ?? '',
    value: items?.length ? total : null,
    average: items?.length ? total / items.length : null,
    count: items?.length ?? 0,
    top: top ? { label: top.label, value: top.value } : null,
    bottom: bottom ? { label: bottom.label, value: bottom.value } : null,
    breakdown: (items || []).map(it => ({ label: it.label, value: it.value })),
  };
}

function nowCtx(): { date: string; time: string; datetime: string } {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
  const time = `${p2(d.getHours())}:${p2(d.getMinutes())}`;
  return { date, time, datetime: `${date} ${time}` };
}

/** Replaces every `""CODE … CODE""` block with its rendered output (branch picked by `if`, body
 * repeated by `for`). A malformed block is left exactly as the user typed it. */
export function renderMailLogic(text: string, ctx: MailLogicCtx): string {
  if (!hasMailLogic(text)) return text || '';
  const fullCtx: MailLogicCtx = { now: nowCtx(), ...(ctx || {}) };
  return text.replace(BLOCK_RE, (whole, body) => {
    try {
      const out = renderNodes(parse(String(body).split(/\r?\n/)), fullCtx);
      return out.replace(/^\n+/, '').replace(/\n+$/, '');
    } catch {
      return whole;
    }
  });
}

// ---- parse -----------------------------------------------------------------

function keywordAt(lines: string[], i: number): string | null {
  const m = String(lines[i] ?? '').trim().match(/^(if|elif|else|end|for)\b/);
  return m ? m[1] : null;
}
function condOf(line: string): string {
  return String(line).trim().replace(/^(if|elif)\s+/, '').trim();
}
function forHeaderOf(line: string): { varName: string; indexName: string | null; listPath: string } {
  const m = String(line).trim().match(/^for\s+(\w+)(?:\s*,\s*(\w+))?\s+in\s+(.+)$/i);
  if (!m) throw new Error('bloque "for" mal formado');
  return { varName: m[1], indexName: m[2] || null, listPath: m[3].trim() };
}

function parse(lines: string[]): Node[] {
  let i = 0;
  const IF_STOP = new Set(['elif', 'else', 'end']);

  function seq(stop: Set<string>): Node[] {
    const nodes: Node[] = [];
    while (i < lines.length) {
      const kw = keywordAt(lines, i);
      if (kw && stop.has(kw)) break;
      if (kw === 'if') {
        nodes.push(parseIf());
      } else if (kw === 'for') {
        nodes.push(parseFor());
      } else if (kw === 'elif' || kw === 'else' || kw === 'end') {
        throw new Error('bloque mal formado');
      } else {
        nodes.push({ t: 'text', v: lines[i] });
        i++;
      }
    }
    return nodes;
  }

  function parseIf(): Node {
    const branches: { cond: string | null; body: Node[] }[] = [];
    branches.push({ cond: condOf(lines[i++]), body: seq(IF_STOP) });
    while (keywordAt(lines, i) === 'elif') {
      branches.push({ cond: condOf(lines[i++]), body: seq(IF_STOP) });
    }
    if (keywordAt(lines, i) === 'else') {
      i++;
      branches.push({ cond: null, body: seq(new Set(['end'])) });
    }
    if (keywordAt(lines, i) !== 'end') throw new Error('falta "end"');
    i++;
    return { t: 'if', branches };
  }

  function parseFor(): Node {
    const { varName, indexName, listPath } = forHeaderOf(lines[i++]);
    const body = seq(new Set(['end']));
    if (keywordAt(lines, i) !== 'end') throw new Error('falta "end" en for');
    i++;
    return { t: 'for', varName, indexName, listPath, body };
  }

  return seq(new Set());
}

function renderNodes(nodes: Node[], ctx: MailLogicCtx): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (n.t === 'text') {
      parts.push(interpolate(n.v, ctx));
    } else if (n.t === 'if') {
      const b = n.branches.find(br => br.cond === null || evalCondition(br.cond, ctx));
      if (b) parts.push(renderNodes(b.body, ctx));
    } else {
      const list = resolveOperand(n.listPath, ctx);
      if (Array.isArray(list)) {
        list.forEach((item, idx) => {
          const childCtx: MailLogicCtx = { ...ctx, [n.varName]: item };
          if (n.indexName) childCtx[n.indexName] = idx + 1;
          parts.push(renderNodes(n.body, childCtx));
        });
      }
    }
  }
  return parts.join('\n');
}

// ---- `${…}` interpolation (inside CODE blocks only) ------------------------

/** Replaces `${path}` with the value at `path` in `ctx`. A token whose path can't be fully
 * resolved (missing segment) is left untouched — see the module doc comment. */
function interpolate(text: string, ctx: MailLogicCtx): string {
  if (text.indexOf('${') < 0) return text;
  return text.replace(/\$\{\s*([^}]+?)\s*\}/g, (whole, path) => {
    const { found, value } = resolvePath(String(path), ctx);
    return found ? formatValue(value) : whole;
  });
}

function resolvePath(path: string, ctx: MailLogicCtx): { found: boolean; value: any } {
  let cur: any = ctx;
  for (const seg of path.split('.')) {
    if (cur === null || cur === undefined || typeof cur !== 'object' || !(seg in cur)) {
      return { found: false, value: undefined };
    }
    cur = cur[seg];
  }
  return { found: true, value: cur };
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return Number.isFinite(v) ? v.toLocaleString('de-DE') : String(v);
  return String(v);
}

// ---- condition evaluation -----------------------------------------------

function evalCondition(expr: string, ctx: MailLogicCtx): boolean {
  return splitTop(expr, 'or').some(orPart =>
    splitTop(orPart, 'and').every(andPart => evalComparison(andPart, ctx)),
  );
}

/** Splits on ` and `/` or ` (case-insensitive) outside quotes. */
function splitTop(s: string, sep: 'and' | 'or'): string[] {
  const out: string[] = [];
  let buf = '';
  let quote = '';
  const tail = new RegExp(`\\s+${sep}\\s+$`, 'i');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      buf += c;
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    buf += c;
    const m = buf.match(tail);
    if (m) { out.push(buf.slice(0, buf.length - m[0].length)); buf = ''; }
  }
  out.push(buf);
  return out.map(x => x.trim()).filter(Boolean);
}

function evalComparison(part: string, ctx: MailLogicCtx): boolean {
  const m = part.match(/^(.+?)\s*(>=|<=|==|!=|>|<|contains)\s*(.+)$/i);
  if (!m) {
    const v = resolveOperand(part.trim(), ctx);
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== '' && v !== false && v !== 0;
  }
  const left = resolveOperand(m[1].trim(), ctx);
  const op = m[2].toLowerCase();
  const right = resolveOperand(m[3].trim(), ctx);

  if (op === 'contains') {
    if (Array.isArray(left)) {
      return left.some((x: any) => String(x) === String(right) || (x && String(x.label) === String(right)));
    }
    return String(left ?? '').toLowerCase().includes(String(right ?? '').toLowerCase());
  }

  const ln = Number(left);
  const rn = Number(right);
  const bothNum = left !== null && left !== '' && right !== null && right !== ''
    && Number.isFinite(ln) && Number.isFinite(rn);
  const a: any = bothNum ? ln : String(left ?? '');
  const b: any = bothNum ? rn : String(right ?? '');
  switch (op) {
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
    case '==': return a === b;
    case '!=': return a !== b;
  }
  return false;
}

function resolveOperand(op: string, ctx: MailLogicCtx): any {
  if (/^-?\d[\d_]*(\.\d+)?$/.test(op)) return Number(op.replace(/_/g, ''));
  if (/^"(.*)"$/.test(op) || /^'(.*)'$/.test(op)) return op.slice(1, -1);
  if (op === 'true') return true;
  if (op === 'false') return false;
  if (op === 'null' || op === 'nil') return null;
  let cur: any = ctx;
  for (const seg of op.split('.')) {
    if (cur === null || cur === undefined) return null;
    cur = cur[seg];
  }
  return cur ?? null;
}
