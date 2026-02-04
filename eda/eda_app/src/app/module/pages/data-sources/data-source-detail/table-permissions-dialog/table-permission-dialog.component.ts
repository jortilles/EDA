import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { DataSourceService, UserService, GroupService } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from "@angular/common";
import { MultiSelectModule } from "primeng/multiselect";
import { FormsModule } from '@angular/forms';
@Component({
    standalone: true,
    selector: 'app-table-permission-dialog',
    templateUrl: './table-permission-dialog.component.html',
    imports: [EdaDialog2Component, CommonModule, MultiSelectModule, FormsModule]
})

export class TablePermissionDialogComponent implements OnInit {
    public display: boolean = false;
    @Input() table: any;
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

    public anyoneCanSee: boolean = false;
    public permission : boolean = true;
    public none : boolean = false;
    public type : string;

    public usersLabel = $localize`:@@usersPermissions:Permisos de usuario`;
    public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
    public usersDefaultLabel = $localize`:@@users:Usuarios`;
    public groupsDefaultLabel = $localize`:@@groups:Grupos`;

    /* filterProps */

    constructor(public dataSourceService: DataSourceService,
                private userService: UserService,
                private groupService: GroupService) {

        // this.dialog = new EdaDialog({
        //     show: () => this.onShow(),
        //     hide: () => this.onClose(EdaDialogCloseEvent.NONE),
        //     title: $localize`:@@addPermission:Añadir permiso`
        // });

        // this.dialog.style = { width: '40%', height:'65%', top:"-4em", left:'1em'};
    }

    ngOnInit() {
        this.load();
    }

    load() {
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
        console.log('<--- Permisos a nivel de Tabla --->')
        let permissionFilter = {};
        console.log(this)
        if(this.type===''){this.closeDialog()}
        if (this.anyoneCanSee === true) {
            permissionFilter = {
                users: ["(~ => All)"],
                usersName: ["(~ => All)"],
                none: this.none ? true : false,
                table: this.table.technical_name,
                column: "fullTable",
                global: true,
                permission: this.anyoneCanSee ? true : false,
                type: 'anyoneCanSee'
            };
        } else {


            if (this.type === 'users') {
                permissionFilter = {
                    users: this.selectedUsers.map(usr => usr._id),
                    usersName: this.selectedUsers.map(usr => usr.name),
                    none: this.none ? true : false,
                    table: this.table.technical_name,
                    column: "fullTable",
                    global: true,
                    permission: this.permission ? true : false,
                    type: 'users'
                };
            }
            else if (this.type === 'groups') {
                permissionFilter = {
                    groups: this.selectedRoles.map(usr => usr._id),
                    groupsName: this.selectedRoles.map(usr => usr.name),
                    none: this.none ? true : false,
                    table: this.table.technical_name,
                    column: "fullTable",
                    global: true,
                    permission: this.permission,
                    type: 'groups'
                };
            }
        }
        this.onClose(permissionFilter);
    }

    
  setPermissionType(type: "users" | "groups") {
    this.type = type;
  }


    resetValues(){
        if(this.type === 'users') this.selectedRoles = [];
        else this.selectedUsers = [];
    }

    closeDialog() {
        this.selectedUsers = [];
        this.onClose();
    }

    onClose(response?: any): void {
        this.display = false;
        this.close.emit(response);
      }
}
