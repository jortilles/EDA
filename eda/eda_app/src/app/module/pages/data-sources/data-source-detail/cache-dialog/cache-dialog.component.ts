import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService } from '@eda/services/service.index';


@Component({
  selector: 'eda-cache-dialog',
  templateUrl: './cache-dialog.component.html',
  //styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class CacheDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public units: string;
  public quantity: number;
  public hours: any;
  public noCache: boolean = false;
  public currentConfig: string;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`

  constructor(
    private alertService: AlertService,
    public dataModelService: DataSourceService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@adChacheConfig:Configurar caché del modelo `
    });

    this.dialog.style = { width: '45%', height: '70%', top: '50px', left: '90px' };

  }
  onShow(): void {

    const config = this.controller.params.config;

    this.units = config.units;
    this.quantity = config.quantity;
    this.hours = `${config.hours}:${config.minutes}`;
    this.noCache = !config.enabled;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  saveConfig() {

    const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
      this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
    const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
      this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;

    this.onClose(EdaDialogCloseEvent.NEW, { units: this.units, quantity: this.quantity, hours: hours, minutes: minutes, enabled: !this.noCache });

  }

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }

  checkForm() {

    if (this.noCache) return false;
    if (!this.units || !this.quantity) return true
    if (this.units === 'days' && !this.hours) return true;
    return false;
  }

  deleteCache() {
    this.dataModelService.removeCache(this.controller.params.model_id).subscribe(
      res => { this.alertService.addSuccess($localize`:@@CacheDeletedOK:Caché eliminada correctamente`); },
      err => { this.alertService.addError($localize`:@@IncorrectCacheDelete:No ha sido posible eliminar la caché`); }
    );
  }



}