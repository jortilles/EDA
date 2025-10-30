import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService, QueryParams, QueryBuilderService, SpinnerService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { SelectItem } from 'primeng/api';
import { EditTablePanel, EditColumnPanel, EditModelPanel, ValueListSource, Relation } from '@eda/models/data-source-model/data-source-models';



@Component({
  selector: 'app-calculated-column-dialog',
  templateUrl: './calculated-column-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class CalculatedColumnDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;

  // Types
  public columnTypes: SelectItem[] = [
      { label: 'text', value: 'text' },
      { label: 'numeric', value: 'numeric' },
      { label: 'date', value: 'date' },
      { label: 'coordinate', value: 'coordinate' }
  ];

  // Default value
  public selectedcolumnType = 'numeric';
  public decimalNumberValue;
  public sqlExpressionString = '';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService,
    private spinnerService: SpinnerService,
    public dataModelService: DataSourceService,
    private queryBuilderService: QueryBuilderService,
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@addCalculatedColTitle:Añadir columna calculada a la tabla `
    });
    this.dialog.style = { width: '55%', height: '60%', top:"-4em", left:'1em'};

    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      description: [null, Validators.required],
      sqlExpression: [null, Validators.required],
      typeSelector: [null, Validators.required],
      decimalNumber: [null, Validators.required],
    });
  }
  onShow(): void {
    const title = this.dialog.title;
    this.dialog.title = `${title} ${this.controller.params.table.name}`;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  saveColumn() {

    if(this.selectedcolumnType !== 'numeric') {
      this.decimalNumberValue = 0;
    }

    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {

      // Check if the name is available
      const tables = this.controller.params.table.columns;
      if(tables.some((column) => column.column_name.trim().toLowerCase() === this.form.value.colName.trim().toLowerCase())) {
        return this.alertService.addError($localize`:@@mandatoryDiferentName:Este nombre de campo calculado ya existe. Intente con otro.`);
      }

      // All this aggregation are prohibited
      const agg = ['avg', 'bit_and', 'bit_or', 'bit_xor', 'count', 'group_concat', 'json_arrayagg', 'json_objectagg', 'max', 'min', 'std', 'stddev', 'sum', 'var_pop', 'var_samp', 'variance', 'cume_dist', 'dense_rank', 'first_value', 'lag', 'last_value', 'lead', 'nth_value', 'ntile', 'percent_rank', 'rank', 'row_number'];
      let exists = -1;
      agg.forEach(e => { if (this.sqlExpressionString.toString().toLowerCase().indexOf(e) == 0) { exists = 1; } });

      if(exists == 1){
         this.alertService.addError($localize`:@@IncorrectQueryAgg:No se puede incluir las siguientes agregaciones: (avg, bit_and, bit_or, bit_xor, count, group_concat, json_arrayagg, json_objectagg, max, min, std, stddev, sum, var_pop, var_samp, variance, cume_dist, dense_rank, first_value, lag, last_value, lead, nth_value, ntile, percent_rank, rank, row_number)`);
         this.spinnerService.off()
      } else {

        const column: any = {
          aggregation_type: [{ value: "none", display_name: "No" }],
          column_granted_roles: [],
          column_name: this.form.value.colName,
          column_type: this.selectedcolumnType,
          description: { default: this.form.value.description, localized: Array(0) },
          display_name: { default: this.form.value.colName, localized: Array(0) },
          row_granted_roles: [],
          SQLexpression: this.sqlExpressionString,
          computed_column : 'computed',
          minimumFractionDigits: this.decimalNumberValue,
          parent: this.controller.params.table.technical_name,
          visible: true
        };
  
        this.spinnerService.on();
        
        const queryParams: QueryParams = {
            table: column.parent,
            dataSource: this.dataModelService.model_id,
        };
  
        const query = this.queryBuilderService.simpleQuery(column, queryParams);
        this.dataModelService.executeQuery(query).subscribe(
            res => { this.alertService.addSuccess($localize`:@@calculatedFieldSuccess:Cálculo del campo calculado verificado con éxito`); 
                     this.onClose(EdaDialogCloseEvent.NEW, { column: column, table_name: this.controller.params.table.technical_name });
                     this.spinnerService.off();
                   },
            err => { this.alertService.addError($localize`:@@calculatedFieldError:Error en la creación del campo calculado. Expresión SQL incorrecta`); this.spinnerService.off() }
        );
      }
    }
  }

  onTypeChange(event: any) {
    const ctrl = this.form.get('decimalNumber');
    if (!ctrl) return;

    if (event.value === 'numeric') {
      ctrl.enable();
    } else {
      ctrl.reset();
      ctrl.disable();
    }
  }


}