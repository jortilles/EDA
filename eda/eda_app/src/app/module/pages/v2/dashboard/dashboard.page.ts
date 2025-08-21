import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { MenuModule } from 'primeng/menu';
import { MessageModule } from 'primeng/message';
import { CompactType, DisplayGrid, GridsterComponent, GridsterConfig, GridsterItem, GridsterItemComponent, GridType } from 'angular-gridster2';
import { AlertService, DashboardService, FileUtiles, GlobalFiltersService, StyleProviderService, IGroup, DashboardStyles, ChartUtilsService } from '@eda/services/service.index';
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

  public title: string = $localize`:@@loading:Cargando informe...`;
  public styles: DashboardStyles;
  public gridsterOptions: GridsterConfig;
  public gridsterDashboard: GridsterItem[];
  
  public reportTitle: any;
  public reportPanel: any;
  public backgroundColor: any;
  public panelTitle: any;
  public panelContent: any;
  public availableChatGpt: any = false;

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
  public stopRefresh: boolean = false;


  //Filter control variables
  public lastFilters: any[] = [];
  public chartFilter: any;

  public applyToAllfilter: {
    present: boolean,
    refferenceTable: string,
    id: string
  };

  public urls: any[] = [];
  public sendViaMailConfig: any = {
    enabled: false
  };

  public selectedTags: any[] = [];

  constructor(public chatgptService: ChatgptService) {

  }

  ngOnInit(): void {
    this.initGridsterOptions();
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

  ngOnDestroy() {
    // Poner estilos como predefinidios
    this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles())
  }



  
  
  private initGridsterOptions(): void {
    this.gridsterOptions = {
      gridType: GridType.VerticalFixed, // Configuración general del Gridster : permite scroll vertical y los items generados son de tamaño fijo.
      compactType: CompactType.None, // Controla la configuración de compactar en el gridster
      displayGrid: DisplayGrid.OnDragAndResize, // Permite configurar la rejilla del gridster
      pushItems: true, // Hace que los elementos se reorganicen automáticamente
      avoidOverlapped: true, // Asegura que no haya solapamientos
      swap: true,
      draggable: {
        enabled: true,
      },
      resizable: {
        enabled: true,
      },
      minCols: 40,
      maxCols: 40,
      minRows: 30, // Se puede optimizar para diferentes pantallas, aún así, con 30 funciona bien
      maxRows: 300,
      margin: 2, // Reduce el margen entre celdas
      fixedRowHeight: 30, // Reduce el tamaño de la altura de las filas
      fixedColWidth: 50, // Ajusta también el ancho de las columnas
      disableScrollHorizontal: true, // Desactiva scroll horizontal si es necesario
      disableScrollVertical: true, // Desactiva scroll vertical si es necesario
      itemChangeCallback: (item: GridsterItem) => this.onItemChange(item),
      itemResizeCallback: (item: GridsterItem) => this.onItemChange(item)
    };
  }

  public async loadDashboard() {
    const dashboardId = this.route.snapshot.paramMap.get('id');
    const data = await lastValueFrom(this.dashboardService.getDashboard(dashboardId));
    const dashboard = data.dashboard;
    this.dataSource = data.datasource;


    if (dashboard?.config) {
      this.dashboardId = dashboardId;
      this.dashboard = dashboard;
      this.title = dashboard.config.title;
      this.applyToAllfilter = dashboard.config.applyToAllfilter || { present: false, refferenceTable: null, id: null };
      this.globalFilter?.initGlobalFilters(dashboard.config.filters || []);// Filtres del dashboard
      this.initPanels(dashboard);
      this.styles = dashboard.config.styles || this.stylesProviderService.generateDefaultStyles();
      //this.chartUtils.MyPaletteColors = this.styles?.palette['paleta'] || [];
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
      // me.selectedTags = me.selectedTagsForDashboard(me.tags, config.tag)
      // me.refreshTime = config.refreshTime;
      // me.onlyIcanEdit = config.onlyIcanEdit;
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

  }

  // Método que asigna los estilos
  public assignStyles() {
    // Panel del título del informe    
    this.reportPanel = {
      height: 'auto',
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

  // Función que cambia el valor de la altura del gridster cada vez que hay un cambio en el elemento
  onItemChange(item: GridsterItem): void {
    //console.log('Cambio en el Item:', item);
    // console.log('Todos los valores => Dashboard:', this.dashboard);

    // let valor = this.getBottomMostItem();
    // console.log('El menor valor: ', valor);
    // this.height = (valor.y + valor.rows + 4) * 32;
  }

  showSidebar(event: Event) {
    if (this.sidebar) {
      this.sidebar.showPopover(event);
    }
  }

  onRemovePanel(panel: any) {
    this.panels.splice(_.findIndex(this.panels, { id: panel }), 1);

    for (const filter of this.globalFilter.globalFilters) {
      filter.panelList = filter.panelList.filter((id: string) => id !== panel);
    }

    // TODO ??
    // let valor = this.getBottomMostItem();
    // console.log('El menor valor: ', valor);
    // this.height = (valor.y + valor.rows + 4) * 32;
  }

  public reloadOnGlobalFilter(): void {
    //not saved alert message
    this.dashboardService._notSaved.next(true);

    // Simula el click en el btn
    setTimeout(() => {
        let btn = document.getElementById('dashFilterBtn');
        if (btn) btn.click();
        else this.reloadPanels();
    }, 500);
  }
  
  public reloadPanels(): void {
    this.edaPanels.forEach(async (panel) => {
      if (panel.currentQuery.length !== 0) {
        panel.display_v.chart = '';
        await panel.runQueryFromDashboard(true);
        panel.panelChart.updateComponent();
      }
    });
}


  // TODO unificar onRemovePanel(),onDuplicatePanel() a onPanelAction()
  // TODO simplificar
  public async onPanelAction(event: IPanelAction): Promise<void> {
    //Check de modo
    let modeEDA = false;
    if (event?.data?.panel) {
      modeEDA = !event?.data.panel.content.query.query.modeSQL &&
      (!event?.data.panel.content.query.query.queryMode || event?.data.panel.content.query.query.queryMode === 'EDA')
    }

    //Si es modo arbol o SQL no aplica filtros
    if (modeEDA && event.code === "ADDFILTER") {


      const data = event?.data;
      const panel = event?.data?.panel;
      let column: any;
      column = this.getCorrectColumnFiltered(event)

      const table = this.dataSource.model.tables.find((table: any) => table.table_name === column?.table_id);
      if (column && table) {
        let config = this.setPanelsToFilter(panel);
        //TENEMOS ALGUN FILTRO APLICADO EN LOS FILTROS GLOBALES DEL DASHBOARD
        if (this.globalFilter.globalFilters) {
          //Buscamos si hay un filtro que existe igual al que acabamos de clicar, y de la misma tabla, si lo hay, hay que borrarlo
          let chartToRemove = this.globalFilter.globalFilters.find(
            (f) => f.table?.value === table.table_name && f.column?.value?.column_name === column.column_name &&
            f.selectedItems.includes(event?.data.label) && f.selectedItems.length === 1 && f.hasOwnProperty("fromChart")
          );
          if (chartToRemove) {
            let filterToAddIndx = this.lastFilters.findIndex(element => element.filterName === chartToRemove.column.label &&
              element.filter.table.label === chartToRemove.table.label)
              // Borramos del global filter el filtro a borrar fromChart
              this.globalFilter.removeGlobalFilterOnClick(chartToRemove, true);            
              // Recuperamos el filtro correspondiente y lo eliminamos de los filtros guardados
              if (filterToAddIndx !== -1 ) { 
                await this.globalFilter.onGlobalFilterAuto(this.lastFilters[filterToAddIndx].filter, table.table_name)
                this.lastFilters.splice(filterToAddIndx, 1);
              }
            
            // Actualizamos global filter
              this.reloadOnGlobalFilter(); 
          } else {
            //CREAMOS NUEVO FILTRO EN CHART
            //Recuperamos filtros activos del global filter
            let actualFilter = this.globalFilter.globalFilters.filter(
              (f) =>f.table?.value === table.table_name && f.column?.value.column_name === column.column_name
            )[0];
            if (actualFilter) {
              //Si last filters no tiene uno con la misma label lo guardamos
              if (!this.lastFilters.includes(actualFilter)) {
                this.lastFilters.push({filterName: actualFilter.column.label, filter: actualFilter});
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
            this.chartFilter = {
              id: `${table.table_name}_${column.column_name}`, //this.fileUtils.generateUUID(),
              isGlobal: true,
              applyToAll: config.applyToAll,
              panelList: config.panelList.map((p) => p.id),
              table: {label: table.display_name.default,value: table.table_name,},
              column: {label: column.display_name.default,value: column,},
              selectedItems: [data.label], // valor del chart que hemos clicado
              fromChart: true, //fromChart = true indica que se ha creado mediante un click
            };
            
            //Borramos filtros activos del global filter, pero los mantenemos guardados
            this.lastFilters.forEach((element) => { this.globalFilter.removeGlobalFilter(element.filter, true);});
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
            this.chartFilter = {
              id: `${table.table_name}_${column.column_name}`, //this.fileUtils.generateUUID(),
              isGlobal: true,
              applyToAll: config.applyToAll,
              panelList: config.panelList.map((p) => p.id),
              table: { label: table.display_name.default, value: table.table_name,},
              column: { label: column.display_name.default, value: column },
              selectedItems: [data.label], // valor del chart que hemos clicado
              fromChart: true, //fromChart = true indica que se ha creado mediante un click
          };
          // Esperamos a que se apliquen los filtros, para luego recargar el global filter
          await this.globalFilter.onGlobalFilterAuto(this.chartFilter,table.table_name);
          this.reloadOnGlobalFilter();
        }
      }
    } else if (event.code === "QUERYMODE") {
      this.setPanelsQueryMode();
    } else if (event.code === 'MAPFILTERS') {
      this.onMapFilters();
    }
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

  public onDuplicatePanel(panel: any) {
    this.panels.push(panel);
    this.dashboardService._notSaved.next(true);
  }

  // TODO revisar funcion (al hacer click en un grafico este deberia añadir un global filter al dashboard)
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
      } else if (standardQueryMode) {
        panel.queryModes = [
          { label: $localize`:@@PanelModeSelectorEDA:Modo EDA`, value: 'EDA' },
          { label: $localize`:@@PanelModeSelectorSQL:Modo SQL`, value: 'SQL' },
        ];
      }

      if ((!standardQueryMode && !treeQueryMode) || this.edaPanels.length === 1) {
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
        setTimeout(() => panel.panelChart.updateComponent(), 100);
      }
    });

  }

  isEditable(): boolean {
    // TODO check is editable
    return true;
  }

  public async saveDashboard() {
    // LiveDashboardTimer
    this.triggerTimer();
    const body = {
      config: {
        title: this.title,
        panel: [],
        ds: { _id: this.dataSource._id },
        filters: this.cleanFiltersData(),
        applyToAllfilter: this.applyToAllfilter,
        visible: this.dashboard.config.visible,
        // tag: this.saveTag(),
        refreshTime: (this.dashboard.config.refreshTime > 5) ? this.dashboard.config.refreshTime : this.dashboard.config.refreshTime ? 5 : null,
        // mailingAlertsEnabled: this.getMailingAlertsEnabled(),
        // sendViaMailConfig: this.sendViaMailConfig,
        onlyIcanEdit: this.onlyIcanEdit,
        styles: this.dashboard.config.styles,
        urls: this.dashboard.config.urls,
        author: this.dashboard.config?.author
      },
      group: this.dashboard.group ? _.map(this.dashboard.group, '_id') : undefined,
    };


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

  private savePanels(): any[] {
    // Each EdaBlankPanel component save method
    this.edaPanels.forEach(panel => { panel.savePanel(); });

    const _panels = JSON.parse(JSON.stringify(this.panels));

    for (const panel of _panels) {
      const dashboardId = panel.dashboard?._id;

      // check if panel is imported from other Dashboard
      if (dashboardId && dashboardId != this.dashboardId) {
        // remove content from panel, only store panel references
        delete (panel.content);
      }
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
        // TODO
        // this.showSwalAlert({
        //   title: $localize`:@@AddFiltersWarningTittle:Solo puedes añadir filtros cuando todos los paneles están configurados`,
        //   text: $localize`:@@AddFiltersWarningText:Puedes borrar los paneles en blanco o configurarlos`,
        //   resolveBtnText: $localize`:@@AddFiltersWarningButton:Entendido`
        // });
      }
    }

    return isvalid;
  }

  public getCorrectColumnFiltered(event): string {
    if (['doughnut', 'polarArea', 'bar', 'line', 'radar',''].includes(event.data.panel.content.chart)) {  //Si el evento es de un chart de la libreria ng2Chart
      if (event.data.query.length > 2) // Si la query tiene más de dos valores en barras, necesitamos redefinir el filterBy
         return event.data.query.find((query: any) => query?.display_name?.default === event.data.query[0].display_name.default);
      else 
        return event.data.query.find((query: any) => query?.display_name?.default === event.data.filterBy);         
    }
    else if (['table','crosstable','treetable'].includes(event.data.panel.content.chart)) {
        return event.data.query.find((query: any) => query?.column_name === event.data.filterBy);  
    }
    else {
        //Si el evento es de un chart de la libreria D3Chart o Leaflet
        return event.data.query.find((query: any) => query?.display_name?.default.localeCompare(event.data.filterBy, undefined, { sensitivity: 'base' }) === 0);    
    }   
}

}