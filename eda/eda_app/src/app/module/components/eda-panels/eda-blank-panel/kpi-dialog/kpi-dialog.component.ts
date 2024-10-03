import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component, ViewChild } from '@angular/core';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';



@Component({
    selector: 'app-kpi-dialog',
    templateUrl: './kpi-dialog.component.html',
    styleUrls: ['./kpi-dialog.component.css']
})

export class KpiEditDialogComponent extends EdaDialogAbstract {

    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;

    public dialog: EdaDialog;
    public panelChartConfig: PanelChart = new PanelChart();

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public units: string;
    public quantity: number;
    public hours: any;
    public hoursSTR = $localize`:@@hours:Hora/s`;
    public daysSTR = $localize`:@@days:Día/s`;
    public mailMessage = '';
    public currentAlert = null;
    public users: any;
    public selectedUsers: any;
    public disabled: boolean;
    public canIRunAlerts: boolean = false;

    public display: boolean = false;

    constructor(private userService: UserService,) {

        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`
        });

        this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };

        if (this.userService.user.name == "edaanonim") {
            this.canIRunAlerts = false;
        } else {
            this.canIRunAlerts = true;
        }

    }

    saveChartConfig() {
        this.onClose(EdaDialogCloseEvent.UPDATE,
            {
                alerts: this.alerts,
                sufix: this.panelChartComponent.componentRef.instance.inject.sufix
            });
    }

    closeChartConfig() {
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onShow(): void {
        this.panelChartConfig = this.controller.params.panelChart;
        const config: any = this.panelChartConfig.config.getConfig();
        this.alerts = config.alertLimits || []; //deepcopy

        this.display = true;
        // this.panelChartComponent.componentRef.instance.updateChart();
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    addAlert() {
        this.alerts.push(
            {
                value: this.value ? this.value : 0,
                operand: this.operand,
                color: this.color,
                mailing: { units: null, quantity: null, hours: null, minutes: null, users: [], mailMessage: null, enabled: false }
            });
    }

    deleteAlert(item) {
        this.alerts = this.alerts.filter(alert => {
            return alert.operand !== item.operand || alert.value !== item.value || alert.color !== item.color
        });
    }

    rgb2hex(rgb): string {
        rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
        return (rgb && rgb.length === 4) ? '#' +
            ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
            ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
    }

    hex2rgb(hex, opacity = 100): string {
        hex = hex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
    }

    openConfigDialog($event, alert) {

        this.userService.getUsers().subscribe(
            res => this.users = res.map(user => ({ label: user.name, value: user })),
            err => console.log(err)
        );


        this.disabled = !alert.mailing.enabled;
        this.hours = `${alert.mailing.hours || '00'}:${alert.mailing.minutes || '00'}`;
        this.units = alert.mailing.units;
        this.quantity = alert.mailing.quantity;
        this.selectedUsers = alert.mailing.users;
        this.mailMessage = alert.mailing.mailMessage;
        this.currentAlert = alert;
        this.mailConfig.toggle($event);
    }

    saveMailingConfig() {

        const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
            this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
        const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
            this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;


        this.currentAlert.mailing = {
            units: this.units,
            quantity: this.quantity,
            hours: hours,
            minutes: minutes,
            users: this.selectedUsers,
            mailMessage: this.mailMessage,
            lastUpdated: new Date().toISOString(),
            enabled: !this.disabled
        }

        this.currentAlert = null;
        this.units = null;
        this.quantity = null;
        this.hours = null;
        this.mailMessage = null;
        this.selectedUsers = [];
        this.mailConfig.hide();
    }

    closeMailingConfig() {
        this.currentAlert = null;
        this.units = null;
        this.quantity = null;
        this.hours = null;
        this.mailMessage = null;
        this.selectedUsers = [];
        this.mailConfig.hide();
    }

    fillWithZeros(n: number) {
        if (n < 10) return `0${n}`
        else return `${n}`;
    }

    disableMailConfirm() {
        return (!this.quantity || !this.units || !(this.selectedUsers.length > 0) || !this.mailMessage)
    }

}