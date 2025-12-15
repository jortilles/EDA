import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, Output } from '@angular/core';
import { EdaDialogAbstract, EdaDialogCloseEvent,EdaDialog2Component, EdaDialog2 } from '@eda/shared/components/shared-components.index';
import { AlertService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators, ReactiveFormsModule, FormsModule} from '@angular/forms';


@Component({
  standalone: true,
  selector: 'app-calculated-column-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './calculated-column-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css'],
  imports: [ReactiveFormsModule, EdaDialog2Component, FormsModule]
})

export class CalculatedColumnDialogComponent{

  public dialog: EdaDialog2;

  @Input() table: any;
  @Input() controller: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  
  public columnName;
  public descriptionContent;
  public title = $localize`:@@addCalculatedColTitle:Añadir columna calculada a la tabla `;

  constructor(private alertService: AlertService) {}
    
  saveColumn() {
    if (!this.validateForm()) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {
      const column: any = {
        aggregation_type: [{ value: "none", display_name: "No" }],
        column_granted_roles: [],
        column_name: this.columnName,
        column_type: "numeric",
        description: { default: this.descriptionContent, localized: Array(0) },
        display_name: { default: this.columnName, localized: Array(0) },
        row_granted_roles: [],
        SQLexpression: '',
        computed_column : 'computed',
        visible: true

      };
      this.onClose(EdaDialogCloseEvent.NEW, { column: column, table_name: this.controller.params.table.technical_name });
    }
  }

  public validateForm(): boolean{
    let validatedForm = false;
    if((this.columnName && this.columnName.trim() !== '') && (this.descriptionContent && this.descriptionContent.trim() !== '')){
      validatedForm = true;
    }
    return validatedForm;
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }
}