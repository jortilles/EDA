import { EdaTable, EdaColumnText, EdaColumnContextMenu } from '@eda/components/component.index';
import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { UntypedFormGroup } from '@angular/forms';
import { MenuItem, SelectItem, TreeNode } from 'primeng/api';
import { AlertService, DataSourceService, QueryParams, QueryBuilderService, SpinnerService } from '@eda/services/service.index';
import { EditTablePanel, EditColumnPanel, EditModelPanel, ValueListSource } from '@eda/models/data-source-model/data-source-models';
import { EdaDialogController, EdaDialogCloseEvent, EdaContextMenu, EdaContextMenuItem } from '@eda/shared/components/shared-components.index';
import { aggTypes } from 'app/config/aggretation-types';
import { EdaColumnFunction } from '@eda/components/eda-table/eda-columns/eda-column-function';
import * as _ from 'lodash';

@Component({
    selector: 'app-data-source-detail',
    templateUrl: './data-source-detail.component.html',
    styleUrls: ['../data-source-list/data-source-list.component.css']
})
export class DataSourceDetailComponent implements OnInit, OnDestroy {
    @Output() onTableCreated: EventEmitter<any> = new EventEmitter();

    public form: UntypedFormGroup;
    public permissionsColumn: EdaTable;
    public permissionTable: EdaTable;
    public permissionModel: EdaTable;
    public relationsTable: EdaTable;
    public navigationSubscription: any;
    // Properties
    public tablePanel: EditTablePanel;
    public columnPanel: EditColumnPanel;
    public modelPanel: EditModelPanel;
    public typePanel: string;
    public relationController: EdaDialogController;
    public valueListController: EdaDialogController;
    public permissionsController: EdaDialogController;
    public tablePermissionsController: EdaDialogController;
    public modelPermissionsController: EdaDialogController;
    public newColController: EdaDialogController;
    public mapController: EdaDialogController;
    public viewController: EdaDialogController;
    public csvPanelController: EdaDialogController;
    public cacheController : EdaDialogController;
    public securityController : EdaDialogController;
    public items: MenuItem[];
    // public hideAllTablesBool : boolean = false;
    // public hideAllRelationsBool : boolean = false;



    /**Strings */
    public functionalities: string = $localize`:@@functionalities:Extender el modelo`;
    public utilities: string = $localize`:@@utilities:Utilidades`;
    public hideTablesString: string = $localize`:@@hideTables:Ocultar todas las tablas`;
    public hideColumnsString: string = $localize`:@@hideColumns:Ocultar todas las columnas`;
    public hideAllRelationsString: string = $localize`:@@hideAllRelations: Ocultar todas las relaciones`;
    public addCacheConfig:string = $localize`:@@addCacheConfig:Configurar Caché`;
    public viewsecurity:string = $localize`:@@viewsecurity:Ver configuración de seguridad`;
    public addMap:string = $localize`:@@addMap:Mapas`;
    public addView:string = $localize`:@@addView:Añadir vista`;
    public addCSV:string = $localize`:@@addCSV:Añadir tabla desde csv`;
    public addRelation:string = $localize`:@@addRelationButton:Añadir relación`;
    public addCalculatedCol:string = $localize`:@@addCalculatedCol:Añadir columna  calculada`; 
    public addPermission:string = $localize`:@@addPermission:Añadir permiso`;
    public addValueList:string = $localize`:@@addValueList:Añadir lista de valores posibles`;
    public si = $localize`:@@si:Si`;
    public no = $localize`:@@no:No`;
    public valueListSourceHeader = $localize`:@@valueListSourceHeader:Tabla que contiene los valores posibles para el filtro asociado a esta columna`;
    public valueListSourceTabla = $localize`:@@valueListSourceTabla:Tabla relacionada`;
    public valueListSourceID = $localize`:@@valueListSourceID:Id de la columna relacionada`;
    public valueListSourceDescripcion = $localize`:@@valueListSourceDescripcion:Descripción dfe la columna relacionada`;
    public possibleValueList = $localize`@@possibleValuesList: Tabla y columna asociadas `
    public possibleValueListTable = $localize`@@possibleValuesListTable: Tabla `
    public possibleValuesListID =  $localize`@@possibleValuesListID: Id de la columna`
    public possibleValuesListDescription = $localize`@@possibleValuesListDescription: Descripción de la columna`

    // Types
    public columnTypes: SelectItem[] = [
        { label: 'text', value: 'text' },
        { label: 'numeric', value: 'numeric' },
        { label: 'date', value: 'date' },
        { label: 'coordinate', value: 'coordinate' }
    ];
    public selectedcolumnType: any;
    public tableTypes: SelectItem[] = [{ label: 'Dimension', value: 'dimension' }, { label: 'Fact', value: 'fact' }, { label: 'View', value: 'view' }];
    public selectedTableType: string;

    // Aggregation Types
    public selectedAggType: any;
    public aggTypes: SelectItem[] = aggTypes;

    // Relations
    public tmpRelations: any = [];

    // DB types[]
    public tiposBD: SelectItem[] = [
        { label: 'Postgres', value: 'postgres' },
        { label: 'Sql Server', value: 'sqlserver' },
        { label: 'MySQL', value: 'mysql' },
        { label: 'Vertica', value: 'vertica' },
        { label: 'Oracle', value: 'oracle' },
        { label: 'BigQuery', value: 'bigquery' },
        { label: 'SnowFlake', value: 'snowflake'},
        { label: 'JsonWebService', value: 'jsonwebservice'}
    ];
    public selectedTipoBD: SelectItem;

    // table permissions
    public permissions: Array<any>;

    // model permissions
    public modelPermissions: Array<any>;

    constructor(public dataModelService: DataSourceService,
        private alertService: AlertService,
        private queryBuilderService: QueryBuilderService,
        private spinnerService: SpinnerService,
        private router: Router) {
        //
        const _me = this;

        this.navigationSubscription = this.router.events.subscribe(
            (res: any) => {
                if (res instanceof NavigationEnd) {
                    this.tablePanel = new EditTablePanel();
                    this.modelPanel = new EditModelPanel();
                    this.columnPanel = new EditColumnPanel();
                }
            }, err => {
                this.alertService.addError(err);
            }
        );
        

        this.permissionsColumn = new EdaTable({
            contextMenu: new EdaContextMenu({
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'ELIMINAR', command: () => {
                            
                            let elem : any =  this.permissionsColumn.getContextMenuRow();
                            
                            try {
                                elem = this.permissionsColumn.getContextMenuRow()._id?.reduce((a, b)=> a + b) ;
                            } catch (e) {

                            }
                            
                            const dynValue = this.modelPanel.metadata.model_granted_roles.filter(r => r.value !== undefined)
                            .filter(r => r.value !== "(x => None)" && r.value !== "(~ => All)")
                            .filter(r => r.value != elem.value );
                            
                            const users = this.modelPanel.metadata.model_granted_roles.filter(r => r.users !== undefined && r.users.length > 0  )
                            .filter(r => r.users.reduce((a, b)=> a + b) !== elem);

                            const groups = this.modelPanel.metadata.model_granted_roles.filter(r => r.groups !== undefined && r.groups.length > 0  )
                            .filter(r => r.groups.reduce((a, b)=> a + b) !== elem);
   
                            let tmpPermissions = [];
                            dynValue.forEach(dyn => tmpPermissions.push(dyn))
                            groups.forEach(group => tmpPermissions.push(group));
                            users.forEach(user => tmpPermissions.push(user));

                            this.modelPanel.metadata.model_granted_roles = tmpPermissions;
  
                            this.update();
                            this.permissionsColumn._hideContexMenu();
                        }
                    })
                ]
            }),
            cols: [
                new EdaColumnContextMenu(),
                new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
                new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
                new EdaColumnText({ field: 'value', header: $localize`:@@valueTable:VALOR` }),
            ]
        });


        

        this.permissionTable = new EdaTable({
            contextMenu: new EdaContextMenu({
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'ELIMINAR', command: () => {
                            const elem = this.permissionTable.getContextMenuRow()._id.reduce((a, b)=> a + b) ;
                            const users = this.modelPanel.metadata.model_granted_roles.filter(r => r.users !== undefined)
                            .filter(r => r.users.reduce((a, b)=> a + b) !== elem);

                            const groups = this.modelPanel.metadata.model_granted_roles.filter(r => r.groups !== undefined)
                            .filter(r => r.groups.reduce((a, b)=> a + b) !== elem);

                            let tmpPermissions = [];
                            groups.forEach(group => tmpPermissions.push(group));
                            users.forEach(user => tmpPermissions.push(user));

                            this.modelPanel.metadata.model_granted_roles = tmpPermissions;
                            this.update();
                 
                            this.permissionTable._hideContexMenu();
                        }
                    })
                ]
            }),
            cols: [
                new EdaColumnContextMenu(),
                new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
                new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
                new EdaColumnText({ field: 'permission', header:"permission" }),
            ]
        });



        this.permissionModel = new EdaTable({
            contextMenu: new EdaContextMenu({
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'ELIMINAR', command: () => {
                            const elem = this.permissionModel.getContextMenuRow()._id.reduce((a, b)=> a + b) ;
                            const users = this.modelPanel.metadata.model_granted_roles.filter(r => r.users !== undefined)
                            .filter(r => r.users.reduce((a, b)=> a + b) !== elem);
                            const groups = this.modelPanel.metadata.model_granted_roles.filter(r => r.groups !== undefined)
                            .filter(r => r.groups.reduce((a, b)=> a + b) !== elem);
                            let tmpPermissions = [];
                            groups.forEach(group => tmpPermissions.push(group));
                            users.forEach(user => tmpPermissions.push(user));
                            this.modelPanel.metadata.model_granted_roles = tmpPermissions;
                            this.update();
                            this.permissionModel._hideContexMenu();
                        }
                    })
                ]
            }),
            cols: [
                
                new EdaColumnContextMenu(),
                new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
                new EdaColumnText({ field: 'group', header: $localize`:@@groupTable:GRUPO` }),
                new EdaColumnText({ field: 'permission', header:"permission" }),
            ]
        });


        this.relationsTable = new EdaTable({
            contextMenu: new EdaContextMenu({
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'ELIMINAR', command: () => {
                            this.deleteRelation(this.relationsTable.getContextMenuRow()._id);
                            this.relationsTable._hideContexMenu();
                        }
                    })
                ]
            }),
            cols: [
                new EdaColumnFunction({ click: (relation) => this.deleteRelation(relation._id) }),
                new EdaColumnText({ field: 'origin', header: $localize`:@@originRel:Origen` }),
                new EdaColumnText({ field: 'dest', header: $localize`:@@targetRel:Destino` })
            ]
        })

    }

    ngOnInit() {
        this.carregarPanels();
        this.items = [{
            label: 'Options',
            items: [{
                label: 'Update',
                icon: 'pi pi-refresh',
                command: () => {
                    //this.update();
                }
            },
            {
                label: 'Delete',
                icon: 'pi pi-times',
                command: () => {
                    // this.delete();
                }
            }
            ]
        },
        {
            label: 'Navigate',
            items: [{
                label: 'Angular Website',
                icon: 'pi pi-external-link',
                url: 'http://angular.io'
            },
            {
                label: 'Router',
                icon: 'pi pi-upload',
                routerLink: '/fileupload'
            }
            ]
        }
        ];
    }

    ngOnDestroy(): void {
        this.typePanel = '';
        this.dataModelService.ngOnDestroy();
        this.navigationSubscription.unsubscribe();
        this.navigationSubscription.complete();
    }

    carregarPanels() {
        // Modelo
        this.dataModelService.currentModelPanel.subscribe(
            modelPanel => {
                this.modelPanel = modelPanel;
                this.permissions = this.modelPanel.metadata ? this.modelPanel.metadata.model_granted_roles : [];
                 // Permisos del model
                this.permissionModel.value = [];
                this.permissions.forEach(permission => {
                    if (  permission.table === "fullModel" && permission.column === "fullModel" ) {
                        this.permissionModel.value.push(
                            {
                                user: permission.usersName,
                                group: permission.groupsName,
                                permission: permission.permission?this.si:this.no,
                                _id: permission.users || permission.groups
                            }
                        );
                    }
                });

            }, err => {
                this.alertService.addError(err);
            }
        );

        // tabla 
        this.dataModelService.currentTablePanel.subscribe(
            tablePanel => {
                this.tablePanel = tablePanel;
                this.tmpRelations = tablePanel.relations.filter(r => r.visible === true);
                this.relationsTable.value = []
                this.permissions = this.modelPanel.metadata ? this.modelPanel.metadata.model_granted_roles : [];
                this.permissionTable.value = [];
                // permisos de la taula.
                this.permissions.forEach(permission => {
                    if (this.tablePanel.technical_name === permission.table&&permission.column === "fullTable") {
                        this.permissionTable.value.push(
                            {
                                user: permission.usersName,
                                group: permission.groupsName,
                                permission: permission.permission?this.si:this.no,
                                _id: permission.users || permission.groups
                            }
                        );
                    }
                });
                tablePanel.relations.filter(r => r.visible === true).forEach(relation => {
                    const row = {
                        origin: relation.source_column,
                        dest: `${relation.target_table}.${relation.target_column}`,
                        _id: relation
                    };
                    if (!this.relationsTable.value.map(value => value.dest).includes(row.dest) ) {
                        this.relationsTable.value.push(row);
                    } else if(!this.relationsTable.value.map(value => value.origin).includes(relation.source_column)){
                        this.relationsTable.value.push(row);
                    }
                    
                });
                //Update to contain only actual values
                this.relationsTable.value = this.relationsTable.value.filter(table => this.tmpRelations.includes(table._id))
                this.selectedTableType = tablePanel.table_type;
            }, err => {
                this.alertService.addError(err);
            }
        );

        //Columna
        this.dataModelService.currentColumnPanel.subscribe(
            columnPanel => {

                this.columnPanel = columnPanel;
                this.selectedcolumnType = this.columnPanel.column_type;
                this.selectedAggType = this.columnPanel.aggregation_type;

                this.permissions = this.modelPanel.metadata ? this.modelPanel.metadata.model_granted_roles : [];
                this.permissionsColumn.value = [];
                this.permissions.forEach(permission => {

                    const table = this.dataModelService.getTable(this.columnPanel);

                    if (this.columnPanel.technical_name === permission.column && table.table_name === permission.table && permission.column != "fullTable" ) {
                        this.permissionsColumn.value.push(
                            {
                                user: permission.usersName,
                                group: permission.groupsName,
                                value: permission.value,
                                _id: permission.users || permission.groups
                            }
                        );
                    }
                });
            }, err => {
                this.alertService.addError(err);
            }
        );



        this.dataModelService.currentTypePanel.subscribe(
            typePanel => {
                this.typePanel = typePanel;
            }, err => this.alertService.addError(err)
        );

        this.dataModelService.currentModelPanel.subscribe(
            modelPanel => {
                this.modelPanel = modelPanel;
                this.selectedTipoBD = this.tiposBD.filter(type => type.value === modelPanel.connection.type)[0];
            }, err => this.alertService.addError(err)
        );

    }


    update() {
        switch (this.typePanel) {
            case 'tabla': this.updateTable(); break;
            case 'columna': this.updateColumn(); break;
            case 'root': this.updateModel(); break;
        }
    }

    updateModel() {
        if (this.modelPanel.type) {
            this.dataModelService.changeModel(this.modelPanel);
        }
    }

    updateTable() {
        if (this.tablePanel.technical_name) {
            this.dataModelService.changeTablePanel(this.tablePanel);
        }
    }

    updateColumn() {
        if (this.columnPanel.technical_name) {
            this.dataModelService.changeColumnPanel(this.columnPanel);
        }
    }

    toggle_table(visible: boolean) {
        this.tablePanel.visible = visible ? false : true;
        this.update();
    }

    toggle_column(visible: boolean) {
        this.columnPanel.visible = visible ? false : true;
        this.update();
    }

    updateColumnType() {
        this.columnPanel.column_type = this.selectedcolumnType;
        this.update();
    }

    updateTableType() {
        this.tablePanel.table_type = this.selectedTableType;
        this.update();
    }

    updateAgg() {
        this.columnPanel.aggregation_type = this.selectedAggType;
        this.update();
    }

    setDbType() {

        this.modelPanel.connection.type = this.selectedTipoBD.value;
        this.update();
    }

    deleteRelation(relation) {
        this.dataModelService.deleteRelation(relation);
    }
    deleteCalculatedCol(columnPanel: EditColumnPanel) {
        this.dataModelService.deleteCalculatedCol(columnPanel);
        this.typePanel = 'tabla';
        this.update();
    }
    deleteView(tableName: string) {
        this.dataModelService.deleteView(tableName);
        this.typePanel = 'root';
        this.update();
    }


    deleteValuesList(columnPanel: EditColumnPanel){
        this.columnPanel.valueListSource = null;
        this.dataModelService.deleteValuesList(columnPanel);
        this.update();
    }



    checkCalculatedColumn(columnPanel: EditColumnPanel) {
        this.spinnerService.on();
        const table = this.dataModelService.getTable(columnPanel);
        const column = table.columns.filter(col => col.column_name === columnPanel.technical_name)[0];
        const agg = ['sum', 'max', 'min', 'avg', 'count', 'distinct'];
        let exists = 0;
        agg.forEach(e => { if (column.SQLexpression.toString().toLowerCase().indexOf(e) >= 0) { exists = 1; } });

        if (exists == 0 && column.column_type == 'numeric' ) {
            this.alertService.addError($localize`:@@IncorrectQueryAgg:Debes incluir la agregación (distinct, sum, max, min, etc)`);
            this.spinnerService.off()
        } else {
            const queryParams: QueryParams = {
                table: table.table_name,
                dataSource: this.dataModelService.model_id,
            };
            const query = this.queryBuilderService.simpleQuery(column, queryParams);
            this.dataModelService.executeQuery(query).subscribe(
                res => { this.alertService.addSuccess($localize`:@@CorrectQuery:Consulta correcta`); this.spinnerService.off() },
                err => { this.alertService.addError($localize`:@@IncorrectQuery:Consulta incorrecta`); this.spinnerService.off() }
            );
        }
    }
    checkConection() {
        this.spinnerService.on();
        let connection = this.modelPanel.connection;
        let id = this.dataModelService.model_id;
        this.dataModelService.testStoredConnection(connection, id).subscribe(
            res => { this.alertService.addSuccess($localize`:@@EstablishedConnections:Conexión establecida`); this.spinnerService.off() },
            err => { this.alertService.addError($localize`:@@IncorrectConnectionData:Datos de conexión incorrectos`); this.spinnerService.off() }
        );
    }

    openTableRelationDialog() {
        this.relationController = new EdaDialogController({
            params: { table: this.tablePanel },
            close: (event, response) => {

                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addRelation(response);
                }

                this.relationController = undefined;
            }
        });
    }

    openNewColDialog() {
        this.newColController = new EdaDialogController({
            params: { table: this.tablePanel },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addCalculatedColumn(response);
                    this.update();
                    this.typePanel = 'columna';
                    const node: TreeNode = this.dataModelService.getTreeColumn(this.tablePanel.name,
                        this.tablePanel.columns[this.tablePanel.columns.length - 1]);
                    this.dataModelService.editColumn(node);
                    this.dataModelService.expandNode(node);
                }

                this.newColController = undefined;
            }
        })
    }
    openNewViewDialog() {
        this.viewController = new EdaDialogController({
            params: { user: sessionStorage.getItem('user'), model_id: this.dataModelService.model_id },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addView(response);

                }
                this.viewController = undefined;
            }
        })
    }

    openNewMapDialog() {
        this.mapController = new EdaDialogController({
            params: {},
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    if (response.newMap) {
                        this.dataModelService.addLinkedToMapColumns(response.linkedColumns, response.mapID);
                    }
                    this.dataModelService.updateMaps(response.serverMaps);
                }
                this.mapController = undefined;
            }
        })
    }

    openCSVDialog() {
        this.csvPanelController = new EdaDialogController({
            params: { model_id: this.dataModelService.model_id },
            close: (event, response) => {
                if (response) {
                    this.onTableCreated.emit();
                }
                this.csvPanelController = undefined;
            }
        })
    }

    openCacheDialog() {
        this.cacheController = new EdaDialogController({
            params: { model_id: this.dataModelService.model_id, config:this.modelPanel.metadata.cache_config },
            close: (event, response) => {
                if (response) {
                    this.dataModelService.addCacheConfig(response);
                }
                this.cacheController = undefined;
            }
        })
    }

    openSecurityDialog(){
        this.securityController = new EdaDialogController({
            params: { model: this.modelPanel },
            close: (event) => {
                this.securityController = undefined;
            }
        })
    }

    openValueListDialog() {
        const table = this.dataModelService.getTable(this.columnPanel);
        this.valueListController = new EdaDialogController({
            params: { column: this.columnPanel, table: table },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addValueListSource(response);
                    this.updateColumn();
                }

                this.valueListController = undefined;
            }
        });
    }
    
    openPermissionsRelationDialog() {
        const table = this.dataModelService.getTable(this.columnPanel);
        this.permissionsController = new EdaDialogController({
            params: { column: this.columnPanel, table: table },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addPermission(response);
                    this.updateColumn();
                }

                this.permissionsController = undefined;
            }
        });
    }


    openTablePermissionsDialog() {
        this.tablePermissionsController = new EdaDialogController({
            params: { table: this.tablePanel },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addPermission(response);
                    this.update();
                }
                this.tablePermissionsController = undefined;
            }
        });
    }

    openModelPermissionsDialog() {
        this.modelPermissionsController = new EdaDialogController({
            params: {   },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addPermission(response);
                    this.update();
                }
                this.modelPermissionsController = undefined;
            }
        });
    }


    hideAllTables() {
        this.dataModelService.hideAllTables();
    }

    hideAllColumns(tablePanel: any) {
        this.dataModelService.hideAllColumns(tablePanel);
    }

    hideAllRelations() {
        this.dataModelService.hideAllRelations();
    }
}


