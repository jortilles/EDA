// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import { IGroup } from '@eda/services/service.index';
import * as _ from 'lodash';
import Swal from 'sweetalert2';
import { PickListModule } from "primeng/picklist";

type Group = {
  _id?: string;
  name?: string;
  role?: { label: string; value: string; };
  users?: any[];
  img?: any;
  isnew?: any;
};

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent, PickListModule],
})
export class GroupListPage implements OnInit {
  private groupService = inject(GroupService);
  private userService = inject(UserService);

  groups: any[] = [];

  searchTerm: string = '';
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null = null;
  selectedGroup: any = {};
  users: any = {};
  availableUsers: any = {};
  showGroupDetail: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  public addGroupTitle = $localize`:@@newGroup:Crear Nuevo Grupo`;
  public updateGroupTitle = $localize`:@@editGroup:Editar Grupo`;

  get filteredGroups() {
    return [...this.groups]
      .sort((a, b) => {
        if (!this.sortConfig) return 0;
        return this.sortConfig.direction === 'asc'
          ? a[this.sortConfig.key].localeCompare(b[this.sortConfig.key])
          : b[this.sortConfig.key].localeCompare(a[this.sortConfig.key]);
      })
      .filter(group =>
        group.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  get paginatedGroups() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGroups.slice(start, start + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadGroups();
    this.loadUserList();
  }


  // Carga de todos los grupos
  async loadGroups() {
    this.groups = await lastValueFrom(this.groupService.getGroups());
    this.groups.sort((a, b) => a.name.localeCompare(b.name));
    }
  
  // Carga de todos los usuarios
  async loadUserList() {
    const users = await lastValueFrom(this.userService.getUsers());

    for (const user of users) {
      const stringGroups = [];
      stringGroups.push(_.map(user.role, 'name'));
      user.role = stringGroups.join(', ');
    }

    this.users = users;

    // Eliminamos usuarios vacios
    this.users = this.users.filter(u => u.name && u.name.trim() !== '');
  }

  handleSort(key: any) {
    this.sortConfig = this.sortConfig?.key === key && this.sortConfig.direction === 'asc'
      ? { key, direction: 'desc' }
      : { key, direction: 'asc' };
  }

  totalPages() {
    return Math.ceil(this.filteredGroups.length / this.itemsPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  // Edición de usuarios
handleEditGroup(group: Group) {
  this.selectedGroup = { ...group };

  // Clonamos la lista completa de usuarios disponibles
  this.availableUsers = [...this.users];

  // Convertimos los IDs de selectedGroup a objetos user
  const selectedUsers = this.users.filter(user =>
    group.users.includes(user._id)
  ).map(user => ({ ...user }));

  this.selectedGroup.users = selectedUsers;

  // Eliminamos los usuarios seleccionados de availableUsers
  this.availableUsers = this.availableUsers.filter(user =>
    !this.selectedGroup.users.some(u => u._id === user._id)
  );

  this.showGroupDetail = true;
}


  handleCreateGroup() {
    this.availableUsers = this.users;
    this.selectedGroup = {
      isnew: true,
      users: this.selectedGroup?.users || []
    };      this.showGroupDetail = true;
  }

  handleDeleteGroup(groupId: string) {
    // Confirmación del borrado de grupo
    let title = $localize`:@@DeleteGroupText:Eliminarás todos los elementos relacionados con este grupo. `
    Swal.fire({
        title: $localize`:@@Sure:¿Estás seguro?`,
        text: `${title} `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: $localize`:@@DeleteGroupButton:Si, ¡Eliminalo!`
    }).then(deleted => {
      if (deleted.value === true) { 
        this.groupService.deleteGroup(groupId).subscribe(
        res => {
            Swal.fire($localize`:@@GroupDeletedOk:El grupo a sido eliminado correctamente`, res.email, 'success');
            this.loadGroups();
        }, err => {
          Swal.fire($localize`:@@ErrorMessage:Ha ocurrido un error`, err.text, 'error');
        }
      );
      }
    });
  }

  onApplyGroupDetail() {
    this.showGroupDetail = false;
    // Reconversión para guardar solo sus IDs
    if (this.selectedGroup.isnew) { //Estamos creando grupo  
      let group: IGroup = {
        name: this.selectedGroup.name,
        role: { label: this.selectedGroup.name, value: this.selectedGroup.role },
        users: this.selectedGroup.users,
      }

      this.groupService.insertGroup(group).subscribe(
        res => {
          Swal.fire($localize`:@@GroupCreated:Grupo creado`, res.name, 'success');
          this.loadGroups();
        }, err => {
          Swal.fire($localize`:@@ErrorMessage:Ha ocurrido un error `, err.text, 'error');
        }
      );   
    }
    else { //Estamos modificando grupo  
      this.selectedGroup.users = this.selectedGroup.users.map(user => user._id );
      let groupToModify = this.groups.find(group => group._id === this.selectedGroup._id);
      groupToModify.name = this.selectedGroup.name; 
      groupToModify.role =  this.selectedGroup.role,
      groupToModify.users = this.selectedGroup.users; 
      this.groupService.updateGroup(this.selectedGroup._id, groupToModify).subscribe(
        res => {
          Swal.fire($localize`:@@GroupUpdated:Grupo actualizado`, res.email, 'success');
          this.loadGroups();
        }, err => {
          Swal.fire($localize`:@@UpdatedGroupError:El grupo no se ha podido actualizar`, err.text, 'error');
        }
      );       
    }

  }
}