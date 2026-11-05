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
import { DropdownModule } from 'primeng/dropdown';
import { AlertService, DataSourceService, SpinnerService } from '@eda/services/service.index';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-datasources-list',
  templateUrl: './datasources-list.page.html',
  standalone: true,
  imports: [SharedModule, CommonModule, FormsModule, IconComponent, DropdownModule],
  styleUrls: ['./datasources-list.page.css']
})
export class DataSourceListPage implements OnInit {
  private datasourceService = inject(DataSourceNamesService);
  private router = inject(Router);
  private dataModelService = inject(DataSourceService);
  private alertService = inject(AlertService);
  private spinnerService = inject(SpinnerService);

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
    const models = await lastValueFrom(this.datasourceService.getModelsNames());
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

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  pageSizeOptions = [5, 10, 25, 50, 100];

  setPage(page: number) {
    this.currentPage = page;
  }


  handleEditDataSource(dataSource: any) {
    this.router.navigate(['/data-source/', dataSource._id]);
  }

  handleCreateDataSource() {
    this.router.navigate(['/admin/data-source/new']);
  }

  handleDownloadDataSource(dataSource: any) {
    this.spinnerService.on();
    this.dataModelService.getDataSourceById(dataSource._id).subscribe(
      (data: any) => {
        const blob = new Blob([JSON.stringify(data.dataSource)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        // Keep the file name filesystem-safe
        link.download = `${(dataSource.model_name || 'model').replace(/[\\/:*?"<>|]/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@modelExportedSucessfully:Modelo exportado correctamente`);
      },
      () => {
        this.spinnerService.off();
        this.alertService.addError($localize`:@@problemExportingModel:Ocurrió un problema al exportar el modelo`);
      }
    );
  }

  handleDeleteDataSource(dataSource: any) {
    Swal.fire(this.dataModelService.deleteModelConfirmOptions(dataSource.model_name)).then(result => {
      if (!result.value) return;
      this.spinnerService.on();
      this.dataModelService.deleteModel(dataSource._id).subscribe(
        () => {
          this.spinnerService.off();
          Swal.fire($localize`:@@Deleted:¡Eliminado!`, $localize`:@@DeleteSuccess:Modelo eliminado correctamente.`, 'success');
          // Drop the editor state if it still holds the deleted model
          if (this.dataModelService.model_id === dataSource._id) this.dataModelService.cleanAll();
          this.dataSources = this.dataSources.filter(ds => ds._id !== dataSource._id);
          // Step back when the current page becomes empty
          if (this.currentPage > 1 && this.currentPage > this.totalPages()) this.currentPage = this.totalPages();
        },
        err => {
          this.spinnerService.off();
          this.alertService.addError(err);
        }
      );
    });
  }

}