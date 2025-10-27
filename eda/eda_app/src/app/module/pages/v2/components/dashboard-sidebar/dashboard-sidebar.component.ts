import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, inject, Input, Output, ViewChild } from "@angular/core";
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
import { ImportPanelDialog } from "../import-panel/import-panel.dialog";
import { DashboardSidebarService } from "@eda/services/shared/dashboard-sidebar.service";
import { ExposeMethod } from "@eda/shared/decorators/expose-method.decorator";
import { IconComponent } from "../../../../../shared/components/icon/icon.component";

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [OverlayModule, OverlayPanelModule, DashboardSaveAsDialog, DashboardTagModal, DashboardEditStyleDialog,
    DashboardCustomActionDialog, DashboardMailConfigModal, DashboardVisibleModal, ImportPanelDialog, IconComponent],
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
  private sidebarService = inject(DashboardSidebarService)
  private dashboardService = inject(DashboardService);
  private fileUtils = inject(FileUtiles);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private alertService = inject(AlertService);
  private stylesProviderService =  inject(StyleProviderService)
  private ChartUtilsService =  inject(ChartUtilsService)
  
  @ViewChild('popover') popover!: OverlayPanel;
  @Input() dashboard: DashboardPageV2;
  @Output() bgClass = new EventEmitter<string>();

  public exposedMethods: Record<string, (...args: any[]) => void> = {};

  isPopoverVisible = false; // Controla la visibilidad del overlay
  isSaveAsDialogVisible = false;
  isEditStyleDialogVisible = false;
  isCustomActionDialogVisible = false;
  isMailConfigDialogVisible = false;
  isVisibleModalVisible = false;
  isTagModalVisible = false;
  inputVisible: boolean = false;
  refreshTime: number = null;
  clickFiltersEnabled: boolean = true;

  mostrarOpciones = false;
  mostrarFiltros = false;
  hayFiltros;

  isImportPanelVisible = false;

  sidebarItems: any[] = [];

  ngOnInit(): void {
    this.hayFiltros = this.dashboard.globalFilter.globalFilters.length > 0;
    this.refreshTime = this.dashboard.dashboard.config.refreshTime || null;
    this.clickFiltersEnabled = this.dashboard.dashboard.config.clickFiltersEnabled ?? true;
    this.dashboard.dashboard.config.clickFiltersEnabled = this.clickFiltersEnabled;

    const methodNames: string[] = (this as any).__proto__.__exposedMethods || [];

    for (const name of methodNames) {
      const method = (this as any)[name];
      if (typeof method === 'function') {
        this.exposedMethods[name] = method.bind(this);
      }
    }

    // Subscribe to method execution commands
    this.sidebarService.command$.subscribe(({ method, args }) => {
      const fn = this.exposedMethods[method];
      if (fn) {
        fn(...(args || []));
      } else {
        console.warn(`Method '${method}' is not exposed on DashboardSidebarComponent`);
      }
    }); 
  }

  initSidebar() { 
    this.sidebarItems = [
    {
      id: 'newPanel',
      label: $localize`:@@dashboardNewPanel:Nuevo Panel`,
      icon: "pi pi-plus-circle",
      command: () => this.onAddWidget()
    },
    {
      id: 'newText',
      label: "Nou text",
      icon: "pi pi-file-edit",
      command: () => this.onAddTitle()
    },
    {
      id: 'newFilter',
      label: "Nou filtre",
      icon: "pi pi-filter",
      command: () => this.onAddGlobalFilter()
      
    },
      {
        id: 'editFilters',
        label: "Editar filtros",
        icon: "pi pi-filter",
        command: () => this.toggleGlobalFilter(),
        items: this.dashboard.globalFilter.globalFilters.map(f => ({
          label: f?.selectedColumn?.description?.default || f?.column?.value?.description?.default ,
          icon: "pi pi-check",
          command: () => this.handleSpecificFilter(f),
        }),
        ),
      },
    {
      id: 'importPanel',
      label: "Importar panell",
      icon: "pi pi-plus-circle",
      command: () => this.onImportPanel()
      
    },
    {
      id: 'refreshDashboard',
      label: "Recargar informe",
      icon: "pi pi-refresh",
      command: () => this.cleanPanelsCache()
    },
    {
      id: 'dashboardPrivacity',
      label: "Privacitat informe",
      icon: "pi pi-lock",
      command: () => { 
        this.isVisibleModalVisible = true;
        this.hidePopover();
      }
    },{
      id: 'addTag',
      label: "Afegir etiqueta",
      icon: "pi pi-tag",
      command: () => {
        this.isTagModalVisible = true;
        this.hidePopover();
      }
    },
    {
      id: 'enableFilters',
      label: this.clickFiltersEnabled ? "Click en filtros habilitado" : "Click en filtros deshabilitado",
      icon: this.clickFiltersEnabled ? "pi pi-lock-open" : "pi pi-lock",
      command: () => {
        this.toggleClickFilters();
      }
    },
    {
      id: 'liveDashboard',
      label: "Live Dashboard",
      icon: "pi pi-desktop",
      items: [],
      command: () => {
        this.inputVisible = !this.inputVisible;
      },
    },{
      id: 'save',
      label: "Guardar",
      icon: "pi pi-save",
      command: () => this.saveDashboard()
    },
    {
      id: 'saveAs',
      label: "Guardar com",
      icon: "pi pi-copy",
      command: () => {
        this.isSaveAsDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      id: 'deleteDashboard',
      label: "Eliminar informe",
      icon: "pi pi-trash",
      command: () => this.removeDashboard()
    },
      { id: 'moreOptions',
        label: 'Más opciones'},
    {
      id: 'editStyles',
      label: "Editar estils",
      icon: "pi pi-palette",
      command: () => {
        this.isEditStyleDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      id: 'downloadPDF',
      label: "Descargar PDF",
      icon: "pi pi-file-pdf",
      command: () => this.exportAsPDF()
    },
    {
      id: 'downloadImage',
      label: "Descargar imatge",
      icon: "pi pi-image",
      command: () => this.exportAsJPEG()
    },
    {
      id: 'sendEmail',
      label: "Enviar per email",
      icon: "pi pi-envelope",
      command: () => { 
        this.isMailConfigDialogVisible = true;
        this.hidePopover();
      }
    },
    {
      id: 'customAction',
      label: "Acció personalitzada",
      icon: "pi pi-cog",
      command: () => {
        this.isCustomActionDialogVisible = true;
        this.hidePopover();
      }
      },
    ]
  }

  showPopover(event: Event) {
    this.initSidebar();
    this.isPopoverVisible = true;
    this.hayFiltros = this.dashboard.globalFilter.globalFilters.length > 0;
    this.popover.toggle(event);
  }

  hidePopover() {
    this.isPopoverVisible = false;
    this.popover.hide();
    this.mostrarOpciones = false;
    this.mostrarFiltros = false;
  }

  public onAddGlobalFilter(): void {
    this.dashboard.globalFilter.onShowGlobalFilter(true);
    this.hidePopover();
  }

  @ExposeMethod()
  public onImportPanel(): void {
    this.isImportPanelVisible = true;
    this.hidePopover();
  }

  public closeImportPanelModal(response?: any) {
    this.isImportPanelVisible = false;

    if (response) {
      for (const item of response) {
        this.dashboard.panels.push(item as EdaPanel);
      }
    }

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
    this.stylesProviderService.loadedPanels++;
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
    // Actualizar el refreshTime si es necesario
    this.dashboard.dashboard.config.refreshTime = this.refreshTime || null;
    this.dashboard.dashboard.config.clickFiltersEnabled = this.clickFiltersEnabled;
    // Actualizar el autor 
    this.dashboard.dashboard.config.author = JSON.parse(localStorage.getItem('user')).name;
    // Guardar Dashboard
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
          tags: null,
          refreshTime: null,
          clickFiltersEnabled: true,
          author: JSON.parse(localStorage.getItem('user')).name,
          styles: this.stylesProviderService.generateDefaultStyles(), 
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
          tags: this.dashboard.dashboard.config.tags,
          refreshTime: (this.dashboard.refreshTime > 5) ? this.dashboard.refreshTime : this.dashboard.refreshTime ? 5 : null,
          clickFiltersEnabled: true,
          mailingAlertsEnabled: this.getMailingAlertsEnabled(),
          sendViaMailConfig: this.dashboard.sendViaMailConfig,
          author: JSON.parse(localStorage.getItem('user')).name,
          onlyIcanEdit: this.dashboard.onlyIcanEdit, //TODO ==> Done?
          styles: this.stylesProviderService.generateDefaultStyles(),
        },
        group: (newDashboard.group || []).map((g: any) => g._id),
        selectedTags: this.dashboard.selectedTags,
      };

      this.dashboard.edaPanels.forEach(panel => panel.savePanel());

      await lastValueFrom(this.dashboardService.updateDashboard(res.dashboard._id, body));
      this.dashboardService._notSaved.next(false);
      this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
      this.router.navigate(['/dashboard/', res.dashboard._id]).then(() => {
        window.location.reload();
      });
    } catch (err) {
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

    this.dashboard.saveDashboard();
  }

  public closeMailConfig() {
    this.isMailConfigDialogVisible = false;
  }

  public saveMailConfig(sendViaMailConfig: any) {
    // Cerrar panel
    this.isMailConfigDialogVisible = false;

    // Clonar info del sendViaMailConfig
    const configToSave = {
      enabled: true,
      hours: sendViaMailConfig.hours,
      lastUpdated: sendViaMailConfig.lastUpdated,
      mailMessage: sendViaMailConfig.mailMessage,
      minutes: sendViaMailConfig.minutes,
      quantity: sendViaMailConfig.quantity,
      units: sendViaMailConfig.units,
      users: sendViaMailConfig.users
    };
    
    // Asignar datos al config
    this.dashboard.dashboard.config.sendViaMailConfig = configToSave;  
  }


  public closeTagModal(tags: any[]) {
    this.isTagModalVisible = false;
    this.dashboard.selectedTags = tags;
    this.dashboard.dashboard.config.tags = tags;
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
          this.router.navigate(['/']).then(() => {
            window.location.reload();
          });
        } catch (err) {
          this.alertService.addError(err);
          throw err;
        }
      }
    });
  }



 exportAsPDF() {
  this.hidePopover();
  this.spinner.on();

  const node = document.getElementById('myDashboard');
  if (!node) {
    console.error('No se encontró el elemento del dashboard');
    this.spinner.off();
    return;
  }

  const title = this.dashboard.title;

  domtoimage.toJpeg(node, { bgcolor: 'white' })
    .then((dataUrl) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        const pdf = new jspdf();
        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();
        pdf.addImage(img, 'JPEG', 0, 0, width, height);
        pdf.save(`${title}.pdf`);
      };
      this.spinner.off();
    });
  }
  
  public exportAsJPEG() {
    this.hidePopover();
    this.spinner.on();

    const node = document.getElementById('myDashboard');
    if (!node) {
      console.error('No se encontró el elemento "myDashboard" en el DOM');
      this.spinner.off();
      return;
    }

    const title = this.dashboard.title;

    domtoimage.toJpeg(node, { bgcolor: 'white' })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `${title}.jpeg`;
        link.href = dataUrl;
        link.click();
        this.spinner.off();
      })
      .catch((error) => {
        console.error('Error exportando como JPEG:', error);
        this.spinner.off();
      });
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

  

  
  // Metodos de creación de la sidebar
   public indiceMasOpciones(): number {
    return this.sidebarItems.findIndex(item => item.id === 'moreOptions');
  }

  public itemsVisibles() {
    return this.sidebarItems.slice(0, this.indiceMasOpciones());
  }

  public itemsDesplegables() {
    return this.sidebarItems.slice(this.indiceMasOpciones());
  }

  public toggleOpciones() {
    // Cambiar estados de la sidebar
    this.mostrarOpciones = !this.mostrarOpciones;
  }

  public toggleGlobalFilter() {
    // Abrimos desplegable de filtros
    this.mostrarFiltros = !this.mostrarFiltros;
  }
  
  // Llamada al filtro especifico via sidebar
  public handleSpecificFilter(filtro: any) {
    this.hidePopover();
    this.toggleGlobalFilter();
    this.dashboard.globalFilter.onShowGlobalFilter(false, filtro)
  }

  public renameDashboard() {
    let elementName = document.getElementById('dashboardName');

    // Crear input
    const input = document.createElement("input");
    input.type = "text";
    input.value = elementName.innerText;

    // remplazamos el elemento por un input 
    elementName.replaceWith(input);
    
    // Foco del titulo
    input.focus();
    
    // Cuando se pierde el foco, volver a texto
    input.addEventListener("blur", () => {
      const p = document.createElement("p");
      p.id = elementName.id;
      p.innerText = input.value;
      input.replaceWith(p);
      p.className = 'italic font-slate-50'; // Estilo que le asignamos para diferenciar que no esta guardado
      this.dashboard.title = p.innerText
    });
    
    // La tecla Enter quita el focus del titulo
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // evita saltos de línea
        input.blur(); 
      }
    });
    this.dashboardService._notSaved.next(true);
  }

  toggleClickFilters() {
      // Buscar el objeto una sola vez
      const clickItem = this.sidebarItems.find(item => item.label === $localize`:@@enableFilters:Click en filtros habilitado` || $localize`:@@disableFilters:Click en filtros deshabilitado`);
      
      // Alternar el estado
      this.clickFiltersEnabled = !this.clickFiltersEnabled;
      
      // Actualizar label e icono según estado
      clickItem.label = this.clickFiltersEnabled ? $localize`:@@enableFilters:Click en filtros habilitado` : $localize`:@@disableFilters:Click en filtros deshabilitado`;
      clickItem.icon = this.clickFiltersEnabled ? "pi pi-lock-open" : "pi pi-lock";
      
      // Actualizar dashboard
      this.dashboard.dashboard.config.clickFiltersEnabled = this.clickFiltersEnabled;
  }
}