import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { lastValueFrom } from "rxjs";
import { AlertService, MailService, UserService } from "@eda/services/service.index";
import { DateUtils } from "@eda/services/utils/date-utils.service";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from "primeng/calendar";
import { InputSwitchModule } from "primeng/inputswitch";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-kpi-mail-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule, CalendarModule, InputSwitchModule, EdaDialog2Component],
  templateUrl: './kpi-mail-config.modal.html',
  styleUrls: ['./kpi-mail-config.modal.css'],
})
export class KpiMailConfigModal implements OnInit {
  @Input() alert: any;
  @Input() dashboardId: string;
  @Input() panelId: string;
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Output() close: EventEmitter<void> = new EventEmitter<void>();

  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailSubject = '';
  public mailMessage = '';
  public users: any[] = [];
  public selectedUsers: any[] = [];
  public otherRecipients: string = '';
  public enabled: boolean = false;
  public isSending = signal<boolean>(false);

  constructor(private userService: UserService, private dateUtils: DateUtils, private mailService: MailService, private alertService: AlertService) {}

  ngOnInit(): void {
    const mailing = this.alert?.mailing;

    if (mailing?.enabled) {
      /** Stored hours/minutes are UTC; convert to a Date so the picker shows the equivalent local time */
      const utcHours = new Date();
      utcHours.setUTCHours(parseInt(mailing.hours, 10) || 0, parseInt(mailing.minutes, 10) || 0, 0, 0);
      this.hours = utcHours;
      this.units = mailing.units;
      this.quantity = mailing.quantity;
      this.mailSubject = mailing.mailSubject || '';
      this.mailMessage = mailing.mailMessage || '';
      this.otherRecipients = mailing.otherRecipients || '';
      this.enabled = mailing.enabled;
    } else {
      this.hours = this.dateUtils.roundToNextHalfHour(new Date());
    }

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

  /** Emails typed by hand in the "Otros destinatarios" input, space-separated */
  public parseOtherRecipients(): string[] {
    return this.otherRecipients
      .split(/\s+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }

  /** All recipients (registered users + manually typed emails), deduplicated, for the dialog summary */
  public get allRecipientEmails(): string[] {
    const registered = (this.selectedUsers || []).map((u: any) => (u.value ?? u).email).filter(Boolean);
    const manual = this.parseOtherRecipients();
    return Array.from(new Set([...registered, ...manual]));
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
      users: this.selectedUsers.map((u: any) => u.value ?? u),
      otherRecipients: this.otherRecipients,
      mailSubject: this.mailSubject,
      mailMessage: this.mailMessage,
      lastUpdated: '2000-01-01T00:00:01.000',
      enabled: this.enabled,
    });
  }

  disableApply(): boolean {
    return !this.quantity || !this.units || this.allRecipientEmails.length === 0 || !this.mailSubject || !this.mailMessage;
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
        to: this.allRecipientEmails,
        subject: this.mailSubject,
        message: this.mailMessage
      }));
      this.alertService.addSuccess($localize`:@@alertSendNowDone:Alerta enviada (si el KPI cumple la condición en este momento)`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSending.set(false);
    }
  }

  onApply() { this.save(); }
  onClose() { this.close.emit(); }

  /** Snaps a manually typed time to the nearest :00 or :30 once the user leaves the field */
  onHoursBlur(): void {
    if (this.hours) {
      this.hours = this.dateUtils.roundToNearestHalfHour(this.hours);
    }
  }
}
