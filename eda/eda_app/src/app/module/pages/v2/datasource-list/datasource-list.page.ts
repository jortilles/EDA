// app/components/user-management/user-management.component.ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { SharedModule } from '@eda/shared/shared.module';
import { lastValueFrom } from 'rxjs';
import { DataSourceNamesService } from '@eda/services/shared/datasource-names.service';
import * as _ from 'lodash';
import { Router } from '@angular/router';

@Component({
  selector: 'app-datasource-list',
  templateUrl: './datasource-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent],
})
export class DataSourceListPage implements OnInit {
  private datasourceService = inject(DataSourceNamesService);
  private router = inject(Router);

  dataSources: any[] = [];

  searchTerm: string = '';
  sortConfig: { key: any; direction: 'asc' | 'desc' } | null = null;

  currentPage: number = 1;
  itemsPerPage: number = 10;

  get filteredDataSources() {
    return [...this.dataSources]
      .sort((a, b) => {
        if (!this.sortConfig) return 0;
        return this.sortConfig.direction === 'asc'
          ? a[this.sortConfig.key].localeCompare(b[this.sortConfig.key])
          : b[this.sortConfig.key].localeCompare(a[this.sortConfig.key]);
      })
      .filter(dataSource =>
        dataSource.model_name.toLowerCase().includes(this.searchTerm.toLowerCase())
        // || dataSource.role.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
  }

  get paginatedDataSources() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredDataSources.slice(start, start + this.itemsPerPage);
  }

  ngOnInit(): void {
    this.loadDataSources();
  }


  async loadDataSources() {
    const models = await lastValueFrom(this.datasourceService.getDataSourceNamesForDashboard());
    this.dataSources = (models.ds||[]).sort((a, b) => {
        let va = a.model_name.toLowerCase();
        let vb = b.model_name.toLowerCase();
        return va < vb ?  -1 : va > vb ? 1 : 0
    });
}

  handleSort(key: any) {
    this.sortConfig = this.sortConfig?.key === key && this.sortConfig.direction === 'asc'
      ? { key, direction: 'desc' }
      : { key, direction: 'asc' };
  }

  totalPages() {
    return Math.ceil(this.filteredDataSources.length / this.itemsPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }


  handleEditDataSource(dataSource: any) {
    this.router.navigate(['/v2/data-source/', dataSource._id]);
  }

  handleCreateDataSource() {
  }

}