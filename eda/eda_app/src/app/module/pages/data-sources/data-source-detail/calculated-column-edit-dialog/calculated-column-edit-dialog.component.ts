import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService, QueryParams, QueryBuilderService, SpinnerService } from '@eda/services/service.index';
import * as _ from 'lodash';
import Swal from 'sweetalert2';


@Component({
  standalone: true,
  selector: 'app-calculated-column-edit-dialog',
  templateUrl: './calculated-column-edit-dialog.component.html',
  styleUrls: ['./calculated-column-edit-dialog.component.css'],
  imports: [EdaDialog2Component, FormsModule, ReactiveFormsModule, CommonModule]
})
export class CalculatedColumnEditDialogComponent implements OnInit {

  @Input() column: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() newColum: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;
  public form: UntypedFormGroup;

  public columnTypes = [
    { label: 'text', value: 'text' },
    { label: 'numeric', value: 'numeric' },
    { label: 'date', value: 'date' },
    { label: 'coordinate', value: 'coordinate' }
  ];

  public name = '';
  public description = '';
  public sqlExpressionString = '';
  public selectedcolumnType = '';
  public decimalNumberValue: any;
  public temporalColumn: any;
  public temp = 0;
  public columnConstant: any;
  public constantName: any;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService,
    private spinnerService: SpinnerService,
    public dataModelService: DataSourceService,
    private queryBuilderService: QueryBuilderService,
  ) {
    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      description: [null, Validators.required],
      sqlExpression: [null, Validators.required],
      typeSelector: [null, Validators.required],
      decimalNumber: [null],
    });
  }

  ngOnInit(): void {
    const column = _.cloneDeep(this.column);
    this.temporalColumn = _.cloneDeep(this.column);
    this.constantName = this.column.technical_name;
    this.initForm(column);
  }

  initForm(column: any) {
    this.name = column.name;
    this.description = column.description;
    this.sqlExpressionString = column.SQLexpression;
    this.selectedcolumnType = column.column_type;
    this.decimalNumberValue = column.minimumFractionDigits;

    this.form.patchValue({
      colName: column.name,
      description: column.description,
      sqlExpression: column.SQLexpression,
      typeSelector: column.column_type,
      decimalNumber: column.minimumFractionDigits
    });

    if (this.selectedcolumnType !== 'numeric') {
      this.decimalNumberValue = 0;
      const ctrl = this.form.get('decimalNumber');
      if (ctrl) { ctrl.reset(); ctrl.disable(); }
    }
  }

  onApplyCalculatedColumn() {
    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@formDialogCalculatedColumn:Recuerde rellenar todos los campos`);
    }

    this.spinnerService.on();
    const table = this.dataModelService.getTable(this.temporalColumn);

    let columns = _.cloneDeep(table.columns);
    columns = columns.filter((col: any) => col.column_name !== this.constantName);

    if (columns.some((col: any) => col.column_name.trim().toLowerCase() === this.name.trim().toLowerCase())) {
      this.spinnerService.off();
      return this.alertService.addError($localize`:@@mandatoryDiferentName:Este nombre de campo calculado ya existe. Intente con otro.`);
    }

    if (this.temp === 0) {
      this.columnConstant = table.columns.filter((col: any) => col.column_name === this.constantName)[0];
      this.temp = 1;
    }

    const agg = ['avg', 'bit_and', 'bit_or', 'bit_xor', 'count', 'group_concat', 'json_arrayagg', 'json_objectagg', 'max', 'min', 'std', 'stddev', 'sum', 'var_pop', 'var_samp', 'variance', 'cume_dist', 'dense_rank', 'first_value', 'lag', 'last_value', 'lead', 'nth_value', 'ntile', 'percent_rank', 'rank', 'row_number'];
    let exists = -1;
    agg.forEach(e => { if (this.sqlExpressionString.toString().toLowerCase().indexOf(e) === 0) { exists = 1; } });

    if (exists === 1) {
      this.alertService.addError($localize`:@@IncorrectQueryAgg:No se puede incluir las siguientes agregaciones: (avg, bit_and, bit_or, bit_xor, count, group_concat, json_arrayagg, json_objectagg, max, min, std, stddev, sum, var_pop, var_samp, variance, cume_dist, dense_rank, first_value, lag, last_value, lead, nth_value, ntile, percent_rank, rank, row_number)`);
      this.spinnerService.off();
      return;
    }

    this.columnConstant.display_name.default = this.temporalColumn.name;
    this.columnConstant.column_name = this.temporalColumn.name;
    this.columnConstant.description.default = this.temporalColumn.description;
    this.columnConstant.SQLexpression = this.temporalColumn.SQLexpression;
    this.columnConstant.column_type = this.temporalColumn.column_type;
    this.columnConstant.minimumFractionDigits = this.temporalColumn.minimumFractionDigits;

    const queryParams: QueryParams = {
      table: table.table_name,
      dataSource: this.dataModelService.model_id,
    };

    const query = this.queryBuilderService.simpleQuery(this.columnConstant, queryParams);
    this.dataModelService.executeQuery(query).subscribe(
      () => {
        this.alertService.addSuccess($localize`:@@CorrectQuery:Consulta correcta`);
        this.newColum.emit(this.temporalColumn);
        this.spinnerService.off();
        this.close.emit();

        Swal.fire({
          title: $localize`:@@titleCalculatedColumnEditMessage:Campo calculado actualizado correctamente`,
          text: $localize`:@@textCalculatedColumnEditMessage:IMPORTANTE: Al modificar un campo calculado ya existente los paneles que lo utilizan no se actualizan automáticamente, es necesario entrar en la configuración de cada uno de ellos, pulsar en Ejecutar y guardar el informe`,
          icon: 'success',
          confirmButtonColor: '#3085d6',
          confirmButtonText: `ok`,
        });
      },
      () => {
        this.alertService.addError($localize`:@@IncorrectQuery:Consulta incorrecta`);
        this.spinnerService.off();
      }
    );
  }

  checkCalculatedColumn() {
    if (!this.sqlExpressionString) return;
    this.spinnerService.on();
    const table = this.dataModelService.getTable(this.temporalColumn);
    const queryParams: QueryParams = {
      table: table.table_name,
      dataSource: this.dataModelService.model_id,
    };
    const columnCheck: any = {
      SQLexpression: this.sqlExpressionString,
      aggregation_type: [{ value: 'none', display_name: 'No' }],
      column_granted_roles: [],
      column_name: 'computed test',
      column_type: this.selectedcolumnType,
      computed_column: 'computed',
      description: { default: 'computed test', localized: [] },
      display_name: { default: 'computed test', localized: [] },
      minimumFractionDigits: this.decimalNumberValue,
      row_granted_roles: [],
      visible: true,
    };
    const query = this.queryBuilderService.simpleQuery(columnCheck, queryParams);
    this.dataModelService.executeQuery(query).subscribe(
      () => { this.alertService.addSuccess($localize`:@@CorrectQuery:Consulta correcta`); this.spinnerService.off(); },
      () => { this.alertService.addError($localize`:@@IncorrectQuery:Consulta incorrecta`); this.spinnerService.off(); }
    );
  }

  onCloseCalculatedColumn() {
    this.close.emit();
  }

  onTypeChange(type: any) {
    this.selectedcolumnType = type.value;
    this.temporalColumn.column_type = type.value;
    if (this.temporalColumn.column_type !== 'numeric') this.temporalColumn.minimumFractionDigits = null;

    this.form.patchValue({ typeSelector: type.value });

    const ctrl = this.form.get('decimalNumber');
    if (!ctrl) return;
    if (type.value === 'numeric') {
      ctrl.enable();
    } else {
      ctrl.reset();
      ctrl.disable();
    }
  }

  update() {
    this.temporalColumn.name = this.name;
    this.temporalColumn.technical_name = this.name;
    this.temporalColumn.description = this.description;
    this.temporalColumn.SQLexpression = this.sqlExpressionString;
    this.temporalColumn.minimumFractionDigits = this.decimalNumberValue;

    this.form.patchValue({
      colName: this.name,
      description: this.description,
      sqlExpression: this.sqlExpressionString,
      decimalNumber: this.decimalNumberValue
    });
  }
}
