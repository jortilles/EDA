import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from "rxjs";
import { AlertService, MailService, UserService } from "@eda/services/service.index";
import { AssistantService } from "@eda/services/api/assistant.service";
import { DateUtils } from "@eda/services/utils/date-utils.service";
import { buildKpiVariables, MailKpiVariable, renderMailPreview, renderMailPreviewHtml } from "@eda/services/utils/mail-variables.util";
import { LogoImage, SubLogoImage } from "@eda/configs/customizable/customizable_default";
import { WEEKDAY_OPTIONS, MONTHLY_ORDINAL_OPTIONS, MONTH_DAY_OPTIONS } from "@eda/services/utils/mail-schedule.util";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from "primeng/calendar";
import { InputSwitchModule } from "primeng/inputswitch";
import { DropdownModule } from "primeng/dropdown";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'app-kpi-mail-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule, CalendarModule, InputSwitchModule, DropdownModule, EdaDialog2Component],
  templateUrl: './kpi-mail-config.modal.html',
  styleUrls: ['./kpi-mail-config.modal.css'],
})
export class KpiMailConfigModal implements OnInit {
  @Input() alert: any;
  @Input() dashboardId: string;
  @Input() panelId: string;
  @Input() kpiPanels: any[] = [];
  @Input() kpiFieldName = '';
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Output() close: EventEmitter<void> = new EventEmitter<void>();

  public display = false;
  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailSubject = '';
  public mailMessage = '';
  public users: any[] = [];
  public selectedUsers: any[] = [];
  public otherRecipients = '';
  public enabled = false;
  public aiAnalysis = false;
  public isSending = signal<boolean>(false);

  /** The "análisis con IA" option only shows when the instance has AI configured */
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

  constructor(
    private userService: UserService,
    private dateUtils: DateUtils,
    private mailService: MailService,
    private alertService: AlertService,
    private assistantService: AssistantService,
  ) {}

  ngOnInit(): void {
    const mailing = this.alert?.mailing;

    if (mailing?.enabled) {
      /** Stored hours/minutes are UTC; convert to a Date so the picker shows the equivalent local time */
      const utcHours = new Date();
      utcHours.setUTCHours(parseInt(mailing.hours, 10) || 0, parseInt(mailing.minutes, 10) || 0, 0, 0);
      this.hours = utcHours;
      this.units = mailing.units;
      this.quantity = mailing.quantity;
      this.weekday = mailing.weekday ?? this.weekday;
      this.monthlyMode = mailing.monthlyMode ?? this.monthlyMode;
      this.monthlyDay = mailing.monthlyDay ?? this.monthlyDay;
      this.monthlyOrdinal = mailing.monthlyOrdinal ?? this.monthlyOrdinal;
      this.monthlyWeekday = mailing.monthlyWeekday ?? this.monthlyWeekday;
      this.mailSubject = mailing.mailSubject || '';
      this.mailMessage = mailing.mailMessage || '';
      this.otherRecipients = mailing.otherRecipients || '';
      this.aiAnalysis = !!mailing.aiAnalysis;
      this.enabled = mailing.enabled;
    } else {
      this.units = 'days';
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      this.hours = noon;
    }

    this.assistantService.availableChatGpt().subscribe(
      (resp: any) => this.availableChatGpt = !!resp?.response?.available,
      () => this.availableChatGpt = false,
    );

    this.userService.getUsers().subscribe(
      res => {
        this.users = res.map(user => ({ label: user.name || user.email, value: user }));
        const savedUsers = mailing?.users || [];
        this.selectedUsers = res.filter((user: any) =>
          savedUsers.some((u: any) => u._id === user._id || u.email === user.email)
        );
      },
      err => console.log(err)
    );
  }

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

  /** "Cada N horas" only accepts positive numbers */
  public clampQuantity(): void {
    if (this.quantity != null && this.quantity < 1) this.quantity = 1;
  }
  public blockNonPositive(e: KeyboardEvent): void {
    if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
  }

  /** Snaps a manually typed time to the nearest :00 or :30 once the user leaves the field */
  onHoursBlur(): void {
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
    return `Se enviará ${this.frequencySummary} a ${dest}, si el KPI cumple la condición`;
  }

  public get previewRecipientsLabel(): string {
    const list = this.allRecipientEmails;
    if (list.length === 0) return 'Sin destinatarios';
    const shown = list.slice(0, 2).join(', ');
    return list.length > 2 ? `${shown} (+${list.length - 2})` : shown;
  }

  /** Removable chips for the selected recipients */
  public get recipientChips(): { label: string; kind: 'user' | 'external' }[] {
    const users = (this.selectedUsers || []).map((u: any) => ({ label: (u.value ?? u).name || (u.value ?? u).email, kind: 'user' as const }));
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

  public async copyToken(token: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(token);
      this.alertService.addSuccess(`Copiado: ${token}`);
    } catch {
      this.alertService.addError('No se pudo copiar');
    }
  }

  /** Emails typed by hand in the external-addresses input, space-separated */
  public parseOtherRecipients(): string[] {
    return this.otherRecipients.split(/\s+/).map(e => e.trim()).filter(e => e.length > 0);
  }

  /** Emails of the users picked in the dropdown */
  public get registeredEmails(): string[] {
    return (this.selectedUsers || []).map((u: any) => (u.value ?? u).email).filter(Boolean);
  }

  /** All recipients (registered users + manually typed emails), deduplicated */
  public get allRecipientEmails(): string[] {
    return Array.from(new Set([...this.registeredEmails, ...this.parseOtherRecipients()]));
  }

  public get kpiVariables(): MailKpiVariable[] {
    return buildKpiVariables(this.kpiPanels);
  }

  public get previewSubject(): string {
    return renderMailPreview(this.mailSubject, this.kpiVariables);
  }

  public get previewBody(): string {
    return renderMailPreviewHtml(this.mailMessage, this.kpiVariables);
  }

  public get previewLink(): string {
    const locale = window.location.pathname.split('/').filter(Boolean)[0] || 'es';
    return `${window.location.origin}/${locale}/#/dashboard/${this.dashboardId}`;
  }

  save() {
    /** Store hours/minutes in UTC so the schedule check on the backend is timezone-independent */
    const hours = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCHours()) : null;
    const minutes = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCMinutes()) : null;

    this.apply.emit({
      units: this.units,
      quantity: this.quantity,
      hours,
      minutes,
      weekday: this.weekday,
      monthlyMode: this.monthlyMode,
      monthlyDay: this.monthlyDay,
      monthlyOrdinal: this.monthlyOrdinal,
      monthlyWeekday: this.monthlyWeekday,
      users: this.selectedUsers.map((u: any) => u.value ?? u),
      otherRecipients: this.otherRecipients,
      mailSubject: this.mailSubject,
      mailMessage: this.mailMessage,
      aiAnalysis: this.aiAvailable && this.aiAnalysis,
      lastUpdated: '2000-01-01T00:00:01.000',
      enabled: this.enabled,
    });
  }

  disableApply(): boolean {
    return !this.units || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
  }

  disableSend(): boolean {
    return this.isSending() || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
  }

  async sendNow() {
    this.isSending.set(true);
    try {
      await lastValueFrom(this.mailService.sendAlertNow({
        dashboardId: this.dashboardId,
        panelId: this.panelId,
        operand: this.alert?.operand,
        value: this.alert?.value,
        to: this.registeredEmails,
        toExternal: this.parseOtherRecipients(),
        subject: this.mailSubject,
        message: this.mailMessage,
        aiAnalysis: this.aiAvailable && this.aiAnalysis,
      }));
      this.alertService.addSuccess($localize`:@@alertSendNowDone:Alerta enviada (si el KPI cumple la condición en este momento)`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSending.set(false);
    }
  }

  onApply() { this.display = false; this.save(); }
  onClose() { this.display = false; this.close.emit(); }
}
