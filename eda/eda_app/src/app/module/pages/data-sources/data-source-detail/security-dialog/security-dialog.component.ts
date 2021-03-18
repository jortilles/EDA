import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent, EdaContextMenu } from '@eda/shared/components/shared-components.index';
import { AlertService, DataSourceService } from '@eda/services/service.index';
import { EdaColumnText, EdaTable } from '@eda/components/component.index';


@Component({
  selector: 'eda-security-dialog',
  templateUrl: './security-dialog.component.html',
  //styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class SecurityDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public securityTable: EdaTable;


  constructor(
    public dataModelService: DataSourceService,
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@securityConfig:Configuración de seguridad`
    });

    this.dialog.style = { width: '45%', height: '50%', top: '50px', left: '90px' };

    this.securityTable = new EdaTable({
      
      cols: [
          new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
          new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
          new EdaColumnText({ field: 'table', header: $localize`:@@tablesd:TABLA` }),
          new EdaColumnText({ field: 'column', header: $localize`:@@column:COLUMNA` }),
      ]
  });

  }
  onShow(): void {

    const model = this.controller.params.model;
    const tables = this.dataModelService.getModel();
    const groups = model.metadata.model_granted_roles.filter(e => e.type ==='groups');
    const users = model.metadata.model_granted_roles.filter(e => e.type === 'users');


    this.securityTable.value = [];

    groups.forEach(group => {

      const table = tables.filter(t => t.table_name === group.table)[0];
      const table_name = table.display_name.default;
      const column = table.columns.filter(c => c.column_name === group.column)[0];
      const column_name = column.display_name.default;

      group.groupsName.forEach(name => {
        this.securityTable.value.push({
          user:null,
          group:name,
          table:table_name,
          column:column_name
        })
      })
    });

    users.forEach(user => {

      const table = tables.filter(t => t.table_name === user.table)[0];
      const table_name = table.display_name.default;
      const column = table.columns.filter(c => c.column_name === user.column)[0];
      const column_name = column.display_name.default;

      user.usersName.forEach(name => {
        this.securityTable.value.push({
          user:name,
          group:null,
          table:table_name,
          column:column_name
        })
      })
    });


  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

}