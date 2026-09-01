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

export type KpiSeriesItem = { label: string; value: number };

function fmtNum(n: number): string {
  return Number.isFinite(n) ? Number(n).toLocaleString('de-DE') : String(n);
}

/** Text a `${pN.value...}` token produces from a panel's series (client-side preview; mirrors
 * MailingService.kpiTokenValue on the backend). Returns '' when there's no series. */
export function formatKpiToken(items: KpiSeriesItem[], kind: 'value' | 'breakdown' | 'top' | 'bottom' | 'average'): string {
  if (!items || !items.length) return '';
  const pair = (i: KpiSeriesItem) => (i.label ? `${i.label}: ${fmtNum(i.value)}` : fmtNum(i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  switch (kind) {
    case 'top':       return pair(items.reduce((a, b) => (b.value > a.value ? b : a)));
    case 'bottom':    return pair(items.reduce((a, b) => (b.value < a.value ? b : a)));
    case 'average':   return fmtNum(total / items.length);
    case 'breakdown': return items.map(pair).join(', ');
    default:          return fmtNum(total);
  }
}

/** Resolves a token variant for the preview: the real value when `seriesOf` yields data,
 * otherwise a descriptive placeholder. */
function previewValue(
  v: MailKpiVariable,
  kind: 'value' | 'breakdown' | 'top' | 'bottom' | 'average',
  valueOf?: (panelId: string) => string,
  seriesOf?: (panelId: string) => KpiSeriesItem[],
): string {
  const series = seriesOf ? seriesOf(v.panelId) : [];
  if (series && series.length) return formatKpiToken(series, kind);
  if (kind === 'value') return valueOf ? valueOf(v.panelId) : `[valor de "${v.title}"]`;
  const labels: Record<string, string> = {
    breakdown: `[desglose de "${v.title}"]`,
    top: `[máximo de "${v.title}"]`,
    bottom: `[mínimo de "${v.title}"]`,
    average: `[media de "${v.title}"]`,
  };
  return labels[kind];
}

/** Plain-text preview substitution (for the subject line). */
export function renderMailPreview(
  template: string,
  vars: MailKpiVariable[],
  valueOf?: (panelId: string) => string,
  seriesOf?: (panelId: string) => KpiSeriesItem[],
): string {
  let out = template || '';
  for (const v of vars) {
    out = out.split(v.breakdownToken).join(previewValue(v, 'breakdown', valueOf, seriesOf));
    out = out.split(v.topToken).join(previewValue(v, 'top', valueOf, seriesOf));
    out = out.split(v.bottomToken).join(previewValue(v, 'bottom', valueOf, seriesOf));
    out = out.split(v.averageToken).join(previewValue(v, 'average', valueOf, seriesOf));
    out = out.split(v.titleToken).join(v.title);
    out = out.split(v.valueToken).join(previewValue(v, 'value', valueOf, seriesOf));
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
  valueOf?: (panelId: string) => string,
  seriesOf?: (panelId: string) => KpiSeriesItem[],
): string {
  let out = template || '';
  const hl = (text: string, tip: string) =>
    `<span class="eda-mail-var" title="${escAttr(tip)}">${escAttr(text)}</span>`;
  for (const v of vars) {
    out = out.split(v.breakdownToken).join(hl(previewValue(v, 'breakdown', valueOf, seriesOf), `desglose de "${v.title}"`));
    out = out.split(v.topToken).join(hl(previewValue(v, 'top', valueOf, seriesOf), `máximo de "${v.title}"`));
    out = out.split(v.bottomToken).join(hl(previewValue(v, 'bottom', valueOf, seriesOf), `mínimo de "${v.title}"`));
    out = out.split(v.averageToken).join(hl(previewValue(v, 'average', valueOf, seriesOf), `media de "${v.title}"`));
    out = out.split(v.titleToken).join(hl(v.title, `título de "${v.title}"`));
    out = out.split(v.valueToken).join(hl(previewValue(v, 'value', valueOf, seriesOf), `valor de "${v.title}"`));
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
