import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertService, SpinnerService, DashboardService } from '@eda/services/service.index';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';

@Component({
  selector: 'app-view-dialog',
  templateUrl: './view-dialog.component.html',
  //styleUrls: ['./view-dialog.component.css']
})

export class ViewDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: FormGroup;
  public table: any;
  public ok : boolean = false;

  constructor(
    private formBuilder: FormBuilder,
    private alertService: AlertService,
    private dashboardService: DashboardService,
    private spinnerService: SpinnerService,
  ) {
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: ''
    });
    this.dialog.style = { width: '60%', height: '70%', top: '30px', left: '100px' };

    this.form = this.formBuilder.group({
      viewName: [null, Validators.required],
      description: [null, Validators.required],
      technical_name : [null, Validators.required],
      SQLexpression: [null, Validators.required]
    });
  }
  onShow(): void {
    this.dialog.title = $localize`:@@ViewDatamodel:Añadir Vista`;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  async checkView() {
    this.spinnerService.on();
    const body = {
      model_id: this.controller.params.model_id,
      user: this.controller.params.user,
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
      description: { default: this.form.value.description, localized: [] },
      column_type: type,
      aggregation_type: [{ value: 'none', display_name: 'no' }],
      column_granted_roles: [],
      row_granted_roles: [],
      visible: true,
      tableCount: 0
    }
    return column;
  }

  buildTable(columns: Array<any>) {
    const table = {
      table_name: `${this.form.value.technical_name}`,
      display_name: { default: `${this.form.value.viewName}`, localized: [] }, 
      description: { default: `${this.form.value.viewName}`, localized: [] }, 
      query:`(${this.form.value.SQLexpression}) as ${this.form.value.technical_name}`,
      table_granted_roles: [],
      table_type: 'view',
      columns: columns,
      relations: [],
      visible: true,
      tableCount: 0
    }
    return table;
  }

  saveView() {
    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@MandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {
      this.onClose(EdaDialogCloseEvent.NEW, this.table);
    }
  }

}