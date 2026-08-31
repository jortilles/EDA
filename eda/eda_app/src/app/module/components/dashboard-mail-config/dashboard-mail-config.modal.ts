import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { lastValueFrom } from "rxjs";
import { AlertService, MailService, UserService } from "@eda/services/service.index";
import { DateUtils } from "@eda/services/utils/date-utils.service";
import { buildKpiVariables, MailKpiVariable, renderMailPreview, renderMailPreviewHtml } from "@eda/services/utils/mail-variables.util";
import { LogoImage, SubLogoImage } from "@eda/configs/customizable/customizable_default";
import { WEEKDAY_OPTIONS, MONTHLY_ORDINAL_OPTIONS, MONTH_DAY_OPTIONS } from "@eda/services/utils/mail-schedule.util";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";


import * as _ from 'lodash';
import { EdaDialog } from "@eda/shared/components/shared-components.index";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";


@Component({
  selector: 'app-dashboard-mail-config',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule,CalendarModule,InputSwitchModule,DropdownModule,EdaDialog2Component],
  templateUrl: './dashboard-mail-config.modal.html',
  styleUrls: ['./dashboard-mail-config.modal.css'],
})

export class DashboardMailConfigModal {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPage;
  public display: boolean = false;
  public dialog: EdaDialog;

  /**mail config properties */
  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailSubject = '';
  public mailMessage = '';
  public currentAlert = null;
  public users: any;
  public selectedUsers: any = [];
  public otherRecipients: string = '';
  public enabled: boolean = true;
  public isSending = signal<boolean>(false);
  /** Dummy toggle, not wired yet */
  public aiAnalysis = false;

  /** The "análisis con IA" option only shows when the instance has AI configured */
  public get aiAvailable(): boolean {
    return !!this.dashboard?.availableChatGpt;
  }

  /** Frequency mockup — local only, not persisted or read by the backend yet */
  public weekdayOptions = WEEKDAY_OPTIONS;
  public ordinalOptions = MONTHLY_ORDINAL_OPTIONS;
  public monthDayOptions = MONTH_DAY_OPTIONS;
  public weekday: number = 1;
  public monthlyMode: 'dom' | 'nth' = 'dom';
  public monthlyDay: number | 'last' = 1;
  public monthlyOrdinal: string = 'first';
  public monthlyWeekday: number = 1;

  public monthlyModeOptions = [
    { label: 'El día del mes', value: 'dom' },
    { label: 'Un día de la semana', value: 'nth' },
  ];
  public monthDayDropdownOptions = [
    ...MONTH_DAY_OPTIONS.map(n => ({ label: String(n), value: n as number | string })),
    { label: 'Último día', value: 'last' },
  ];

  public setUnits(u: string): void {
    this.units = u;
    if (u === 'hours' && !this.quantity) this.quantity = 12;
  }

  /** class for a segmented frequency button */
  public seg(u: string): string {
    return this.units === u
      ? 'bg-[var(--corporate-primary)] text-white'
      : 'text-gray-500 hover:bg-white/70';
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

  /** Human-readable recap of the schedule (mockup strings, not localized yet) */
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
    return `Se enviará ${this.frequencySummary} a ${dest}`;
  }

  public get statusLabel(): string {
    return this.enabled && this.units ? this.footerSummary : 'Sin programación activa';
  }

  public get previewRecipientsLabel(): string {
    const list = this.allRecipientEmails;
    if (list.length === 0) return 'Sin destinatarios';
    const shown = list.slice(0, 2).join(', ');
    return list.length > 2 ? `${shown} (+${list.length - 2})` : shown;
  }

  /** Removable chips for the selected recipients */
  public get recipientChips(): { label: string; kind: 'user' | 'external' }[] {
    const users = (this.selectedUsers || []).map((u: any) => ({ label: u.name || u.email, kind: 'user' as const }));
    const ext = this.parseOtherRecipients().map(e => ({ label: e, kind: 'external' as const }));
    return [...users, ...ext];
  }

  public removeChip(chip: { label: string; kind: 'user' | 'external' }): void {
    if (chip.kind === 'user') {
      this.selectedUsers = (this.selectedUsers || []).filter((u: any) => (u.name || u.email) !== chip.label);
    } else {
      this.otherRecipients = this.parseOtherRecipients().filter(e => e !== chip.label).join(' ');
    }
  }

  public async copyToken(token: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(token);
      this.alertService.addSuccess(`Copiado: ${token}`);
    } catch {
      this.alertService.addError('No se pudo copiar');
    }
  }

  /** Best-effort current value of a KPI panel (the dashboard is still rendered behind the dialog) */
  public getPanelCurrentValue(panelId: string): string {
    try {
      const arr = (this.dashboard as any)?.edaPanels?.toArray?.() ?? [];
      const comp = arr.find((p: any) => p?.panel?.id === panelId);
      const v = comp?.panelChart?.componentRef?.instance?.inject?.value;
      if (v === undefined || v === null || v === '') return '—';
      const n = Number(v);
      return Number.isFinite(n) ? n.toLocaleString('de-DE') : String(v);
    } catch {
      return '—';
    }
  }

  constructor(private alertService: AlertService, private userService: UserService, private dateUtils: DateUtils, private mailService: MailService) { }

  ngOnInit(): void {
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name || user.email, value: user })),
      err => console.log(err)
    );

    const sendViaMailConfig = this.dashboard.dashboard.config?.sendViaMailConfig;
    if (sendViaMailConfig?.enabled) {
      this.setConfig();
    } else {
      this.units = 'days';
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      this.hours = noon;
    }
  }

  /** "Cada N horas" only accepts positive numbers */
  public clampQuantity(): void {
    if (this.quantity != null && this.quantity < 1) this.quantity = 1;
  }
  public blockNonPositive(e: KeyboardEvent): void {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  }

  /** Snaps a manually typed time to the nearest :00 or :30 once the user leaves the field */
  onHoursBlur(): void {
    if (this.hours) {
      this.hours = this.dateUtils.roundToNearestHalfHour(this.hours);
    }
  }

  setConfig() {
    const config = this.dashboard.dashboard.config.sendViaMailConfig;
    /** Stored hours/minutes are UTC; convert to a Date so the picker shows the equivalent local time */
    const utcHours = new Date();
    utcHours.setUTCHours(parseInt(config.hours, 10) || 0, parseInt(config.minutes, 10) || 0, 0, 0);
    this.hours = utcHours;
    this.units = config.units;
    this.quantity = config.quantity;
    this.weekday = config.weekday ?? this.weekday;
    this.monthlyMode = config.monthlyMode ?? this.monthlyMode;
    this.monthlyDay = config.monthlyDay ?? this.monthlyDay;
    this.monthlyOrdinal = config.monthlyOrdinal ?? this.monthlyOrdinal;
    this.monthlyWeekday = config.monthlyWeekday ?? this.monthlyWeekday;
    this.selectedUsers = config.users;
    this.otherRecipients = config.otherRecipients || '';
    this.mailSubject = config.mailSubject || '';
    this.mailMessage = config.mailMessage;
    this.aiAnalysis = !!config.aiAnalysis;
    this.enabled = config.enabled;
  }

  /** Emails typed by hand in the "Otros destinatarios" input, space-separated */
  public parseOtherRecipients(): string[] {
    return this.otherRecipients
      .split(/\s+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  /** All recipients (registered users + manually typed emails), deduplicated, for the dialog summary */
  public get allRecipientEmails(): string[] {
    const registered = (this.selectedUsers || []).map((u: any) => u.email).filter(Boolean);
    const manual = this.parseOtherRecipients();
    return Array.from(new Set([...registered, ...manual]));
  }

  /** `${kpiN}` -> KPI panel name, listed in the dialog for use in the subject/body */
  public get kpiVariables(): MailKpiVariable[] {
    return buildKpiVariables(this.dashboard?.panels as any[]);
  }

  public logoImage = LogoImage;
  public bannerImage = SubLogoImage;
  public noSubjectLabel = $localize`:@@mailNoSubject:Sin asunto`;

  public get previewSubject(): string {
    return renderMailPreview(this.mailSubject, this.kpiVariables, id => this.getPanelCurrentValue(id));
  }

  public get previewBody(): string {
    return renderMailPreviewHtml(this.mailMessage, this.kpiVariables, id => this.getPanelCurrentValue(id));
  }

  public get previewLink(): string {
    const locale = window.location.pathname.split('/').filter(Boolean)[0] || 'es';
    return `${window.location.origin}/${locale}/#/dashboard/${this.dashboard?.dashboardId}`;
  }

  public get pdfName(): string {
    return `${this.dashboard?.dashboard?.config?.title || 'informe'}.pdf`;
  }

  save() {

    /** Store hours/minutes in UTC so the schedule check on the backend is timezone-independent */
    const hours = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCHours()) : null;
    const minutes = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCMinutes()) : null;

    const response = {
      units: this.units,
      quantity: this.quantity,
      hours: hours,
      minutes: minutes,
      weekday: this.weekday,
      monthlyMode: this.monthlyMode,
      monthlyDay: this.monthlyDay,
      monthlyOrdinal: this.monthlyOrdinal,
      monthlyWeekday: this.monthlyWeekday,
      users: this.selectedUsers,
      otherRecipients: this.otherRecipients,
      mailSubject: this.mailSubject,
      mailMessage: this.mailMessage,
      aiAnalysis: this.aiAvailable && this.aiAnalysis,
      lastUpdated: new Date().toISOString(),
      enabled: this.enabled,
      dashboard: this.dashboard
    };
    this.apply.emit(response);
  }

  public onApply() {
    this.display = false;
    this.save();
  }

  public disableApply(): boolean {
    return false;
  }

  disableSend(): boolean {
    return this.isSending() || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
  }

  async sendNow() {
    this.isSending.set(true);
    try {
      await lastValueFrom(this.mailService.sendDashboardNow({
        dashboardId: this.dashboard.dashboardId,
        to: this.allRecipientEmails,
        subject: this.mailSubject,
        message: this.mailMessage,
        aiAnalysis: this.aiAvailable && this.aiAnalysis
      }));
      this.alertService.addSuccess($localize`:@@mailSendNowStarted:Envío iniciado. Los informes se están generando y llegarán en unos minutos.`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSending.set(false);
    }
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}
