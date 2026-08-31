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

/** Plain-text preview substitution (for the subject line): `${pN.title}` -> the real title,
 * `${pN.value}` -> the panel's current value (via `valueOf`) or a placeholder. */
export function renderMailPreview(
  template: string,
  vars: MailKpiVariable[],
  valueOf?: (panelId: string) => string
): string {
  let out = template || '';
  for (const v of vars) {
    out = out.split(v.titleToken).join(v.title);
    out = out.split(v.valueToken).join(valueOf ? valueOf(v.panelId) : `[valor de "${v.title}"]`);
  }
  return out;
}

function escAttr(s: string): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** HTML preview (for the body): keeps the user's HTML untouched but renders each `${pN.title}` /
 * `${pN.value}` as a green highlight. `${pN.value}` shows the panel's current value (via `valueOf`),
 * with the descriptive placeholder as tooltip. */
export function renderMailPreviewHtml(
  template: string,
  vars: MailKpiVariable[],
  valueOf?: (panelId: string) => string
): string {
  let out = template || '';
  for (const v of vars) {
    const t = escAttr(v.title);
    out = out.split(v.titleToken).join(
      `<span class="eda-mail-var" title="título de &quot;${t}&quot;">${t}</span>`
    );
    const val = escAttr(valueOf ? valueOf(v.panelId) : v.valueToken);
    out = out.split(v.valueToken).join(
      `<span class="eda-mail-var" title="[valor de &quot;${t}&quot;]">${val}</span>`
    );
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
