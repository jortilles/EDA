import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { UserService, MailService, AlertService } from "@eda/services/service.index";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from "primeng/calendar";
import { InputSwitchModule } from "primeng/inputswitch";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from "@angular/common";

export interface AlertHistoryItem {
  timestamp: string;
  status: 'success' | 'failed';
  recipient: string;
  error?: string;
  kpiValue?: number | null;
  conditionMet?: boolean;
}

export interface TestResult {
  success: boolean;
  error?: string;
  kpiValue?: number | null;
  recipient: string;
}

@Component({
  selector: 'app-kpi-mail-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule, CalendarModule, InputSwitchModule, EdaDialog2Component],
  templateUrl: './kpi-mail-config.modal.html',
})
export class KpiMailConfigModal implements OnInit {
  @Input() alert: any;
  @Input() query: any;
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Output() close: EventEmitter<void> = new EventEmitter<void>();

  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailMessage = '';
  public users: any[] = [];
  public selectedUsers: any[] = [];
  public enabled: boolean = false;

  public isTesting = false;
  public testResults: TestResult[] = [];
  public history: AlertHistoryItem[] = [];
  public showHistory = false;

  constructor(
    private userService: UserService,
    private mailService: MailService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    const mailing = this.alert?.mailing;

    if (mailing?.enabled) {
      this.hours = `${mailing.hours || '00'}:${mailing.minutes || '00'}`;
      this.units = mailing.units;
      this.quantity = mailing.quantity;
      this.mailMessage = mailing.mailMessage || '';
      this.enabled = mailing.enabled;
    }

    this.history = mailing?.history || [];

    this.userService.getUsers().subscribe(
      res => {
        this.users = res.map(user => ({ label: user.name, value: user }));
        const savedUsers = mailing?.users || [];
        this.selectedUsers = this.users.filter(opt =>
          savedUsers.some((u: any) => u._id === opt.value._id || u.email === opt.value.email)
        );
      },
      err => console.log(err)
    );
  }

  save() {
    const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
      this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
    const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
      this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;

    this.apply.emit({
      units: this.units,
      quantity: this.quantity,
      hours,
      minutes,
      users: this.selectedUsers.map((u: any) => u.value ?? u),
      mailMessage: this.mailMessage,
      lastUpdated: '2000-01-01T00:00:01.000',
      enabled: this.enabled,
      history: this.history,
    });
  }

  disableApply(): boolean {
    return !this.quantity || !this.units || this.selectedUsers.length === 0 || !this.mailMessage;
  }

  disableTest(): boolean {
    return this.selectedUsers.length === 0 || this.isTesting;
  }

  onApply() { this.save(); }
  onClose() { this.close.emit(); }

  fillWithZeros(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }

  testSend(): void {
    if (this.disableTest()) return;

    this.isTesting = true;
    this.testResults = [];

    const alertConfig = {
      users: this.selectedUsers.map((u: any) => u.value ?? u),
      mailMessage: this.mailMessage,
      operand: this.alert?.operand,
      value: this.alert?.value,
    };

    this.mailService.testAlertMail(alertConfig, this.query).subscribe(
      res => {
        this.isTesting = false;
        this.testResults = res.results || [];

        const hasErrors = this.testResults.some(r => !r.success);
        if (hasErrors) {
          this.alertService.addError('Algunos envíos de prueba fallaron. Revise los resultados a continuación.');
        } else {
          this.alertService.addSuccess('Todos los envíos de prueba fueron exitosos.');
        }
      },
      err => {
        this.isTesting = false;
        this.alertService.addError(err);
        this.testResults = this.selectedUsers.map(u => ({
          success: false,
          error: err?.message || 'Error desconocido',
          recipient: (u.value?.email ?? u.email) || 'Desconocido'
        }));
      }
    );
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
  }

  formatDate(timestamp: string): string {
    if (!timestamp) return 'N/A';
    try {
      const date = new Date(timestamp);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  }

  getStatusClass(status: string): string {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  }

  getStatusLabel(status: string): string {
    return status === 'success' ? 'Éxito' : 'Fallido';
  }
}
