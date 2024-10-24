import { Component } from "@angular/core";
import { DataSourceService, QueryBuilderService, UserService, GroupService, QueryParams } from "@eda/services/service.index";
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";




@Component({
    selector: 'app-column-permission-dialog',
    templateUrl: './column-permission-dialog.component.html'
})

export class ColumnPermissionDialogComponent extends EdaDialogAbstract {

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

    public all : boolean = false;
    public none : boolean = false;
    public dynamic : boolean = false;
    public dynamicQuery : string;
    public type : string; 

    public usersLabel = $localize`:@@usersPermissions:Permisos de usuario`;
    public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
    public usersDefaultLabel = $localize`:@@users:Usuarios`;
    public groupsDefaultLabel = $localize`:@@groups:Grupos`;

    /* filterProps */
    private table: any;
    private column: any;


    constructor(private dataSourceService: DataSourceService,
                private queryBuilderService: QueryBuilderService,
                private userService: UserService,
                private groupService: GroupService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@AddPermiso:Añadir permiso`
        });

        this.dialog.style = { width: '40%', height:'65%', top:"-4em", left:'1em'};
    }

    onShow() {
        this.load();
    }

    load() {
        this.table =  this.controller.params.table;
        this.column = this.table.columns.filter(c => c.column_name === this.controller.params.column.technical_name)[0];
        this.loadDataSource();
        this.loadUsers();
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

    savePermission() {

        let permissionFilter = {};


        if(this.type === 'users'){
            permissionFilter = {
                users : this.selectedUsers.map(usr => usr._id),
                usersName : this.selectedUsers.map(usr => usr.name),
                value : this.dynamic ? this.dynamicQuery :   this.all ? '(~ => All)' :  this.none ? ['(x => None)'] : this.selectedValues,
                none : this.none ? true : false,
                table : this.table.table_name,
                column : this.column.column_name,
                global : this.all ? true : false,
                dynamic : this.dynamic, 
                type : 'users',
                /*SDA Custom */ source: 'SDA'
            };
        }
        else if(this.type === 'groups'){
            permissionFilter = {
                groups : this.selectedRoles.map(usr => usr._id),
                groupsName : this.selectedRoles.map(usr => usr.name),
                value : this.dynamic ? this.dynamicQuery : this.all ? '(~ => All)' :  this.none ? ['(x => None)'] : this.selectedValues,
                none : this.none ? true : false,
                table : this.table.table_name,
                column : this.column.column_name,
                global : this.all ? true : false,
                dynamic : this.dynamic, 
                type : 'groups',
                /*SDA Custom */ source: 'SDA'
            };
        }
        this.onClose(EdaDialogCloseEvent.NEW, permissionFilter);
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
