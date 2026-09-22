/**
 * Conditional blocks for mail templates. A block is fenced by `""CODE` (own line) and `CODE""`
 * (own line); inside, `if` / `elif` / `else` / `end` lines drive which text is emitted:
 *
 *   ""CODE
 *   if p1.value > 1000000
 *     Excelente mes: ${p1.value}
 *   elif p1.value > 500000
 *     Mes correcto
 *   else
 *     Ojo, ventas bajas
 *   end
 *   CODE""
 *
 * Conditions: `<operand> <op> <operand>` with `> < >= <= == != contains`, joined by `and` / `or`.
 * Operands are numbers, "quoted strings", true/false/null, or context paths (`p1.value`,
 * `p1.top.label`, …). `${…}` tokens are left untouched — resolve those separately.
 *
 * One `""CODE` fence per region; nest with nested `if`, not nested fences.
 * Kept dependency-free and identical on the backend (eda_api) on purpose.
 */

export type MailLogicCtx = Record<string, any>;

type Node = { t: 'text'; v: string } | { t: 'if'; branches: { cond: string | null; body: Node[] }[] };

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

/** Replaces every `""CODE … CODE""` block with the branch that matches `ctx`. A malformed block
 * is left exactly as the user typed it. */
export function renderMailLogic(text: string, ctx: MailLogicCtx): string {
  if (!hasMailLogic(text)) return text || '';
  return text.replace(BLOCK_RE, (whole, body) => {
    try {
      const out = renderNodes(parse(String(body).split(/\r?\n/)), ctx || {});
      return out.replace(/^\n+/, '').replace(/\n+$/, '');
    } catch {
      return whole;
    }
  });
}

// ---- parse -----------------------------------------------------------------

function keywordAt(lines: string[], i: number): string | null {
  const m = String(lines[i] ?? '').trim().match(/^(if|elif|else|end)\b/);
  return m ? m[1] : null;
}
function condOf(line: string): string {
  return String(line).trim().replace(/^(if|elif)\s+/, '').trim();
}

function parse(lines: string[]): Node[] {
  let i = 0;
  const STOP = new Set(['elif', 'else', 'end']);

  function seq(stop: Set<string>): Node[] {
    const nodes: Node[] = [];
    while (i < lines.length) {
      const kw = keywordAt(lines, i);
      if (kw && stop.has(kw)) break;
      if (kw === 'if') {
        nodes.push(parseIf());
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
    branches.push({ cond: condOf(lines[i++]), body: seq(STOP) });
    while (keywordAt(lines, i) === 'elif') {
      branches.push({ cond: condOf(lines[i++]), body: seq(STOP) });
    }
    if (keywordAt(lines, i) === 'else') {
      i++;
      branches.push({ cond: null, body: seq(new Set(['end'])) });
    }
    if (keywordAt(lines, i) !== 'end') throw new Error('falta "end"');
    i++;
    return { t: 'if', branches };
  }

  return seq(new Set());
}

function renderNodes(nodes: Node[], ctx: MailLogicCtx): string {
  const parts: string[] = [];
  for (const n of nodes) {
    if (n.t === 'text') {
      parts.push(n.v);
    } else {
      const b = n.branches.find(br => br.cond === null || evalCondition(br.cond, ctx));
      if (b) parts.push(renderNodes(b.body, ctx));
    }
  }
  return parts.join('\n');
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
