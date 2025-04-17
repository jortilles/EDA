import { Component, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { UserService } from '@eda/services/api/user.service';
import { AlertService, DashboardService } from '@eda/services/service.index';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import { CreateDashboardComponent } from '@eda/shared/components/shared-components.index';
@Component({
  selector: 'app-v2-home-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CreateDashboardComponent],
  templateUrl: './home.page.html'
})
export class HomePageV2 implements OnInit {
  private createDashboardService = inject(CreateDashboardService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  allDashboards: any[] = [];
  publicReports: any[] = [];
  privateReports: any[] = [];
  roleReports: any[] = [];
  sharedReports: any[] = [];
  reportMap: any = {};

  activeFilters: string[] = ['Veure tots', 'Ajuntament'];
  
  tags: any[] = [];
  selectedTags = signal<any[]>(JSON.parse(sessionStorage.getItem('activeTags') ? sessionStorage.getItem('activeTags') : '[]').map(
    tag => ({ label: tag.label, value: String(tag.value) })
  ));

  isOpenTags = signal(false)
  searchTagTerm = signal("")


  //Variables de control de edició Modificar
  isEditing: boolean = false;
  editingReportId: number;
  editTitle: string = ''; 
  sortingType: string = sessionStorage.getItem('homeSorting') || 'name';

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadReports();
  }

  private async loadReports() {
    const { publics, shared, dashboards, group } = await lastValueFrom(this.dashboardService.getDashboards());
    this.publicReports = publics;
    this.privateReports = dashboards;
    this.roleReports = group;
    this.sharedReports = shared;

  this.allDashboards = [].concat(this.publicReports, this.privateReports, this.roleReports, this.sharedReports);

  this.reportMap = {
    private: this.privateReports,
    group: this.roleReports,
    public: this.publicReports,
    shared: this.sharedReports
  };

  this.handleSorting();
  this.loadReportTags();
  }

  private async loadReportTags() {
    /** Obtener etiquetas únicas */
    this.tags = _.uniqBy(
      [...this.privateReports, ...this.publicReports, ...this.roleReports, ...this.sharedReports]
        .flatMap(db => db.config.tag) // Aplanamos los arrays de tags
        .filter(tag => tag !== null && tag !== undefined) // Eliminamos valores nulos o indefinidos
        .flatMap(tag => Array.isArray(tag) ? tag : [tag]) // Si es un array, lo expandimos; si no, lo mantenemos como está
        .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag), // Convertimos en objetos { label, value }
      'value' // Eliminamos duplicados basados en el valor
    );

    // Agregar opciones adicionales
    this.tags.unshift({ label: $localize`:@@NoTag:Sin Etiqueta`, value: 0 });
    this.tags.push({ label: $localize`:@@AllTags:Todos`, value: 1 });
    this.filterByTags();
  }

  public openReport(report: any) {
    this.router.navigate(['/v2/dashboard', report._id]);
  }

  public handleTagSelect(option: any): void {
    const currentFilters = this.selectedTags(); // Filtros de tags 
    const tags = JSON.parse(sessionStorage.getItem("activeTags") || "[]"); // Tags activos en sesion
    
    if (currentFilters.some((filter) => filter.value === option.value)) { //Si el filtro existe eliminamos este
      this.selectedTags.set(currentFilters.filter((filter) => filter.value !== option.value)); // Elimina el valor del tag del headerTag
      sessionStorage.setItem("activeTags", JSON.stringify((() => {
        return tags.filter(tag => tag.value !== option.value) // Elimina valor del JSON de storage
      })()));
    } else {
      this.selectedTags.set([...currentFilters, option]); // Añadir el valor del tag del headerTag
      sessionStorage.setItem("activeTags", JSON.stringify((() => {
        return [...tags, option]; // Añadir valor del JSON de storage
      })()));
    }

    this.isOpenTags.set(false);
    this.filterByTags();
  }

  public filteredTags(): any[] {
    return this.tags.filter((option) => option.label.toLowerCase().includes(this.searchTagTerm().toLowerCase()))
  }

  public removeTag(filterToRemove: any): void {
    this.selectedTags.set(this.selectedTags().filter((filter) => filter.value !== filterToRemove.value)); // Elimina del header el tag
    sessionStorage.setItem("activeTags", JSON.stringify((() => {    
      const tags = JSON.parse(sessionStorage.getItem("activeTags") || "[]"); 
      return tags.filter(tag => tag.value !== filterToRemove.value); // Elimina valor del JSON de storage
    })()));
    this.filterByTags();
  }

  public toggleDropdownTags(): void {
    this.isOpenTags.set(!this.isOpenTags())
  }

  public isTagSelected(optionValue: string): boolean {
    return this.selectedTags().some(filter => filter.value === optionValue);
  }

  public onCreateDashboard() {
    this.createDashboardService.open();
  }

  public filterByTags() { // Esta función actualiza los reports, y es llamada cada vez que se modifican los tags
    const tags = sessionStorage.getItem("activeTags") || "[]";
    if (tags.includes('1') || tags === '[]') { // Si tiene la etiqueta Todos o no tiene etiqueta mostraremos todos los informes
      this.publicReports  = this.reportMap.public;
      this.sharedReports  = this.reportMap.shared;
      this.privateReports = this.reportMap.private;
      this.roleReports    = this.reportMap.group;
    } else {
      // Asignación de reportes visibles
      this.publicReports  = this.checkTagsIntoReports(this.reportMap.public, tags);
      this.sharedReports  = this.checkTagsIntoReports(this.reportMap.shared, tags);
      this.privateReports = this.checkTagsIntoReports(this.reportMap.private, tags);
      this.roleReports = this.checkTagsIntoReports(this.reportMap.group, tags);
      }
  }

  private checkTagsIntoReports(reports, tags) { // Función que devuelve los reports que contienen alguno de los tags del header
    return reports.filter(db => {
        const tag = db.config?.tag;
        return tags.includes('0') ? (tag === null || tags.includes(tag)): tags.includes(tag) && tag != '';
    });
  }

  public filterByTitle(event) {
    const query = event.target.value?.toString().trim().toUpperCase();
    if (query?.length > 1) {
        this.publicReports  = this.reportMap.public.filter(db => db.config?.title?.toUpperCase().includes(query));
        this.sharedReports  = this.reportMap.shared.filter(db => db.config?.title?.toUpperCase().includes(query));
        this.privateReports = this.reportMap.private.filter(db => db.config?.title?.toUpperCase().includes(query));
        this.roleReports    = this.reportMap.group.filter(db => db.config?.title?.toUpperCase().includes(query));
    } else {
        ({ public: this.publicReports, shared: this.sharedReports, private: this.privateReports, group: this.roleReports } = this.reportMap);
    }
  }

  // Activar modo edición de un reporte
  renameReport(report: any) {
    this.isEditing = true;
    this.editingReportId = report._id;
    this.editTitle = report.config.title;
  }

  //Manejar flow de edición
  handleEditing(code: string, report: any) {
    switch (code) {
      case 'done': // Guardar cambios
        if (this.editTitle.trim()) {
          report.config.title = this.editTitle;
          //TODO s'ha de canviar a updateDashboardSpecific
          this.dashboardService.updateDashboard(report._id.toString(), report).subscribe(
          () => {
            this.allDashboards[this.allDashboards.findIndex(d => d._id === report._id)] = report;
            this.alertService.addSuccess($localize`:@@DashboardUpdatedInfo:Report successfully updated.`);
          },
          err => this.alertService.addError(err)
        );
      }
        break;
      case 'cancel': // Cancelar y no guardar los cambios
        break;
    }
    // Estado de rename reseteado
    this.isEditing = false;
    this.editingReportId = null;
    this.editTitle = '';
  }

  /**
   * Deletes a report after user confirmation.
   * @param report The report to be deleted
   */
  public deleteReport(report: any): void {
    let text = $localize`:@@deleteDashboardWarning:You are about to delete the report:`;
    Swal.fire({
      title: $localize`:@@Sure:Are you sure?`,
      text: `${text} ${report.config.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Yes, delete it!`,
      cancelButtonText: $localize`:@@DeleteGroupCancel:Cancel`,
    }).then(deleted => {
      if (deleted.value) {
        this.dashboardService.deleteDashboard(report._id).subscribe(
          () => {
            // Remove the dashboard from allDashboards and visibleDashboards without reordering
            this.allDashboards = this.allDashboards.filter(d => d._id !== report._id);
            
            const targetArray = this.reportMap[report.config.visible];
            if (targetArray) {
              // Find the index of the removed report
              const originalIndex = targetArray.findIndex(d => d._id === report._id);

              if (originalIndex !== -1) {
                // Remove from the list
                targetArray.splice(originalIndex, 1);
              }
            }

            this.alertService.addSuccess($localize`:@@DashboardDeletedInfo:Report successfully deleted.`);
          },
          err => this.alertService.addError(err)
        );
      }
    });
  }

  /**
 * Clones a report
 * @param report The report to clone
 */
  public cloneReport(report: any): void {
    this.dashboardService.cloneDashboard(report._id).subscribe(
      response => {
        if (response.ok && response.dashboard) {
          // Create a deep copy of the original report
          const clonedReport = _.cloneDeep(report);
          Object.assign(clonedReport, response.dashboard);
          // Update the cloned report data with the server response
          
          // Ensure type and author are correctly assigned
          clonedReport.type = clonedReport.config.visible;
          clonedReport.user = this.userService.user.name;
          
          // Update creation and modification dates
          const currentDate = new Date().toISOString().split("T")[0];
          clonedReport.config.createdAt = currentDate;
          clonedReport.config.modifiedAt = currentDate;
          
          // Assing author
          clonedReport.config.author =  clonedReport.user; 
          


          const targetArray = this.reportMap[clonedReport.type];

          if (targetArray) {
            // Find the index of the original report in both lists
            const originalIndex = targetArray.findIndex(d => d._id === report._id);

            // Insert the cloned report just after the original in both lists
            if (originalIndex !== -1) {
              targetArray.splice(originalIndex + 1, 0, clonedReport);
            } else {
              targetArray.push(clonedReport);
            }
          }

          // Mark the report as newly cloned
          clonedReport.isNewlyCloned = true;

          // Scroll to the cloned report
          // setTimeout(() => {
          //     const element = document.getElementById(`dashboard-${clonedDashboard._id}`);
          //     if (element) {
          //         element.scrollIntoView({
          //             behavior: "smooth",
          //             block: "center"
          //         });
          //     }
          // }, 100);

          // // Remove the newly cloned mark after 5 seconds
          // setTimeout(() => {
          //     clonedDashboard.isNewlyCloned = false;
          // }, 5000);
          // TODO
          //   this.alertService.addSuccess($localize`:@@REPORTCloned:Informe clonado correctamente`);
        } else {
          throw new Error($localize`:@@InvalidServerResponse:Respuesta inválida del servidor`);
        }
      },
      error => {
        console.error($localize`:@@ErrorCloningDashboard:Error al clonar el dashboard:`, error);
        // TODO
        // Swal.fire(
        //   $localize`:@@Error:Error`,
        //   $localize`:@@CouldNotCloneReport:No se pudo clonar el informe. Por favor, inténtalo de nuevo.`,
        //   "error"
        // );
      }
    );
  }


  handleSorting() {
    switch (this.sortingType) {
      case 'date':
        this.sortingReports('createdAt', this.reportMap);
        sessionStorage.setItem("homeSorting", "date");
        break;
      default:
        this.sortingReports('title', this.reportMap);
        sessionStorage.setItem("homeSorting", "name");
        break;
    }
  }


  sortingReports(type: string, reports: any) {
    this.publicReports = reports.public.sort(function (report, nextReport) {return report.config[type].localeCompare(nextReport.config[type]);});
    this.privateReports = reports.private.sort(function (report, nextReport) {return report.config[type].localeCompare(nextReport.config[type]);});
    this.roleReports = reports.group.sort(function (report, nextReport) {return report.config[type].localeCompare(nextReport.config[type]);});
    this.sharedReports = reports.shared.sort(function (report, nextReport) {return report.config[type].localeCompare(nextReport.config[type]);});
  }

}
