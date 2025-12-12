// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { MultiSelectModule } from 'primeng/multiselect';
import { lastValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

type User = {
  _id?: string;
  email: string;
  name: string;
  password: string;
  role?: any;
  isnew?: any;
};

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent, MultiSelectModule],
})
export class UserListPage implements OnInit {
  private userService = inject(UserService);
  private groupService = inject(GroupService);

  public addUserTitle = $localize`:@@newUser:Crear Nuevo Usuario`;
  public updateUserTitle = $localize`:@@editUser:Editar Usuario`;

  groups: any[] = [];
  users: User[] = [];

  searchTerm: string = '';
  sortConfig: { key: keyof User; direction: 'asc' | 'desc' } | null = null;
  selectedUser: User = { name: '', email: '', password: '' };
  selectedUserApply: User = { name: '', email: '', password: '' };
  showUserDetail: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  get filteredUsers() {
    return [...this.users]
      .sort((a, b) => {
        if (!this.sortConfig) return 0;
        return this.sortConfig.direction === 'asc'
          ? a[this.sortConfig.key].localeCompare(b[this.sortConfig.key])
          : b[this.sortConfig.key].localeCompare(a[this.sortConfig.key]);
      })
      .filter(user =>
        user.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  get paginatedUsers() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadUserList();
    this.loadGroups();
  }

  async loadUserList() {
    const users = await lastValueFrom(this.userService.getUsers());

    for (const user of users) {
      const stringGroups = [];
      stringGroups.push(_.map(user.role, 'name'));
      user.role = stringGroups.join(', ');
    }

    this.users = users;
  }

  async loadGroups() {
    this.groups = await lastValueFrom(this.groupService.getGroups());
  }



  handleSort(key: keyof User) {
    this.sortConfig = this.sortConfig?.key === key && this.sortConfig.direction === 'asc'
      ? { key, direction: 'desc' }
      : { key, direction: 'asc' };
  }

  totalPages() {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }


  handleEditUser(user: User) {
    this.selectedUser = user;
    this.selectedUserApply = { ...user };
    // Comprovar si podemos coger roles
    if (typeof this.selectedUserApply.role === 'string') {
      this.selectedUserApply.role = this.selectedUser.role.split(',');
    }
    // Si los roles estan vacios quitar todo valor
    if (this.selectedUserApply.role[0] === '') {
      this.selectedUserApply.role = '';
    }

    this.showUserDetail = true;
  }

  handleCreateUser() {
    // REVISAR QUE PASA CON LAS INICIALES DE USER cache
    this.selectedUser = { name: '', email: '', password: '', isnew: true };
    this.selectedUserApply = { name: '', email: '', password: '', isnew: true };
    this.showUserDetail = true;
  }

  handleDeleteUser(userId: string) {
    // Control de no borrar el propio usuario
    if (userId === this.userService.getUserObject()._id) {
      Swal.fire($localize`:@@cantDeleteUser:No se puede borrar el usuario`, $localize`:@@cantSelfDelete:No se puede borrar a si mismo`, 'error');
      return;
    }

    // Confirmación del borrado de usuario
    let title = $localize`:@@DeleteUserMessage:Estás a punto de borrar el usuario `
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${title} `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: $localize`:@@DeleteUser:Si, ¡Bórralo!`
    }).then(deleted => {
      if (deleted.value === true) {
        this.users = this.users.filter(user => user._id !== userId);
        this.userService.deleteUser(userId).subscribe(
          res => {
            Swal.fire($localize`:@@UserDeletedOk:El usuario a sido eliminado correctamente`, res.email, 'success');
            this.loadUserList();
          }, err => {
            Swal.fire($localize`:@@ErrorMessage:Ha ocurrido un error`, err.text, 'error');
          }
        );
      }
    });
  }

  onApplyUserDetail() {
    this.showUserDetail = false;
    if (this.selectedUser.isnew) { //Estamos creando usuario

      let roleIds = (this.selectedUserApply?.role ?? [])
        .map(name => this.groups.find(group => group.name === name)?._id)
        .filter(id => id);

      let user: User = {
        name: this.selectedUserApply.name,
        email: this.selectedUserApply.email,
        password: this.selectedUserApply.password,
        ...(roleIds.length ? { role: roleIds } : {}) // solo incluye role si hay 
      };

      this.userService.createUser(user).subscribe(
        res => {
          Swal.fire($localize`:@@UserCreated:Usuario creado`, res.email, 'success');
          this.loadUserList();
        }, err => {
          Swal.fire($localize`:@@RegisterError:Error al registrarse`, err.text, 'error');
        }
      );
    }

    else { //Estamos modificando usuario
      let userToModify = this.users.find(user => user._id === this.selectedUser._id);
      this.selectedUser = this.selectedUserApply;

      if (this.selectedUser.password && this.selectedUser.password.length > 1) {
        userToModify.password = this.selectedUser.password;
      }

      userToModify.name = this.selectedUser.name;
      userToModify.email = this.selectedUser.email;
      userToModify.role = this.groups.filter(group => this.selectedUser.role.includes(group.name))
      this.userService.manageUpdateUsers(userToModify).subscribe(
        res => {
          Swal.fire($localize`:@@UpdatedUser:Usuario actualizado`, res.email, 'success');
          this.loadUserList();
        }, err => {
          Swal.fire($localize`:@@UpdatedUserError:Error al actualizar el usuario`, err.text, 'error');
        }
      );
    }
  }
}