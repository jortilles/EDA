import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, ViewChild } from "@angular/core";
import { OverlayModule } from "primeng/overlay";
import { OverlayPanel, OverlayPanelModule } from "primeng/overlaypanel";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";
import { AlertService, DashboardService, FileUtiles, SpinnerService, StyleProviderService, ChartUtilsService } from "@eda/services/service.index";
import { EdaPanel, EdaPanelType, EdaTitlePanel } from "@eda/models/model.index";
import { lastValueFrom } from "rxjs";
import { DashboardSaveAsDialog } from "../dashboard-save-as/dashboard-save-as.dialog";
import { DashboardEditStyleDialog } from "../dashboard-edit-style/dashboard-edit-style.dialog";
import { DashboardCustomActionDialog } from "../dashboard-custom-action/dashboard-custom-action.dialog";
import { DashboardTagModal } from "../dashboard-tag/dashboard-tag.modal";
import { Router } from "@angular/router";
import domtoimage from 'dom-to-image';
import jspdf from 'jspdf';
import Swal from 'sweetalert2';
import { DashboardMailConfigModal } from "../dashboard-mail-config/dashboard-mail-config.modal";
import { DashboardVisibleModal } from "../dashboard-visible/dashboard-visible.modal";

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [OverlayModule, OverlayPanelModule, DashboardSaveAsDialog, DashboardTagModal, DashboardEditStyleDialog,
    DashboardCustomActionDialog, DashboardMailConfigModal, DashboardVisibleModal],
  templateUrl: './dashboard-sidebar.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styles: `
    .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5); /* Fondo oscuro */
        z-index: 999; /* Debe estar por debajo del overlay panel */
    }
      
    /* Asegurar que el OverlayPanel esté sobre la capa oscura */
    ::ng-deep .p-overlaypanel {
        z-index: 1000 !important; /* Un z-index mayor que el del overlay-backdrop */
    }

    ::ng-deep .p-overlaypanel-content {
        background-color: white;
        border-radius: 1em;
    }
  `
})
export class DashboardSidebarComponent {
  private dashboardService = inject(DashboardService);
  private fileUtils = inject(FileUtiles);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private alertService = inject(AlertService);
  private stylesProviderService =  inject(StyleProviderService)
  private ChartUtilsService =  inject(ChartUtilsService)
  
  
  @ViewChild('popover') popover!: OverlayPanel;
  @Input() dashboard: DashboardPageV2;

  isPopoverVisible = false; // Controla la visibilidad del overlay
  isSaveAsDialogVisible = false;
  isEditStyleDialogVisible = false;
  isCustomActionDialogVisible = false;
  isMailConfigDialogVisible = false;
  isVisibleModalVisible = false;
  isTagModalVisible = false;

  mostrarOpciones = false;


  sidebarItems = [
    {
      label: "Nou panell",
      icon: "pi pi-plus-circle",
      command: () => this.onAddWidget()
    },
    {
      label: "Nou text",
      icon: "pi pi-file-edit",
      command: () => this.onAddTitle()
    },
    {
      label: "Nou filtre",
      icon: "pi pi-filter",
      command: () => this.onAddGlobalFilter()
      
    },
    {
      label: "Recargar informe",
      icon: "pi pi-refresh",
      command: () => this.cleanPanelsCache()
    },
    {
      label: "Live Dashboard",
      icon: "pi pi-desktop",
      items: [],
    },
    {
      label: "Afegir etiqueta",
      icon: "pi pi-tag",
      command: () => {
        this.isTagModalVisible = true;
        this.hidePopover();
      }
    },
    {
      label: "Guardar",
      icon: "pi pi-save",
      command: () => this.saveDashboard()
    },
    {
      label: "Guardar com",
      icon: "pi pi-copy",
      command: () => {
        this.isSaveAsDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      label: "Eliminar informe",
      icon: "pi pi-trash",
      command: () => this.removeDashboard()
    },
    {
      label: "Privacitat informe",
      icon: "pi pi-lock",
      command: () => { 
        this.isVisibleModalVisible = true;
        this.hidePopover();
      }
    },
      { label: 'Más opciones'},
    {
      label: "Editar estils",
      icon: "pi pi-palette",
      command: () => {
        this.isEditStyleDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      label: "Descargar PDF",
      icon: "pi pi-file-pdf",
      command: () => this.exportAsPDF()
    },
    {
      label: "Descargar imatge",
      icon: "pi pi-image",
      command: () => this.exportAsJPEG()
    },
    {
      label: "Enviar per email",
      icon: "pi pi-envelope",
      command: () => { 
        this.isMailConfigDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      label: "Acció personalitzada",
      icon: "pi pi-cog",
      command: () => {
        this.isCustomActionDialogVisible = true;
        this.hidePopover();
      }
    },
  ]

  
  showPopover(event: Event) {
    this.isPopoverVisible = true;
    this.popover.toggle(event);
  }

  hidePopover() {
    this.isPopoverVisible = false;
    this.popover.hide();
  }

  public onAddGlobalFilter(): void {
    this.dashboard.globalFilter.onShowGlobalFilter(true);
    this.hidePopover();
  }

  public onAddWidget(): void {
    const panel = new EdaPanel({
      id: this.fileUtils.generateUUID(),
      title: $localize`:@@newPanelTitle2:Nuevo Panel`,
      type: EdaPanelType.BLANK,
      w: 20,
      h: 10,
      cols: 20,
      rows: 10,
      resizable: true,
      dragAndDrop: true,
      x: 0,
      y: 0,
    });

    this.dashboard.panels.push(panel);
    this.hidePopover();
  }

  public onAddTitle(): void {
    let panel = new EdaTitlePanel({
      id: this.fileUtils.generateUUID(),
      title: 'Titulo',
      type: EdaPanelType.TITLE,
      w: 20,
      h: 1,
      cols: 20,
      rows: 1,
      resizable: true,
      dragAndDrop: true,
      fontsize: '22px',
      color: '#000000'
    });

    this.dashboard.panels.push(panel);
    this.hidePopover();
  }

  // Get the queries in the dashboard for delete it from cache
  public async cleanPanelsCache() {
    const queries = [];

    for (const panel of this.dashboard.panels) {
      if (panel.content && panel.content.query && panel.content.query.query) {
        queries.push(panel.content.query.query);
      }
    }

    const body = {
      model_id: this.dashboard.dataSource._id,
      queries: queries
    }

    await lastValueFrom(this.dashboardService.cleanCache(body));
    this.hidePopover();

    this.dashboard.loadDashboard();
    this.dashboardService._notSaved.next(false);
  }

  private async saveDashboard() {
    await this.dashboard.saveDashboard();
    this.hidePopover();
  }

  public async saveDashboardAs(newDashboard: any) {
    this.isSaveAsDialogVisible = false;
    // onClose
    if (!newDashboard) {
      return;
    }

    try {
      const ds = { _id: this.dashboard.dataSource._id };
      const bodyNew = {
        config: {
          title: newDashboard.name,
          visible: newDashboard.visible,
          ds,
          tag: null,
          refreshTime: null,
          styles: this.stylesProviderService.generateDefaultStyles(), //TODO ==> Done?
        },
        group: (newDashboard.group || []).map((g: any) => g._id)
      };

      const res = await lastValueFrom(this.dashboardService.addNewDashboard(bodyNew));
      const body = {
        config: {
          title: newDashboard.name,
          panel: this.dashboard.panels,
          ds: { _id: this.dashboard.dataSource._id },
          filters: this.dashboard.cleanFiltersData(),
          applyToAllfilter: this.dashboard.applyToAllfilter,
          visible: newDashboard.visible,
          tags: this.dashboard.dashboard.config.tag, //TODO ==> Done?
          refreshTime: (this.dashboard.refreshTime > 5) ? this.dashboard.refreshTime : this.dashboard.refreshTime ? 5 : null,
          mailingAlertsEnabled: this.getMailingAlertsEnabled(),
          sendViaMailConfig: this.dashboard.sendViaMailConfig, //TODO ==> Done?
          onlyIcanEdit: this.dashboard.onlyIcanEdit, //TODO ==> Done?
          styles: this.stylesProviderService.generateDefaultStyles(), //TODO ==> Done?
        },
        group: (newDashboard.group || []).map((g: any) => g._id)
      };

      // TODO ==> Done?
      this.dashboard.edaPanels.forEach(panel => panel.savePanel());

      await lastValueFrom(this.dashboardService.updateDashboard(res.dashboard._id, body));
      this.dashboardService._notSaved.next(false);
      // TODO ==> Done?
      this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
      this.router.navigate(['/v2/dashboard/', res.dashboard._id]).then(() => { // TODO ==> deixo v2 per ara  a la url 
        window.location.reload();
      });
    } catch (err) {
      // TODO ==> Done?
      this.alertService.addError(err);
      throw err;
    }
  }


  public closeCustomAction() {
    this.isCustomActionDialogVisible = false;
  }

  public saveCustomAction(url: any) {
    this.isCustomActionDialogVisible = false;
    this.dashboard.dashboard.config.urls = url;
  }

  public closeStyles() {
    this.isEditStyleDialogVisible = false;
  }

  public saveStyles(newStyles: any) {
    this.isEditStyleDialogVisible = false;
    this.dashboard.dashboard.config.styles = newStyles;
    this.ChartUtilsService.MyPaletteColors = newStyles.palette?.paleta || this.ChartUtilsService.MyPaletteColors;

    // Elimina los colores específicos de cada panel para aplicar la paleta global
    if (Array.isArray(this.dashboard.panels)) {
      this.dashboard.panels.forEach(panel => {
        if (panel.content?.query?.output?.config) {
              console.log(panel)
                panel.content.query.output.config.colors = undefined;
            }
        });
    }
    this.dashboard.assignStyles();
    this.dashboard.refreshPanels();
}

  public closeVisibleModal() {
    this.isVisibleModalVisible = false;
  }

  public saveVisibleModal(privacity: any) {
    this.isVisibleModalVisible = false;
    this.dashboard.dashboard.config.visible = privacity.visible;
    if (privacity.visible === 'group')
      this.dashboard.dashboard.group = privacity.group.map(grup => grup._id);
    else
      this.dashboard.dashboard.group = []
  }

  public closeMailConfig() {
    this.isCustomActionDialogVisible = false;
  }

  public saveMailConfig(mailConfig: any) {
    this.isCustomActionDialogVisible = false;
    //this.dashboard.sendViaMailConfig = mailConfig;  
  }


  public closeTagModal(tags: any[]) {
    this.isTagModalVisible = false;
    this.dashboard.selectedTags = tags;
  }

  public removeDashboard() {
    const dashboardId = this.dashboard.dashboardId;

    this.hidePopover();

    let text = $localize`:@@deleteDashboardWarning: Estás a punto de borrar el informe`;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@DeleteGroupCancel:Cancelar`
    }).then(async (borrado) => {
      if (borrado.value) {
        try {
          await lastValueFrom(this.dashboardService.deleteDashboard(dashboardId));

          // La app se direcciona al home EDA
          this.router.navigate(['/v2/']).then(() => {
            window.location.reload();
          });
        } catch (err) {
          // TODO ==> Done?
          this.alertService.addError(err);
          throw err;
        }
      }
    });
  }



  public exportAsPDF() {
    this.hidePopover();
    this.spinner.on();
    const title = this.dashboard.title;
    domtoimage.toJpeg(document.getElementById('myDashboard'), { bgcolor: 'white' })
      .then((dataUrl) => {
        let img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          let pdf = new jspdf();
          let width = pdf.internal.pageSize.getWidth();
          let height = pdf.internal.pageSize.getHeight();
          pdf.addImage(img, 'JPEG', 0, 0, width, height);
          pdf.save(`${title}.pdf`);
        }
        this.spinner.off();
      });
  }

  public exportAsJPEG() {
    this.hidePopover();
    this.spinner.on();

    const title = this.dashboard.title;
    domtoimage.toJpeg(document.getElementById('myDashboard'), { bgcolor: 'white' })
      .then((dataUrl) => {
        var link = document.createElement('a');
        link.download = `${title}.jpeg`;
        link.href = dataUrl;
        link.click();
        this.spinner.off();
      });
  }



  // Funcion que agrega urls para acción personalizada
  public openUrlsConfig() {
    this.hidePopover();
    const params = { urls: this.dashboard.urls };
    // TODO
    // this.urlsController = new EdaDialogController({
    //   params,
    //   close: (event, response) => {
    //     if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
    //       this.urls = response.urls;
    //       this.dashboardService._notSaved.next(true);
    //     }
    //     this.urlsController = undefined;
    //   }
    // })
  }

  public getMailingAlertsEnabled(): boolean {

    let mailingenabled = false;

    this.dashboard.panels.forEach(panel => {
        if (panel.content && panel.content.chart === 'kpi') {
            try{
                panel.content.query.output.config.alertLimits.forEach(alert => {
                    if (alert.mailing.enabled === true) {
                        mailingenabled = true
                    };
                });
            }catch(e){
                    console.log('error getting mailing alerts.... setting it to false');
                    mailingenabled = false;
            }
        }
    });

    return mailingenabled;
  } 

  
   public indiceMasOpciones(): number {
    return this.sidebarItems.findIndex(item => item.label === 'Más opciones');
  }

  public itemsVisibles() {
    return this.sidebarItems.slice(0, this.indiceMasOpciones()); // antes de 'Más opciones'
  }

  public itemsDesplegables() {
    return this.sidebarItems.slice(this.indiceMasOpciones()); // incluye 'Más opciones' y después
  }

  public toggleOpciones() {
    this.mostrarOpciones = !this.mostrarOpciones;
  }
}