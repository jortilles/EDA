import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent, EdaContextMenu } from '@eda/shared/components/shared-components.index';
import {   DataSourceService } from '@eda/services/service.index';
import { EdaColumnText, EdaTable } from '@eda/components/component.index';
import { EditColumnPanel, EditModelPanel, EditTablePanel } from '@eda/models/data-source-model/data-source-models';


@Component({
  selector: 'eda-security-dialog',
  templateUrl: './security-dialog.component.html',
  //styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class SecurityDialogComponent extends EdaDialogAbstract {
  //public tablePanel: EditTablePanel;
  public dialog: EdaDialog;
  //public table: EdaTable;
  public columnPanel: EditColumnPanel;
  public modelPanel: EditModelPanel;
  public securityTable: EdaTable;
  public securityTableTableLevel: EdaTable;
  public securityModelTableLevel: EdaTable;


  public si = $localize`:@@si:Si`;
  public no = $localize`:@@no:No`;


  public permissions: Array<any>;
  constructor(   
    public dataModelService: DataSourceService,
  ) {
    super();

    
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@securityConfig:Configuración de seguridad`
    });

    this.dialog.style = { width: '60%', height: '80%', top:"-4em", left:'1em' };

    this.securityTable = new EdaTable({
      
      cols: [
          new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
          new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
          new EdaColumnText({ field: 'table', header: $localize`:@@tablesd:TABLA` }),
          new EdaColumnText({ field: 'column', header: $localize`:@@column:COLUMNA` }),
          new EdaColumnText({ field: 'permission',  header: $localize`:@@permisos:PERMISOS` }),
      ]
  });
  this.securityTableTableLevel = new EdaTable({
      
    cols: [
        new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
        new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
        new EdaColumnText({ field: 'table', header: $localize`:@@tablesd:TABLA` }),
        new EdaColumnText({ field: 'value', header: $localize`:@@visible:VISIBLE` }),
    ]
  });
  this.securityModelTableLevel = new EdaTable({
      
    cols: [
        new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
        new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
        new EdaColumnText({ field: 'value', header: $localize`:@@visible:VISIBLE` }),
    ]
  });
  }
  onShow(): void {

    const model = this.controller.params.model;
    const tables = this.dataModelService.getModel();
    const groups = model.metadata.model_granted_roles.filter(e => e.type ==='groups' &&   e.column !='fullTable'  &&  ( e.table !='fullModel' && e.column !='fullModel' ) );
    const users = model.metadata.model_granted_roles.filter(e => e.type === 'users' &&   e.column !='fullTable'  &&   ( e.table !='fullModel' && e.column !='fullModel' ) );

    const tableGroups =  model.metadata.model_granted_roles.filter(e => e.type ==='groups' &&   e.column ==='fullTable');
    const tableUsers = model.metadata.model_granted_roles.filter(e => e.type === 'users' &&   e.column === 'fullTable');

    const modelGroups =  model.metadata.model_granted_roles.filter(e => e.type ==='groups' &&   e.table ==='fullModel' &&   e.column ==='fullModel' );
    const modelUsers = model.metadata.model_granted_roles.filter(e => e.type === 'users'   &&   e.table ==='fullModel' &&   e.column ==='fullModel' );
    const modelAnyoneCanSee = model.metadata.model_granted_roles.filter(e => e.type === 'anyoneCanSee'   );

    this.securityTable.value = [];
    this.securityTableTableLevel.value = [];
    this.securityModelTableLevel.value = [];


    groups.forEach(group => {
      const table = tables.filter(t => t.table_name === group.table)[0];
      const table_name = table.display_name.default;
      const column = table.columns.filter(c => c.column_name === group.column)[0];
      const column_name = column.display_name.default;
      //console.log(column);
      //const permission = "";
      const permission = group.value.toString();
      group.groupsName.forEach(name => {
        this.securityTable.value.push({
          user:null,
          group:name,
          table:table_name,
          column:column_name,
          permission:permission
        })
      })
    });
    users.forEach(user => {
      const table = tables.filter(t => t.table_name === user.table)[0];
      const table_name = table.display_name.default;
      const column = table.columns.filter(c => c.column_name === user.column)[0];
      const column_name = column.display_name.default;
      //console.log(column);
      //const permission = "";
      const permission = user.value.toString();
      user.usersName.forEach(name => {
        this.securityTable.value.push({
          user:name,
          group:null,
          table:table_name,
          column:column_name,
          permission:permission
        })
      })
    });


    /** table based visibility */
    tableGroups.forEach(group => {
      const table = tables.filter(t => t.table_name === group.table)[0];
      const table_name = table.display_name.default;
      const value = group.permission?this.si:this.no;
      group.groupsName.forEach(name => {
        this.securityTableTableLevel.value.push({
          user:null,
          group:name,
          table:table_name,
          value:value
        })
      })
    });
    /** table based visibility */
    tableUsers.forEach(user => {
      const table = tables.filter(t => t.table_name === user.table)[0];
      const table_name = table.display_name.default;
      const value = user.permission?this.si:this.no;
      user.usersName.forEach(name => {
        this.securityTableTableLevel.value.push({
          user:name,
          group:null,
          table:table_name,
          value:value
        })
      })
    });




     /** model based visibility */
     modelGroups.forEach(group => {
      const value = group.permission?this.si:this.no;
      group.groupsName.forEach(name => {
        this.securityModelTableLevel.value.push({
          user:null,
          group:name,
          value:value
        })
      })
    });
    /** model based visibility */
    modelUsers.forEach(user => {
      const value = user.permission?this.si:this.no;
      user.usersName.forEach(name => {
        this.securityModelTableLevel.value.push({
          user:name,
          group:null,
          value:value
        })
      })
    });
    /** model based visibility */
    modelAnyoneCanSee.forEach(e => {
      const value = e.permission?this.si:this.no;
        this.securityModelTableLevel.value.push({
          user:e.usersName,
          group:e.usersName,
          value:value
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