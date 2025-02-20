import { Dashboard } from './../../../../shared/models/dashboard-models/dashboard.model';
import { Component } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { UserService } from '@eda/services/service.index';

@Component({
  selector: 'dashboard-mail-dialog',
  templateUrl: './dashboard-mail-dialog.component.html',
  styleUrls: []
})

export class DashboardMailDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public dashboard: any;

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
  public enabled : boolean = true ;

  constructor(private userService: UserService,) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@DashboardMailingTitle:Configuración del envío por email`,
    });
    this.dialog.style = { width: '50%', height: '50%', top: "-4em", left: '1em' };
  }

  onShow(): void {
 
    this.dashboard = this.controller.params.dashboard;
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name, value: user })),
      err => console.log(err)
    );

    if(this.controller.params.config && this.controller.params.config.enabled){
      this.setConfig();
    }
  }
  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  setConfig(){
    const config = this.controller.params.config;
    this.hours = `${config.hours || '00'}:${config.minutes || '00'}`;
    this.units = config.units;
    this.quantity = config.quantity;
    this.selectedUsers = config.users.map(user => ({ label: user.name, value: user }) );
    this.mailMessage = config.mailMessage;
    this.enabled = config.enabled;
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
      users: this.selectedUsers.map(user => user.value),
      mailMessage: this.mailMessage,
      lastUpdated: new Date().toISOString(),
      enabled: this.enabled,
      dashboard: this.dashboard
    };
    this.onClose(EdaDialogCloseEvent.NEW, response);
  }

  disableConfirm() {
    return (!this.quantity || !this.units || !(this.selectedUsers.length > 0) || !this.mailMessage)
  }

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }

}