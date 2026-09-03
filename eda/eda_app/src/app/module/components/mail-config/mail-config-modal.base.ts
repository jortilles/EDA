import { Directive, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject, signal } from "@angular/core";
import { Observable, lastValueFrom } from "rxjs";
import { AlertService, MailService, UserService } from "@eda/services/service.index";
import { AssistantService } from "@eda/services/api/assistant.service";
import { DateUtils } from "@eda/services/utils/date-utils.service";
import {
  buildKpiVariables, kpiVarTokens, MailKpiVariable, MailTokenKind, formatKpiToken,
  renderMailPreview, renderMailPreviewHtml,
} from "@eda/services/utils/mail-variables.util";
import { renderMailLogic, hasMailLogic, buildKpiCtxNode } from "@eda/services/utils/mail-logic.util";
import { LogoImage, SubLogoImage } from "@eda/configs/customizable/customizable_default";
import { WEEKDAY_OPTIONS, MONTHLY_ORDINAL_OPTIONS, MONTH_DAY_OPTIONS } from "@eda/services/utils/mail-schedule.util";

/** Shared dashboard / KPI-alert mail-config dialog. The two subclasses only supply where the
 * config is read from / written to, how "enviar ahora" is dispatched, and which panels feed the
 * `${pN}` variables. Everything else — the 3 steps, the preview, the frequency logic — lives here. */
@Directive()
export abstract class MailConfigModalBase implements OnInit {

  @Output() apply = new EventEmitter<any>();
  @Output() close = new EventEmitter<any>();

  /** Preview label for the KPI value line (alert dialog only). */
  @Input() kpiFieldName = '';

  protected alertService = inject(AlertService);
  protected userService = inject(UserService);
  protected dateUtils = inject(DateUtils);
  protected mailService = inject(MailService);
  protected assistantService = inject(AssistantService);

  public display = false;

  public units!: string;
  public quantity!: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailSubject = '';
  public mailMessage = '';
  public otherRecipients = '';
  public enabled = false;
  public aiAnalysis = false;
  public isSending = signal<boolean>(false);

  public users: any[] = [];
  public selectedUsers: any[] = [];
  protected savedUserRefs: any[] = [];

  public availableChatGpt = false;
  public get aiAvailable(): boolean { return !!this.availableChatGpt; }

  public weekdayOptions = WEEKDAY_OPTIONS;
  public ordinalOptions = MONTHLY_ORDINAL_OPTIONS;
  public weekday = 1;
  public monthlyMode: 'dom' | 'nth' = 'dom';
  public monthlyDay: number | 'last' = 1;
  public monthlyOrdinal = 'first';
  public monthlyWeekday = 1;
  public monthlyModeOptions = [
    { label: $localize`:@@mailFreqMonthlyDom:El día del mes`, value: 'dom' },
    { label: $localize`:@@mailFreqMonthlyNth:Un día de la semana`, value: 'nth' },
  ];
  public monthDayDropdownOptions = [
    ...MONTH_DAY_OPTIONS.map(n => ({ label: String(n), value: n as number | string })),
    { label: $localize`:@@mailFreqLastDay:Último día`, value: 'last' },
  ];

  public logoImage = LogoImage;
  public bannerImage = SubLogoImage;
  public noSubjectLabel = $localize`:@@mailNoSubject:Sin asunto`;
  public previewKpiLabel = $localize`:@@mailPreviewKpiLabel:Valor del KPI`;

  /** true in the KPI-alert dialog — toggles the alert-specific copy + preview blocks. */
  abstract get isAlert(): boolean;
  /** Panels that back the `${pN}` variables. */
  protected abstract get variablePanels(): any[];
  /** Dashboard id for the "Abrir en Edalitics" link. */
  protected abstract get linkDashboardId(): string;
  /** Loads the saved config into the form fields + `savedUserRefs`. */
  abstract loadConfig(): void;
  /** Emits the config to persist. */
  abstract save(): void;
  /** "Enviar una copia ahora". */
  abstract sendNow(): Promise<void>;

  /** Header subtitle (dashboard title). */
  public get subtitle(): string { return ''; }
  /** Appended to the footer summary (alert condition note). */
  protected footerCondition = '';

  ngOnInit(): void {
    this.loadConfig();

    this.assistantService.availableChatGpt().subscribe(
      (r: any) => this.availableChatGpt = !!r?.response?.available,
      () => this.availableChatGpt = false,
    );
    this.userService.getUsers().subscribe(
      res => {
        this.users = res.map((u: any) => ({ label: u.name || u.email, value: u }));
        this.reconcileSelectedUsers();
      },
      err => console.log(err),
    );
  }

  /** Pre-selects the saved recipients using the option objects (so the multiselect renders them
   * as chosen, not just the chip list below it). */
  protected reconcileSelectedUsers(): void {
    const refs = this.savedUserRefs || [];
    this.selectedUsers = (this.users || []).filter((opt: any) =>
      refs.some((r: any) => (r?._id && r._id === opt.value?._id) || (r?.email && r.email === opt.value?.email)),
    );
  }

  // ---- schedule ---------------------------------------------------------------

  public setUnits(u: string): void {
    this.units = u;
    if (u === 'hours' && !this.quantity) this.quantity = 12;
  }

  public seg(u: string): string {
    return this.units === u
      ? 'bg-[var(--corporate-primary)] text-white'
      : 'text-gray-500 hover:bg-white/70';
  }

  public clampQuantity(): void {
    if (this.quantity != null && this.quantity < 1) this.quantity = 1;
  }
  public blockNonPositive(e: KeyboardEvent): void {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  }
  public onHoursBlur(): void {
    if (this.hours) this.hours = this.dateUtils.roundToNearestHalfHour(this.hours);
  }

  private weekdayLong(v: number): string {
    return WEEKDAY_OPTIONS.find(o => o.value === v)?.long ?? '';
  }
  private ordinalLabel(v: string): string {
    return MONTHLY_ORDINAL_OPTIONS.find(o => o.value === v)?.label ?? '';
  }

  public get hoursLabel(): string {
    const d = this.hours instanceof Date ? this.hours : null;
    if (!d) return '--:--';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  public get frequencySummary(): string {
    const t = this.hoursLabel;
    switch (this.units) {
      case 'hours': return this.quantity > 0 ? `cada ${this.quantity} h` : 'cada X horas';
      case 'days': return `cada día a las ${t}`;
      case 'weekly': return `cada ${this.weekdayLong(this.weekday).toLowerCase()} a las ${t}`;
      case 'monthly': {
        const when = this.monthlyMode === 'dom'
          ? (this.monthlyDay === 'last' ? 'el último día' : `el día ${this.monthlyDay}`)
          : `el ${this.ordinalLabel(this.monthlyOrdinal).toLowerCase()} ${this.weekdayLong(this.monthlyWeekday).toLowerCase()}`;
        return `${when} de cada mes a las ${t}`;
      }
      default: return '';
    }
  }

  public get footerSummary(): string {
    if (!this.units) return 'Sin programación configurada';
    const n = this.allRecipientEmails.length;
    const dest = n === 1 ? '1 destinatario' : `${n} destinatarios`;
    return `Se enviará ${this.frequencySummary} a ${dest}${this.footerCondition}`;
  }

  // ---- recipients -----------------------------------------------------------

  public parseOtherRecipients(): string[] {
    return this.otherRecipients.split(/\s+/).map(e => e.trim()).filter(e => e.length > 0);
  }

  public get registeredEmails(): string[] {
    return (this.selectedUsers || []).map((u: any) => (u.value ?? u).email).filter(Boolean);
  }

  public get allRecipientEmails(): string[] {
    return Array.from(new Set([...this.registeredEmails, ...this.parseOtherRecipients()]));
  }

  public get previewRecipientsLabel(): string {
    const list = this.allRecipientEmails;
    if (list.length === 0) return 'Sin destinatarios';
    const shown = list.slice(0, 2).join(', ');
    return list.length > 2 ? `${shown} (+${list.length - 2})` : shown;
  }

  public get recipientChips(): { label: string; kind: 'user' | 'external' }[] {
    const users = (this.selectedUsers || []).map((u: any) => {
      const r = u.value ?? u;
      return { label: r.name || r.email, kind: 'user' as const };
    });
    const ext = this.parseOtherRecipients().map(e => ({ label: e, kind: 'external' as const }));
    return [...users, ...ext];
  }

  public removeChip(chip: { label: string; kind: 'user' | 'external' }): void {
    if (chip.kind === 'user') {
      this.selectedUsers = (this.selectedUsers || []).filter((u: any) => {
        const r = u.value ?? u;
        return (r.name || r.email) !== chip.label;
      });
    } else {
      this.otherRecipients = this.parseOtherRecipients().filter(e => e !== chip.label).join(' ');
    }
  }

  // ---- variables + conditions help --------------------------------------

  public readonly messageExample =
    'Hola,\n\nResumen de ${p1.title}: ${p1.value}\n\n""CODE\nif p1.value > 1000000\n  Excelente mes 🎉\nelse\n  Mes por debajo de lo esperado\nend\nCODE""\n\nUn saludo.';

  // reference card: KPI value tokens with a plain-language meaning
  public readonly refVars: { token: string; desc: string }[] = [
    { token: '${p1.title}', desc: $localize`:@@mailRefVarTitle:el título del KPI` },
    { token: '${p1.value}', desc: $localize`:@@mailRefVarValue:el valor actual del KPI` },
    { token: '${p1.value.top}', desc: $localize`:@@mailRefVarTop:la categoría con el valor más alto` },
    { token: '${p1.value.bottom}', desc: $localize`:@@mailRefVarBottom:la categoría con el valor más bajo` },
    { token: '${p1.value.average}', desc: $localize`:@@mailRefVarAvg:la media de las categorías` },
    { token: '${p1.value.breakdown}', desc: $localize`:@@mailRefVarBreakdown:todas las categorías con su valor` },
  ];

  public readonly condOps = '>   <   >=   <=   ==   !=   contains';

  // full worked example shown on the left side of the reference card
  public readonly refExample =
    'Asunto: Resumen de ${p1.title}\n' +
    '\n' +
    'Hola,\n' +
    '\n' +
    'El valor de ${p1.title} es ${p1.value}.\n' +
    'Media por categoría: ${p1.value.average}\n' +
    'Categoría más alta: ${p1.value.top}\n' +
    '\n' +
    '""CODE\n' +
    'if p1.value > 1000000\n' +
    '  Excelente mes 🎉\n' +
    'elif p1.value > 500000\n' +
    '  Mes correcto\n' +
    'else\n' +
    '  Por debajo de lo esperado\n' +
    'end\n' +
    'CODE""\n' +
    '\n' +
    'Desglose por categoría:\n' +
    '${p1.value.breakdown}\n' +
    '\n' +
    'Un saludo.';

  // rendered version of refExample with sample data; `hl` marks auto-substituted parts
  public readonly refResult: { t: string; hl?: boolean }[] = [
    { t: 'Asunto: Resumen de ' }, { t: 'Ventas 2024', hl: true },
    { t: '\n\nHola,\n\nEl valor de ' }, { t: 'Ventas 2024', hl: true },
    { t: ' es ' }, { t: '1.240.000', hl: true },
    { t: '.\nMedia por categoría: ' }, { t: '310.000', hl: true },
    { t: '\nCategoría más alta: ' }, { t: 'Europa: 480.000', hl: true },
    { t: '\n\n' }, { t: 'Excelente mes 🎉', hl: true },
    { t: '\n\nDesglose por categoría:\n' },
    { t: 'Europa: 480.000, Asia: 360.000, América: 280.000', hl: true },
    { t: '\n\nUn saludo.' },
  ];


  // ---- reference dialog + insert toolbox ------------------------------------

  @ViewChild('msgArea') private msgArea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('subjArea') private subjArea?: ElementRef<HTMLInputElement>;

  public refOpen = false;
  public openRef(): void { this.refOpen = true; }

  public readonly varTokensOf = kpiVarTokens;
  public readonly refIconTitle = $localize`:@@mailRefIconTitle:Variables y condicionales`;
  public readonly codeBlockTip = $localize`:@@mailRefInsertCodeTip:Inserta un bloque condicional (if / else) en el mensaje`;

  /** `${p1.value.top}` -> `value.top` for the compact toolbox chips. */
  public shortTok = (t: string): string => t.replace(/^\$\{p\d+\./, '').replace(/\}$/, '');

  /** Field the toolbox inserts into: whichever of subject/message was focused last. */
  public activeField: 'subject' | 'message' = 'message';
  public get activeFieldLabel(): string {
    return this.activeField === 'subject'
      ? $localize`:@@mailSubjectShort:Asunto`
      : $localize`:@@mailMessageLabel:Mensaje`;
  }

  private spliceInto(el: HTMLInputElement | HTMLTextAreaElement | undefined,
                     current: string, text: string, apply: (v: string) => void): void {
    const cur = current || '';
    if (!el) { apply(cur + text); return; }
    const s = el.selectionStart ?? cur.length;
    const e = el.selectionEnd ?? cur.length;
    apply(cur.slice(0, s) + text + cur.slice(e));
    setTimeout(() => {
      el.focus();
      const p = s + text.length;
      try { el.setSelectionRange(p, p); } catch { /* noop */ }
    });
  }

  /** Insert a variable token into the active field (subject or message). */
  public insertToken(text: string): void {
    if (this.activeField === 'subject') {
      this.spliceInto(this.subjArea?.nativeElement, this.mailSubject, text, v => (this.mailSubject = v));
    } else {
      this.spliceInto(this.msgArea?.nativeElement, this.mailMessage, text, v => (this.mailMessage = v));
    }
  }

  public insertCodeBlock(): void {
    const base = this.kpiVariables[0]?.base || 'p1';
    this.activeField = 'message';
    this.spliceInto(this.msgArea?.nativeElement, this.mailMessage,
      `\n""CODE\nif ${base}.value > 0\n  \nelse\n  \nend\nCODE""\n`, v => (this.mailMessage = v));
  }

  public get kpiVariables(): MailKpiVariable[] {
    return buildKpiVariables(this.variablePanels);
  }

  /** Live value of a KPI panel — only the dashboard dialog can resolve it. */
  public getPanelCurrentValue(_panelId: string): string { return '—'; }
  /** Live category→value series of a kpibar/kpiline/kpiarea — dashboard dialog only. */
  public getPanelSeries(_panelId: string): { label: string; value: number }[] { return []; }

  public varValueResolver = (v: MailKpiVariable, kind: MailTokenKind): string => {
    if (kind === 'title') return v.title;
    if (kind === 'value') { const cv = this.getPanelCurrentValue(v.panelId); return cv === '—' ? '' : cv; }
    return formatKpiToken(this.getPanelSeries(v.panelId), kind);
  };

  /** `{ p1: {...}, p2: {...} }` for `""CODE` conditions in the preview, from the live panels. */
  protected get logicCtx(): Record<string, any> {
    const ctx: Record<string, any> = {};
    this.kpiVariables.forEach((v, i) => {
      ctx[`p${i + 1}`] = buildKpiCtxNode(v.title, this.getPanelSeries(v.panelId));
    });
    return ctx;
  }

  public get previewSubject(): string {
    let out = renderMailPreview(this.mailSubject, this.kpiVariables, id => this.getPanelCurrentValue(id), id => this.getPanelSeries(id));
    return hasMailLogic(out) ? renderMailLogic(out, this.logicCtx) : out;
  }
  public get previewBody(): string {
    let out = renderMailPreviewHtml(this.mailMessage, this.kpiVariables, id => this.getPanelCurrentValue(id), id => this.getPanelSeries(id));
    return hasMailLogic(out) ? renderMailLogic(out, this.logicCtx) : out;
  }
  public get previewLink(): string {
    const locale = window.location.pathname.split('/').filter(Boolean)[0] || 'es';
    return `${window.location.origin}/${locale}/#/dashboard/${this.linkDashboardId}`;
  }
  public get pdfName(): string { return 'informe.pdf'; }

  // ---- store hours as UTC so the backend schedule check is timezone-independent ----
  protected utcHoursMinutes(): { hours: string | null; minutes: string | null } {
    return {
      hours: this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCHours()) : null,
      minutes: this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCMinutes()) : null,
    };
  }

  /** Frequency fields common to both payloads. */
  protected schedulePayload(): any {
    const { hours, minutes } = this.utcHoursMinutes();
    return {
      units: this.units,
      quantity: this.quantity,
      hours, minutes,
      weekday: this.weekday,
      monthlyMode: this.monthlyMode,
      monthlyDay: this.monthlyDay,
      monthlyOrdinal: this.monthlyOrdinal,
      monthlyWeekday: this.monthlyWeekday,
      users: (this.selectedUsers || []).map((u: any) => u.value ?? u),
      otherRecipients: this.otherRecipients,
      mailSubject: this.mailSubject,
      mailMessage: this.mailMessage,
      aiAnalysis: this.aiAvailable && this.aiAnalysis,
      enabled: this.enabled,
    };
  }

  /** Load the frequency/message fields common to both configs from a saved `mailing`/`sendViaMailConfig`. */
  protected loadSchedule(c: any): void {
    if (c?.enabled) {
      const utc = new Date();
      utc.setUTCHours(parseInt(c.hours, 10) || 0, parseInt(c.minutes, 10) || 0, 0, 0);
      this.hours = utc;
      this.units = c.units;
      this.quantity = c.quantity;
      this.weekday = c.weekday ?? this.weekday;
      this.monthlyMode = c.monthlyMode ?? this.monthlyMode;
      this.monthlyDay = c.monthlyDay ?? this.monthlyDay;
      this.monthlyOrdinal = c.monthlyOrdinal ?? this.monthlyOrdinal;
      this.monthlyWeekday = c.monthlyWeekday ?? this.monthlyWeekday;
      this.savedUserRefs = c.users || [];
      this.otherRecipients = c.otherRecipients || '';
      this.mailSubject = c.mailSubject || '';
      this.mailMessage = c.mailMessage || '';
      this.aiAnalysis = !!c.aiAnalysis;
      this.enabled = c.enabled;
    } else {
      this.units = 'days';
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      this.hours = noon;
    }
  }

  protected async runSend(request$: Observable<any>, successMsg: string): Promise<void> {
    this.isSending.set(true);
    try {
      await lastValueFrom(request$);
      this.alertService.addSuccess(successMsg);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSending.set(false);
    }
  }

  // ---- footer buttons -----------------------------------------------------

  public disableApply(): boolean {
    return !this.units || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
  }
  public disableSend(): boolean {
    return this.isSending() || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
  }

  public onApply(): void { this.display = false; this.save(); }
  public onClose(): void { this.display = false; this.close.emit(); }
}
