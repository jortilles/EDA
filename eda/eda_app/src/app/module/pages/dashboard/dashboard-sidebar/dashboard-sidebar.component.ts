import { AfterViewInit, Component, EventEmitter, inject, Input, Output, ViewChild } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { OverlayModule } from "primeng/overlay";
import { OverlayPanel, OverlayPanelModule } from "primeng/overlaypanel";
import { DashboardPage } from "../dashboard.page";
import { AlertService, DashboardService, FileUtiles, SpinnerService, StyleProviderService, ChartUtilsService } from "@eda/services/service.index";
import { DashboardPanelExport } from "@eda/services/utils/file-utils.service";
import { EdaPanel, EdaPanelType, EdaTitlePanel, EdaTabsPanel } from "@eda/models/model.index";
import { lastValueFrom } from "rxjs";
import { Router } from "@angular/router";
import domtoimage from 'dom-to-image';
import jspdf from 'jspdf';
import html2canvas from 'html2canvas';
import Swal from 'sweetalert2';
import { DashboardSidebarService } from "@eda/services/shared/dashboard-sidebar.service";
import { ExposeMethod } from "@eda/shared/decorators/expose-method.decorator";
import { IconComponent } from "../../../../shared/components/icon/icon.component";
import { FocusOnShowDirective } from "@eda/shared/directives/autofocus.directive";
import * as _ from 'lodash';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

// Sidebar imports
import { DashboardSaveAsDialog } from "../../../components/dashboard-save-as/dashboard-save-as.dialog";
import { DashboardEditStyleDialog } from "../../../components/dashboard-edit-style/dashboard-edit-style.dialog";
import { DashboardCustomActionDialog } from "../../../components/dashboard-custom-action/dashboard-custom-action.dialog";
import { DashboardTagModal } from "../dashboard-tag/dashboard-tag.modal";
import { DashboardMailConfigModal } from "../../../components/dashboard-mail-config/dashboard-mail-config.modal";
import { ImportPanelDialog } from "../../../components/import-panel/import-panel.dialog";
import { DependentFilters } from "../../../components/dependent-filters/dependent-filters.component";
import { DashboardVisibleModal } from "../../../components/dashboard-visible/dashboard-visible.modal";
import { GlobalFilterDialogComponent } from "../../../pages/dashboard/global-filter-dialog/global-filter-dialog.component";
import { GlobalFilterComponent } from "@eda/components/global-filter/global-filter.component";

const STANDALONE_COMPONENTS = [
    DashboardSaveAsDialog,
    DashboardEditStyleDialog,
    DashboardCustomActionDialog,
    DashboardTagModal,
    DashboardMailConfigModal,
    DashboardVisibleModal,
    ImportPanelDialog,
    DependentFilters,
    GlobalFilterDialogComponent,
    GlobalFilterComponent
] 

const ANGULAR_MODULES = [
  OverlayModule,
  OverlayPanelModule,
  IconComponent,
  DragDropModule,
  FormsModule,
  FocusOnShowDirective
]

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [ STANDALONE_COMPONENTS, ANGULAR_MODULES],
  styleUrl: './dashboard-sidebar.component.css',
  templateUrl: './dashboard-sidebar.component.html',
  styles: `
    .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5); /* Dark background */
        z-index: 999; /* Must be below the overlay panel */
    }

    /* Ensure the OverlayPanel is above the dark layer */
    ::ng-deep .p-overlaypanel {
        z-index: 1000 !important; /* A higher z-index than the overlay-backdrop */
    }

    ::ng-deep .p-overlaypanel-content {
        background-color: white;
        border-radius: 1em;
    }
  `
})
export class DashboardSidebarComponent implements AfterViewInit {
  private sidebarService = inject(DashboardSidebarService)
  private dashboardService = inject(DashboardService);
  private fileUtils = inject(FileUtiles);
  private router = inject(Router);
  private spinner = inject(SpinnerService);
  private alertService = inject(AlertService);
  private stylesProviderService = inject(StyleProviderService)
  private ChartUtilsService = inject(ChartUtilsService)

  @ViewChild('popover') popover!: OverlayPanel;
  @Input() dashboard: DashboardPage;
  @Output() bgClass = new EventEmitter<string>();

  public exposedMethods: Record<string, (...args: any[]) => void> = {};

  isPopoverVisible = false; // Controls overlay visibility
  isSaveAsDialogVisible = false;
  isEditStyleDialogVisible = false;
  isCustomActionDialogVisible = false;
  isMailConfigDialogVisible = false;
  isVisibleModalVisible = false;
  isTagModalVisible = false;
  inputVisible: boolean = false;
  refreshTime: number = null;
  clickFiltersEnabled: boolean = true;
  clickPanelLockButton: boolean = true;
  onlyIcanEdit: boolean = true; // Only I can edit, but I can save as
  isReadOnly: boolean = false; // this is a read-only dashboard
  isEditable: boolean = false; // can edit the dashboard
  mostrarOpciones = false;
  mostrarFiltros = false;
  mostrarDescargas = false;
  hayFiltros;

  isImportPanelVisible = false;
  isDependentFiltersVisible = false;
  editingTitle: boolean = false;
  editableTitle: string = '';

  sidebarItems: any[] = [];

  ngOnInit(): void {
    this.hayFiltros = this.dashboard.globalFilter.globalFilters.length > 0;
    this.refreshTime = this.dashboard.dashboard.config.refreshTime || null;
    this.clickFiltersEnabled = this.dashboard.dashboard.config.clickFiltersEnabled ?? true;
    this.onlyIcanEdit = this.dashboard.dashboard.config.onlyIcanEdit ?? true;
    this.clickPanelLockButton = this.dashboard.dashboard.config.panelLockEnabled ?? true;
    this.isReadOnly = this.isReadOnlyCheck();
    this.isEditable = this.isEditableCheck();
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

  ngAfterViewInit(): void {
    this.dashboard.gridsterOptions.api?.optionsChanged();
  }

  initSidebar() {
    this.sidebarItems = [
      {
        id: 'newPanel',
        label: $localize`:@@newPanelTitle:Nuevo panel`,
        icon: "pi pi-plus-circle",
        command: () => this.onAddWidget()
      },
      {
        id: 'newFilter',
        label: $localize`:@@dashboardSidebarNewFilter:Nuevo filtro`,
        icon: "pi pi-filter",
        command: () => this.onAddGlobalFilter()

      },
      {
        id: 'newText',
        label: $localize`:@@dashboardSidebarNewText:Nuevo texto`,
        icon: "pi pi-file-edit",
        command: () => this.onAddTitle()
      },
      {
        id: 'newTabs',
        label: $localize`:@@dashboardSidebarNewTabs:Nuevo navegador`,
        icon: "pi pi-folder",
        command: () => this.onAddTabsPanel()
      },
      {
        id: 'editFilters',
        label: $localize`:@@dashboardSidebarEditFilter:Editar filtros`,
        icon: "pi pi-filter",
        command: () => this.toggleGlobalFilter(),
        items: this.dashboard.globalFilter.globalFilters.map(f => ({
          label: f?.selectedColumn?.display_name?.default || f?.column?.value?.description?.default,
          icon: "pi pi-check",
          command: () => this.handleSpecificFilter(f),
        }),
        ),
      },
      {
        id: 'dependentFilters',
        label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`,
        icon: "pi pi-sliders-h",
        command: () => this.dependentFilters()
        
      },
      {
        id: 'importPanel',
        label: $localize`:@@dashboardSidebarImportPanel:Importar panel`,
        icon: "pi pi-plus-circle",
        command: () => this.onImportPanel()
      },
      {
        id: 'refreshDashboard',
        label: $localize`:@@dashboardSidebarRefreshDashboard: Recargar informe`,
        icon: "pi pi-refresh",
        command: () => this.cleanPanelsCache()
      },
      {
        id: 'liveDashboard',
        label: $localize`:@@dashboardSidebarLiveDashboard: Live Dashboard`,
        icon: "pi pi-desktop",
        items: [],
        command: () => {
          this.inputVisible = !this.inputVisible;
        },
      }, {
        id: 'save',
        label: $localize`:@@dashboardSidebarSave: Guardar`,
        icon: "pi pi-save",
        command: () => this.saveDashboard()
      },
      {
        id: 'saveAs',
        label: $localize`:@@dashboardSidebarSaveAs: Guardar como`,
        icon: "pi pi-copy",
        command: () => {
          this.isSaveAsDialogVisible = true;
          this.hidePopover();
        }
      },
      {
        id: 'deleteDashboard',
        label: $localize`:@@dashboardSidebarDeleteDashboard: Eliminar informe`,
        icon: "pi pi-trash",
        command: () => this.removeDashboard()
      },
      {
        id: 'moreOptions',
        label: $localize`:@@dashboardSidebarMoreOptions: Más opciones`,
      },
      {
        id: 'editStyles',
        label: $localize`:@@dashboardSidebarEditStyles: Editar estilos`,
        icon: "pi pi-palette",
        command: () => {
          this.isEditStyleDialogVisible = true;
          this.hidePopover();
        }
      },
      {
        id: 'dashboardPrivacity',
        label: $localize`:@@dashboardSidebarDashboardPrivacity: Privacidad informe`,
        icon: "pi pi-lock",
        command: () => {
          this.isVisibleModalVisible = true;
          this.hidePopover();
        }
      }, {
        id: 'addTag',
        label: $localize`:@@addTag: Añadir etiqueta`,
        icon: "pi pi-tag",
        command: () => {
          this.isTagModalVisible = true;
          this.hidePopover();
        }
      },
      {
        id: 'enableFilters',
        label: this.clickFiltersEnabled ? $localize`:@@enableFilters: Click en filtros habilitado`
          : $localize`:@@disableFilters:Click en filtros deshabilitado`,
        icon: this.clickFiltersEnabled ? "pi pi-bolt" : "pi pi-ban",
        command: () => {
          this.toggleClickFilters();
        }
      },
      {
        id: 'enablePanelLock',
        label: this.clickPanelLockButton ? $localize`:@@enablePanelLockButton: Bloquear los paneles`
          : $localize`:@@disablePanelLockButton:Desbloquear los paneles`,
        icon: this.clickPanelLockButton ? "pi pi-lock-open" : "pi pi-lock",
        command: () => {
          this.panelLockButton();
        }
      },
      {
        id: 'enableEdition',
        label: this.onlyIcanEdit ? $localize`:@@onlyIcanEditTagEnable:Edición privada habilitada` : $localize`:@@onlyIcanEditTagDisable:Edición privada deshabilitada`,
        icon: this.onlyIcanEdit ? "pi pi-check" : "pi pi-ban",
        command: () => {
          this.toggleEdit();
        }
      },
      {
        id: 'download',
        label: $localize`:@@dashboardSidebarDownload:Descargar...`,
        icon: "pi pi-download",
        items: [
          {
            id: 'downloadPDF',
            label: $localize`:@@dashboardSidebarDownloadPDF: Descargar PDF`,
            icon: "pi pi-file-pdf",
            command: () => this.exportAsPDF()
          },
          {
            id: 'downloadImage',
            label: $localize`:@@dashboardSidebarDownloadImage:Descargar Imagen`,
            icon: "pi pi-image",
            command: () => this.exportAsJPEG()
          },
          {
            id: 'downloadExcel',
            label: $localize`:@@dashboardSidebarDownloadExcel:Descargar Excel`,
            icon: "pi pi-file-excel",
            command: () => this.exportDashboardAsExcel()
          },
          {
            id: 'downloadWord',
            label: $localize`:@@dashboardSidebarDownloadWord:Descargar Word`,
            icon: "pi pi-file-word",
            command: () => this.exportDashboardAsWord()
          },
        ]
      },
      {
        id: 'sendEmail',
        label: $localize`:@@opcionMail: Enviar por email`,
        icon: "pi pi-envelope",
        command: () => {
          this.isMailConfigDialogVisible = true;
          this.hidePopover();
        }
      },
      {
        id: 'customAction',
        label: $localize`:@@dashboardSidebarCustomAction: Acción personalizada`,
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
    this.mostrarDescargas = false;
  }

  public onAddGlobalFilter(): void {
    this.dashboard.globalFilter.onShowGlobalFilter(true);
    this.hidePopover();
  }

  public dependentFilters() {

    if(this.dashboard.globalFilter.globalFilters.length !== 0) {
      this.isDependentFiltersVisible = true;
      this.hidePopover();
    } else {
      this.alertService.addWarning($localize`:@@globalFiltersToDF:Debe disponer de filtros globales para poder avanzar con la configuración de los filtros dependientes.`);
    }

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
        const panel = item as EdaPanel;
        if (this.importedPanelOverlaps(panel)) {
          panel.x = 0;
          panel.y = this.getImportBottomY();
        }
        this.dashboard.panels.push(panel);
      }
    }
  }

  private importedPanelOverlaps(panel: EdaPanel): boolean {
    if (panel.x == null || panel.y == null || !panel.cols || !panel.rows) return true;
    return this.dashboard.panels.some(existing => {
      const hOverlap = panel.x < (existing.x + existing.cols) && (panel.x + panel.cols) > existing.x;
      const vOverlap = panel.y < (existing.y + existing.rows) && (panel.y + panel.rows) > existing.y;
      return hOverlap && vOverlap;
    });
  }

  private getImportBottomY(): number {
    return this.dashboard.panels.reduce((max, p) => {
      const bottom = (p.y || 0) + (p.rows || 0);
      return bottom > max ? bottom : max;
    }, 0);
  }

  public closeDependentFilters(dependentFilterObject: any){
    this.isDependentFiltersVisible = false;
    
    // Receives the child ordering for each item
    if(Object.keys(dependentFilterObject).length > 0) {
      this.dashboard.globalFilter.loading = true; // Show spinner while filters are being updated
      // Temporarily save the dependent filter structure
      this.dashboard.globalFilter.globalFilters = dependentFilterObject.globalFilters;
      this.dashboard.globalFilter.orderDependentFilters = dependentFilterObject.orderDependentFilters;
      this.dashboardService.setNotSaved(true); // Mark dashboard as unsaved
      // Update filter values when a new configuration is applied
      this.dashboard.globalFilter.initGlobalFilters(this.dashboard.globalFilter.globalFilters);
    } 
  }

  public onAddWidget(): void {
    const panel = new EdaPanel({
      id: this.fileUtils.generateUUID(),
      title: $localize`:@@newPanelTitle:Nuevo Panel`,
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
      title: 'Titulo Panel',
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

  public onAddTabsPanel(): void {
    let panel = new EdaTabsPanel({
      id: this.fileUtils.generateUUID(),
      title: 'Tabs',
      type: EdaPanelType.TABS,
      w: 40,
      h: 2,
      cols: 40,
      rows: 2,
      resizable: true,
      dragAndDrop: true,

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
    this.dashboardService.setNotSaved(false);
  }

  private async saveDashboard() {
    // Update refreshTime if needed
    this.dashboard.dashboard.config.refreshTime = this.refreshTime || null;
    this.dashboard.dashboard.config.clickFiltersEnabled = this.clickFiltersEnabled;
    this.dashboard.dashboard.config.onlyIcanEdit = this.onlyIcanEdit;
    this.dashboard.dashboard.config.panelLockEnabled = this.clickPanelLockButton;
    // Update the author
    this.dashboard.dashboard.config.author =  this.dashboard.dashboard.config.author?this.dashboard.dashboard.config.author:JSON.parse(localStorage.getItem('user')).name;
    // Save dashboard
    try {
      await this.dashboard.saveDashboard();
    } catch { }
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
          onlyIcanEdit: true,
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
          tag: this.dashboard.dashboard.config.tag,
          refreshTime: (this.dashboard.refreshTime > 5) ? this.dashboard.refreshTime : this.dashboard.refreshTime ? 5 : null,
          mailingAlertsEnabled: this.getMailingAlertsEnabled(),
          sendViaMailConfig: this.dashboard.sendViaMailConfig,
          author: JSON.parse(localStorage.getItem('user')).name,
          onlyIcanEdit: this.onlyIcanEdit,
          styles: this.stylesProviderService.generateDefaultStyles(),
        },
        group: (newDashboard.group || []).map((g: any) => g._id),
        selectedTags: this.dashboard.selectedTags,
      };

      this.dashboard.edaPanels.forEach(panel => panel.savePanel());

      await lastValueFrom(this.dashboardService.updateDashboard(res.dashboard._id, body));
      this.dashboardService.setNotSaved(false);
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
      this.dashboardService.setNotSaved(true);
      this.ChartUtilsService.MyPaletteColors = newStyles.palette?.paleta || this.ChartUtilsService.MyPaletteColors;
      this.dashboard.assignStyles();
      
      setTimeout(() => {
          this.dashboard.edaPanels.forEach((panel, index) => {
              if (panel.panelChart) {
                  try {
                      panel.panelChart.updateComponent();
                  } catch (error) {
                      console.error(`Error al actualizar panel:`, error);
                  }
              }
          });
          this.dashboard.refreshPanels();
      }, 100);
  }

  public closeVisibleModal() {
    this.isVisibleModalVisible = false;
  }

  public async saveVisibleModal(privacity: any) {
    this.isVisibleModalVisible = false;
    const previousVisible = this.dashboard.dashboard.config.visible;
    const previousGroup = [...(this.dashboard.dashboard.group || [])];

    this.dashboard.dashboard.config.visible = privacity.visible;
    if (privacity.visible === 'group')
      this.dashboard.dashboard.group = privacity.group.map(grup => grup._id);
    else
      this.dashboard.dashboard.group = []

    try {
      await this.dashboard.saveDashboard();
    } catch {
      this.dashboard.dashboard.config.visible = previousVisible;
      this.dashboard.dashboard.group = previousGroup;
    }
  }

  public closeMailConfig() {
    this.isMailConfigDialogVisible = false;
  }

  public async saveMailConfig(sendViaMailConfig: any) {
    // Close panel
    this.isMailConfigDialogVisible = false;

    // Clone sendViaMailConfig info
    const configToSave = {
      enabled: sendViaMailConfig.enabled,
      hours: sendViaMailConfig.hours,
      lastUpdated: sendViaMailConfig.lastUpdated,
      mailMessage: sendViaMailConfig.mailMessage,
      minutes: sendViaMailConfig.minutes,
      quantity: sendViaMailConfig.quantity,
      units: sendViaMailConfig.units,
      users: sendViaMailConfig.users,
      otherRecipients: sendViaMailConfig.otherRecipients
    };

    // Assign data to config and persist to DB
    this.dashboard.dashboard.config.sendViaMailConfig = configToSave;
    await this.dashboard.saveDashboard();

  }


  public closeTagModal(tags: any[]) {
    this.isTagModalVisible = false;
    // Normalize tags to array of strings
    const normalizedTags = tags ? tags.map(tag =>
      typeof tag === 'string' ? tag : tag.value || tag.label
    ) : [];
    this.dashboard.selectedTags = normalizedTags;
    this.dashboard.dashboard.config.tag = normalizedTags;
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
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@cancelarBtn:Cancelar`
    }).then(async (borrado) => {
      if (borrado.value) {
        try {
          await lastValueFrom(this.dashboardService.deleteDashboard(dashboardId));

          // Navigate the app to EDA home
          this.router.navigate(['/home']).then(() => {
            window.location.reload();
          });
        } catch (err) {
          this.alertService.addError(err);
          throw err;
        }
      }
    });
  }




  public exportAsPDF() {
    this.hidePopover();
    this.spinner.on();

    const element = document.getElementById('myDashboard');

    domtoimage.toPng(element, {
      bgcolor: 'white',
      height: element.scrollHeight * 2,
      width: element.scrollWidth * 2,
      style: {
        transform: 'scale(2)',
        transformOrigin: 'top left'
      }
    }).then((dataUrl: string) => {
      const img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const pdf = new jspdf('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = pageWidth / imgWidth;

        const sliceCanvas = document.createElement('canvas');
        const ctx = sliceCanvas.getContext('2d')!;
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = Math.round(pageHeight / ratio);

        let position = 0;
        while (position < imgHeight) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(img, 0, -position, imgWidth, imgHeight);

          pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight);

          position += sliceCanvas.height;
          if (position < imgHeight) pdf.addPage();
        }

        this.spinner.off();
        pdf.save(`${this.dashboard.title}.pdf`);
      };
    }).catch((error: any) => {
      console.error('Error exportando como PDF:', error);
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

    domtoimage.toPng(node, { bgcolor: 'white' })
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = `${title}.png`;
        link.href = dataUrl;
        link.click();
        this.spinner.off();
      })
      .catch((error: any) => {
        console.error('Error exportando como imagen:', error);
        this.spinner.off();
      });
  }

  public async exportDashboardAsExcel(): Promise<void> {
    this.hidePopover();
    this.spinner.on();
    try {
      const panelDataList = await this._collectPanelData();
      await this.fileUtils.exportDashboardToExcel(panelDataList, this.dashboard.title);
    } catch (err) {
      console.error('[ExportExcel] Error exportando dashboard a Excel:', err);
    } finally {
      this.spinner.off();
    }
  }

  public async exportDashboardAsWord(): Promise<void> {
    this.hidePopover();
    this.spinner.on();
    try {
      const panelDataList = await this._collectPanelData();
      await this.fileUtils.exportDashboardToWord(panelDataList, this.dashboard.title);
    } catch (err) {
      console.error('[ExportWord] Error exportando dashboard a Word:', err);
    } finally {
      this.spinner.off();
    }
  }

  /**
   * Iterates over all panels and returns their content ready for export.
   * For charts, temporarily hides the panel header before capturing
   * the image to avoid the title appearing duplicated.
   */
  private async _collectPanelData(): Promise<DashboardPanelExport[]> {
    const panelDataList: DashboardPanelExport[] = [];

    for (const panelComp of this.dashboard.edaPanels?.toArray() ?? []) {
      if (!panelComp.panel?.content) continue;

      const chartType = panelComp.panelChart?.props?.chartType ?? '';
      const title     = panelComp.panel.title ?? '';
      const gridPos   = {
        gridX:    panelComp.panel.x    ?? 0,
        gridY:    panelComp.panel.y    ?? 0,
        gridCols: panelComp.panel.cols ?? 20,
        gridRows: panelComp.panel.rows ?? 10,
      };

      if (['table', 'crosstable'].includes(chartType)) {
        const tableInstance = panelComp.panelChart?.currentConfig;
        if (tableInstance) {
          panelDataList.push({ title, type: chartType as 'table' | 'crosstable', tableData: tableInstance, ...gridPos });
        }
      } else if (['kpi', 'kpibar', 'kpiline', 'kpiarea'].includes(chartType)) {
        const inject = panelComp.panelChart?.componentRef?.instance?.inject;
        if (inject) {
          const kpiData = {
            value:              inject.value,
            sufix:              inject.sufix              || '',
            kpiColor:           inject.kpiColor           || '',
            modifiedFontPoints: inject.modifiedFontPoints || 0,
          };
          if (chartType === 'kpi') {
            // Pure KPI: text only
            panelDataList.push({ title, type: 'kpi', kpiData, ...gridPos });
          } else {
            // KPI with chart: hide the number to capture only the chart
            const kpiComp   = panelComp.panelChart?.componentRef?.instance;
            const kpiNumEl  = kpiComp?.kpiContainer?.nativeElement as HTMLElement | undefined;
            if (kpiNumEl) kpiNumEl.style.visibility = 'hidden';
            const captured = await this._captureChartImage(panelComp.elRef?.nativeElement, title);
            if (kpiNumEl) kpiNumEl.style.visibility = '';
            panelDataList.push({
              title,
              type: 'kpi',
              kpiData,
              imageBase64:  captured.imageBase64,
              imageWidth:   captured.imageWidth,
              imageHeight:  captured.imageHeight,
              ...gridPos,
            });
          }
        }
      } else {
        const captured = await this._captureChartImage(panelComp.elRef?.nativeElement, title);
        panelDataList.push({ ...captured, title, ...gridPos });
      }
    }

    return panelDataList;
  }

  /**
   * Captures the chart area as PNG, previously hiding the header
   * (.drag-handler) so the panel title does not appear in the image.
   */
  private async _captureChartImage(
    hostEl: HTMLElement | undefined,
    panelTitle: string
  ): Promise<Pick<DashboardPanelExport, 'type' | 'imageBase64' | 'imageWidth' | 'imageHeight'>> {
    if (!hostEl) return { type: 'other' };

    const headerEl = hostEl.querySelector('.drag-handler') as HTMLElement | null;
    if (headerEl) headerEl.style.visibility = 'hidden';

    try {
      const SCALE = 1.5;
      const canvas = await html2canvas(hostEl, {
        backgroundColor: '#ffffff',
        useCORS: false,
        allowTaint: true,
        logging: false,
        scale: SCALE,
      });
      return {
        type: 'chart',
        imageBase64:  canvas.toDataURL('image/png'),
        imageWidth:   Math.round(canvas.width  / SCALE),
        imageHeight:  Math.round(canvas.height / SCALE),
      };
    } catch (err) {
      console.warn(`[Export] No se pudo capturar imagen del panel "${panelTitle}":`, err);
      return { type: 'other' };
    } finally {
      if (headerEl) headerEl.style.visibility = '';
    }
  }

  public getMailingAlertsEnabled(): boolean {

    let mailingenabled = false;

    this.dashboard.panels.forEach(panel => {
      if (panel.content && panel.content.chart === 'kpi') {
        try {
          panel.content.query.output.config.alertLimits.forEach(alert => {
            if (alert.mailing.enabled === true) {
              mailingenabled = true
            };
          });
        } catch (e) {
          console.log('error getting mailing alerts.... setting it to false');
          mailingenabled = false;
        }
      }
    });

    return mailingenabled;
  }




  // Sidebar creation methods
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
    // Toggle sidebar states
    this.mostrarOpciones = !this.mostrarOpciones;
  }

  public toggleGlobalFilter() {
    // Open filters dropdown
    this.mostrarFiltros = !this.mostrarFiltros;
  }

  // Call to specific filter via sidebar
  public handleSpecificFilter(filtro: any) {
    this.hidePopover();
    this.toggleGlobalFilter();
    this.dashboard.globalFilter.onShowGlobalFilter(false, filtro)
  }

  public renameDashboard() {
    this.editableTitle = this.dashboard.title;
    this.editingTitle = true;
  }

  public saveDashboardTitle() {
    if (this.editableTitle?.trim()) {
      this.dashboard.title = this.editableTitle.trim();
      this.dashboardService.setNotSaved(true);
    }
    this.editingTitle = false;
  }

  public cancelDashboardTitle() {
    this.editingTitle = false;
  }


 public isReadOnlyCheck() {
    const user = localStorage.getItem('user');
    const userName = JSON.parse(user)._id;
    const imProperty = userName === this.dashboard.dashboard.user;
    const isObserver = JSON.parse(user).role.includes('135792467811111111111113');
    const onlyIcanEdit = this.dashboard.dashboard.config.onlyIcanEdit ? this.dashboard.dashboard.config.onlyIcanEdit: true ;
    return userName === '135792467811111111111112' || (!onlyIcanEdit && !imProperty) || isObserver;
  }

  public isEditableCheck() {
    const user = localStorage.getItem('user');
    const userId = JSON.parse(user)._id;
    const userRole = JSON.parse(user).role;
    const isAdmin = userRole.includes('135792467811111111111110');
    const imProperty = userId === this.dashboard.dashboard.user;
    return (!this.dashboard.dashboard.config.onlyIcanEdit || imProperty || isAdmin );
  }

  toggleClickFilters() {
    // Find the item once
    const clickItem = this.sidebarItems.find(item => item.id === 'enableFilters');

    // Toggle the state
    this.clickFiltersEnabled = !this.clickFiltersEnabled;
    this.dashboard.dashboard.config.clickFiltersEnabled = this.clickFiltersEnabled;

    // Dashboard-level setting overrides each panel's local setting, regardless of its previous value
    for (const panel of this.dashboard.panels) {
      (panel as any).clickFiltersEnabled = this.clickFiltersEnabled;
    }
    this.dashboardService.setNotSaved(true);

    // Update label and icon based on state
    clickItem.label = this.clickFiltersEnabled ? $localize`:@@enableFilters:Click en filtros habilitado` : $localize`:@@disableFilters:Click en filtros deshabilitado`;
    clickItem.icon = this.clickFiltersEnabled ? "pi pi-bolt" : "pi pi-ban";

  }

  panelLockButton() {
    const lockItem = this.sidebarItems.find(item => item.id === 'enablePanelLock');

    this.clickPanelLockButton = !this.clickPanelLockButton;
    const locked = !this.clickPanelLockButton;

    for (const panel of this.dashboard.panels) {
      (panel as any).dragEnabled = !locked;
      (panel as any).resizeEnabled = !locked;
    }

    this.dashboard.gridsterOptions.api?.optionsChanged();
    this.dashboard.dashboard.config.panelLockEnabled = this.clickPanelLockButton;
    this.dashboardService.setNotSaved(true);

    lockItem.label = this.clickPanelLockButton
      ? $localize`:@@enablePanelLockButton: Bloquear los paneles`
      : $localize`:@@disablePanelLockButton:Desbloquear los paneles`;
    lockItem.icon = this.clickPanelLockButton ? "pi pi-lock-open" : "pi pi-lock";
  }
  
  toggleEdit() {
    // Find the item once
    const clickItem = this.sidebarItems.find(item => item.id === 'enableEdition');

    // Toggle the state
    this.onlyIcanEdit = !this.onlyIcanEdit;

    // Update label and icon based on state
    clickItem.label = this.onlyIcanEdit ? $localize`:@@onlyIcanEditTagEnable:Edición privada habilitada` : $localize`:@@onlyIcanEditTagDisable:Edición privada deshabilitada`;
    clickItem.icon = this.onlyIcanEdit ? "pi pi-check" : "pi pi-ban";
  }

  toggleDownload() {
    // Open downloads dropdown
    this.mostrarDescargas = !this.mostrarDescargas;
  }

  // EVENT FUNCTIONS THAT CONTROL FILTER DRAG AND DROP
  // DRAG AND DROP FUNCTIONALITY
  drop(event: CdkDragDrop<any[]>) {
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }

  // FILTER SORT
  onDrop(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.dashboard.globalFilter.globalFilters, event.previousIndex, event.currentIndex);
    this.dashboardService.setNotSaved(true);
  }
}