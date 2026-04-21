import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AlertService, TemplateService, UserService, GroupService, DashboardService, StyleProviderService } from '@eda/services/service.index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import { DataSourceNamesService } from '@eda/services/shared/datasource-names.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { SelectItem } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'app-template-center',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CommonModule, DropdownModule, ButtonModule, SelectButtonModule, MultiSelectModule],
  templateUrl: './template-center.page.html',
  styleUrls: ['./template-center.page.css']
})
export class TemplateCenterPage implements OnInit, OnDestroy {
  private templateService = inject(TemplateService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private userService = inject(UserService);
  private groupService = inject(GroupService);
  private dashboardService = inject(DashboardService);
  private createDashboardService = inject(CreateDashboardService);
  private dataSourceNameService = inject(DataSourceNamesService);
  private stylesProviderService = inject(StyleProviderService);

  templates: any[] = [];
  filteredTemplates: any[] = [];
  searchQuery: string = '';
  sortingType: string = 'lastUsedAt';

  isObserver: boolean = true;
  grups: Array<any> = [];

  showCreateFromTemplate: boolean = false;
  selectedTemplate: any = null;
  createForm: any = {
    name: '',
    visible: 'private',
    group: null
  };

  dataSources: any[] = [];
  selectedDataSource: any = null;
  visibleTypes: SelectItem[] = [];
  showGroups: boolean = false;

  isArray = Array.isArray;

  formatDate(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  constructor() { }

  ngOnInit(): void {
    this.loadTemplates();
    this.setIsObserver();
    this.initializeCreateForm();
  }

  ngOnDestroy(): void { }

  private initializeCreateForm(): void {
    this.visibleTypes = [
      { label: $localize`:@@publicPanel:Publico`, value: 'open', icon: 'fa fa-fw fa-globe' },
      { label: $localize`:@@commonPanel:Común`, value: 'common', icon: 'fa fa-fw fa-globe' },
      { label: $localize`:@@group:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
      { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
    ];

    this.dataSourceNameService.getDataSourceNamesForDashboard().subscribe((res) => {
      this.dataSources = res?.ds;
      this.dataSources = this.dataSources.sort((a, b) => {
        let va = a.model_name.toLowerCase();
        let vb = b.model_name.toLowerCase();
        return va < vb ? -1 : va > vb ? 1 : 0
      });
    });

    this.loadGroups();
  }

  private async loadGroups(): Promise<void> {
    try {
      this.grups = await this.groupService.getGroupsByUser().toPromise();

      if (this.grups.length === 0) {
        this.visibleTypes.splice(1, 1);
      }
    } catch (err) {
      this.alertService.addError(err)
      throw err;
    }
  }

  private setIsObserver = async () => {
    this.groupService.getGroupsByUser().subscribe(
      res => {
        const user = localStorage.getItem('user');
        const userID = JSON.parse(user)._id;
        this.grups = res;
        this.isObserver = this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0
      },
      (err) => this.alertService.addError(err)
    );
  }

  private async loadTemplates(dataSourceId?: string) {
    try {
      const params: any = {};
      if (dataSourceId) {
        params.dataSourceId = dataSourceId;
      }
      const data = await lastValueFrom(this.templateService.getTemplates(params));
      this.templates = data.templates || [];
      this.filteredTemplates = [...this.templates];
      this.handleSorting();
    } catch (err) {
      this.alertService.addError(err);
    }
  }

  public onDataSourceChange(): void {
    if (this.selectedDataSource) {
      this.loadTemplates(this.selectedDataSource._id);
    } else {
      this.loadTemplates();
    }
  }

  public filterByTitle(event: Event) {
    const raw = (event.target as HTMLInputElement).value?.toString().trim() || '';
    this.searchQuery = raw;
    this.applyFilters();
  }

  private applyFilters() {
    if (this.searchQuery.length <= 1) {
      this.filteredTemplates = [...this.templates];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredTemplates = this.templates.filter(template => {
        return template.name?.toLowerCase().includes(query) ||
          template.description?.toLowerCase().includes(query) ||
          template.config?.title?.toLowerCase().includes(query) ||
          template.config?.ds?.name?.toLowerCase().includes(query);
      });
    }
    this.handleSorting();
  }

  handleSorting() {
    const sortFn = this.getSortFunction();
    this.filteredTemplates.sort(sortFn);
  }

  private getSortFunction(): (a: any, b: any) => number {
    switch (this.sortingType) {
      case 'name':
        return (a, b) => (a.name || a.config?.title || '').localeCompare(b.name || b.config?.title || '');
      case 'nameDesc':
        return (a, b) => (b.name || b.config?.title || '').localeCompare(a.name || a.config?.title || '');
      case 'dateAsc':
        return (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'dateDesc':
        return (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'lastUsedAt':
        return (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      case 'useCount':
        return (a, b) => (b.useCount || 0) - (a.useCount || 0);
      default:
        return (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    }
  }

  public openCreateFromTemplate(template: any) {
    this.selectedTemplate = template;
    this.createForm = {
      name: template.name + ' - ' + $localize`:@@newReport:Nuevo Informe`,
      visible: 'private',
      group: null
    };
    this.showGroups = false;
    this.showCreateFromTemplate = true;
  }

  public closeCreateFromTemplate() {
    this.showCreateFromTemplate = false;
    this.selectedTemplate = null;
  }

  public handleSelectedBtn(event): void {
    this.showGroups = event.value === 'group';
  }

  public async createDashboardFromTemplate(): Promise<void> {
    if (!this.createForm.name) {
      this.alertService.addError($localize`:@@fillRequiredFields:Por favor, rellene los campos obligatorios`);
      return;
    }

    try {
      const res = await lastValueFrom(
        this.templateService.createDashboardFromTemplate(
          this.selectedTemplate._id,
          {
            name: this.createForm.name,
            visible: this.createForm.visible,
            group: this.createForm.group ? _.map(this.createForm.group, '_id') : undefined
          }
        )
      );

      this.alertService.addSuccess($localize`:@@dashboardCreated:Informe creado correctamente`);
      this.closeCreateFromTemplate();

      if (res.dashboard?._id) {
        this.router.navigate(['/dashboard', res.dashboard._id]);
      } else {
        this.loadTemplates();
      }
    } catch (err) {
      this.alertService.addError(err);
    }
  }

  public deleteTemplate(template: any): void {
    let text = $localize`:@@deleteTemplateWarning:Estás a punto de borrar la plantilla:`;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text} ${template.name}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#14B8A6",
      cancelButtonColor: " #ff2802",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
    }).then(deleted => {
      if (deleted.value) {
        this.templateService.deleteTemplate(template._id).subscribe(
          () => {
            this.templates = this.templates.filter(t => t._id !== template._id);
            this.filteredTemplates = this.filteredTemplates.filter(t => t._id !== template._id);
            this.alertService.addSuccess($localize`:@@TemplateDeletedInfo:Plantilla eliminada correctamente.`);
          },
          err => this.alertService.addError(err)
        );
      }
    });
  }

  public goToHome() {
    this.router.navigate(['/home']);
  }

  public openCreateDashboard() {
    this.createDashboardService.open();
  }
}
