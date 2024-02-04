import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';


@Component({
  selector: 'app-calculated-column-dialog',
  templateUrl: './calculated-column-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class CalculatedColumnDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@addCalculatedColTitle:Añadir columna calculada a la tabla `
    });
    this.dialog.style = { width: '50%', height: '40%', top:"-4em", left:'1em'};

    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      description: [null, Validators.required]
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



}