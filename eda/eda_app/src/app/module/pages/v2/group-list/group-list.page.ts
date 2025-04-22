// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GroupService, UserService } from '@eda/services/service.index';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';
import Swal from 'sweetalert2';
import { EdaListComponent } from '@eda/shared/components/eda-list/eda-list.component';
import { IGroup } from '@eda/services/service.index';
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
  imports: [SharedModule, CommonModule, FormsModule, IconComponent, EdaListComponent],
})
export class GroupListPage implements OnInit {
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
        group.name.toLowerCase().includes(this.searchTerm.toLowerCase())
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


  handleEditGroup(group: Group) {
    this.selectedGroup = group;
    this.showGroupDetail = true;
  }

  handleCreateGroup() {
    this.selectedGroup = { isnew: true };
    this.showGroupDetail = true;
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
    if (this.selectedGroup.isnew) { //Estamos creando grupo  
      let group: IGroup = {
        name: this.selectedGroup.name,
        role: { label: this.selectedGroup.name, value: this.selectedGroup.role },
        users: [],
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