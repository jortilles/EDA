import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent,EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService, QueryBuilderService, QueryParams, SpinnerService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';
import { SelectItem } from 'primeng/api';
import { EditColumnPanel } from '@eda/models/data-source-model/data-source-models';
import { aggTypes } from 'app/config/aggretation-types';


@Component({
  standalone: true,
  selector: 'app-calculated-column-dialog',
  templateUrl: './calculated-column-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css'],
  imports: [ReactiveFormsModule, EdaDialog2Component, FormsModule, CommonModule]
})

export class CalculatedColumnDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public title = $localize`:@@addCalculatedColTitle:Añadir columna calculada a la tabla `;

  // Aggregation Types
  public aggTypes: SelectItem[] = aggTypes;

  // Table Name
  public tableName = "";

  public columnPanel: EditColumnPanel;

  // Types
  public columnTypes: SelectItem[] = [
    { label: 'text', value: 'text' },
    { label: 'numeric', value: 'numeric' },
    { label: 'date', value: 'date' },
    { label: 'coordinate', value: 'coordinate' }
  ];

  public aggregation_type_cases: any[] = [
    { value: "sum", display_name: "Suma",  display: true },
    { value: "avg", display_name: "Media",  display: true },
    { value: "max", display_name: "Máximo",  display: true },
    { value: "min", display_name: "Mínimo",  display: true },
    { value: "count", display_name: "Cuenta Valores",  display: true },
    { value: "count_distinct", display_name: "Valores Distintos",  display: true },
    { value: "none", display_name: "No", display: true },
  ]

  public final_aggregation_type: any[] = [
    { value: "sum", display_name: "Suma" },
    { value: "avg", display_name: "Media" },
    { value: "max", display_name: "Máximo" },
    { value: "min", display_name: "Mínimo" },
    { value: "count", display_name: "Cuenta Valores" },
    { value: "count_distinct", display_name: "Valores Distintos" },
    { value: "none", display_name: "No" },
  ];

  public selectedcolumnType = 'numeric';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService,
    private spinnerService: SpinnerService,
    public dataModelService: DataSourceService,
    private queryBuilderService: QueryBuilderService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
    });

    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      colDescription: [null, Validators.required],
      colSqlExpression: [null, Validators.required],
      colDecimalNumber: [0],
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
    console.log('.... CANCELANDO ....')

    this.onClose(EdaDialogCloseEvent.NONE);
  }

  saveColumn() {

    console.log('.... CONFIRMANDO ....')
    console.log('this.form: ', this.form);

    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {

      const column: any = {
        aggregation_type: this.selectedcolumnType === 'numeric' ? this.final_aggregation_type : [{ value: "none", display_name: "No" }],
        column_granted_roles: [],
        column_name: this.form.value.colName,
        column_type: this.selectedcolumnType,
        description: { default: this.form.value.colDescription, localized: Array(0) },
        display_name: { default: this.form.value.colName, localized: Array(0) },
        row_granted_roles: [],
        SQLexpression: this.form.value.colSqlExpression,
        computed_column : 'computed',
        minimumFractionDigits: this.form.value.colDecimalNumber,
        visible: true
      };

      console.log('Generación => column: ', column);

      this.onClose(EdaDialogCloseEvent.NEW, { column: column, table_name: this.controller.params.table.technical_name });
    }
  }

  checkCalculatedColumn(){

    if(this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {

      console.log('final_aggregation_type: ', this.final_aggregation_type);

      const columnCheck: any = {
        SQLexpression: this.form.value.colSqlExpression,
        aggregation_type: this.selectedcolumnType === 'numeric' ? this.final_aggregation_type : [{ value: "none", display_name: "No" }],
        column_granted_roles: [],
        column_name: "computed test",
        column_type: this.selectedcolumnType,
        computed_column: "computed",
        description: {default: "computed test", localized: []},
        display_name: {default: "computed test", localized: []},
        minimumFractionDigits: this.form.value.colDecimalNumber,
        row_granted_roles: [],
        visible: true,
      }

      this.spinnerService.on();

      this.tableName = this.controller.params.table.technical_name;

      const queryParams: QueryParams = {
          table: this.tableName,
          dataSource: this.dataModelService.model_id,
      };
      const query = this.queryBuilderService.simpleQuery(columnCheck, queryParams);
        this.dataModelService.executeQuery(query).subscribe(
            res => { this.alertService.addSuccess($localize`:@@CorrectQuery:Consulta correcta`); this.spinnerService.off() },
            err => { this.alertService.addError($localize`:@@IncorrectQuery:Consulta incorrecta`); this.spinnerService.off() }
        );

    }

  }

  updateAgg(type?: any) {

    console.log('type: ', type);
    const aggItem = this.aggregation_type_cases.find((item: any) => item.value === type);

    if(aggItem.display) {
      aggItem.display = false
    } else {
      aggItem.display = true
    }

    this.final_aggregation_type = this.aggregation_type_cases.filter((item: any ) => item.display).map((item: any) => {
      return {
        value: item.value,
        display_name: item.display_name
      }
    })

    console.log('this.aggregation_type_cases: ', this.aggregation_type_cases)
    console.log('this.final_aggregation_type: ', this.final_aggregation_type)


    // const inx = this.columnPanel.aggregation_type.indexOf(type);
    // if (inx != -1) {
    //     this.columnPanel.aggregation_type.splice(inx,1);
    // } else {
    //     this.columnPanel.aggregation_type.push(type);
    // }
  }

  onTypeChange(event: any) {

    console.log("event: ", event);
    this.selectedcolumnType = event.value;

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