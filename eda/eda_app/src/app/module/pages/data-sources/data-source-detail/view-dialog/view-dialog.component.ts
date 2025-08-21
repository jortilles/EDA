import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AlertService, SpinnerService, DashboardService } from '@eda/services/service.index';

@Component({
  selector: 'app-view-dialog',
  templateUrl: './view-dialog-v2.component.html',
  //styleUrls: ['./view-dialog.component.css']
})

export class ViewDialogComponent implements OnInit {
  @Input() model_id: string;
  @Input() user: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() apply: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;

  public form: UntypedFormGroup;
  public table: any;

  public ok: boolean = false;
  public isGenerating: boolean = false;
  generateText = {
    generating: $localize`:@@generating:Generando...`,
    generate: $localize`:@@generateView:Generar vista`
  };
  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService,
    private dashboardService: DashboardService,
    private spinnerService: SpinnerService,
  ) {
    this.form = this.formBuilder.group({
      viewName: [null, Validators.required],
      description: [null, Validators.required],
      technical_name: [null, Validators.required],
      SQLexpression: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.display = true;
  }

  async checkView() {
    this.spinnerService.on();
    this.form.value.SQLexpression = this.form.value.SQLexpression.replace(';', '')
    const body = {
      model_id: this.model_id,
      user: this.user,
      query: this.form.value.SQLexpression
    }

    try {
      const res = await this.dashboardService.executeView(body).toPromise();
      const columns = [];
      res[0].forEach((col, idx) => {
        const column = this.buildColumn(col, idx, res[1]);
        columns.push(column);
      });
      this.table = this.buildTable(columns);
      this.alertService.addSuccess($localize`:@@viewOk: Vista generada correctamente`);
      this.ok = true;
      this.spinnerService.off();
    } catch (err) {
      this.alertService.addError(err);
      this.spinnerService.off();
    }

  }

  buildColumn(column_name: string, column_index: number, data: Array<any>) {
    let type = 'numeric';
    for (let i = 0; i < data.length; i++) {
      if (data[i][column_index] !== null && !parseFloat(data[i][column_index])) {
        type = 'text';
        break;
      }
    }
    const column = {
      column_name: column_name,
      display_name: { default: column_name, localized: [] },
      description: { default: this.beautifulNames(column_name), localized: [] },
      column_type: type,
      aggregation_type: this.getAggregation(type),
      column_granted_roles: [],
      row_granted_roles: [],
      visible: true,
      tableCount: 0
    }
    return column;
  }

  getAggregation(type: string) {
    if (type === 'numeric') {
      return [
        { value: 'sum', display_name: 'Suma' },
        { value: 'avg', display_name: 'Media' },
        { value: 'max', display_name: 'Máximo' },
        { value: 'min', display_name: 'Mínimo' },
        { value: 'count', display_name: 'Cuenta Valores' },
        { value: 'count_distinct', display_name: 'Valores Distintos' },
        { value: 'none', display_name: 'no' }
      ]
    } else if (type === 'text') {
      return [
        { value: 'count', display_name: 'Cuenta Valores' },
        { value: 'count_distinct', display_name: 'Valores Distintos' },
        { value: 'none', display_name: 'No' }
      ];
    } else {
      return [{ value: 'none', display_name: 'No' }]
    }

  }

  buildTable(columns: Array<any>) {
    const table = {
      table_name: `${this.form.value.technical_name.replace(' ', '_')}`,
      display_name: { default: `${this.form.value.viewName}`, localized: [] },
      description: { default: `${this.form.value.description}`, localized: [] },
      query: `(${this.form.value.SQLexpression.replace(';', '')}) as ${this.form.value.technical_name.replace(' ', '_')}`,
      table_granted_roles: [],
      table_type: 'view',
      columns: columns,
      relations: [],
      visible: true,
      tableCount: 0
    }
    return table;
  }

  beautifulNames = (name) => {
    return name.split('_').map(name => name.charAt(0).toUpperCase() + name.slice(1)).join(' ')
  }

  public onApply() {
    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {
      this.display = false;
      this.close.emit(this.table);
    }
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }

}