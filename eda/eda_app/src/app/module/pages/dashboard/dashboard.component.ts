import { Component, OnInit, ViewChild, ViewChildren, QueryList, AfterViewInit, OnDestroy } from '@angular/core';
import { GridsterComponent, IGridsterOptions, IGridsterDraggableOptions } from 'angular2gridster';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Dashboard, EdaPanel } from '@eda/models/model.index';
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { EdaDialogController, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { DashboardService, AlertService, FileUtiles, QueryBuilderService, GroupService, IGroup } from '@eda/services/service.index';
import { SelectItem } from 'primeng/api';
import Swal from 'sweetalert2';
import * as _ from 'lodash';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    // Gridster ViewChild
    @ViewChild(GridsterComponent, { static: false }) gridster: GridsterComponent;
    @ViewChildren(EdaBlankPanelComponent) edaPanels: QueryList<EdaBlankPanelComponent>;
    private edaPanelsSubscription: Subscription;

    // Dashboard Page Variables
    public id: string;
    public title: string = 'Cargando informe...';
    public form: FormGroup;
    public titleClick: boolean;
    public dataSource: any;
    public dashboard: Dashboard;
    public visibleTypes: SelectItem[] = [];
    public filterController: EdaDialogController;
    public applyToAllfilter: { present: boolean, refferenceTable: string, id: string };
    public grups: IGroup[] = [];

    // Grid Global Variables
    public inject: any;
    public panels: EdaPanel[] = [];
    public panelsCopy: EdaPanel[] = [];
    public screen: number;
    public lanes: number = 40;
    public gridsterOptions: IGridsterOptions;
    public gridsterDraggableOptions: IGridsterDraggableOptions;
    public gridItemEvent: any;
    public itemOptions = {
        maxWidth: 40,
        maxHeight: 200,
        minWidth: 6,
        minHeight: 4
    };

    // Display Variables
    public display_v = {
        minispinner: false, // mini spinner panel
        responsive: false, // responsive option
        rightSidebar: false, // sidebar dashboard options
        groups: false
    };

    // Global filters vars
    public filtersList: Array<{ table, column, panelList, data, selectedItems, id, isGlobal, applyToAll }> = [];

    constructor(private dashboardService: DashboardService,
        private groupService: GroupService,
        private queryBuilderService: QueryBuilderService,
        private alertService: AlertService,
        private fileUtiles: FileUtiles,
        private formBuilder: FormBuilder,
        private route: ActivatedRoute) {
        this.initializeGridsterOptions();
        this.initializeForm();
    }

    ngOnInit(): void {
        this.dashboard = new Dashboard({});
        this.loadDashboard();
    }

    /**
     * Set applyToAllFilters for new panel when it's created
     */
    ngAfterViewInit(): void {
        this.edaPanelsSubscription = this.edaPanels.changes.subscribe((comps: QueryList<EdaBlankPanelComponent>) => {
            const globalFilters = this.filtersList.filter(filter => filter.isGlobal === true);
            const unsetPanels = this.edaPanels.filter(panel => panel.panel.content === undefined);
            setTimeout(() => {
                unsetPanels.forEach(panel => {
                    globalFilters.forEach(filter => {
                        filter.panelList.push(panel.panel.id);
                        panel.setGlobalFilter(this.formatFilter(filter))
                    });
                });
            }, 0);
        });
    }

    ngOnDestroy() {
        if (this.edaPanelsSubscription) {
            this.edaPanelsSubscription.unsubscribe();
        }
    }

    initializeGridsterOptions(): void {
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

    initializeForm(): void {
        this.form = this.formBuilder.group({
            visible: [null, Validators.required],
            group: [null]
        });

        this.visibleTypes = [
            { label: '', value: 'public', icon: 'fa fa-fw fa-globe' },
            { label: '', value: 'group', icon: 'fa fa-fw fa-users' },
            { label: '', value: 'private', icon: 'fa fa-fw fa-lock' },
        ];

        this.groupService.getGroupsByUser().subscribe(
            res => {
                this.grups = res;

                if (this.grups.length === 0) {
                    this.visibleTypes.splice(1, 1);
                }
            },
            (err) => this.alertService.addError(err)
        );
    }

    loadDashboard(): void {
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

                    me.form.controls['visible'].setValue(config.visible);

                    if (config.visible === 'group') {
                        me.display_v.groups = true;
                        me.form.controls['group'].setValue(_.find(me.grups, g => g._id === res.dashboard.group));
                    }

                    if (!res.dashboard.config.panel) { // Si el dashboard no te cap panel es crea un automatic
                        me.panels.push(new EdaPanel(me.fileUtiles.generateUUID(), 'Nuevo', 20, 10, true, true));
                        me.dashboard = new Dashboard({
                            id: me.id,
                            title: me.title,
                            visible: config.visible,
                            panel: me.panels,
                            user: res.dashboard.user,
                            datasSource: me.dataSource,
                            filters: [],
                            applytoAllFilter: { present: false, refferenceTable: null, id: null }
                        });
                    } else { // Si te panels els carrega
                        me.dashboard = new Dashboard({
                            id: me.id,
                            title: me.title,
                            visible: config.visible,
                            panel: config.panel,
                            user: res.dashboard.user,
                            datasSource: me.dataSource,
                            filters: config.filters,
                            applytoAllFilter: me.applyToAllfilter
                        });
                        me.panels = config.panel;
                    }
                    this.initializePanels();
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

    initializePanels(): void {
        this.inject = {
            dataSource: this.dataSource,
            dashboard_id: this.dashboard.id,
            applyToAllfilter: this.applyToAllfilter
        }
    }

    onAddWidget(): void {
        this.panels.push(new EdaPanel(this.fileUtiles.generateUUID(), 'Nuevo', 20, 10, true, true));
    }

    onRemovePanel(panel): void {
        this.panels.splice(_.findIndex(this.panels, { id: panel }), 1);
        this.filtersList.forEach(filter => {
            filter.panelList = filter.panelList.filter(id => id !== panel);
        });
    }

    onResetWidgets(): void {
        // Netejem els canvis i utilitzem la última copia feta, per defecte sempre hi haura 1 panel
        this.panels = this.panelsCopy.map(panel => ({ ...panel }));
    }

    saveDashboard(): void {
        if (this.form.invalid) {
            this.display_v.rightSidebar = false;
            this.alertService.addError(`Recuerde rellenar los campos obligatorios`);
        } else {
            const body = {
                config: {
                    title: this.title,
                    panel: this.dashboard.panel,
                    ds: { _id: this.dataSource._id },
                    filters: this.filtersList,
                    applyToAllfilter: this.applyToAllfilter,
                    visible: this.form.controls['visible'].value,
                },
                group: this.form.value.group ? this.form.value.group._id : undefined
            };

            this.edaPanels.forEach(panel => {
                panel.savePanel();
            });

            this.dashboardService.updateDashboard(this.id, body).subscribe(
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
    }

    /** NOT USED !! */
    resetGlobalFiltersOnPanels(): void {
        this.edaPanels.toArray().forEach(panel => {
            panel.selectedFilters = panel.selectedFilters.filter(f => f.isGlobal !== false);
        });
    }

    // Podem agafar els events del panel
    itemChange($event: any, panel): void {
        this.gridItemEvent = $event;
    }

    /* GLOBAL FILTERS  */
    addGlobalFilter(): void {
        // Check if any panel isn't configurated
        let voidPanel = false;

        this.edaPanels.forEach((panel) => {
            if (panel.currentQuery.length === 0) {
                voidPanel = true;
            }
        });

        if (voidPanel) {
            this.display_v.rightSidebar = false;
            Swal.fire({
                title: 'Solo puedes añadir filtros cuando todos los paneles estan configurados',
                text: `Puedes borrar los paneles en blanco o configurarlos`,
                type: 'warning',
                showCancelButton: false,
                confirmButtonColor: '#3085d6',
                confirmButtonText: 'Entendido'
            });
        } else {
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
                        this.loadGlobalFiltersData(response);

                        // If default values are selected filter is applied
                        if (response.filterList.selectedItems.length > 0) {
                            this.applyGlobalFilter(response.filterList);
                        }
                        // If filter apply to all panels and this dashboard hasn't any 'apllyToAllFilter' new 'apllyToAllFilter' is set
                        if (response.filterList.applyToAll && (this.applyToAllfilter.present === false)) {
                            this.applyToAllfilter = { present: true, refferenceTable: response.targetTable, id: response.filterList.id };
                            this.updateApplyToAllFilterInPanels();
                        }
                    }
                    this.filterController = undefined;
                }
            });
        }
    }

    /** Updates applyToAllFilter in every panel */
    updateApplyToAllFilterInPanels(): void {
        this.edaPanels.forEach(panel => {
            panel.inject.applyToAllfilter = this.applyToAllfilter;
            panel.reloadTablesData();
        });
    }

    /** Loads columns by given table */
    loadGlobalFiltersData(params): void {
        const filter = params.filterList;
        const queryParams = {
            table: params.targetTable,
            dataSource: this.dataSource._id,
            dashboard: '',
            panel: '',
            filters: []
        };
        this.dashboardService.executeQuery(
            this.queryBuilderService.simpleQuery(filter.column.value, queryParams)
        ).subscribe(
            res => filter.data = res[1].map(item => ({ label: item[0], value: item[0] })),
            err => this.alertService.addError(err)
        );
    }

    formatFilter(filter) {
        const formatedFilter = {
            filter_id: filter.id,
            filter_table: filter.table.value,
            filter_column: filter.column.value.column_name,
            filter_type: 'in',
            filter_elements: [{ value1: filter.selectedItems }],
            isGlobal: true,
            applyToAll: filter.applyToAll
        }
        return formatedFilter;
    }

    /** Apply filter to panels when filter's selected value changes */
    applyGlobalFilter(filter): void {
        const newFilter = this.formatFilter(filter)
        filter.panelList.map(id => this.edaPanels.toArray().find(p => p.panel.id === id))
            .forEach(
                (panel) => {
                    // console.log('APPYGLOBALFILTER')
                    // console.log(panel)
                    // // DELETE FILTER IF PRESENT IN PANEL AND SET NEW VALUES
                    panel.setGlobalFilter(newFilter);
                }
            );

        this.reloadPanels();
    }

    removeGlobalFilter(filter): void {
        // Remove 'applytoall' filter if it's the same fitler
        if (filter.id === this.applyToAllfilter.id) {
            this.applyToAllfilter = { present: false, refferenceTable: null, id: null };
            this.updateApplyToAllFilterInPanels();
        }

        // Update fileterList and clean panels' filters
        this.filtersList = this.filtersList.filter(f => f.id !== filter.id);
        this.edaPanels.forEach(panel => {
            panel.globalFilters = panel.globalFilters.filter(f => f.filter_id !== filter.id);
        });

        this.reloadPanels();
    }

    reloadPanels(): void {
        this.edaPanels.forEach(panel => {
            if (panel.currentQuery.length !== 0) {
                panel.display_v.chart = '';
                panel.runQuery(true);
            }
        });
    }

    handleSelectedBtn(event): void {
        const groupControl = this.form.get('group');
        this.display_v.groups = event.value === 'group';

        if (this.display_v.groups) {
            groupControl.setValidators(Validators.required);
        }

        if (!this.display_v.groups) {
            groupControl.setValidators(null);
            groupControl.setValue(null);
        }
    }

    setTitle(click: boolean): void {
        this.titleClick = click;
    }

}
