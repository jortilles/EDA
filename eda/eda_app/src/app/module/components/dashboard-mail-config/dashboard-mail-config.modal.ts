import { Component, EventEmitter, Input, OnInit, Output, signal } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { lastValueFrom } from "rxjs";
import { AlertService, MailService, UserService } from "@eda/services/service.index";
import { DateUtils } from "@eda/services/utils/date-utils.service";
import { buildKpiVariables, MailKpiVariable } from "@eda/services/utils/mail-variables.util";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import { InputSwitchModule } from 'primeng/inputswitch';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";


import * as _ from 'lodash';
import { EdaDialog } from "@eda/shared/components/shared-components.index";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";


@Component({
  selector: 'app-dashboard-mail-config',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule,CalendarModule,InputSwitchModule,EdaDialog2Component],
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
      this.hours = this.dateUtils.roundToNextHalfHour(new Date());
    }
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
    this.selectedUsers = config.users;
    this.otherRecipients = config.otherRecipients || '';
    this.mailSubject = config.mailSubject || '';
    this.mailMessage = config.mailMessage;
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

  save() {

    /** Store hours/minutes in UTC so the schedule check on the backend is timezone-independent */
    const hours = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCHours()) : null;
    const minutes = this.hours ? this.dateUtils.fillWithZeros(this.hours.getUTCMinutes()) : null;

    const response = {
      units: this.units,
      quantity: this.quantity,
      hours: hours,
      minutes: minutes,
      users: this.selectedUsers,
      otherRecipients: this.otherRecipients,
      mailSubject: this.mailSubject,
      mailMessage: this.mailMessage,
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
        message: this.mailMessage
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
