import { Component, OnInit, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { GridsterComponent, IGridsterOptions, IGridsterDraggableOptions } from 'angular2gridster';
import { ActivatedRoute } from '@angular/router';
import { Dashboard, Panel } from '@eda_models/model.index';
import { EdaBlankPanelComponent } from '@eda_components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { EdaDialogController, EdaDialogCloseEvent } from '@eda_shared/components/shared-components.index';
import { DashboardService, AlertService, FileUtiles, GlobalFiltersService, QueryBuilderService } from '@eda_services/service.index';
import * as _ from 'lodash';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
    // Gridster ViewChild
    @ViewChild(GridsterComponent, { static: false }) gridster: GridsterComponent;
    @ViewChildren(EdaBlankPanelComponent) edaPanels: QueryList<EdaBlankPanelComponent>;

    // Dashboard Page Variables
    public id: string;
    public title: string = 'Cargando dashboard...';
    public titleClick: boolean;
    public dataSource: any;
    public dashboard: Dashboard;

    public filterController: EdaDialogController;
    public applyToAllfilter: { present: boolean, refferenceTable: string, id: string };

    // Grid Global Variables
    public panels: Panel[] = [];
    public panelsCopy: Panel[] = [];
    public screen: number;
    public lanes: number = 40;
    public gridsterOptions: IGridsterOptions;
    public gridsterDraggableOptions: IGridsterDraggableOptions;
    public itemOptions = {
        maxWidth: 40,
        maxHeight: 200,
        minWidth: 10,
        minHeight: 8
    };

    /*-------------------------------- Global Filters options ------------------------------*/
    // Dialog
    public display_v = {
        minispinner: false, // mini spinner panel
        responsive: false, // responsive option
        rightSidebar: false // sidebar dashboard options
    };

    // Global filters vars
    public filtersList: Array<{ table, column, panelList, data, selectedItems, id, isGlobal, applyToAll }> = [];

    constructor(private dashboardService: DashboardService,
                private globalFiltersService: GlobalFiltersService,
                private queryBuilderService: QueryBuilderService,
                private fileUtiles: FileUtiles,
                private route: ActivatedRoute,
                private alertService: AlertService) {
        this.initGridsterOptions();
    }

    ngOnInit(): void {
        this.loadDashboard();
        // this.responsiveScreen();
    }

    setTitle(click: boolean) {
        this.titleClick = click;
    }

    initGridsterOptions() {
        this.gridsterOptions = {
            lanes: this.lanes,
            direction: 'vertical',
            floating: false,
            dragAndDrop: true,
            resizable: true,
            resizeHandles: {
                s: true,
                e: true,
                se: true
            },
            widthHeightRatio: 1,
            lines: {
                visible: true,
                color: '#dbdbdb',
                width: 1
            },
            tolerance: 'pointer',
            shrink: true,
            useCSSTransforms: true,
            responsiveView: true, // turn on adopting items sizes on window resize and enable responsiveOptions
            responsiveDebounce: 500, // window resize debounce time
            responsiveSizes: true
        };

        this.gridsterDraggableOptions = {
            handlerClass: 'panel-heading'
        };
    }

    loadDashboard() {
        const me = this;
        me.route.paramMap.subscribe(
            params => me.id = params.get('id'),
            err => me.alertService.addError(err)
        );

        if (me.id) {
            me.dashboardService.getDashboard(me.id).subscribe(
                res => {
                    /** res - retorna 2 objectes, el dashboard i el datasource per separat  */
                    const config = res.dashboard.config;
                    me.title = config.title; // Titul del dashboard, utilitzat per visualització
                    me.filtersList = !_.isNil(config.filters) ? config.filters : []; // Filtres del dashboard
                    me.dataSource = res.datasource; // DataSource del dashboard
                    me.applyToAllfilter = config.applyToAllfilter || { present: false, refferenceTable: null, id: null };

                    // Si el dashboard no te cap panel es crea un automatic
                    if (!res.dashboard.config.panel) {
                        me.panels.push(new Panel(me.fileUtiles.generateUUID(), 'Nuevo', 20, 10, true, true));
                        me.dashboard = new Dashboard(me.id, me.title, me.panels, res.dashboard.user, me.dataSource, [], { present: false, refferenceTable: null, id: null });
                    } else {
                        // Si te panels els carrega
                        me.dashboard = new Dashboard(me.id, me.title, config.panel, res.dashboard.user, me.dataSource, config.filters, me.applyToAllfilter);
                        me.panels = config.panel;
                    }
                    // Fem una copia de seguretat per en cas de desastre :D
                    me.panels.forEach(p => {
                        me.panelsCopy.push(p);
                    });
                },
                err => {
                    me.alertService.addError(err);
                }
            );
        } else {
            // Si accedicis a un dashboard sense cap ID saltaria error
            me.alertService.addError('Error al cargar el Dashboard');
        }
    }

    addWidget() {
        // Afegim un panel nou al dashboard buit, la posició s'assigna automaticament
        this.panels.push(new Panel(this.fileUtiles.generateUUID(), 'Nuevo', 20, 10, true, true));
    }

    onRemovePanel(panel) {
        this.panels.splice(_.findIndex(this.panels, { id: panel }), 1);
        this.filtersList.forEach(filter => {
            filter.panelList = filter.panelList.filter(id => id !== panel);
        });
    }

    resetWidgets() {
        // Netejem els canvis i utilitzem la última copia feta, per defecte sempre hi haura 1 panel
        this.panels = this.panelsCopy.map(panel => ({ ...panel }));
    }

    saveDashboard() {
        const config = {
            title: this.title,
            panel: this.dashboard.panel,
            ds: { _id: this.dataSource._id },
            filters: this.filtersList,
            applyToAllfilter: this.applyToAllfilter
        };

        this.edaPanels.forEach(panel => {
            panel.savePanel();
        });

        this.dashboardService.updateDashboard(this.id, config).subscribe(
            () => {
                this.display_v.rightSidebar = false;
                this.alertService.addSuccess(`Dashboard guardado correctamente`);
            },
            err => {
                this.display_v.rightSidebar = false;
                this.alertService.addError(err);
            }
        );
    }

    /** NOT USED !! */
    resetGlobalFiltersOnPanels() {

        this.edaPanels.toArray().forEach(panel => {
            panel.selectedFilters = panel.selectedFilters.filter(f => f.isGlobal !== false);
        });
    }

    // Podem agafar els events del panel
    itemChange($event: any, gridster) {
        // console.log($event);
    }

    /* GLOBAL FILTERS  */
    addGlobalFilter() {
        //Check if any panel isn't configurated
        let voidPanel = false;
        this.edaPanels.forEach((panel) => {
            if (panel.select.length === 0) {
                voidPanel = true;
            }
        })
        if (voidPanel) {
            this.display_v.rightSidebar = false;
            Swal.fire({
                title: 'Solo puedes añadir filtros quando todos los paneles estan configurados',
                text: `Puedes borrar los paneles en blanco o configurarlos`,
                type: 'warning',
                showCancelButton: false,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Entendido'
            })
        }else{
            const params = {
                panels: this.panels,
                dataSource: this.dataSource
            };
            this.display_v.rightSidebar = false;
            this.filterController = new EdaDialogController({
                params,
                close: (event, response) => {
                    if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                        this.filtersList.push(response.filterList);
                        this.loadGLobalFiltersData(response);

                        //If default values are selected filter is applied
                        if (response.filterList.selectedItems.length > 0) {
                            this.applyGlobalFilter(response.filterList);
                        }
                        //If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                        if (response.filterList.applyToAll && (this.applyToAllfilter.present === false)) {
                            this.applyToAllfilter = { present: true, refferenceTable: response.targetTable, id: response.filterList.id }
                            this.updateApplytoAllFilterInPanels();
                        }
                    }
                    this.filterController = undefined;
                }
            });
        }
    }

    /**
     * Updates applyToAllFilter in every panel
     */
    updateApplytoAllFilterInPanels() {
        this.edaPanels.forEach(panel => {
            panel.inject.applyToAllfilter = this.applyToAllfilter;
            panel.reloadTablesData();
        });
    }

    /** Loads columns by given table */
    loadGLobalFiltersData(params) {
        const filter = params.filterList;
        const table = params.targetTable;
        this.dashboardService.executeQuery(
            this.queryBuilderService.simpleQuery(filter.column.value, table, this.dataSource._id, '', '')
        ).subscribe(
            res => filter.data = res[1].map(item => ({ label: item[0], value: item[0] })),
            err => this.alertService.addError(err)
        );
    }

    /** Apply filter to panels when filter's selected value changes */
    applyGlobalFilter(filter) {
        // If filter has no values is removed from afected panels
        if (filter.selectedItems.length === 0) {
            this.edaPanels.toArray().forEach(panel => {
                panel.selectedFilters = panel.selectedFilters.filter(f => f.filter_id !== filter.id);
            });
        } else {
            filter.panelList.map(id => this.edaPanels.toArray().find(p => p.inject.panel.id === id))
                .forEach(
                    (panel) => {
                        // DELETE FILTER IF PRESENT IN PANEL AND SET NEW VALUES
                        panel.selectedFilters = panel.selectedFilters.filter(f => f.filter_id !== filter.id);
                        panel.selectedFilters.push(
                            {
                                filter_id: filter.id,
                                filter_table: filter.table.value,
                                filter_column: filter.column.value.column_name,
                                filter_type: 'in',
                                filter_elements: [{ value1: filter.selectedItems }],
                                isGlobal: true,
                                applyToAll: filter.applyToAll
                            }
                        );
                    }
                );
        }
        this.reloadPanels();
    }

    removeGlobalFilter(filter) {
        // Remove 'applytoall' filter if it's the same fitler
        if (filter.id === this.applyToAllfilter.id) {
            this.applyToAllfilter = { present: false, refferenceTable: null, id: null };
            this.updateApplytoAllFilterInPanels();
        }

        // Update fileterList and clean panels' filters
        this.filtersList = this.filtersList.filter(f => f.id !== filter.id);
        this.edaPanels.forEach(panel => {
            panel.selectedFilters = panel.selectedFilters.filter(f => f.filter_id !== filter.id);
        });

        this.reloadPanels();
    }

    reloadPanels() {
        this.edaPanels.forEach(panel => {
            if (panel.select.length !== 0) {
                panel.display_v.chart = '';
                panel.runQuery(true);
            }
        });
    }

    onResize(event) {
        this.display_v.responsive = event.currentTarget.innerWidth <= 1440;
    }

}
