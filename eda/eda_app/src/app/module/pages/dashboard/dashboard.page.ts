import { ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom, Subscription } from 'rxjs';
import { DateUtils } from '@eda/services/utils/date-utils.service';
import * as _ from 'lodash';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { CompactType, DisplayGrid, GridsterComponent, GridsterConfig, GridsterItem, GridsterItemComponent, GridType } from 'angular-gridster2';
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, StyleProviderService, IGroup, DashboardStyles, ChartUtilsService, UserService } from '@eda/services/service.index';
import { EdaPanel, EdaPanelType, InjectEdaPanel } from '@eda/models/model.index';
import { DashboardSidebarComponent } from './dashboard-sidebar/dashboard-sidebar.component';
import { GlobalFilterComponent } from '@eda/components/global-filter/global-filter.component'; 
import { EdaBlankPanelComponent, IPanelAction } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { FormsModule } from '@angular/forms';
import { FocusOnShowDirective } from '@eda/shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { EdaTitlePanelComponent, EdaTabsPanelComponent } from '@eda/components/component.index';

// Imports del sidebar
import { DashboardSidebarService } from '@eda/services/shared/dashboard-sidebar.service';
import { DependentFilters } from '@eda/components/dependent-filters/dependent-filters.component';
import { FilterDialogComponent } from '@eda/components/component.index';
import { GlobalFilterDialogComponent } from '@eda/components/component.index';
import { ImportPanelDialog } from "@eda/components/import-panel/import-panel.dialog";
import { DashboardSaveAsDialog } from "@eda/components/dashboard-save-as/dashboard-save-as.dialog";
import { DashboardEditStyleDialog } from "@eda/components/dashboard-edit-style/dashboard-edit-style.dialog";
import { DashboardVisibleModal } from "@eda/components/dashboard-visible/dashboard-visible.modal";
import { DashboardTagModal } from './dashboard-tag/dashboard-tag.modal'; 
import { DashboardMailConfigModal } from "@eda/components/dashboard-mail-config/dashboard-mail-config.modal";
import { DashboardCustomActionDialog } from "@eda/components/dashboard-custom-action/dashboard-custom-action.dialog";

const PRIMENG_MODULES = [
    ButtonModule,
    DropdownModule,
    MenuModule,
    MessageModule,
]

const ANGULAR_MODULES = [
    FormsModule,
    FocusOnShowDirective,
    CommonModule,
];
const GRIDSTER_MODULES = [
    GridsterComponent,
    GridsterItemComponent
]

// Standalone Components
const STANDALONE_COMPONENTS = [
  DashboardSidebarComponent,
  EdaBlankPanelComponent, 
  GlobalFilterComponent, 
  DashboardSaveAsDialog,
  DashboardEditStyleDialog,
  DashboardCustomActionDialog,
  DashboardTagModal,
  DashboardMailConfigModal,
  DashboardVisibleModal,
  GlobalFilterDialogComponent,
  FilterDialogComponent,
  ImportPanelDialog,
  DependentFilters,
  EdaTitlePanelComponent,
  EdaTabsPanelComponent
]
@Component({
  selector: 'app-v2-dashboard-page',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [STANDALONE_COMPONENTS, ANGULAR_MODULES, GRIDSTER_MODULES, PRIMENG_MODULES],

  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
})
export class DashboardPage implements OnInit {
  @ViewChild(DashboardSidebarComponent) sidebar!: DashboardSidebarComponent;
  @ViewChild(GlobalFilterComponent) globalFilter: GlobalFilterComponent;
  @ViewChildren(EdaBlankPanelComponent) edaPanels: QueryList<EdaBlankPanelComponent>;
  
  private sidebarService = inject(DashboardSidebarService)
  private globalFiltersService = inject(GlobalFiltersService);
  private stylesProviderService = inject(StyleProviderService);
  private dashboardService = inject(DashboardService);
  private alertService = inject(AlertService);
  private fileUtils = inject(FileUtiles);
  private route = inject(ActivatedRoute);
  private chartUtils = inject(ChartUtilsService);
  private dateUtilsService = inject(DateUtils);
  private userService = inject(UserService);

  public title: string = $localize`:@@loading:Cargando informe...`;
  public styles: DashboardStyles;
  public gridsterOptions: GridsterConfig;
  public gridsterDashboard: GridsterItem[];
  private edaPanelsSubscription: Subscription;
  
  public reportTitle: any;
  public reportPanel: any;
  public backgroundColor: any;
  public panelTitle: any;
  public panelTabText: any;
  public panelTabAlign: any;
  public panelContent: any;
  public availableChatGpt: any = false;
  public height: number = 1000;
  public toLitle: boolean = false;
  public toMedium: boolean = false;
  public queryParams: any = {};
  public hideWheel: boolean = false;
  public panelMode: boolean = false;
  public connectionProperties: any;


  titleClick: boolean = false;
  sidebarVisible = false;
  notSaved: boolean = false;

  dashboardId: string;
  dashboard: any;
  dataSource: any;
  panels: any[] = [];

  grups: IGroup[] = [];
  injectEdaPanel: InjectEdaPanel;

  public onlyIcanEdit: boolean = false;
  public refreshTime: number;
  public clickFiltersEnabled: boolean = true;
  public stopRefresh: boolean = false;


  //Filter control variables
  public lastFilters: any[] = [];
  public lastMultipleFilters: any[] = [];
  public chartFilter: any;

  public applyToAllfilter: {
    present: boolean,
    refferenceTable: string,
    id: string
  };

  public urls: any[] = [];
  public sendViaMailConfig: any = { enabled: false};

  public selectedTags: any[] = [];

  constructor(public chatgptService: ChatgptService, private cdr: ChangeDetectorRef) {

  }

  ngOnInit(): void {
    this.initializeResponsiveSizes();
    this.initializeGridsterOptions();
    this.loadDashboard();
    this.dashboardService.notSaved.subscribe(
      (data) => this.notSaved = data
    );

    this.chatgptService.availableChatGpt().subscribe((resp: any) => {
      if(resp.response.available) {
        this.availableChatGpt = true;
      } else {
        this.availableChatGpt = false;
      }
    })
  }


  /* Set applyToAllFilters for new panel when it's created */
      public ngAfterViewInit(): void {
          this.edaPanelsSubscription = this.edaPanels.changes.subscribe((comps: QueryList<EdaBlankPanelComponent>) => {
              const globalFilters = this.globalFilter?.globalFilters.filter(filter => filter.isGlobal === true);
              const unsetPanels = this.edaPanels.filter(panel => _.isNil(panel.panel.content));
  
              this.setPanelsQueryMode();
  
              setTimeout(() => {
                  const treeQueryMode = this.edaPanels.some((panel) => panel.selectedQueryMode === 'EDA2');
  
                  unsetPanels.forEach(panel => {
                      globalFilters.forEach(filter => {
                          if (panel && !treeQueryMode) {
                              filter.panelList.push(panel.panel.id);
                              const formatedFilter = this.globalFiltersService.formatFilter(filter);
                              panel.assertGlobalFilter(formatedFilter)
                          }
                      });
                  });
  
              }, 0);
          });
  
      }

  ngOnDestroy() {
    // Poner estilos como predefinidios
    this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles())
    this.stylesProviderService.loadingFromPalette = false;
    this.stopRefresh = true;
    this.dashboard.config.stopRefresh = true;
    clearInterval(this.countdownInterval);
      if (this.edaPanelsSubscription) {
          this.edaPanelsSubscription.unsubscribe();
      }
  }



  
  
    private initializeGridsterOptions(): void {
    this.gridsterOptions = {
      gridType: GridType.VerticalFixed, // Configuración general del Gridster : permite scroll vertical y los items generados son de tamaño fijo.
      compactType: CompactType.None, // Controla la configuración de compactar en el gridster
      displayGrid: DisplayGrid.OnDragAndResize, // Permite configurar la rejilla del gridster
      pushItems: true, // Hace que los elementos se reorganicen automáticamente
      avoidOverlapped: true, // Asegura que no haya solapamientos
      swap: true,
      draggable: {
        enabled: true,
        ignoreContent: true,
        dragHandleClass: 'drag-handler' // Clase que hace que los elementos sean draggable
      },
      resizable: {
        enabled: true,
      },
      minCols: 40,
      maxCols: 40,
      minRows: 30, // Se puede optimizar para diferentes pantallas, aún así, con 30 funciona bien
      maxRows: 300,
      margin: 2, // Reduce el margen entre celdas
      fixedRowHeight: undefined, // Reduce el tamaño de la altura de las filas
      fixedColWidth: undefined, // Ajusta también el ancho de las columnas
      disableScrollHorizontal: true, // Desactiva scroll horizontal si es necesario
      disableScrollVertical: true, // Desactiva scroll vertical si es necesario
      itemChangeCallback: (item: GridsterItem) => this.onItemChange(item),
      itemResizeCallback: (item: GridsterItem) => this.onItemChange(item)
    };
      this.updateSquareCells();
      window.addEventListener('resize', () => this.updateSquareCells());

    }

    private  updateSquareCells() {
    const container = document.querySelector('gridster') as HTMLElement;
    if (!container) return;

    const cols = this.gridsterOptions.minCols!;
    const width = container.clientWidth;
    const mobileBreakpoint = this.gridsterOptions.mobileBreakpoint || 640;
    //Si la visión es en movil. Gridsted pone los elementos apilados.
    //https://github.com/tiberiuzuld/angular-gridster2/blob/master/src/assets/gridTypes.md
    if (width < mobileBreakpoint) {
      // En modo móvil: altura fija por celda para que los paneles tengan un tamaño razonable
      this.gridsterOptions.fixedRowHeight = 150;
    } else {
      let cellSize = Math.floor(width / cols);
      if(cellSize < 30){
        // si estoy muy ajustado le doy un poco de altura.
        cellSize = 30;
      }
      this.gridsterOptions.fixedRowHeight = cellSize;
    }
   this.gridsterOptions.api?.optionsChanged();
  }

  public async loadDashboard() {
    const dashboardId = this.route.snapshot.paramMap.get('id');
    const data = await lastValueFrom(this.dashboardService.getDashboard(dashboardId));
    const dashboard = data.dashboard;
    this.dataSource = data.datasource;
    if (dashboard?.config) {
      this.onlyIcanEdit = dashboard.config.onlyIcanEdit ;
      this.dashboardId = dashboardId;
      this.dashboard = dashboard;
      this.title = dashboard.config.title;
      this.applyToAllfilter = dashboard.config.applyToAllfilter || { present: false, refferenceTable: null, id: null };
      this.globalFilter?.initOrderDependentFilters(dashboard.config.orderDependentFilters || []); // Filtros dependientes
      this.globalFilter?.initGlobalFilters(dashboard.config.filters || []);// Filtres del dashboard
      this.initPanels(dashboard);
      this.styles = dashboard.config.styles || this.stylesProviderService.generateDefaultStyles();
      this.getUrlParams();
      this.globalFilter.findGlobalFilterByUrlParams(this.queryParams);
      this.globalFilter.fillFiltersData();
      
      if (this.styles.palette !== undefined) {
        this.chartUtils.MyPaletteColors = this.styles.palette['paleta'];
      }
      
      
      if (this.dashboard.config.styles?.palette && this.dashboard.config.styles?.stylesApplied) { 
        this.assignStyles();
        this.stylesProviderService.setStyles(this.styles, true)
      }

      if (dashboard.config.refreshTime) {
        dashboard.config.stopRefresh = false;
        this.startCountdown(dashboard.config.refreshTime);
      }
      this.selectedTags = this.dashboard.config.tag;
    }

    this.checkImportedPanels(dashboard);
    this.updateFilterDatesInPanels();
  }

  private updateFilterDatesInPanels(): void {

        /**Set ranges for dates in panel filters */
        this.panels.filter(panel => panel.content).forEach(panel => {

            let panelFilters = [...panel.content.query.query.filters];
            panel.content.query.query.filters = [];

            panelFilters.forEach(pFilter => {

                if (!!pFilter.selectedRange) {

                    let range = this.dateUtilsService.getRange(pFilter.selectedRange);
                    let stringRange = this.dateUtilsService.rangeToString(range);

                    pFilter.filter_elements[0] = { value1: [stringRange[0]] }
                    pFilter.filter_elements[1] = { value2: [stringRange[1]] }

                }

                panel.content.query.query.filters.push(pFilter);

            });

        });

        /**Set ranges for dates in global filters */
        this.globalFilter?.globalFilters.filter(f => f.selectedRange).forEach(filter => {

            let range = this.dateUtilsService.getRange(filter.selectedRange);
            let stringRange = this.dateUtilsService.rangeToString(range);
            filter.selectedItems = stringRange;

            this.panels.filter(panel => panel.content).forEach(panel => {

                const panelFilters = [...panel.content.query.query.filters];
                panel.content.query.query.filters = [];

                panelFilters.forEach(pFilter => {

                    if (pFilter.filter_id === filter.id) {
                        const formatedFilter = this.globalFiltersService.formatFilter(filter);
                        panel.content.query.query.filters.push(formatedFilter);
                    } else {
                        panel.content.query.query.filters.push(pFilter);
                    }
                });
            });
        });
    }
    

  // Método que asigna los estilos
  public assignStyles() {
    // Panel del título del informe    
    this.reportPanel = {
      height: 5 + (this.dashboard.config.styles.title.fontSize*0.25) + 'vh',
    };
    
    // Texto del título del informe
    this.reportTitle = {
      color: this.dashboard.config.styles.title.fontColor,
      'font-size': (20 + this.dashboard.config.styles.title.fontSize * 3) + 'px',
      'font-family': this.dashboard.config.styles.title.fontFamily,
      display: 'flex',
    'justify-content': this.dashboard.config.styles.titleAlign === 'center' ? 'center'
                      : this.dashboard.config.styles.titleAlign === 'flex-end' ? 'right'
                      : 'flex-start'  
    };

    // Panel del título del chart
    this.backgroundColor = {
      background: this.dashboard.config.styles.backgroundColor, 
    };

    // Texto del título del chart
    this.panelTitle = {
      background: this.dashboard.config.styles.panelColor,
      color: this.dashboard.config.styles.panelTitle.fontColor,
      'font-size': (20 + this.dashboard.config.styles.panelTitle.fontSize * 3) + 'px',
      'font-family': this.dashboard.config.styles.panelTitle.fontFamily,
      display: 'flex',
      'justify-content': this.dashboard.config.styles.panelTitleAlign === 'center' ? 'center'
                        : this.dashboard.config.styles.panelTitleAlign === 'flex-end' ? 'right'
                        : 'flex-start'
    };

    this.panelContent = {
      background: this.dashboard.config.styles.panelColor,
    };

    // Texto de los tabs (como panelTitle pero con display:block y text-align)
    this.panelTabText = {
      background: this.dashboard.config.styles.panelColor,
      color: this.dashboard.config.styles.panelTitle.fontColor,
      'font-size': (20 + this.dashboard.config.styles.panelTitle.fontSize * 3) + 'px',
      'font-family': this.dashboard.config.styles.panelTitle.fontFamily,
    };

    this.panelTabAlign = {
      'text-align': this.dashboard.config.styles.panelTitleAlign === 'center' ? 'center'
                    : this.dashboard.config.styles.panelTitleAlign === 'flex-end' ? 'right'
                    : 'left'
    };

    this.stylesProviderService.ActualChartPalette = this.dashboard.config.styles.palette;
  }

  private initPanels(dashboard: any) {
    if (!dashboard.config.panel) {
      this.panels.push(
        new EdaPanel({
          id: this.fileUtils.generateUUID(),
          title: $localize`:@@newPanelTitle:Nuevo Panel`,
          type: EdaPanelType.BLANK,
          dragAndDrop: true,
          resizable: true,
          w: 20,
          h: 10,
          cols: 20,
          rows: 10,
        })
      );
    } else {
      this.panels = dashboard.config.panel;
    }

    // AngularGridster2 new properties (cols, rows)
    for (const panel of this.panels) {
      panel.cols = panel.cols || panel.w;
      panel.rows = panel.rows || panel.h;
    }

    const user = localStorage.getItem('user');
    const userID = JSON.parse(user)._id;

    this.injectEdaPanel = {
      dataSource: this.dataSource,
      dashboard_id: this.dashboardId,
      applyToAllfilter: this.applyToAllfilter,
      isObserver: this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0
    }
    this.stylesProviderService.loadedPanels = dashboard.config?.panel?.length || -1;
  }

  // Init functions
  private initializeResponsiveSizes(): void {
      if (window.innerWidth >= 1200) {
          this.toLitle = false;
          this.toMedium = false;
      }

      if (window.innerWidth < 1000) {
          this.toLitle = true;
          this.toMedium = false;
      }
  }

  showSidebar(event: Event) {
    if (this.sidebar) {
      this.sidebar.showPopover(event);
    }
  }

      public canIedit(): boolean {
        let result: boolean = false;
        result = this.userService.isAdmin;
        // si no es admin...
        if (!result) {
            if (this.dashboard.onlyIcanEdit) {
                result = this.userService.user._id === this.dashboard.user
            } else {
                // Usuari anonim no pot editar
                result = this.userService.user._id !== '135792467811111111111112';
            }

        }
        return result;
    }

  onRemovePanel(panel: any) {
    this.panels.splice(_.findIndex(this.panels, { id: panel }), 1);

    for (const filter of this.globalFilter.globalFilters) {
      filter.panelList = filter.panelList.filter((id: string) => id !== panel);
    }

    let valor = this.getBottomMostItem();
    this.height = valor !== undefined ? (valor.y + valor.rows + 2) * 32 : 750;
    this.cdr.detectChanges();
    this.stylesProviderService.loadedPanels--;
  }

  public reloadOnGlobalFilter(): void {
    //not saved alert message
    this.dashboardService._notSaved.next(true);

    // Simula el click en el btn
    const interval = setInterval(() => {
      if (this.globalFilter.loading === false) {
          clearInterval(interval); // detener el polling
          let btn = document.getElementById('dashFilterBtn');
          if (btn) btn.click();
          else this.reloadPanels();
      }
    }, 100); // revisa cada 100ms
  }
  
  public async reloadPanels(): Promise<void> {
    const tasks = this.edaPanels.map(async (panel) => {
      if (panel.currentQuery.length > 0) {
        panel.display_v.chart = '';

        await panel.runQueryFromDashboard(true);

        // Actualizo el panelChart si existe
        if (panel.panelChart) {
          try {
            panel.panelChart?.updateComponent();
          } catch (error) {
            console.error('Error al actualizar panelChart', error);
          }
        }
      }
    });

    // Espero a que terminen todos en paralelo
    await Promise.all(tasks);
  }

  public async onPanelAction(event: IPanelAction): Promise<void> {
    let modeEDA = false;
    const panel = event?.data?.panel;
    const filtersEnabled: boolean = this.dashboard.config.clickFiltersEnabled;
    const isImportedPanel: boolean = panel?.globalFilterMap;

    if (panel) {
      modeEDA = !event?.data.panel.content?.query?.query.modeSQL &&
        (!event?.data.panel.content.query.query.queryMode || event?.data.panel.content.query.query.queryMode === 'EDA');
    }

    if (modeEDA && event.code === "ADDFILTER" && this.validateDashboard('GLOBALFILTER') && filtersEnabled && !isImportedPanel) {
      this.alertService.addSuccess($localize`:@@filteredReportMessage:Por favor, espera un momento mientras procesamos la selección.`);
      const data = event?.data;
      let column: any = this.getCorrectColumnFiltered(event);
      const table = this.dataSource.model.tables.find((table: any) => table.table_name === column?.table_id);

      if (column && table) {
        this.edaPanels.forEach(panel => {
          if (panel.panelChart) panel.panelChart.updateComponent();
        });

        let config = this.setPanelsToFilter(panel);
        let existingFilter = this.globalFilter.globalFilters.find(f =>
          this.getChartClicked(f, table.table_name, column.column_name) &&
          f.panelList.includes(panel.content.query.dashboard.panel_id)
        );

        if (existingFilter) {
          await this.handleExistingFilter(existingFilter, data, table, column);
        } else {
          await this.handleNewFilter(table, column, data, config);
        }

        this.edaPanels.forEach(panel => {
          if (panel.panelChart) panel.panelChart.updateComponent();
        });
      }
    } else if (event.code === "QUERYMODE") {
      this.setPanelsQueryMode();
    } else if (event.code === 'MAPFILTERS') {
      this.onMapFilters();
    }
  }

  // FUNCIONES DE FILTROS DINAMICOS 
  // FUNCIONES DE FILTROS DINAMICOS 

   //Maneja el caso cuando ya existe un filtro
  private async handleExistingFilter(existingFilter: any, data: any, table: any, column: any): Promise<void> {
    const filterName = existingFilter.column?.label || existingFilter.selectedColumn?.display_name?.default ||"default";
    
    if (existingFilter.selectedItems.length === 0) { // Filtro existente vacio
      this.handleEmptyFilter(existingFilter, data);
    } else if (existingFilter.selectedItems.length === 1) { // Filtro existente 1 valor
      await this.handleSingleValueFilter(existingFilter, filterName, data, table, column);
    } else { // Filtro existente con valores
      this.handleMultipleValuesFilter(existingFilter, filterName, data);
    }
  }

   // CASO: Filtro vacío → Añadir el valor
  private handleEmptyFilter(existingFilter: any, data: any): void {
    existingFilter.selectedItems = [data.label];
    this.globalFilter.applyGlobalFilter(existingFilter);
    this.reloadOnGlobalFilter();
  }

   // CASO: Filtro con 1 solo valor
  private async handleSingleValueFilter(existingFilter: any, filterName: string, data: any, table: any, column: any ): Promise<void> {
    const backupFilter = this.lastMultipleFilters.find(f => f.filterName === filterName);

    if (backupFilter) { // Tenemos valor previo del filtro
      this.restoreFilterFromBackup(existingFilter, filterName, backupFilter);
    } else { // No tenemos valor previo
      await this.removeOrClearFilter(existingFilter, data, table, column);
    }
  }

   // Restaura el filtro desde el backup guardado
  private restoreFilterFromBackup(existingFilter: any, filterName: string, backupFilter: any): void {
    existingFilter.selectedItems = [...backupFilter.filter.selectedItems];
    this.lastMultipleFilters = this.lastMultipleFilters.filter(f => f.filterName !== filterName);
    this.globalFilter.applyGlobalFilter(existingFilter);
    this.reloadOnGlobalFilter();
  }

   // Elimina o vacía el filtro según sea fromChart o no
  private async removeOrClearFilter(existingFilter: any, data: any, table: any, column: any): Promise<void> {
    if (existingFilter.fromChart) {
      await this.deleteFilterCompletely(existingFilter, data, table, column);
    } else {
      this.clearFilterValues(existingFilter);
    }
  }

   // Elimina completamente un filtro fromChart
  private async deleteFilterCompletely(existingFilter: any, data: any, table: any, column: any): Promise<void> {
    const filterTable = existingFilter.selectedTable?.table_name || existingFilter.table?.value;
    const filterColumn = existingFilter.selectedColumn?.column_name || existingFilter.column?.value?.column_name;

    // Limpiar filtro de todos los paneles
    this.cleanFilterFromAllPanels(filterTable, filterColumn);

    // Limpiar del panel actual
    this.cleanFilterFromPanel(data.panel, filterTable, filterColumn);

    // Eliminar del globalFilter
    this.globalFilter.removeGlobalFilter(existingFilter, true);
    this.reloadOnGlobalFilter();
  }

   // Limpia el filtro de todos los paneles del dashboard
  private cleanFilterFromAllPanels(filterTable: string, filterColumn: string): void {
    this.edaPanels['_results'].forEach(p => {
      // Limpiar de panel.content
      if (p.panel?.content?.query?.query?.filters) {
        p.panel.content.query.query.filters = p.panel.content.query.query.filters.filter(
          f => !(f.filter_table === filterTable && f.filter_column === filterColumn)
        );
      }

      // Limpiar de inject.content
      if (p.inject?.content?.query?.query?.filters) {
        p.inject.content.query.query.filters = p.inject.content.query.query.filters.filter(
          f => !(f.filter_table === filterTable && f.filter_column === filterColumn)
        );
      }

      // Limpiar de globalFilters del panel
      if (p.globalFilters && Array.isArray(p.globalFilters)) {
        p.globalFilters = p.globalFilters.filter(
          f => !(
            (f.filter_table === filterTable && f.filter_column === filterColumn) ||
            (f.table?.value === filterTable && f.column?.value?.column_name === filterColumn)
          )
        );
      }

      // Limpiar de panelChart.inject si existe
      if (p.panelChart?.inject?.content?.query?.query?.filters) {
        p.panelChart.inject.content.query.query.filters = p.panelChart.inject.content.query.query.filters.filter(
          f => !(f.filter_table === filterTable && f.filter_column === filterColumn)
        );
      }
    });
  }

   // Limpia el filtro de un panel específico
  private cleanFilterFromPanel(panel: any, filterTable: string, filterColumn: string): void {
    if (panel?.content?.query?.query?.filters) {
      panel.content.query.query.filters = panel.content.query.query.filters.filter(
        f => !(f.filter_table === filterTable && f.filter_column === filterColumn)
      );
    }
  }

   // Vacía los valores de un filtro sin eliminarlo (para filtros NO fromChart)
  private clearFilterValues(existingFilter: any): void {
    existingFilter.selectedItems = [];
    this.globalFilter.applyGlobalFilter(existingFilter);
    this.reloadOnGlobalFilter();
  }

   // CASO: Filtro con múltiples valores → Guardar backup y filtrar por uno solo
  private handleMultipleValuesFilter(existingFilter: any, filterName: string, data: any): void {
    // Guardar backup si no existe
    if (!this.lastMultipleFilters.find(f => f.filterName === filterName)) {
      this.lastMultipleFilters.push({
        filterName: filterName,
        filter: JSON.parse(JSON.stringify(existingFilter))
      });
    }

    // Filtrar solo por el valor clickeado
    existingFilter.selectedItems = [data.label];
    this.globalFilter.applyGlobalFilter(existingFilter);
    this.reloadOnGlobalFilter();
  }

   // Crea un nuevo filtro cuando no existe
  private async handleNewFilter(table: any, column: any, data: any, config: any): Promise<void> {
    this.chartFilter = this.createChartFilter(table, column, data.label, config);
    data.panel.content.query.query?.filters.push(
      this.createChartFilter(table, column, data.label, config)
    );

    try {
      await this.globalFilter.onGlobalFilterAuto(this.chartFilter, table.table_name);
      this.reloadOnGlobalFilter();
    } catch (error) {
      console.error('Error creando filtro:', error);
    }
  }


  createChartFilter(table: any, column: any, dataLabel: string, config: any): any {
    const filter = {
      id: `${table.table_name}_${column.column_name}`,
      filter_id: `${table.table_name}_${column.column_name}`, 
      isGlobal: true,
      isAutocompleted: config.isAutocompleted ?? false,
      applyToAll: config.applyToAll ?? true,
      panelList: config.panelList.map((p) => p.id),
      table: { label: table.display_name.default, value: table.table_name },
      column: { 
          label: column.display_name?.default || column.column_name, 
          value: column
      },
      selectedItems: [dataLabel],
      fromChart: true,
      visible: 'public',
      data: []
    };
    
    return filter;
  }

  deleteDynamicFilter(chartToRemove: any, table: any, filterName: any) {
    // Borramos el filtro existente
    let filterToAddIndx = this.lastFilters.findIndex(element => element.filterName === chartToRemove.column.label &&
      element.filter.table.label === chartToRemove.table.label)
    // Borramos del global filter el filtro a borrar fromChart
    this.globalFilter.removeGlobalFilterOnClick(chartToRemove, true);
    // Recuperamos el filtro correspondiente y lo eliminamos de los filtros guardados
    if (filterToAddIndx !== -1 ) { 
      this.globalFilter.onGlobalFilterAuto(this.lastFilters[filterToAddIndx].filter, table.table_name)
      this.lastFilters.splice(filterToAddIndx, 1);
    }  
  }

  recoverDynamicFilter(chartToRemove?: any, existingFilter?: any, filterName?: string) {
    // Restaurar selectedItems desde el filtro guardado
    chartToRemove.selectedItems = [...existingFilter.filter.selectedItems];

    // Eliminar ese filtro del array
    this.lastMultipleFilters = this.lastMultipleFilters.filter(f => f.filterName !== filterName);

    // Aplicar filtro global
    this.globalFilter.applyGlobalFilter(chartToRemove);
  }

  isFilterAppliedToChart(anyChartToRemove: any, data: any) : boolean {

    let filterInPanel = data.panel.content.query.query?.filters.find((f: any) =>
      (f.filter_elements?.some((fe: any) => fe.value1?.includes(data.label))) ||
      (data.label.includes(f.selectedItems))) 
      !== undefined;

    if(anyChartToRemove && filterInPanel) {
      // aunque coincida, si este no esta aplicado en el propio panel como filtro, crearemos uno de nuevo
      return false;
    }   
    return true;
  }

  /** Updates applyToAllFilter in every panel */
  public updateApplyToAllFilterInPanels(): void {
    this.edaPanels.forEach((panel) => {
      panel.inject.applyToAllfilter = this.applyToAllfilter;
      panel.reloadTablesData();
    });
  }

  public onMapFilters() {
    this.sidebarService.invokeMethod('onImportPanel');
  }

  checkImportedPanels(dashboard) {
    dashboard.config.panel?.forEach(element => {
      try {        
        if (element.globalFilterMap) {
          const panelFilters = element.content.query.query.filters;
  
          element.globalFilterMap.forEach(filterLinkId => {
            // Buscar el filtro del dashboard al que apunta targetId
            const dashboardFilterToApply = dashboard.config.filters.find(filter => filter.id === filterLinkId.targetId);
            const sourceFilter = panelFilters.find(f => f.filter_id === filterLinkId.sourceId);
            const valueToApply = dashboardFilterToApply.selectedItems;
  
            if(sourceFilter?.filter_elements)
              sourceFilter.filter_elements[0].value1 = valueToApply;
          });
        }
      } catch (error) {
        console.log('Error al cargar imported panels', error)      
        this.alertService.addError('Error al cargar imported panels')  
      }
    });
  }

  public onDuplicatePanel(panel: any) {
    this.panels.push(panel);
    this.dashboardService._notSaved.next(true);
    this.stylesProviderService.loadedPanels++;
  }

  async onGlobalFilter(data: any) {
    // const data = action?.data;
    if (data && !_.isNil(data?.inx)) {
      const panel = data?.panel;
      const column = data.query.find((query: any) => query?.display_name?.default === data.filterBy);
      const table = this.dataSource.model.tables.find((table: any) => table.table_name === column?.table_id);

      if (column && table) {
        let config = this.setPanelsToFilter(panel);

        let globalFilter = {
          id: `${table.table_name}_${column.column_name}`,  //this.fileUtils.generateUUID(),
          isGlobal: true,
          isAutocompleted: config.isAutocompleted,
          applyToAll: config.applyToAll,
          panelList: config.panelList.map(p => p.id),
          table: { label: table.display_name.default, value: table.table_name },
          column: { label: column.display_name.default, value: column },
          selectedItems: [data.label]
        };

        await this.globalFilter.onGlobalFilter(true, globalFilter);
      

        this.dashboardService._notSaved.next(true);

        // Simula el click en el btn
        setTimeout(() => {
          let btn = document.getElementById('dashFilterBtn');
          if (btn) btn.click();
          else this.refreshPanelsOthersCharts();
        }, 100);
      }
    }
    this.setPanelsQueryMode();
  }

  private setPanelsToFilter(panel: any): any {
    const newPanel = this.panels.find(p => p.id === panel.id);
    const panels = this.globalFiltersService.panelsToDisplay(this.dataSource.model.tables, this.panels, newPanel);
    const panelsToFilter = panels.filter(p => p.avaliable === true);

    return {
        panelList: panelsToFilter,
        applyToAll: (panels.length === panelsToFilter.length)
    };
  }

  /** Selecciona el modo en el que se permitirá hacer consultas. Teniendo en cuenta que no se pueden mezclar consultas de tipo EDA y Arbol en un mismo informe. */
  private setPanelsQueryMode(): void {
    const treeQueryMode = this.panels.some((p) => p.content?.query?.query?.queryMode === 'EDA2');
    const standardQueryMode = this.panels.some((p) => p.content?.query?.query?.queryMode === 'EDA');

    for (const panel of this.edaPanels) {
      if (treeQueryMode) {
        panel.queryModes = [
          { label: $localize`:@@PanelModeSelectorTree:Modo Árbol`, value: 'EDA2' },
          { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
        ];
        panel.selectedQueryMode = 'EDA2';
      } else if (standardQueryMode) {
        panel.queryModes = [
          { label: $localize`:@@PanelModeSelectorEDA:Modo EDA`, value: 'EDA' },
          { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
        ];
      }
      if (((!standardQueryMode && !treeQueryMode) || this.edaPanels.length === 1) && this.globalFilter.globalFilters.length === 0) {
        panel.queryModes = [
          { label: $localize`:@@PanelModeSelectorEDA:Modo EDA`, value: 'EDA' },
          { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
          { label: $localize`:@@PanelModeSelectorTree:Modo Árbol`, value: 'EDA2' }
        ];
      }
    }
  }

  refreshPanels() {
    this.edaPanels.forEach(async (panel) => {
      if (panel.currentQuery.length > 0) {
        panel.display_v.chart = '';
        await panel.runQueryFromDashboard(true);
        setTimeout(() => panel.panelChart?.updateComponent(), 100);
      }
    });
    
    // LiveDashboardTimer
    let isvalid = true;
    const emptyQuery = this.edaPanels.some((panel) => panel.currentQuery.length === 0);


      if (emptyQuery) isvalid = false;

      if (!isvalid) {
        this.alertService.addError($localize`:@@SaveWarningTittle:Solo puedes guardar cuando todos los paneles están configurados`)
      }else{
        
        
            this.triggerTimer();
            const body = {
              config: {
                title: this.title,
                panel: [],
                ds: { _id: this.dataSource._id },
                filters: this.cleanFiltersData(),
                applyToAllfilter: this.applyToAllfilter,
                visible: this.dashboard.config.visible,
                tag: this.selectedTags,
                refreshTime: (this.dashboard.config.refreshTime > 5) ? this.dashboard.config.refreshTime : this.dashboard.config.refreshTime ? 5 : null,
                clickFiltersEnabled: this.dashboard.config.clickFiltersEnabled,
                // mailingAlertsEnabled: this.getMailingAlertsEnabled(),
                sendViaMailConfig: this.dashboard.config.sendViaMailConfig || this.sendViaMailConfig, 
                onlyIcanEdit: this.dashboard.config.onlyIcanEdit, //Ssólo yo puedo editar el dashboard --> publico con enlace
                styles: this.dashboard.config.styles,
                urls: this.dashboard.config.urls,
                author: this.dashboard.config?.author
              },
              group: this.dashboard.group ? _.map(this.dashboard.group) : undefined,
            }
        
            body.config.panel = this.savePanels();
          }

  }

  // Metodo a revisar, este solo refresh a los paneles que no son js
  refreshPanelsOthersCharts() {
    this.edaPanels.forEach(async (panel) => {
        if (panel.currentQuery.length > 0) {
            const chartType = panel.graphicType;
            const isChartJS = ['doughnut', 'polarArea', 'bar', 'horizontalBar', 'line', 'area', 'barline', 'histogram', 'pyramid', 'radar', 'knob'].includes(chartType);
            
            // Solo re-ejecutar query para charts NO ChartJS
            if (!isChartJS) {
                panel.display_v.chart = '';
                await panel.runQueryFromDashboard(true);
            } 
            
            // Siempre llamar a updateComponent para aplicar nuevos colores
            setTimeout(() => panel.panelChart?.updateComponent(), 100);
        }
    });
    
    // LiveDashboardTimer
    let isvalid = true;
    const emptyQuery = this.edaPanels.some((panel) => panel.currentQuery.length === 0);

    if (emptyQuery) isvalid = false;

    if (!isvalid) {
        this.alertService.addError($localize`:@@SaveWarningTittle:Solo puedes guardar cuando todos los paneles están configurados`)
    } else {
        this.triggerTimer();
        const body = {
            config: {
                title: this.title,
                panel: [],
                ds: { _id: this.dataSource._id },
                filters: this.cleanFiltersData(),
                applyToAllfilter: this.applyToAllfilter,
                visible: this.dashboard.config.visible,
                tag: this.selectedTags,
                refreshTime: (this.dashboard.config.refreshTime > 5) ? this.dashboard.config.refreshTime : this.dashboard.config.refreshTime ? 5 : null,
                clickFiltersEnabled: this.dashboard.config.clickFiltersEnabled,
                sendViaMailConfig: this.dashboard.config.sendViaMailConfig || this.sendViaMailConfig, 
                onlyIcanEdit: this.dashboard.config.onlyIcanEdit,
                styles: this.dashboard.config.styles,
                urls: this.dashboard.config.urls,
                author: this.dashboard.config?.author
            },
            group: this.dashboard.group ? _.map(this.dashboard.group) : undefined,
        }
    
        body.config.panel = this.savePanels();
    }
}


  public async saveDashboard() {
    // LiveDashboardTimer
    let isvalid = true;
    const emptyQuery = this.edaPanels.some((panel) => panel.currentQuery.length === 0);



      if (emptyQuery) isvalid = false;

      if (!isvalid) {
        this.alertService.addError($localize`:@@SaveWarningTittle:Solo puedes guardar cuando todos los paneles están configurados`)
      }else{
        
        
            this.triggerTimer();
            const body = {
              config: {
                title: this.title,
                panel: [],
                ds: { _id: this.dataSource._id },
                filters: this.cleanFiltersData(),
                applyToAllfilter: this.applyToAllfilter,
                visible: this.dashboard.config.visible,
                tag: this.selectedTags,
                refreshTime: (this.dashboard.config.refreshTime > 5) ? this.dashboard.config.refreshTime : this.dashboard.config.refreshTime ? 5 : null,
                clickFiltersEnabled: this.dashboard.config.clickFiltersEnabled,
                createdAt: this.dashboard.config.createdAt || new Date().toISOString(),
                modifiedAt: new Date().toISOString(),
                // mailingAlertsEnabled: this.getMailingAlertsEnabled(),
                sendViaMailConfig: this.dashboard.config.sendViaMailConfig || this.sendViaMailConfig, 
                onlyIcanEdit: this.dashboard.config.onlyIcanEdit, // NO puedo Editar dashboard --> publico con enlace
                styles: this.dashboard.config.styles,
                urls: this.dashboard.config.urls,
                author: this.dashboard.config?.author,
                orderDependentFilters: this.globalFilter?.orderDependentFilters,
              },
              group: this.dashboard.group ? _.map(this.dashboard.group) : undefined,
            }
        
            body.config.panel = this.savePanels();

            try {
              await lastValueFrom(this.dashboardService.updateDashboard(this.dashboardId, body));
              this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
              this.dashboardService._notSaved.next(false);
            } catch (err) {
              this.alertService.addError(err);
              throw err;
            }
      }
      this.checkImportedPanels(this.dashboard);
  }

  private savePanels(): any[] {
    // Each EdaBlankPanel component save method
    this.edaPanels.forEach(panel => { panel.savePanel(); });

    const _panels = JSON.parse(JSON.stringify(this.panels));

    for (const panel of _panels) {
      const dashboardId = panel.dashboard?._id;
    }

    return _panels;
  }

  public cleanFiltersData() {
    const filtersCleaned = [];

    for (const _globalFilter of this.globalFilter?.globalFilters) {
      const globalFilter = _.cloneDeep(_globalFilter);

      delete (globalFilter.isnew);

      if (globalFilter.pathList) {
        for (const key in globalFilter.ist) {
          const selectedTableNodes = globalFilter.pathList[key].selectedTableNodes;
          delete (selectedTableNodes.parent);
        }
      }

      if (globalFilter.selectedTable) {
        delete (globalFilter.selectedTable.columns);
      }

      globalFilter.data = null;
      filtersCleaned.push(globalFilter);
    }

    return filtersCleaned;
  }

private countdownInterval: any;

public startCountdown(seconds: number) {

  if (this.dashboard.config.stopRefresh) return;

  let counter = seconds;

  // Evita intervalos duplicados
  clearInterval(this.countdownInterval);
  this.countdownInterval = setInterval(() => {
    if (this.dashboard.config.stopRefresh) {
      clearInterval(this.countdownInterval);
      return;
    }    
    counter--; 
    if (counter < 0) {
      this.onResetWidgets();
      counter = seconds; // Cambio de recursividad a contador
    }
  }, 1000);
}

  public onResetWidgets(): void {
    // Get the queries in the dashboard for delete it from cache
    const queries = [];
    this.panels.forEach( p=> {
            if(p.content  !== undefined && p.content.query  !== undefined && p.content.query.query  !== undefined){
                queries.push( p.content.query.query );
            }
        });
    let body =
    {
        model_id: this.dataSource._id,
        queries: queries
    }

    this.dashboardService.cleanCache(body).subscribe(
        res => {
            this.loadDashboard();
            this.dashboardService._notSaved.next(false);
        },
        err => console.log(err)
    )
  }

  triggerTimer() {

    // Si hay tiempo config lo paramos
    this.dashboard.config.stopRefresh = true;
    clearInterval(this.countdownInterval);

    //Give time to stop counter if any
    setTimeout(() => {
        const refreshTime = this.dashboard.config.refreshTime;
        // si no hay tiempo de refresh, no lanzamos el contador
        if (!refreshTime) {
            this.dashboard.config.stopRefresh = true;
            return;
        }
        // si el tiempo de refresh es menor a 5 segundos, lo ponemos a 5 segundos         if (refreshTime < 5) this.dashboard.config.refreshTime = 5;
        this.dashboard.config.stopRefresh = false;
        // lanzamos el contador
        this.startCountdown(this.dashboard.config.refreshTime);
    }, 2000);
  }

  public validateDashboard(action: string): boolean {
    let isvalid = true;

    if (action == 'GLOBALFILTER') {
      const emptyQuery = this.edaPanels.some((panel) => panel.currentQuery.length === 0);
      if (emptyQuery) isvalid = false;

      if (!isvalid) {
        this.alertService.addError($localize`:@@AddFiltersWarningTittle:Solo puedes añadir filtros cuando todos los paneles están configurados`)
      }
    }

    return isvalid;
  }

  public getCorrectColumnFiltered(event): string {
    const chartType = event.data?.panel?.content?.chart;
    const edaChart = event.data?.panel?.content?.edaChart;
    const queries = event.data?.query || [];
    const filterBy = event.data?.filterBy;
    if (['doughnut', 'polarArea', 'bar', 'line', 'radar'].includes(chartType)) {
      if (edaChart === 'stackedbar100') {
        // Para stackedbar100, un label es un valor, no una columna de la tabla, no puede ser filterby.
        // La ultima columna de texto es el valor que buscamos
        const textColumns = queries.filter(q => q.column_type === 'text');
        // si hay dos columnas de texto, la segunda es el valor, si no, la primera(y unica) es el valor
        return textColumns.length > 1 ? textColumns[1] : textColumns[0];
      }
      const queryFiltered = queries.find(q => q.display_name?.default === filterBy);
      if (queryFiltered?.column_type === 'numeric') {
        return queries.find(q => q.column_type === 'text');
      }
      else if (event.data.query.length > 2) // Si la query tiene más de dos valores en barras, necesitamos redefinir el filterBy
        return event.data.query.find((query: any) => query?.display_name?.default === event.data.query[0].display_name.default);
      else
        return event.data.query.find((query: any) => query?.display_name?.default === event.data.filterBy);
    }
    else if (['table', 'crosstable', 'treetable'].includes(event.data.panel.content.chart)) {
      return event.data.query.find((query: any) => query?.column_name === event.data.filterBy);
    }
    else {
      //Si el evento es de un chart de la libreria D3Chart o Leaflet
        return event.data.query.find((query: any) => query?.column_name?.localeCompare(event.data.filterBy, undefined, { sensitivity: 'base' }) === 0);    
//        return event.data.query.find((query: any) => query?.display_name?.default.localeCompare(event.data.filterBy, undefined, { sensitivity: 'base' }) === 0);    
    }
  }
  
  //----------------------------------------//
  //--Revisar si es necesario o se puede eliminar--//
  // Obtiene el item que se encuentra en la parte más inferior del gridster -- Revisar si es necesario
  getBottomMostItem(): GridsterItem | undefined {
      let bottomMostItem: GridsterItem | undefined;
      let maxBottom = -1; // Inicializamos con un valor bajo

      for (let item of this.panels) {
          // Calculamos la posición final en Y (bottom) del ítem
          const bottom = item.y + item.rows;
  
          // Si el ítem actual es más bajo, lo actualizamos
          if (bottom > maxBottom) {
          maxBottom = bottom;
          bottomMostItem = item;
          }
      }
      return bottomMostItem; // El item de la posición mas inferior de todo el gridster
  }

  // Función que cambia el valor de la altura del gridster cada vez que hay un cambio en el elemento
  onItemChange(item: GridsterItem): void {
    if (this.panels) {
      let valor = this.getBottomMostItem();
      this.height = ((valor.y + valor.rows  + 4 ) * 50);
      this.cdr.detectChanges();
    } 
  }


  private getUrlParams(): void {
    this.route.queryParams.subscribe(params => {
      this.queryParams = params;
      try{
        if(params['hideWheel'] == 'true'){
          this.hideWheel =true;
        }
        if(params['panelMode'] == 'true'){
          this.panelMode =true;
          this.hideWheel =true;
        }
        if (params['cnproperties']) {
          this.connectionProperties = JSON.parse(decodeURIComponent(params['cnproperties'])); 
        }
        
      } catch(e){
        console.error('getUrlParams: '+ e);
      }
    });
  }


// Función para detectar el filtro clicado
  private getChartClicked(f: any, tableName: string, columnName: string, label?: any): boolean {
    const norm = (val: any) => val?.toString()?.normalize("NFD")?.replace(/[\u0300-\u036f]/g, "")?.toLowerCase()?.trim();

    const newTable = norm(f.selectedTable?.table_name);
    const newColumn = norm(f.selectedColumn?.column_name);
    const oldTable = norm(f.table?.value);
    const oldColumn = norm(f.column?.value?.column_name);

    const targetTable = norm(tableName);
    const targetColumn = norm(columnName);

    const tableMatch = newTable === targetTable || oldTable === targetTable;
    const columnMatch = newColumn === targetColumn || oldColumn === targetColumn;

    // Si no se proporciona label, solo verificar tabla y columna
    if (!label) {
      return tableMatch && columnMatch;
    }

    // Si se proporciona label, también verificar que coincida
    const targetLabel = norm(label);
    let labelMatch = false;

    if (Array.isArray(f.selectedItems)) {
      f.selectedItems.forEach((item) => {
        const normItem = norm(item);
        if (normItem === targetLabel) {
          labelMatch = true;
        }
      });
    }
    return tableMatch && columnMatch && labelMatch;
  }
}