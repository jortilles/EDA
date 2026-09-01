export interface MailKpiVariable {
  /** Base name, e.g. "p1" */
  base: string;
  /** `${p1.title}` — resolves to the panel's current title */
  titleToken: string;
  /** `${p1.value}` — the panel's headline number */
  valueToken: string;
  /** `${p1.value.breakdown}` / `.top` / `.bottom` / `.average` — only meaningful for
   * category-based KPIs (kpibar / kpiline / kpiarea) */
  breakdownToken: string;
  topToken: string;
  bottomToken: string;
  averageToken: string;
  /** true for kpibar / kpiline / kpiarea — those support the breakdown/top/bottom/average tokens */
  hasBreakdown: boolean;
  panelId: string;
  /** Current panel title, for the dialog listing */
  title: string;
}

/** Plain-text preview substitution (for the subject line). `${pN.title}` -> the real title,
 * `${pN.value}` -> the panel's current value (via `valueOf`); the breakdown/top/bottom/average
 * variants show a descriptive placeholder (their real value is only known at send time). */
export function renderMailPreview(
  template: string,
  vars: MailKpiVariable[],
  valueOf?: (panelId: string) => string
): string {
  let out = template || '';
  for (const v of vars) {
    out = out.split(v.breakdownToken).join(`[desglose de "${v.title}"]`);
    out = out.split(v.topToken).join(`[máximo de "${v.title}"]`);
    out = out.split(v.bottomToken).join(`[mínimo de "${v.title}"]`);
    out = out.split(v.averageToken).join(`[media de "${v.title}"]`);
    out = out.split(v.titleToken).join(v.title);
    out = out.split(v.valueToken).join(valueOf ? valueOf(v.panelId) : `[valor de "${v.title}"]`);
  }
  return out;
}

function escAttr(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** HTML preview (for the body): keeps the user's HTML untouched but renders each token as a
 * green highlight. */
export function renderMailPreviewHtml(
  template: string,
  vars: MailKpiVariable[],
  valueOf?: (panelId: string) => string
): string {
  let out = template || '';
  const hl = (text: string, tip: string) =>
    `<span class="eda-mail-var" title="${escAttr(tip)}">${escAttr(text)}</span>`;
  for (const v of vars) {
    out = out.split(v.breakdownToken).join(hl(`[desglose de "${v.title}"]`, `desglose de "${v.title}"`));
    out = out.split(v.topToken).join(hl(`[máximo de "${v.title}"]`, `máximo de "${v.title}"`));
    out = out.split(v.bottomToken).join(hl(`[mínimo de "${v.title}"]`, `mínimo de "${v.title}"`));
    out = out.split(v.averageToken).join(hl(`[media de "${v.title}"]`, `media de "${v.title}"`));
    out = out.split(v.titleToken).join(hl(v.title, `título de "${v.title}"`));
    const val = valueOf ? valueOf(v.panelId) : `[valor de "${v.title}"]`;
    out = out.split(v.valueToken).join(hl(val, `valor de "${v.title}"`));
  }
  return out;
}

/** Token descriptors for each KPI panel, shown in the mail-config dialogs. N is a 1-based index
 * over the dashboard's KPI panels in document order. */
export function buildKpiVariables(panels: any[] = []): MailKpiVariable[] {
  return (panels || [])
    .filter(p => String(p?.content?.chart ?? p?.chart ?? '').startsWith('kpi'))
    .map((p, i) => {
      const base = `p${i + 1}`;
      const chart = String(p?.content?.chart ?? p?.chart ?? '');
      const tk = (suffix: string) => '${' + base + '.' + suffix + '}';
      return {
        base,
        titleToken: tk('title'),
        valueToken: tk('value'),
        breakdownToken: tk('value.breakdown'),
        topToken: tk('value.top'),
        bottomToken: tk('value.bottom'),
        averageToken: tk('value.average'),
        hasBreakdown: chart === 'kpibar' || chart === 'kpiline' || chart === 'kpiarea',
        panelId: p?.id ?? p?.panelId ?? '',
        title: p?.title || `KPI ${i + 1}`,
      };
    });
}
