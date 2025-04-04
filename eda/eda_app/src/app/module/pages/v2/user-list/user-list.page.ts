// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { User } from '@eda/models/model.index';

type TemporalUser = {
  _id?: string;
  email?: string;
  name?: string;
  password?: string;
  role?: any;
  isnew?: any;
};

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent],
})
export class UserListPage implements OnInit {
  private userService = inject(UserService);
  private groupService = inject(GroupService);

  groups: any[] = [];
  users: TemporalUser[] = [];

  searchTerm: string = '';
  sortConfig: { key: keyof User; direction: 'asc' | 'desc' } | null = null;
  selectedUser: TemporalUser = {};
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
        user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    console.log(this.groups)
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


  handleEditUser(user: TemporalUser) {
    this.selectedUser = user;
    this.showUserDetail = true;
  }

  handleCreateUser() {
    this.selectedUser = { isnew: true };
    this.showUserDetail = true;
  }

  handleDeleteUser(userId: string) {
    // Control de no borrar el propio usuario
    this.users = this.users.filter(user => user._id !== userId);
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
    // TODO Insert/Update user
    this.showUserDetail = false;
    
    // TODO arreglar create con rol ==> el rol ha de ser el id del group


    console.log(this.selectedUser)
    console.log(this.groups)

    
    if (this.selectedUser.isnew) { //Estamos creando usuario
      let user: User = {
        name: this.selectedUser.name,
        email: this.selectedUser.email,
        password: this.selectedUser.password,
        role: this.groups.find(group => group.name === this.selectedUser.role)._id,
      }
      this.userService.createUser(user).subscribe(
        res => {
          Swal.fire($localize`:@@CreatedUser:Usuario creado`, res.email, 'success');
          this.loadUserList();
        }, err => {
          Swal.fire($localize`:@@RegisterError:Error al registrarse`, err.text, 'error');
        }
      );   
    }



    else { //Estamos modificando usuario
      let user: User = {
        _id: this.selectedUser._id,
        name: this.selectedUser.name,
        email: this.selectedUser.email,
        password: this.selectedUser.password,
        role: this.groups.find(group => group.name === this.selectedUser.role)._id,
      }
      if (user.password && user.password !== '') {
        this.userService.manageUpdateUsers(user).subscribe(
          res => {
            Swal.fire($localize`:@@UpdatedUser:Usuario actualizado`, res.email, 'success');
            this.loadUserList();
          }, err => {
            Swal.fire($localize`:@@UpdatedUserError:Error al actualizar el usuario`, err.text, 'error');
          }
        );
      } else {
        Swal.fire($localize`:@@UpdatedUserError:Error al actualizar el usuario`,'error','error');
      }
    }
  }
}