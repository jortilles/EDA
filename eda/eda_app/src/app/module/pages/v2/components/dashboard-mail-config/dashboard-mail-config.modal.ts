import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService, UserService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from 'primeng/calendar';
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import { InputSwitchModule } from 'primeng/inputswitch';

import * as _ from 'lodash';
import { EdaDialog } from "@eda/shared/components/shared-components.index";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";


@Component({
  selector: 'app-dashboard-mail-config',
  standalone: true,
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule,CalendarModule,InputSwitchModule],
  templateUrl: './dashboard-mail-config.modal.html',
})

export class DashboardMailConfigModal {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPageV2;
  public display: boolean = false;
  public dialog: EdaDialog;

  /**mail config properties */
  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailMessage = '';
  public currentAlert = null;
  public users: any;
  public selectedUsers: any = [];
  public disabled : boolean ;

  constructor(private alertService: AlertService, private userService: UserService) { }
  
  ngOnInit(): void {
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name, value: user })),
      err => console.log(err)
    );

    if(this.dashboard.dashboard.config && this.dashboard.dashboard.config.enabled){
      this.setConfig();
    }

    console.log(this)

  }

  setConfig(){
      const config = this.dashboard.dashboard.config;
      this.hours = `${config.hours || '00'}:${config.minutes || '00'}`;
      this.units = config.units;
      this.quantity = config.quantity;
      this.selectedUsers = config.users.map(user => ({ label: user.name, value: user }) );
      this.mailMessage = config.mailMessage;
      this.disabled = !config.enabled;
    }
  
  save() {

    const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
      this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
    const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
      this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;

    const response = {
      units: this.units,
      quantity: this.quantity,
      hours: hours,
      minutes: minutes,
      users: this.selectedUsers.map(user => user.name),
      mailMessage: this.mailMessage,
      lastUpdated: new Date().toISOString(),
      enabled: !this.disabled,
      dashboard: this.dashboard
    };
    this.apply.emit(response);
  }

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }
  
  public onApply() {
    this.display = false;
    this.save();
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}
