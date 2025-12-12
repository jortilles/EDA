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
import { DashboardSidebarComponent } from '../components/dashboard-sidebar/dashboard-sidebar.component';
import { GlobalFilterV2Component } from '../components/global-filter/global-filter.component';
import { EdaBlankPanelComponent, IPanelAction } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { ComponentsModule } from '@eda/components/components.module';
import { FormsModule } from '@angular/forms';
import { FocusOnShowDirective } from '@eda/shared/directives/autofocus.directive';
import { CommonModule } from '@angular/common';
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { DashboardSidebarService } from '@eda/services/shared/dashboard-sidebar.service';

@Component({
  selector: 'app-v2-dashboard-page',
  standalone: true,
  imports: [FormsModule, GridsterComponent, GridsterItemComponent, DashboardSidebarComponent, GlobalFilterV2Component, ComponentsModule, ButtonModule, DropdownModule, MenuModule, MessageModule, FocusOnShowDirective,CommonModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class DashboardPageV2 implements OnInit {
  @ViewChild(DashboardSidebarComponent) sidebar!: DashboardSidebarComponent;
  @ViewChild(GlobalFilterV2Component) globalFilter: GlobalFilterV2Component;
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
    const cellSize = Math.floor(width / cols);

    this.gridsterOptions.fixedRowHeight = cellSize;
    this.gridsterOptions.api?.optionsChanged();
  }

  public async loadDashboard() {
    const dashboardId = this.route.snapshot.paramMap.get('id');
    const data = await lastValueFrom(this.dashboardService.getDashboard(dashboardId));
    const dashboard = data.dashboard;
    this.dataSource = data.datasource;
    if (dashboard?.config) {
      this.onlyIcanEdit = dashboard.config.visible !== 'public'
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
      // me.tags = me.tags.filter(tag => tag.value !== 0); //treiem del seleccionador de tags el valor "sense etiqueta"
      // me.tags = me.tags.filter(tag => tag.value !== 1); //treiem del seleccionador de tags el valor "tots"

      this.selectedTags = this.dashboard.config.tag;
      //this.onlyIcanEdit = this.dashboard.config.onlyIcanEdit;
    }

    // Estableix els permisos d'edició i propietat...
    // this.setEditMode();
    // // Check dashboard owner
      //TODO
    // this.checkVisibility(res.dashboard);
    // me.setDashboardCreator(res.dashboard);
    // me.dataSource = res.datasource; // DataSource del dashboard
    // me.datasourceName = res.datasource.name;
    // me.form.controls['visible'].setValue(config.visible);

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
    //Check de modo
    let modeEDA = false;
    const panel = event?.data?.panel
    
    // Check de filtros en click habilitados
    const filtersEnabled: boolean = this.dashboard.config.clickFiltersEnabled;
    
    // Check si el panel es importado
    const isImportedPanel: boolean = panel?.globalFilterMap;

    if (panel) {
      modeEDA = !event?.data.panel.content?.query?.query.modeSQL &&
        (!event?.data.panel.content.query.query.queryMode || event?.data.panel.content.query.query.queryMode === 'EDA')
    }
    //Si es modo arbol o SQL no aplica filtros
    if (modeEDA && event.code === "ADDFILTER" && this.validateDashboard('GLOBALFILTER') && filtersEnabled && !isImportedPanel) {
      this.alertService.addSuccess($localize`:@@filteredReportMessage:Por favor, espera un momento mientras procesamos la selección.`);
      const data = event?.data;
      const panel = event?.data?.panel;
      let column: any;
      column = this.getCorrectColumnFiltered(event)
      const table = this.dataSource.model.tables.find((table: any) => table.table_name === column?.table_id);
      if (column && table) {
        this.edaPanels.forEach(panel => {
          if (panel.panelChart) panel.panelChart.updateComponent();
        });
        let config = this.setPanelsToFilter(panel);
        let anyChartToRemove: boolean;

        //TENEMOS ALGUN FILTRO APLICADO EN LOS FILTROS GLOBALES DEL DASHBOARD
        if (this.globalFilter.globalFilters && this.globalFilter.globalFilters.length > 0) {

          //Buscamos si hay un filtro que existe igual al que acabamos de clicar, y de la misma tabla
          let chartToRemove = this.globalFilter.globalFilters.find(f =>
            this.getChartClicked(f, table.table_name, column.column_name, data.label) && f.panelList.includes(panel.content.query.dashboard.panel_id)
          );
          anyChartToRemove = !!chartToRemove; // true si encontró algún chart

          // Control origen de los datos 
          let filterName = chartToRemove?.column?.label ?? chartToRemove?.selectedColumn?.colum ?? "default";

          // Comprobamos si el filtro que queremos crear ya esta aplicado en el chart
          let makeNewFilter: boolean = this.isFilterAppliedToChart(anyChartToRemove, data);

          // EL FILTRO CON EL QUE QUEREMOS TRABAJAR EXISTE
          if (chartToRemove) {
            if (makeNewFilter) {
              // Creamos un filtro nuevo con from chart true
              this.chartFilter = this.createChartFilter(table, column, data.label, config);
              // Control de filtros para filtros parciales
              data.panel.content.query.query?.filters.push(this.createChartFilter(table, column, data.label, config))

              //Añadimos filtros nuevos
              try {
                await this.globalFilter.onGlobalFilterAuto(this.chartFilter, table.table_name);
              }
              catch (error) { }
            }

            else if (chartToRemove.selectedItems.length === 1) { // TENEMOS SOLO UN VALOR ACTUAL EN EL FILTRO
              const existingFilter = this.lastMultipleFilters.find(f => f.filterName === filterName);// Buscar si existe auxiliarmente en lastMultipleFilters
              if (existingFilter) { this.recoverDynamicFilter(chartToRemove, existingFilter, filterName); }// Si el filtro esta en lastMultipleFilters, lo recuperamos
              else { this.deleteDynamicFilter(chartToRemove, table, filterName); }// Si no esta en lastMultipleFilters, lo borramos
            }

            else { // TENEMOS MAS DE UN VALOR ACTUAL EN EL FILTRO
              // GUARDAMOS EL ORIGINAL EN LASTMULTIPLEFILTERS
              this.lastMultipleFilters.push({
                filterName: filterName,
                filter: { ...chartToRemove }
              });

              // Filtramos el valor clicado
              chartToRemove.selectedItems = chartToRemove.selectedItems.filter((item) => item === data.label);
              this.globalFilter.applyGlobalFilter(chartToRemove);
            }

            // Actualizamos global filter
            this.reloadOnGlobalFilter();
          }
          // EL FILTRO CON EL QUE QUEREMOS TRABAJAR NO EXISTE
          else {
            //CREAMOS NUEVO FILTRO EN CHART
            //Recuperamos filtros activos del global filter
            let actualFilter = this.globalFilter.globalFilters.filter(
              (f) => f.table?.value === table.table_name && f.column?.value.column_name === column.column_name
            )[0];
            if (actualFilter) {
              //Si last filters no tiene uno con la misma label lo guardamos
              if (!this.lastFilters.includes(actualFilter)) {
                this.lastFilters.push({ filterName: actualFilter.column.label, filter: actualFilter });
              } else {
                //Si label es igual lo remplazamos
                if (this.lastFilters.includes(actualFilter.column.label)) {
                  let filterToRemoveIndx = this.lastFilters.findIndex(element => element.filterName === actualFilter.column.label)
                  this.lastFilters.splice(filterToRemoveIndx, 1);
                  this.lastFilters.push(({ filterName: actualFilter.column.label, filter: actualFilter }));
                }
              }
            }

            // Creamos un filtro nuevo con from chart true
            this.chartFilter = this.createChartFilter(table, column, data.label, config);
            // Control de filtros para filtros parciales
            data.panel.content.query.query?.filters.push(this.createChartFilter(table, column, data.label, config))

            //Borramos filtros activos del global filter, pero los mantenemos guardados
            for (const element of this.lastFilters) {
              this.globalFilter.removeGlobalFilter(element.filter, true);
            }
            //Añadimos filtros nuevos
            try {
              await this.globalFilter.onGlobalFilterAuto(this.chartFilter, table.table_name);
              this.reloadOnGlobalFilter();
            }
            catch (error) {
              console.log(error)
            }
          }
        }

        // NO TENEMOS NINGUN FILTRO APLICADO EN LOS FILTROS GLOBALES DEL DASHBOARD
        else {
          // Creamos un filtro nuevo con from chart true
          this.chartFilter = this.createChartFilter(table, column, data.label, config);
          // Control de filtros para filtros parciales
          data.panel.content.query.query?.filters.push(this.createChartFilter(table, column, data.label, config))

          // Esperamos a que se apliquen los filtros, para luego recargar el global filter
          await this.globalFilter.onGlobalFilterAuto(this.chartFilter, table.table_name);
          this.reloadOnGlobalFilter();
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

  createChartFilter(table: any, column: any, dataLabel: string, config: any): any {
    return {
        id: `${table.table_name}_${column.column_name}`,
        isGlobal: true,
        isAutocompleted: config.isAutocompleted ?? false,
        applyToAll: config.applyToAll ?? true,
        panelList: config.panelList.map((p) => p.id),
        table: { label: table.display_name.default, value: table.table_name },
        column: { label: column.display_name.default, value: column },
        selectedItems: [dataLabel],
        fromChart: true
    };
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
          else this.refreshPanels();
        }, 500);
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
                onlyIcanEdit: this.dashboard.config.onlyIcanEdit, // NO puedo Editar dashboard --> publico con enlace
                styles: this.dashboard.config.styles,
                urls: this.dashboard.config.urls,
                author: this.dashboard.config?.author
              },
              group: this.dashboard.group ? _.map(this.dashboard.group) : undefined,
            }
        
            body.config.panel = this.savePanels();
          }

  }

  isEditable(): boolean {
    return this.dashboard.dashboard.config.isEditable
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

    this.stopRefresh = !this.stopRefresh;

    //Give time to stop counter if any
    setTimeout(() => {
        if (!this.refreshTime) this.stopRefresh = true;
        else if (this.refreshTime) this.stopRefresh = false;

        if (this.refreshTime && this.refreshTime < 5) this.refreshTime = 5;

        this.startCountdown(this.refreshTime);

    }, 2000)

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
    const queries = event.data?.query || [];
    const filterBy = event.data?.filterBy;
    if (['doughnut', 'polarArea', 'bar', 'line', 'radar'].includes(chartType)) {
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
      this.height = ((valor.y + valor.rows + 2) * 32);
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


// --- Función para detectar el filtro clicado ---
private getChartClicked(f: any, tableName: string, columnName: string, label: any): boolean {
  const norm = (val: any) =>
    val?.toString()
      ?.normalize("NFD")
      ?.replace(/[\u0300-\u036f]/g, "")
      ?.toLowerCase()
      ?.trim();

  const newTable = norm(f.selectedTable?.table_name);
  const newColumn = norm(f.selectedColumn?.column_name);
  const oldTable = norm(f.table?.value);
  const oldColumn = norm(f.column?.value?.column_name);

  const targetTable = norm(tableName);
  const targetColumn = norm(columnName);
  const targetLabel = norm(label);

  const tableMatch = newTable === targetTable || oldTable === targetTable;
  const columnMatch = newColumn === targetColumn || oldColumn === targetColumn;

  let labelMatch = false;



  if (Array.isArray(f.selectedItems)) {
    f.selectedItems.forEach((item, i) => {
      const normItem = norm(item);
      const includes = normItem?.includes(targetLabel);
      if (includes) labelMatch = true;
    });
  } 

  return tableMatch && columnMatch && labelMatch;
}

}