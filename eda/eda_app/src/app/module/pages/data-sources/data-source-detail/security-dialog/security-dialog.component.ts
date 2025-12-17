import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { DataSourceService } from '@eda/services/service.index';
import { EdaColumnText, EdaTable, EdaTableComponent } from '@eda/components/component.index';
import { EditColumnPanel, EditModelPanel } from '@eda/models/data-source-model/data-source-models';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";


@Component({
  standalone: true,
  selector: 'eda-security-dialog',
  templateUrl: './security-dialog.component.html',
  imports: [EdaDialog2Component, EdaTableComponent]
})

export class SecurityDialogComponent implements OnInit {
  public display: boolean = false;
  @Input() config: any;
  @Input() model: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public title = $localize`:@@securityConfig:Configuración de seguridad`;

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
    this.securityTable = new EdaTable({

      cols: [
        new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
        new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
        new EdaColumnText({ field: 'table', header: $localize`:@@tablesd:TABLA` }),
        new EdaColumnText({ field: 'column', header: $localize`:@@column:COLUMNA` }),
        new EdaColumnText({ field: 'permission', header: $localize`:@@permisos:PERMISOS` }),
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

  ngOnInit(): void {
    const model = this.model;
    const tables = this.dataModelService.getModel();
    const groups = model.metadata.model_granted_roles.filter(e => e.type === 'groups' && e.column != 'fullTable' && (e.table != 'fullModel' && e.column != 'fullModel'));
    const users = model.metadata.model_granted_roles.filter(e => e.type === 'users' && e.column != 'fullTable' && (e.table != 'fullModel' && e.column != 'fullModel'));

    const tableGroups = model.metadata.model_granted_roles.filter(e => e.type === 'groups' && e.column === 'fullTable');
    const tableUsers = model.metadata.model_granted_roles.filter(e => e.type === 'users' && e.column === 'fullTable');

    const modelGroups = model.metadata.model_granted_roles.filter(e => e.type === 'groups' && e.table === 'fullModel' && e.column === 'fullModel');
    const modelUsers = model.metadata.model_granted_roles.filter(e => e.type === 'users' && e.table === 'fullModel' && e.column === 'fullModel');
    const modelAnyoneCanSee = model.metadata.model_granted_roles.filter(e => e.type === 'anyoneCanSee');

    this.securityTable.value = [];
    this.securityTableTableLevel.value = [];
    this.securityModelTableLevel.value = [];

    groups.forEach(group => {
      try {
        const table = tables.filter(t => t.table_name === group.table)[0];
        const table_name = table.display_name.default;
        const column = table.columns.filter(c => c.column_name === group.column)[0];
        const column_name = column.display_name.default;
        const permission = group.value.toString();
        group.groupsName.forEach(name => {
          this.securityTable.value.push({
            user: null,
            group: name,
            table: table_name,
            column: column_name,
            permission: permission
          })
        })
      } catch (e) {
        console.log('No data for this group at column level. You defined a security group no longer exists');
        console.log(group);
      }
    });
    users.forEach(user => {
      try {
        const table = tables.filter(t => t.table_name === user.table)[0];
        const table_name = table.display_name.default;
        const column = table.columns.filter(c => c.column_name === user.column)[0];
        const column_name = column.display_name.default;
        const permission = user.value.toString();
        user.usersName.forEach(name => {
          this.securityTable.value.push({
            user: name,
            group: null,
            table: table_name,
            column: column_name,
            permission: permission
          })
        })
      } catch (e) {
        console.log('No data for this user at column level. You defined a security for an user  no longer exists');
        console.log(user);
      }
    });


    /** table based visibility */
    tableGroups.forEach(group => {
      try {
        const table = tables.filter(t => t.table_name === group.table)[0];
        const table_name = table.display_name.default;
        const value = group.permission ? this.si : this.no;
        group.groupsName.forEach(name => {
          this.securityTableTableLevel.value.push({
            user: null,
            group: name,
            table: table_name,
            value: value
          })
        })
      } catch (e) {
        console.log('No data for this group at table leve. You defined a security group no longer exists');
        console.log(group);
      }
    });
    /** table based visibility */
    tableUsers.forEach(user => {
      try {
        const table = tables.filter(t => t.table_name === user.table)[0];
        const table_name = table.display_name.default;
        const value = user.permission ? this.si : this.no;
        user.usersName.forEach(name => {
          this.securityTableTableLevel.value.push({
            user: name,
            group: null,
            table: table_name,
            value: value
          })
        })
      } catch (e) {
        console.log('No data for this user at table level. You defined a security for an user  no longer exists');
        console.log(user);
      }
    });




    /** model based visibility */
    modelGroups.forEach(group => {
      try {
        const value = group.permission ? this.si : this.no;
        group.groupsName.forEach(name => {
          this.securityModelTableLevel.value.push({
            user: null,
            group: name,
            value: value
          })
        })
      } catch (e) {
        console.log('No data for this group at model level. You defined a security group no longer exists');
        console.log(group);
      }
    });
    /** model based visibility */
    modelUsers.forEach(user => {
      try {
        const value = user.permission ? this.si : this.no;
        user.usersName.forEach(name => {
          this.securityModelTableLevel.value.push({
            user: name,
            group: null,
            value: value
          })
        })
      } catch (e) {
        console.log('No data for this user at model level. You defined a security for an user  no longer exists');
        console.log(user);
      }
    });
    /** model based visibility */
    modelAnyoneCanSee.forEach(e => {
      const value = e.permission ? this.si : this.no;
      this.securityModelTableLevel.value.push({
        user: e.usersName,
        group: e.usersName,
        value: value
      })
    });
  }

  onClose(response?: any): void {
    this.display = false;
    this.close.emit(response);
  }

  closeDialog() {
    this.onClose();
  }
}