import { Component, EventEmitter, OnInit, Output, signal, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import { UserService, GroupService } from "@eda/services/service.index";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from '@angular/common';


@Component({
  standalone: true,
  selector: 'app-model-permission-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './model-permission-dialog.component.html',
  styleUrls: ['./model-permission-dialog.component.css'],
  imports: [EdaDialog2Component, CommonModule]
})

export class ModelPermissionDialogComponent implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;

  isUserSelectorOpen = signal(false)
  isGroupSelectorOpen = signal(false)

  /*model */
  public dbModel: any;

  /* MultiSelects Vars */
  public users: any[] = [];
  public selectedUsers: any[] = [];

  public roles: any[] = [];
  public selectedRoles: any[] = [];


  public permission: boolean = true;
  public anyoneCanSee: boolean = false;
  public none: boolean = false;
  public type: string;

  public usersLabel = $localize`:@@usersPermissions:Permisos de usuario`;
  public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
  public usersDefaultLabel = $localize`:@@users:Usuarios`;
  public groupsDefaultLabel = $localize`:@@groups:Grupos`;

  public title = $localize`:@@addModelPermissions:Añadir permiso a nivel de modelo`;

  constructor(private userService: UserService,
    private groupService: GroupService) {

  }

  ngOnInit(): void {
    this.display = true;
    this.load();
  }

  load() {
    this.loadUsers();
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

    if (this.anyoneCanSee === true) {
      permissionFilter = {
        users: ["(~ => All)"],
        usersName: ["(~ => All)"],
        none: this.none ? true : false,
        table: "fullModel",
        column: "fullModel",
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
          table: "fullModel",
          column: "fullModel",
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
          table: "fullModel",
          column: "fullModel",
          global: true,
          permission: this.permission,
          type: 'groups'
        };
      }
    }

    this.onClose(permissionFilter);
  }

  resetValues() {
    if (this.type === 'users') this.selectedRoles = [];
    else this.selectedUsers = [];
  }

  setPermissionType(type: "users" | "groups") {
    this.type = type;
  }

  // Métodos para manejar usuarios
  toggleUserSelector() {
    this.isUserSelectorOpen.update((open) => !open)
  }

  // Métodos para manejar grupos
  toggleGroupSelector() {
    this.isGroupSelectorOpen.update((open) => !open)
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
