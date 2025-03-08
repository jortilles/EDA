// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';

type User = {
  _id?: string;
  email?: string;
  name?: string;
  role?: string;
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
  users: User[] = [];

  searchTerm: string = '';
  sortConfig: { key: keyof User; direction: 'asc' | 'desc' } | null = null;
  selectedUser: User = {};
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
    this.showUserDetail = true;
  }

  handleCreateUser() {
    this.selectedUser = { isnew: true };
    this.showUserDetail = true;
  }

  handleDeleteUser(userId: string) {
    // TODO Remove User call
    this.users = this.users.filter(user => user._id !== userId);
  }

  onApplyUserDetail() {
    // TODO Insert/Update user
    this.showUserDetail = false;
  }
}