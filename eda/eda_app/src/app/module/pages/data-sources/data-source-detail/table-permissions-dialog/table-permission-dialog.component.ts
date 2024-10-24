import { Component } from "@angular/core";
import { DataSourceService, QueryBuilderService, UserService, GroupService, QueryParams } from "@eda/services/service.index";
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";




@Component({
    selector: 'app-table-permission-dialog',
    templateUrl: './table-permission-dialog.component.html'
})

export class TablePermissionDialogComponent extends EdaDialogAbstract {

    public dialog: EdaDialog;

    /*model */
    public dbModel: any;

    /* MultiSelects Vars */
    public users: Array<object>;
    public selectedUsers: Array<any> = [];

    public roles: Array<object>;
    public selectedRoles: Array<any> = [];


    public permission : boolean = true;
    public none : boolean = false;
    public type : string;

    public usersLabel = $localize`:@@usersPermissions:Permisos de usuario`;
    public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
    public usersDefaultLabel = $localize`:@@users:Usuarios`;
    public groupsDefaultLabel = $localize`:@@groups:Grupos`;

    /* filterProps */
    private table: any;

    /*SDA CUSTOM*/ constructor(public dataSourceService: DataSourceService,
                private userService: UserService,
                private groupService: GroupService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: $localize`:@@addPermissions:Añadir permiso`
        });

        this.dialog.style = { width: '40%', height:'65%', top:"-4em", left:'1em'};
    }

    onShow() {
        this.load();
    }

    load() {
        this.table =  this.controller.params.table;
        this.loadDataSource();
        this.loadUsers();
    }

    loadDataSource() {
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
                none : this.none ? true : false,
                table : this.controller.params.table.technical_name,
                column : "fullTable",
                global : true,
                permission : this.permission ? true : false,
                type : 'users',
              /*SDA Custom */      source: 'SDA'
            };
        }
        else if(this.type === 'groups'){
            permissionFilter = {
                groups : this.selectedRoles.map(usr => usr._id),
                groupsName : this.selectedRoles.map(usr => usr.name),
                none : this.none ? true : false,
                table : this.controller.params.table.technical_name,
                column : "fullTable",
                global : true,
                permission : this.permission,
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

    closeDialog() {
        this.selectedUsers = [];
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }
}
