import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { UserService } from "@eda/services/service.index";
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
})
export class KpiMailConfigModal implements OnInit {
  @Input() alert: any;
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

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name, value: user })),
      err => console.log(err)
    );

    const mailing = this.alert?.mailing;
    if (mailing?.enabled) {
      this.hours = `${mailing.hours || '00'}:${mailing.minutes || '00'}`;
      this.units = mailing.units;
      this.quantity = mailing.quantity;
      this.selectedUsers = (mailing.users || []).map((u: any) =>
        u.label ? u : { label: u.name, value: u }
      );
      this.mailMessage = mailing.mailMessage || '';
      this.enabled = mailing.enabled;
    }
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
    });
  }

  disableApply(): boolean {
    return !this.quantity || !this.units || this.selectedUsers.length === 0 || !this.mailMessage;
  }

  onApply() { this.save(); }
  onClose() { this.close.emit(); }

  fillWithZeros(n: number) {
    return n < 10 ? `0${n}` : `${n}`;
  }
}
