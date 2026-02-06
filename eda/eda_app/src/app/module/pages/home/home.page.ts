import { Component, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { UserService } from '@eda/services/api/user.service';
import { AlertService, DashboardService } from '@eda/services/service.index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-v2-home-page',
  standalone: true,
  imports: [FormsModule, NgTemplateOutlet, IconComponent, CommonModule],
  templateUrl: './home.page.html'
})
export class HomePage implements OnInit {
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
  
  tags: any[] = [];
  selectedTags = signal<any>(JSON.parse(sessionStorage.getItem('activeTags') ? sessionStorage.getItem('activeTags') : '[]'));

  isOpenTags = signal(false)
  searchTagTerm = signal("")


  //Variables de control de edició Modificar
  isEditing = false;
  editingReportId: string | null = null;
  editTitle: string = '';
  sortingType: string = sessionStorage.getItem('homeSorting') || 'name';

  public publicTitle: string = $localize`:@@tituloGrupoPublicos:PUBLICOS`;
  public commonTitle: string = $localize`:@@tituloGrupoComunes:COMUNES`;
  public groupTitle: string = $localize`:@@tituloGrupoMisGrupos:MIS GRUPOS`;
  public privateTitle: string = $localize`:@@tituloGrupoPersonales:PRIVADOS`;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.loadReports();
  }

  private async loadReports() {
    const { publics, shared, dashboards, group } = await lastValueFrom(this.dashboardService.getDashboards());
    this.publicReports = shared;
    this.privateReports = dashboards;
    this.roleReports = group;
    this.sharedReports = publics;

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
      [...this.allDashboards]
      .flatMap(db => db.config.tag) // Aplanamos los arrays de tags
      .filter(tag => tag !== null && tag !== undefined) // Eliminamos valores nulos o indefinidos
      .flatMap(tag => Array.isArray(tag) ? tag : [tag]) // Si es un array, lo expandimos; si no, lo mantenemos como está
      .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag), // Convertimos en objetos { label, value }
      'value' // Eliminamos duplicados basados en el valor
    );

    // Agregar opciones adicionales
    this.tags.unshift({ label: $localize`:@@NoTag:Sin Etiqueta`, value: $localize`:@@NoTag:Sin Etiqueta`, });
    this.tags.push({ label: $localize`:@@AllTags:Todos`, value: $localize`:@@AllTags:Todos` });
    this.filterByTags();
  }

  public openReport(report: any, event: MouseEvent) {
    if(this.isEditing){return}
    // Crear la URL completa del informe    
    const urlTree = this.router.createUrlTree(['/dashboard', report._id]);
    const relativeUrl = this.router.serializeUrl(urlTree);
    const absoluteUrl = window.location.origin + relativeUrl;

    // Manejar clic medio o Ctrl+clic para abrir en nueva pestaña
    if (event.button === 1 || event.ctrlKey) {
      window.open('#/' + relativeUrl);
      return;
    }

    // Navegar en la misma pestaña
    this.router.navigate(['/dashboard', report._id]);
  }


public handleTagSelect(option: any): void {
  const currentFilters = this.selectedTags(); // Filtros de tags
  const tags = JSON.parse(sessionStorage.getItem("activeTags") || "[]"); // Tags activos en sesión

  const isSelected = currentFilters.value === option.value;

  if (isSelected) {
    // Eliminar tag
    this.selectedTags.set({"label":$localize`:@@AllTags:Todos`,"value":$localize`:@@AllTags:Todos`});
    sessionStorage.setItem("activeTags", JSON.stringify({"label":$localize`:@@AllTags:Todos`,"value":$localize`:@@AllTags:Todos`}));
  } else {
    // Añadir tag
    this.selectedTags.set(option);

    sessionStorage.setItem("activeTags", JSON.stringify(option));
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
    return this.selectedTags().value === optionValue;
  }

  public onCreateDashboard() {
    this.createDashboardService.open();
  }

  // Esta función actualiza los reports, y es llamada cada vez que se modifican los tags
  public filterByTags() { 
    const tags = sessionStorage.getItem("activeTags") || "[]";
    // Si tiene la etiqueta Todos o no tiene etiqueta mostraremos todos los informes
    if (tags.includes( $localize`:@@AllTags:Todos`) || tags === '[]') {
      this.publicReports  = this.reportMap.public;
      this.sharedReports  = this.reportMap.shared;
      this.privateReports = this.reportMap.private;
      this.roleReports    = this.reportMap.group;
    // Asignación de reportes visibles
    } else {
      this.publicReports  = this.checkTagsIntoReports(this.reportMap.public, tags);
      this.sharedReports  = this.checkTagsIntoReports(this.reportMap.shared, tags);
      this.privateReports = this.checkTagsIntoReports(this.reportMap.private, tags);
      this.roleReports = this.checkTagsIntoReports(this.reportMap.group, tags);
      }
  }
  
  // Función que devuelve los reports que contienen alguno de los tags del header
  private checkTagsIntoReports(reports, tags) {
    return reports.filter(db => {
        const tag = db.config?.tag;

        // Si no tiene tag y el filtro es "Sin Etiqueta"
        if (tags.includes($localize`:@@NoTag:Sin Etiqueta`)) {
          return tag === null || tag === undefined || tag === '';
        }

        // Si el tag no existe, no mostrar
        if (!tag || tag === '') return false;

        // Normalizar el tag a array de strings
        const tagArray = Array.isArray(tag)
          ? tag.map(t => typeof t === 'string' ? t : t.value || t.label)
          : [typeof tag === 'string' ? tag : tag.value || tag.label];

        // Verificar si alguno de los tags del dashboard está en los filtros seleccionados
        return tagArray.some(t => tags.includes(t));
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

  copyReport(report: any) {
    // Obtener la URL actual
    const currentUrl = window.location.href;
    // Eliminar la parte 'home' de la URL si existe i construir la nueva URL apuntando a dashboard/{id}
    const dashboardUrl = `${currentUrl.replace(/\/home\/?$/, '')}/public/${report._id}`;
    // Copiar al portapapeles
    navigator.clipboard.writeText(dashboardUrl)
  }

  // Activar modo edición de un reporte
  renameReport(report: any) {
    //Reseteo de variables
    this.isEditing = true;
    this.editingReportId = report._id;
    this.editTitle = report.config?.title || '';

    //Apartado para añadir focus
    setTimeout(() => {
      const inputElement = document.querySelector<HTMLInputElement>('.edit-title-input');
      if (inputElement) {inputElement.focus();} //Añadir focus si es el elemento seleccionado
    }, 0);
  }

  //Manejar flow de edición
  handleEditing(code: string, report: any) {
    switch (code) {
      case 'done': // Guardar cambios
        if (this.editTitle.trim()) {
          report.config.title = this.editTitle;

          const payload = {
            data: {
              key: 'config.title',
              newValue: report.config.title
            }
          };
          
          this.dashboardService.updateDashboardSpecific(report._id.toString(), payload).subscribe(
            () => {
              this.allDashboards[this.allDashboards.findIndex(d => d._id === report._id)].config.title = report.config.title;
              this.alertService.addSuccess($localize`:@@DashboardUpdatedInfo:El dashboard ha sido actualizado correctamente.`);
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
    let text = $localize`:@@deleteDashboardWarning:Estás a punto de borrar el informe:`;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text} ${report.config.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#14B8A6",
      cancelButtonColor: " #ff2802",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`,
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

            const listNames = ['publicReports', 'privateReports', 'roleReports', 'sharedReports'];

            for (const name of listNames) {
              const list = this[name]; // ahora TypeScript sabe que name es string
              if (list.some(d => d._id === report._id)) {
                this[name] = list.filter(d => d._id !== report._id);
                break; // ya lo eliminamos
              }
            }
            this.loadReportTags();
            this.alertService.addSuccess($localize`:@@DashboardDeletedInfo:Informe eliminado correctamente.`);
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
          // Clonar el informe original
          const clonedReport = _.cloneDeep(report);
          Object.assign(clonedReport, response.dashboard);

          // Ajustar propiedades
          clonedReport.type = clonedReport.config.visible;
          clonedReport.user = this.userService.user.name;

          // Fechas de creación/modificación
          const currentDate = new Date().toISOString().split("T")[0];
          clonedReport.config.createdAt = currentDate;
          clonedReport.config.modifiedAt = currentDate;

          // Autor
          clonedReport.config.author = JSON.parse(localStorage.getItem('user')).name;

          // Insertar en el array correspondiente
          const targetArray = this.reportMap[clonedReport.type];
          if (targetArray) {
            const originalIndex = targetArray.findIndex(d => d._id === report._id);
            if (originalIndex !== -1) {
              targetArray.splice(originalIndex + 1, 0, clonedReport);
            } else {
              targetArray.push(clonedReport);
            }
          }

          // Ordenar informes
          this.handleSorting();

          // Marcar como recién clonado
          clonedReport.isNewlyCloned = true;

          // Scroll automático al nuevo dashboard
          setTimeout(() => {
            const element = document.getElementById(`dashboard-${clonedReport._id}`);
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            }
          }, 500);

          // Quitar marca de nuevo a los 5s
          setTimeout(() => {
            clonedReport.isNewlyCloned = false;
          }, 5000);

          // Alerta de éxito
          this.alertService.addSuccess($localize`:@@REPORTCloned:Informe clonado correctamente`);
        } else {
          throw new Error($localize`:@@InvalidServerResponse:Respuesta inválida del servidor`);
        }
      },
      error => {
        // Alerta de error
        this.alertService.addError($localize`:@@CouldNotCloneReport:No se pudo clonar el informe. Por favor, inténtalo de nuevo.`);
      }
    );
  }




  handleSorting() {
    switch (this.sortingType) {
      case 'dateAsc':
        this.sortingReports('modifiedAt', this.reportMap, 'asc');
        sessionStorage.setItem("homeSorting", "dateAsc");
        break;
      case 'dateDesc':
        this.sortingReports('modifiedAt', this.reportMap, 'desc');
        sessionStorage.setItem("homeSorting", "dateDesc");
        break;
      default:
        this.sortingReports('title', this.reportMap, 'asc');
        sessionStorage.setItem("homeSorting", "name");
        break;
    }
  }

  sortingReports(type: string, reports: any, direction: string) {
    const compareFn = (a: any, b: any) => {
      const valA = a.config[type];
      const valB = b.config[type];
      // Si es fecha, convertir a Date
      if (type === 'modifiedAt') {
        const dateA = new Date(valA);
        const dateB = new Date(valB);

        return direction === 'asc'
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }

      // Por defecto, ordenar strings con localeCompare
      const comparison = valA.localeCompare(valB);
      return direction === 'asc' ? comparison : -comparison;
    };

    this.publicReports = reports.public.sort(compareFn);
    this.privateReports = reports.private.sort(compareFn);
    this.roleReports = reports.group.sort(compareFn);
    this.sharedReports = reports.shared.sort(compareFn);
  }


}
