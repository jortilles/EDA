import { DateUtils } from './../../../services/utils/date-utils.service';
import { Component, OnInit, ViewChild, ViewChildren, QueryList, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { GridsterComponent, IGridsterOptions, IGridsterDraggableOptions } from 'angular2gridster';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Dashboard, EdaPanel, EdaTitlePanel, EdaPanelType, InjectEdaPanel } from '@eda/models/model.index';
import { EdaDialogController, EdaDialogCloseEvent, EdaDatePickerComponent } from '@eda/shared/components/shared-components.index';
import { DashboardService, AlertService, FileUtiles, QueryBuilderService, GroupService, IGroup, SpinnerService, UserService, StyleProviderService, DashboardStyles, GlobalFiltersService } from '@eda/services/service.index';
import { EdaBlankPanelComponent, IPanelAction } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';
import { EdaDatePickerConfig } from '@eda/shared/components/eda-date-picker/datePickerConfig';
import { SelectItem } from 'primeng/api';
import { Subscription } from 'rxjs';
import domtoimage from 'dom-to-image';
import Swal from 'sweetalert2';
import jspdf from 'jspdf';
import * as _ from 'lodash';
import { NULL_VALUE } from '@eda/configs/personalitzacio/customizables';
import { GlobalFilterComponent } from './global-filter/global-filter.component';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
    //@HostListener('window:resize', ['$event'])

    @ViewChild(GlobalFilterComponent, { static: false }) gFilter: GlobalFilterComponent;
    // Gridster ViewChild
    @ViewChild(GridsterComponent, { static: false }) gridster: GridsterComponent;
    @ViewChildren(EdaBlankPanelComponent) edaPanels: QueryList<EdaBlankPanelComponent>;
    private edaPanelsSubscription: Subscription;

    // Dashboard Page Variables
    public id: string;
    public title: string = $localize`:@@loading:Cargando informe...`;
    public form: UntypedFormGroup;
    public titleClick: boolean;
    public dataSource: any;
    public dashboard: Dashboard;
    public visibleTypes: SelectItem[] = [];
    public emailController: EdaDialogController;
    public saveasController: EdaDialogController;
    public editStylesController: EdaDialogController;
    public applyToAllfilter: { present: boolean, refferenceTable: string, id: string };
    public grups: IGroup[] = [];
    public toLitle: boolean = false;
    public toMedium: boolean = false;
    public datasourceName: string;
    public group: string = '';
    public onlyIcanEdit: boolean = false;
    public queryParams: any = {};

    public isDashboardCreator: boolean = false;

    // Grid Global Variables
    public inject: InjectEdaPanel;
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
        minWidth: 3,
        minHeight: 1,
        resizeHandles: { s: false, e: false, n: false, w: false, se: false, ne: false, sw: false, nw: false },
    };
    public tag: any;;
    public tags: Array<any>;
    public selectedtag: any;
    public addTag: boolean = false;
    public sendViaMailConfig: any = { enabled: false };


    // Display Variables
    public display_v = {
        minispinner: false, // mini spinner panel
        responsive: false, // responsive option
        rightSidebar: false, // sidebar dashboard options
        groups: false,
        shared: false, //if shared copy url is displayed
        edit_mode: true, //editable dashboard
        anonimous_mode: false,
        notSaved: false,
        hideWheel: false, // dashboard config options (mostrar la rodeta o no)
        panelMode:false, // en mode panel es mostra nomel el panell
        globalFilter: false
    };

    //Date filter ranges Dropdown
    public datePickerConfigs: {} = {};

    public sharedURL: string;

    // Global filters vars
    // public filtersList: Array<any> = [];
    public refreshTime: number = null;
    public stopRefresh: boolean = false;

    public styles : DashboardStyles;

    public filtrar: string = $localize`:@@filterButtonDashboard:Filtrar`;
    public addTagString: string = $localize`:@@addTag:AÑADIR ETIQUETA`;
    public newTag = $localize`:@@newTag:Nueva etiqueta`;
    public Seconds_to_refresh = $localize`:@@seconds_to_refresh:Intervalo de recarga`;
    public canIeditTooltip = $localize`:@@canIeditTooltip:Si esta opción está seleccionada sólo el propietario del informe y los administradores podrán guardar los cambios`;
    //public globalFilter: any;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private dashboardService: DashboardService,
        private groupService: GroupService,
        private queryBuilderService: QueryBuilderService,
        private spinnerService: SpinnerService,
        private alertService: AlertService,
        private fileUtiles: FileUtiles,
        private formBuilder: UntypedFormBuilder,
        private dateUtilsService: DateUtils,
        private userService: UserService,
        private globalFiltersService: GlobalFiltersService,
        private stylesProviderService: StyleProviderService
    ) {

        this.initializeResponsiveSizes();
        this.initializeGridsterOptions();
        this.initializeForm();
        let tags = JSON.parse(sessionStorage.getItem('tags'));
        if (tags) {
            this.tags = tags.filter(tag => tag.value !== 1);
        } else {
            this.tags = [];
        }
        this.tags.push({ value: 2, label: this.newTag });
    }

    // ng cycle lives
    public ngOnInit(): void {
        this.dashboard = new Dashboard({});

        this.initializeDashboard();
        this.initStyles();

        this.dashboardService.notSaved.subscribe(
            (data) => this.display_v.notSaved = data,
            (err) => this.alertService.addError(err)
        )
        //JJ: Inicialitzo a false...
        this.dashboardService._notSaved.next(false);
        // this.display_v.notSaved = false;
    }

    /** Selecciona el modo en el que se permitirá hacer consultas. Teniendo en cuenta que no se pueden mezclar consultas de tipo EDA y Abrol en un mismo informe. */
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

    /* Set applyToAllFilters for new panel when it's created */
    public ngAfterViewInit(): void {
        this.edaPanelsSubscription = this.edaPanels.changes.subscribe((comps: QueryList<EdaBlankPanelComponent>) => {
            const globalFilters = this.gFilter?.globalFilters.filter(filter => filter.isGlobal === true);
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

    public ngOnDestroy() {
        this.stopRefresh = true;
        if (this.edaPanelsSubscription) {
            this.edaPanelsSubscription.unsubscribe();
        }
    }

    private initStyles(): void{

        /**Global */
        this.stylesProviderService.panelColor.subscribe(panelColor => {
            document.documentElement.style.setProperty('--panel-color', panelColor);
        });

        /**Title */
        this.stylesProviderService.titleFontColor.subscribe(color => {
            document.documentElement.style.setProperty('--eda-title-font-color', color);
        });
        this.stylesProviderService.titleFontFamily.subscribe(font => {
            document.documentElement.style.setProperty('--eda-title-font-family', font);
        });
        this.stylesProviderService.titleFontSize.subscribe(size => {
            this.stylesProviderService.setTitleFontSize(size);
        });
        this.stylesProviderService.titleAlign.subscribe(align => {
            document.documentElement.style.setProperty('--justifyTitle', align)
        })

        /**Filters */
        this.stylesProviderService.filtersFontColor.subscribe(color => {
            document.documentElement.style.setProperty('--eda-filters-font-color', color);
        });
        this.stylesProviderService.filtersFontFamily.subscribe(font => {
            document.documentElement.style.setProperty('--eda-filters-font-family', font);
        });
        this.stylesProviderService.filtersFontSize.subscribe(size => {
            this.stylesProviderService.setfiltersFontSize(size);
        });

        /**Title */
        this.stylesProviderService.panelTitleFontColor.subscribe(color => {
            document.documentElement.style.setProperty('--panel-title-font-color', color);
        });
        this.stylesProviderService.panelTitleFontFamily.subscribe(font => {
            document.documentElement.style.setProperty('--panel-title-font-family', font);
        });
        this.stylesProviderService.panelTitleFontSize.subscribe(size => {
            this.stylesProviderService.setPanelTitleFontSize(size);
        });
        this.stylesProviderService.panelTitleAlign.subscribe(align => {
            document.documentElement.style.setProperty('--justifyPanelTitle', align)
        })

        /**Content */
        this.stylesProviderService.panelFontColor.subscribe(color => {
            document.documentElement.style.setProperty('--panel-font-color', color);
        });
        this.stylesProviderService.panelFontFamily.subscribe(font => {
            document.documentElement.style.setProperty('--panel-font-family', font);
        });
        this.stylesProviderService.panelFontSize.subscribe(size => {
            this.stylesProviderService.setPanelContentFontSize(size);
        });

        this.stylesProviderService.customCss.subscribe((css) => {
           this.stylesProviderService.setCustomCss(css);
        });


    }

    // Init functions
    private initializeResponsiveSizes(): void {
        if (window.innerWidth >= 1200) {
            this.toLitle = false;
            this.toMedium = false;
        }
/* NO MORE TAMANY MIG
        if ((window.innerWidth < 1200) && (window.innerWidth > 1000)) {
            this.lanes = 20;
            this.toMedium = true;
            this.toLitle = false;
        }
*/
        if (window.innerWidth < 1000) {
            this.lanes = 10;
            this.toLitle = true;
            this.toMedium = false;
        }
    }

    private initializeGridsterOptions(): void {

        this.gridsterOptions = {
            lanes: this.lanes,
            direction: 'vertical',
            floating: false,
            dragAndDrop: window.innerWidth > 1000,
            resizable: window.innerWidth > 1000,
            resizeHandles: {
                sw: true,
                se: true,
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

    private initializeForm(): void {
        this.form = this.formBuilder.group({
            visible: [null, Validators.required],
            group: [[]]
        });

        this.visibleTypes = [
            { label: '', value: 'shared', icon: 'fa fa-share-alt' },
            { label: '', value: 'public', icon: 'fa fa-fw fa-globe' },
            { label: '', value: 'group', icon: 'fa fa-fw fa-users' },
            { label: '', value: 'private', icon: 'fa fa-fw fa-lock' }
        ];

        this.groupService.getGroupsByUser().subscribe(
            res => {
                this.grups = res.sort((a, b) => {
                    let va = (a.name||'').toLowerCase();
                    let vb = (b.name||'').toLowerCase();
                    return va < vb ?  -1 : va > vb ? 1 : 0
                });
                if (this.grups.length === 0) {
                    this.visibleTypes.splice(1, 1);
                }




                // pot ser que no estinguin disponibles encara els grups... per això  es crida des de els dos llocs
                // i es crida també des de aqui.... a mes a mes des de la inicilialització del dashboard
                // per estar segurn que es tenen disponibles.
                this.setDashboardGrups();
                this.setEditMode();
            },
            (err) => this.alertService.addError(err)
        );
    }

    private initializeDashboard(): void {

        const me = this;

        me.route.paramMap.subscribe(
            params => me.id = params.get('id'),
            err => me.alertService.addError(err)
        );

        // Check url for filters in params
        this.getUrlParams();

        if (me.id) {
            me.dashboardService.getDashboard(me.id).subscribe(
                res => {
                    /** res - retorna 2 objectes, el dashboard i el datasource per separat  */
                    const config = res.dashboard.config;
                    // Estableix els permisos d'edició i propietat...
                    this.setEditMode();
                    // Check dashboard owner
                    this.checkVisibility(res.dashboard);
                    me.title = config.title; // Titul del dashboard, utilitzat per visualització
                    me.gFilter.initGlobalFilters(config.filters||[]); // Filtres del dashboard
                    me.dataSource = res.datasource; // DataSource del dashboard
                    me.datasourceName = res.datasource.name;
                    me.applyToAllfilter = config.applyToAllfilter || { present: false, refferenceTable: null, id: null };
                    me.form.controls['visible'].setValue(config.visible);
                    me.tag = config.tag;
                    me.selectedtag = me.tags.filter(tag => tag.value === me.tag)[0];
                    me.refreshTime = config.refreshTime;
                    me.onlyIcanEdit = config.onlyIcanEdit;
                    if (me.refreshTime) {
                        this.stopRefresh = false;
                        this.startCountdown(me.refreshTime);
                    }
                    me.sendViaMailConfig = config.sendViaMailConfig || this.sendViaMailConfig;
                    me.styles = config.styles || this.stylesProviderService.generateDefaultStyles();
                    this.stylesProviderService.setStyles(me.styles);

                    // pot ser que no estinguin disponibles encara els grups... per això de vegades es perd
                    // i es crida també des de els subscribe del groupcontroller ... a mes a mes des de la inicilialització del dashboard
                    // per estar segurn que es tenen disponibles.
                    let grp = [];
                    me.setDashboardCreator(res.dashboard);
                    if (config.visible === 'group' && res.dashboard.group) {
                        grp = res.dashboard.group;
                    }

                    // Si el dashboard no te cap panel es crea un automatic
                    if (!res.dashboard.config.panel) {
                        me.panels.push(
                            new EdaPanel({
                                id: me.fileUtiles.generateUUID(),
                                title: $localize`:@@newPanelTitle:Nuevo Panel`,
                                type: EdaPanelType.BLANK,
                                dragAndDrop: true,
                                resizable: true,
                                w: 20,
                                h: 10,
                            })
                        );
                        // Check url for filters in params
                        this.gFilter.findGlobalFilterByUrlParams(this.queryParams);
                        this.gFilter.fillFiltersData();

                        me.dashboard = new Dashboard({
                            onlyIcanEdit: me.onlyIcanEdit, id: me.id, title: me.title, visible: config.visible, panel: me.panels, user: res.dashboard.user,
                            datasSource: me.dataSource, filters: [], applytoAllFilter: { present: false, refferenceTable: null, id: null }, group: grp
                        });

                    } else {
                        // Si te panels els carrega
                        me.panels = config.panel;
                        // Check url for filters in params
                        this.gFilter.findGlobalFilterByUrlParams(this.queryParams);
                        this.gFilter.fillFiltersData();

                        me.dashboard = new Dashboard({
                            onlyIcanEdit: me.onlyIcanEdit, id: me.id, title: me.title, visible: config.visible, panel: config.panel, user: res.dashboard.user,
                            datasSource: me.dataSource, filters: config.filters, applytoAllFilter: me.applyToAllfilter, group: grp
                        });
                        /**To update panel filters with filters current data */
                        me.updateFilterDatesInPanels();
                    }

                    // pot ser que no estinguin disponibles encara els grups... per això es crida des de els dos llocs
                    // i es crida també des de els subscribe del groupcontroller ... a mes a mes des de la inicilialització del dashboard
                    // per estar segurn que es tenen disponibles.
                    if (config.visible === 'group') {
                        this.setDashboardGrups();
                    }


                    if (this.toLitle) {
                        this.initMobileSizes();
                    }

                    if (this.toMedium) {
                        this.initMediumSizes();
                    }

                    this.initializePanels();
                    // Fem una copia de seguretat per en cas de desastre :D
                    me.panels.forEach(p => {
                        me.panelsCopy.push(p);
                    });

                },
                err => {
                    me.alertService.addError(err);
                    if (err.text === "You don't have permission") {
                        console.log("You don't have permission");
                        this.router.navigate(['/login']);
                    }
                }
            );
        } else {
            // Si accedicis a un dashboard sense cap ID saltaria error
            me.alertService.addError('Error al cargar el Dashboard');
        }
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
        this.gFilter?.globalFilters.filter(f => f.selectedRange).forEach(filter => {

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

    private getUrlParams(): void {
        this.route.queryParams.subscribe(params => {
            this.queryParams = params;
            try{
                if(params['hideWheel'] == 'true'){
                    this.display_v.hideWheel =true;
                }
                if(params['panelMode'] == 'true'){
                    this.display_v.panelMode =true;
                    this.display_v.hideWheel =true;
                }
            }catch(e){
                console.warn('getUrlParams: ' + e)
            }
        });
    }

    // Dashboard Panels
    private initializePanels(): void {
        const user = sessionStorage.getItem('user');
        const userID = JSON.parse(user)._id;

        this.inject = {
            dataSource: this.dataSource,
            dashboard_id: this.dashboard.id,
            applyToAllfilter: this.applyToAllfilter,
            isObserver: this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0
        }
    }

    private setPanelSizes(panel) {

        if (this.toLitle) {
            if (this.panels.length > 0) {
                const lastPanel = this.panels[this.panels.length - 1];
                panel.tamanyMobil.w = this.lanes;
                panel.tamanyMobil.h = 10;
                panel.tamanyMobil.x = 0;
                panel.tamanyMobil.y = lastPanel.tamanyMobil.y + lastPanel.tamanyMobil.h;
            }
        }
/* NO LONGER TAMANY MIG
        if (this.toMedium) {
            if (this.panels.length > 0) {
                const lastPanel = this.panels[this.panels.length - 1];
                panel.tamanyMig.w = 10;
                panel.tamanyMig.h = 10;
                panel.tamanyMig.x = 0;
                panel.tamanyMig.y = lastPanel.tamanyMig.y + lastPanel.tamanyMig.h;
            }
        }
*/
        this.panels.push(panel);
    }

    public reloadPanelsWithTimeOut(time?: number) {
        setTimeout(() => {
            this.reloadPanels()
        }, time || 250);
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

    // Dashboard control
    public async setEditMode() {
        const user = sessionStorage.getItem('user');
        const userName = JSON.parse(user).name;
        const userID = JSON.parse(user)._id;
        this.display_v.edit_mode = (userName !== 'edaanonim') && !(this.grups.filter(group => group.name === 'EDA_RO' && group.users.includes(userID)).length !== 0)
        this.display_v.anonimous_mode = (userName !== 'edaanonim');
    }



    private setDashboardGrups( ): void {
        const me = this;
        try{// debo recibir por un lado el dashboard y por otro el listado de roles. Mientras no tenga los dos esto fallará.
            // Lo puedo hacer cuando tengo los dos.
            if(me.grups.length > 0 && me.dashboard.group.length > 0 ){
                me.display_v.groups = true;
                const selectedGroups = [];
                for (let i = 0, n = me.grups.length; i < n; i += 1) {
                    const group: any = me.grups[i];
                    for (const dashGroup of me.dashboard.group) {
                        if (_.isEqual(group._id, dashGroup)) {
                            selectedGroups.push(group)
                        }
                    }
                }
                me.form.controls['group'].setValue(selectedGroups);
            }
        }catch(e){
            // todavia no se han seteado me.grups o me.dashboard.goup.
        }
    }

    private checkVisibility(dashboard) {
        if (!this.display_v.anonimous_mode && dashboard.config.visible !== 'shared') {
            console.log('Check visibility... you cannot see this dashboard');
            this.router.navigate(['/login']);
        }

        if (dashboard.config.visible === 'shared') {
            this.sharedURL = this.getsharedURL();
            this.display_v.shared = true;
        }
    }

    // Sizes functions
    private initMobileSizes() {
        let height = 0;
        let pannelHeight = 0;
        for (let i = 0, n = this.panels.length; i < n; i++) {
            // Init tamanys mobils
            const panel = this.panels[i];
            if (panel.tamanyMobil.h == 0) {
                if (i !== 0) {
                    panel.tamanyMobil.y = height;
                }
                pannelHeight = _.round(panel.h * 1.6);
                // si el panell es mes gran que la pantalla ho ajusto a la pantalla.
                // tot això es fa per tenir el tamany d'una cela i multiplicar-ho per el 70% de la pantalla
                // vertical
                if ((pannelHeight * (window.innerWidth / this.lanes) > window.innerHeight) && (window.innerHeight > window.innerWidth)) {
                    pannelHeight = _.round((window.innerHeight / (window.innerWidth / this.lanes)) * 0.8);
                }
                //horitzontal
                if ((pannelHeight * (window.innerWidth / this.lanes) > window.innerHeight) && (window.innerHeight < window.innerWidth)) {
                    pannelHeight = _.round((window.innerHeight / (window.innerWidth / this.lanes)) * 1.1);
                }

                panel.tamanyMobil.w = this.lanes;
                panel.tamanyMobil.h = pannelHeight;
                panel.tamanyMobil.x = 0;
                height += pannelHeight;
            }

        }

    }

    private initMediumSizes() {
        for (let i = 0, n = this.panels.length; i < n; i++) {
            // Init tamanys mobils
            const panel = this.panels[i];
            if (panel.tamanyMig.h == 0) {
                panel.tamanyMig.x = _.round(panel.x / 2);
                panel.tamanyMig.y = _.round(panel.y / 1.5);
                panel.tamanyMig.w = _.round(panel.w / 2);
                panel.tamanyMig.h = _.round(panel.h / 1.5);
            }
        }
    }

    public onResize(event) {
        const innerWidth = event.target.innerWidth;
        if (innerWidth >= 1200) {
            this.lanes = 40;
            this.toLitle = false;
            this.toMedium = false;
            this.gridster.setOption('lanes', this.lanes).reload();
            /* NO MORE TAMANY MIG
        } else if ((innerWidth < 1200) && (innerWidth >= 1000)) {
            this.lanes = 20;
            this.toMedium = true;
            this.toLitle = false;
            this.gridster.setOption('lanes', this.lanes).reload();
            this.initMediumSizes();
        */
        } else {
            this.lanes = 10;
            this.toLitle = true;
            this.toMedium = false;
            this.gridster.setOption('lanes', this.lanes).reload();
            this.initMobileSizes();

        }
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

    public async onPanelAction(event: IPanelAction): Promise<void> {
        if (event.code === 'ADDFILTER') {
            const data = event?.data;
            const panel = event?.data?.panel;
            if (!_.isNil(data?.inx)) {
                const column = event.data.query.find((query: any) => query?.display_name?.default === data.filterBy);
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

                    await this.gFilter.onGlobalFilter(globalFilter, table.table_name);
                    this.reloadOnGlobalFilter();
                }
            }
        } else if (event.code === 'QUERYMODE') {
            this.setPanelsQueryMode();
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

    public saveAs() {
        this.display_v.rightSidebar = false;
        const params = {
            dataSource: this.dataSource
        };
        this.saveasController = new EdaDialogController({
            params,
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    const ds = { _id: this.dataSource._id };
                    const body = {
                        config: {
                            title: response.name, visible: response.visible, ds, tag: null, refreshTime: null,
                            styles: this.stylesProviderService.generateDefaultStyles(),
                        },
                        group: response.group
                            ? _.map(response.group, '_id')
                            : undefined
                    };

                    this.dashboardService.addNewDashboard(body).subscribe(
                        r => {
                            const body = {
                                config: {
                                    title: response.name,
                                    panel: this.dashboard.panel,
                                    ds: { _id: this.dataSource._id },
                                    filters: this.cleanFiltersData(),
                                    applyToAllfilter: this.applyToAllfilter,
                                    visible: response.visible,
                                    tag: this.getTag(),
                                    refreshTime: (this.refreshTime > 5) ? this.refreshTime : this.refreshTime ? 5 : null,
                                    mailingAlertsEnabled: this.getMailingAlertsEnabled(),
                                    sendViaMailConfig: this.sendViaMailConfig,
                                    onlyIcanEdit: this.onlyIcanEdit,
                                    styles:this.styles

                                },
                                group: response.group ? _.map(response.group, '_id') : undefined
                            };

                            this.edaPanels.forEach(panel => {
                                panel.savePanel();
                            });

                            this.dashboardService.updateDashboard(r.dashboard._id, body).subscribe(
                                () => {
                                    this.dashboardService._notSaved.next(false);
                                    this.display_v.rightSidebar = false;
                                    this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
                                    this.router.navigate(['/dashboard/', r.dashboard._id]).then(() => {
                                        window.location.reload();
                                    });

                                },
                                err => {
                                    this.dashboardService._notSaved.next(false);
                                    this.display_v.rightSidebar = false;
                                    this.alertService.addError(err);
                                }
                            );
                        },
                        err => this.alertService.addError(err)
                    );
                }
                this.saveasController = null;
            }
        });
    }

    public editStyles() {
        this.display_v.rightSidebar = false;
        const params = this.styles;
        this.editStylesController = new EdaDialogController({
            params,
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.stylesProviderService.setStyles(response);
                    this.styles = response;
                    this.dashboardService._notSaved.next(true);
                }
                this.editStylesController = null;
            }
        })
    }

    /** Updates applyToAllFilter in every panel */
    public updateApplyToAllFilterInPanels(): void {
        this.edaPanels.forEach(panel => {
            panel.inject.applyToAllfilter = this.applyToAllfilter;
            panel.reloadTablesData();
        })
    }

    private cleanFiltersData() {
        const filtersCleaned = [];

        for (const _globalFilter of this.gFilter?.globalFilters) {
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


    // Sidebar functions
    public onAddWidget(): void {
        let panel = new EdaPanel({
            id: this.fileUtiles.generateUUID(),
            title: $localize`:@@newPanelTitle2:Nuevo Panel`,
            type: EdaPanelType.BLANK,
            w: 20,
            h: 10,
            resizable: true,
            dragAndDrop: true
        });

        this.setPanelSizes(panel);
        this.display_v.rightSidebar = false;
    }

    public onAddTitle(): void {
        let panel = new EdaTitlePanel({
            id: this.fileUtiles.generateUUID(),
            title: 'Titulo',
            type: EdaPanelType.TITLE,
            w: 20,
            h: 1,
            resizable: true,
            dragAndDrop: true,
            fontsize: '22px',
            color: '#000000'
        });
        this.setPanelSizes(panel);
        this.display_v.rightSidebar = false;
    }

    public onRemovePanel(panel): void {
        this.panels.splice(_.findIndex(this.panels, { id: panel }), 1);

        for (let i = 0, n = this.gFilter?.globalFilters.length; i < n; i += 1) {
            const filter = this.gFilter?.globalFilters[i];
            filter.panelList = filter.panelList.filter(id => id !== panel);
        }
    }

    public onDuplicatePanel(panel): void {
        this.panels.push(panel);
        this.dashboardService._notSaved.next(true);
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
                this.initializeDashboard();
                this.display_v.rightSidebar = false;
                this.dashboardService._notSaved.next(false);
            },
            err => console.log(err)
        )
    }

    public getsharedURL(): string {
        const url = location.href;
        const baseURL = url.slice(0, url.indexOf('#'));

        return `${baseURL}#/public/${this.id}`
    }

    public copyURL(): void {
        let $body = document.getElementsByTagName('body')[0];
        const value = this.getsharedURL();

        let copyToClipboard = function (value) {
            let $tempInput = document.createElement('INPUT') as HTMLInputElement;
            $body.appendChild($tempInput);
            $tempInput.setAttribute('value', value)
            $tempInput.select();
            document.execCommand('copy');
            $body.removeChild($tempInput);
        }

        copyToClipboard(value);

        this.saveDashboard();
    }

    public saveDashboard(): void {
        this.triggerTimer();

        if (this.form.invalid) {
            this.display_v.rightSidebar = false;
            this.alertService.addError($localize`:@@mandatoryFields:Recuerde rellenar los campos obligatorios`);
        } else {

            const body = {
                config: {
                    title: this.title,
                    panel: [],
                    ds: { _id: this.dataSource._id },
                    filters: this.cleanFiltersData(),
                    applyToAllfilter: this.applyToAllfilter,
                    visible: this.form.controls['visible'].value,
                    tag: this.getTag(),
                    refreshTime: (this.refreshTime > 5) ? this.refreshTime : this.refreshTime ? 5 : null,
                    mailingAlertsEnabled: this.getMailingAlertsEnabled(),
                    sendViaMailConfig: this.sendViaMailConfig,
                    onlyIcanEdit: this.onlyIcanEdit,
                    styles : this.styles

                },
                group: this.form.value.group ? _.map(this.form.value.group, '_id') : undefined
            };
            this.edaPanels.forEach(panel => { panel.savePanel(); });
            body.config.panel = this.dashboard.panel;

            this.dashboardService.updateDashboard(this.id, body).subscribe(
                () => {
                    this.display_v.rightSidebar = false;
                    this.alertService.addSuccess($localize`:@@dahsboardSaved:Informe guardado correctamente`);
                },
                err => {
                    this.display_v.rightSidebar = false;
                    this.alertService.addError(err);
                }
            );

            //not saved alert message
            this.dashboardService._notSaved.next(false);
        }
    }

    public getMailingAlertsEnabled(): boolean {

        let mailingenabled = false;

        this.dashboard.panel.forEach(panel => {
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

    public getTag() {
        if (this.tag && this.tag.value === 0) return null;
        else if (this.tag && this.tag.value) return this.tag.label;
        else if (this.tag) return this.tag;
        else return null;
    }

    public exportAsPDF() {
        this.display_v.rightSidebar = false;
        this.spinnerService.on();
        const title = this.title;
        domtoimage.toJpeg(document.getElementById('myDashboard'), { bgcolor: 'white' })
            .then((dataUrl) => {
                let img = new Image();
                img.src = dataUrl;
                img.onload = () => {
                    let pdf = new jspdf('l', 'pt', [img.width, img.height]);
                    let width = pdf.internal.pageSize.getWidth();
                    let height = pdf.internal.pageSize.getHeight();
                    pdf.addImage(img, 'JPEG', 0, 0, width, height);
                    pdf.save(`${title}.pdf`);
                }
                this.spinnerService.off();
            });

    }

    public exportAsJPEG() {
        this.display_v.rightSidebar = false;
        this.spinnerService.on();
        const title = this.title;
        domtoimage.toJpeg(document.getElementById('myDashboard'), { bgcolor: 'white' })
            .then((dataUrl) => {
                var link = document.createElement('a');
                link.download = `${title}.jpeg`;
                link.href = dataUrl;
                link.click();
                this.spinnerService.off();
            });
    }

    public openMailConfig() {
        const params = { dashboard: this.id, config: this.sendViaMailConfig };
        this.display_v.rightSidebar = false;
        this.emailController = new EdaDialogController({
            params,
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.sendViaMailConfig = response;
                    this.saveDashboard();
                }
                this.emailController = undefined;
            }
        });

    }

    // Others
    public handleSelectedBtn(event): void {
        const groupControl = this.form.get('group');
        this.display_v.groups = event.value === 'group';
        this.display_v.shared = event.value === 'shared';
        if (this.display_v.groups) {
            groupControl.setValidators(Validators.required);
        }

        if (!this.display_v.groups) {
            if (event.value !== 'shared') {
                this.saveDashboard();
            }
            groupControl.setValidators(null);
            groupControl.setValue(null);
        }
    }

    public setTitle(): void {
        this.titleClick = !this.titleClick;
    }

    // Podem agafar els events del panel
    public itemChange($event: any, panel): void {
        this.gridItemEvent = $event;
        let found = this.edaPanels.filter(edaPanel => edaPanel.panel.id === panel.id)[0];
        if (
            found
            && panel.content
            && !found.panelChart.NO_DATA
            && (['parallelSets', 'kpi',  'dynamicText', 'treeMap', 'scatterPlot', 'knob', 'funnel','bubblechart', 'sunburst'].includes(panel.content.chart))
            && !$event.isNew) {
            found.savePanel();
        }

        // found.onGridsterResize($event);
        if (panel.type === 1) {
            let elements = document.querySelectorAll(`.eda-text-panel`);
            elements.forEach((element) => {
                this.setPanelSize(element);
            });
        }
    }

    public setPanelSize(element): void {
        let parentElement = element?.parentNode;
        if (parentElement) {
            let parentWidth = parentElement.offsetWidth - 20;
            let parentHeight = parentElement.offsetHeight - 20;
            const imgs = element.querySelectorAll('img');

            imgs.forEach((img) => {
                img.style.maxHeight = `${parentHeight}px`;
                img.style.maxWidth = `${parentWidth}px`;
            })
        }
    }

    public selectTag() {
        this.addTag = this.selectedtag.label === this.newTag;
        this.tag = this.selectedtag;
        if (this.tag.value === 0) this.tag.label = null;
    }

    public startCountdown(seconds: number) {

        if (!this.stopRefresh) {
            let counter = seconds;
            const interval = setInterval(() => {

                counter--;
                if (counter < 0 && !this.stopRefresh) {
                    clearInterval(interval);
                    this.onResetWidgets();
                    this.startCountdown(seconds);
                } else if (this.stopRefresh) {
                    clearInterval(interval);
                    return;
                }
            }, 1000);
        } else return;
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

    public setDashboardCreator(dashboard : any) : void {
        if (this.userService.user._id === dashboard.user)  {
            this.isDashboardCreator = true;
        }
    }

    public validateDashboard(action: string): boolean {
        let isvalid = true;

        if (action == 'GLOBALFILTER') {
            const emptyQuery = this.edaPanels.some((panel) => panel.currentQuery.length === 0);
            if (emptyQuery) isvalid = false;

            if (!isvalid) {
                this.showSwalAlert({
                    title: $localize`:@@AddFiltersWarningTittle:Solo puedes añadir filtros cuando todos los paneles están configurados`,
                    text: $localize`:@@AddFiltersWarningText:Puedes borrar los paneles en blanco o configurarlos`,
                    resolveBtnText: $localize`:@@AddFiltersWarningButton:Entendido`
                });
            }
        }

        return isvalid;
    }

    private showSwalAlert(swal: any) {
        Swal.fire({
            icon: 'success',
            title: swal.title,
            text: swal.text,
            showConfirmButton: true,
            showCancelButton: false,
            confirmButtonColor: '#3085d6',
            confirmButtonText: swal.resolveBtnText,
        });
    }

    /**
     * Filters dashboard visibility types based on user role.
     *
     * @returns {SelectItem[]} Array of allowed visibility types.
     *
     * @description
     * Returns all types for admins, excludes 'shared' for non-admins.
    */
    /*SDA CUSTOM*/public getFilteredVisibleTypes(): SelectItem[] {
    /*SDA CUSTOM*/  return this.userService.isAdmin
    /*SDA CUSTOM*/    ? this.visibleTypes
    /*SDA CUSTOM*/    : this.visibleTypes.filter(type => type.value !== 'shared');
    /*SDA CUSTOM*/}
}
