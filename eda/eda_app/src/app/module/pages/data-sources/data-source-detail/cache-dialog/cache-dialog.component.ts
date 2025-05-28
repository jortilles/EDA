import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService } from '@eda/services/service.index';


@Component({
  selector: 'eda-cache-dialog',
  templateUrl: './cache-dialog.component.html',
})

export class CacheDialogComponent implements OnInit {
  public display: boolean = false;
  @Input() config: any;
  @Input() model_id: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();


  public title = $localize`:@@adChacheConfig:Configurar caché del modelo`;

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

  }

  ngOnInit(): void {
    const config = this.config;
    this.units = config.units;
    this.quantity = config.quantity;
    this.hours = `${config.hours}:${config.minutes}`;
    this.noCache = !config.enabled;
  }

  onClose(response?: any): void {
    this.display = false;
    this.close.emit(response);
  }

  closeDialog() {
    this.onClose();
  }

  saveConfig() {
    const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
      this.hours ? this.fillWithZeros(this.hours.getHours()) : null;

    const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
      this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;

    this.onClose({ units: this.units, quantity: this.quantity, hours: hours, minutes: minutes, enabled: !this.noCache });
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
    this.dataModelService.removeCache(this.model_id).subscribe(
      res => { this.alertService.addSuccess($localize`:@@CacheDeletedOK:Caché eliminada correctamente`); },
      err => { this.alertService.addError($localize`:@@IncorrectCacheDelete:No ha sido posible eliminar la caché`); }
    );
  }



}