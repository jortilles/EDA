export interface MailKpiVariable {
  /** Base name, e.g. "p1" */
  base: string;
  /** `${p1.title}` — resolves to the panel's current title */
  titleToken: string;
  /** `${p1.value}` — resolves to the panel's current KPI value */
  valueToken: string;
  panelId: string;
  /** Current panel title, for the dialog listing */
  title: string;
}

/** Client-side preview substitution: `${pN.title}` -> the real title, `${pN.value}` -> a visible
 * placeholder. The real value is only known at send time (per-recipient query), so we don't fake one. */
export function renderMailPreview(template: string, vars: MailKpiVariable[]): string {
  let out = template || '';
  for (const v of vars) {
    out = out.split(v.titleToken).join(v.title);
    out = out.split(v.valueToken).join(`[valor de "${v.title}"]`);
  }
  return out;
}

/** `${pN.title}` / `${pN.value}` tokens for each KPI panel, shown in the mail-config dialogs.
 * N is a 1-based index over the dashboard's KPI panels in document order. */
export function buildKpiVariables(panels: any[] = []): MailKpiVariable[] {
  return (panels || [])
    .filter(p => String(p?.content?.chart ?? p?.chart ?? '').startsWith('kpi'))
    .map((p, i) => {
      const base = `p${i + 1}`;
      return {
        base,
        titleToken: '${' + base + '.title}',
        valueToken: '${' + base + '.value}',
        panelId: p?.id ?? p?.panelId ?? '',
        title: p?.title || `KPI ${i + 1}`,
      };
    });
}
