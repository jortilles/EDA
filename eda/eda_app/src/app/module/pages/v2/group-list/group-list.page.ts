// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { EdaListComponent } from '@eda/shared/components/eda-list/eda-list.component';

@Component({
  selector: 'app-group-list',
  templateUrl: './group-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent, EdaListComponent],
})
export class GroupListPage implements OnInit {
  private userService = inject(UserService);
  private groupService = inject(GroupService);

  groups: any[] = [];

  searchTerm: string = '';
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null = null;
  selectedGroup: any = {};
  showGroupDetail: boolean = false;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  get filteredGroups() {
    return [...this.groups]
      .sort((a, b) => {
        if (!this.sortConfig) return 0;
        return this.sortConfig.direction === 'asc'
          ? a[this.sortConfig.key].localeCompare(b[this.sortConfig.key])
          : b[this.sortConfig.key].localeCompare(a[this.sortConfig.key]);
      })
      .filter(group =>
        group.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        group.role.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  get paginatedGroups() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredGroups.slice(start, start + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadGroups();
  }


  async loadGroups() {
    this.groups = await lastValueFrom(this.groupService.getGroups());
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


  handleEditGroup(group: any) {
    this.selectedGroup = group;
    this.showGroupDetail = true;
  }

  handleCreateGroup() {
    this.selectedGroup = { isnew: true };
    this.showGroupDetail = true;
  }

  handleDeleteGroup(userId: string) {
    // TODO Remove User call
    this.groups = this.groups.filter(user => user._id !== userId);
  }

  onApplyGroupDetail() {
    // TODO Insert/Update user
    this.showGroupDetail = false;
  }
}