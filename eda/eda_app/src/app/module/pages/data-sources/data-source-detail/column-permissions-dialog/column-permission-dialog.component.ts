import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { DataSourceService, QueryBuilderService, UserService, GroupService, QueryParams } from "@eda/services/service.index";
import { EdaDialog, EdaDialogCloseEvent, EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { FormsModule } from "@angular/forms";
import { PrimengModule } from "app/core/primeng.module";
import { MultiSelectModule } from "primeng/multiselect";

@Component({
    standalone: true,
    selector: 'app-column-permission-dialog',
    templateUrl: './column-permission-dialog.component.html',
    imports: [EdaDialog2Component,FormsModule, PrimengModule, MultiSelectModule]
})

export class ColumnPermissionDialogComponent implements OnInit {

    public display: boolean = false;
    @Input() table: any;
    @Input() controller: any;
    @Output() close: EventEmitter<any> = new EventEmitter<any>();
    
    public title = $localize`:@@addPermission:Añadir permiso`;
 
    public dialog: EdaDialog;

    /*model */
    public dbModel: any;

    /* MultiSelects Vars */
    public users: Array<object>;
    public selectedUsers: Array<any> = [];

    public roles: Array<object>;
    public selectedRoles: Array<any> = [];

    public values: Array<object>;
    public selectedValues: Array<any> = [];

    public anyoneCanSee: boolean = false;
    public permission : boolean = true;

    public all : boolean = false;
    public none : boolean = false;
    public dynamic : boolean = false;
    public dynamicQuery : string;
    public type : string; 
    public column: any; 

    public usersLabel = $localize`:@@usersPermissions:Permisos de usuario`;
    public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
    public usersDefaultLabel = $localize`:@@users:Usuarios`;
    public groupsDefaultLabel = $localize`:@@groups:Grupos`;

    /* filterProps */


    constructor(private dataSourceService: DataSourceService,
                private queryBuilderService: QueryBuilderService,
                private userService: UserService,
                private groupService: GroupService) {
    }

    ngOnInit() {
        this.load();
    }

    load() {
        this.column = this.table.columns.filter(c => c.column_name === this.controller.params.column.technical_name)[0];
        this.loadUsers();
        this.loadDataSource();
    }


    loadUsers() {
        this.userService.getUsers().subscribe(
            res => this.users = res.map(user => ({label: user.name, value: user})),
            err => console.log(err)
        );
        this.groupService.getGroups().subscribe(
            res => this.roles = res.map(group => ({label:group.name, value: group})),
            err => console.log(err)
        )
    }

    loadDataSource() {
        const queryParams: QueryParams = {
            table: this.controller.params.table.table_name,
            dataSource: this.dataSourceService.model_id,
        };
        this.dataSourceService.executeQuery(
            this.queryBuilderService.simpleQuery(this.column, queryParams)
        ).subscribe(
            res => this.values = res[1].map(item => ({ label: item[0], value: item[0] })),
            err => console.log(err)
        );
    }

    savePermission() {


        let permissionFilter = {};

        // Determinar el valor basándose en las opciones seleccionadas
        let value;
        let isDynamic = false;

        if (this.all) {
            value = ["(~ => All)"];
        } else if (this.none) {
            value = ["(x => None)"];
        } else if (this.dynamic) {
            value = [this.dynamicQuery];
            isDynamic = true;
        } else {
            value = this.selectedValues;
        }


        if (this.type === 'users') {
            permissionFilter = {
                users: this.selectedUsers.map(usr => usr._id),
                usersName: this.selectedUsers.map(usr => usr.name),
                value: value,
                dynamic: isDynamic,
                none: this.none ? true : false,
                table: this.table.technical_name,
                column: this.column.column_name,
                global: false,
                permission: this.permission ? true : false,
                type: 'users'
            };
        }
        else if (this.type === 'groups') {
            permissionFilter = {
                groups: this.selectedRoles.map(usr => usr._id),
                groupsName: this.selectedRoles.map(usr => usr.name),
                value: value,
                dynamic: isDynamic,
                none: this.none ? true : false,
                table: this.table.technical_name,
                column: this.column.column_name,
                global: false,
                permission: this.permission,
                type: 'groups'
            };
        }

        this.onClose(EdaDialogCloseEvent.NEW, permissionFilter);
    }

  setPermissionType(type: "users" | "groups") {
    this.type = type;
  }

  resetValues(){
        if(this.type === 'users') this.selectedRoles = [];
        else this.selectedUsers = [];
    }

    syncronizeAllNoneValuesNone(){
        if(this.none === true ){
            this.all = false;
            this.dynamic = false;
        }
    }

    syncronizeAllNoneValuesAll(){
        if(this.all === true ){
            this.none = false;
            this.dynamic = false;
        }
    }

    syncronizeAllNoneValuesDynamic(){
        if(this.dynamic === true ){
            this.none = false;
            this.all = false;
        }
    }
    closeDialog() {
        this.selectedUsers = [];
        this.selectedValues = [];
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
