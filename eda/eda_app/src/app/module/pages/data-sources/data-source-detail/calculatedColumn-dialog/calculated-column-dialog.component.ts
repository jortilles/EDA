import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent,EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AlertService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';
import { SelectItem } from 'primeng/api';

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

  // Types
  public columnTypes: SelectItem[] = [
      { label: 'text', value: 'text' },
      { label: 'numeric', value: 'numeric' },
      { label: 'date', value: 'date' },
      { label: 'coordinate', value: 'coordinate' }
  ];

  public selectedcolumnType = 'numeric';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
    });

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
    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {

      const column: any = {
        aggregation_type: [{ value: "none", display_name: "No" }],
        column_granted_roles: [],
        column_name: this.form.value.colName,
        column_type: "numeric",
        description: { default: this.form.value.description, localized: Array(0) },
        display_name: { default: this.form.value.colName, localized: Array(0) },
        row_granted_roles: [],
        SQLexpression: '',
        computed_column : 'computed',
        visible: true

      };
      this.onClose(EdaDialogCloseEvent.NEW, { column: column, table_name: this.controller.params.table.technical_name });
    }
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