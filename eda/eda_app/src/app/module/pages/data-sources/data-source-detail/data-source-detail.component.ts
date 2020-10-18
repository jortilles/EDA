import { EdaTable, EdaColumnText, EdaColumnContextMenu } from '@eda/components/component.index';
import { Component, OnInit, OnDestroy, EventEmitter, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { SelectItem, TreeNode } from 'primeng/api';
import { AlertService, DataSourceService, QueryParams, QueryBuilderService, SpinnerService } from '@eda/services/service.index';
import { EditTablePanel, EditColumnPanel, EditModelPanel } from '@eda/models/data-source-model/data-source-models';
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

    public form: FormGroup;
    public table: EdaTable;
    public relationsTable: EdaTable;
    public navigationSubscription: any;
    // Properties
    public tablePanel: EditTablePanel;
    public columnPanel: EditColumnPanel;
    public modelPanel: EditModelPanel;
    public typePanel: string;
    public relationController: EdaDialogController;
    public permissionsController: EdaDialogController;
    public newColController: EdaDialogController;
    public mapController : EdaDialogController;
    public viewController : EdaDialogController;
    public csvPanelController : EdaDialogController;
    public functionalities : string = $localize`:@@functionalities:Funcionalidades`

    // Types canvi tonto
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
        { label: 'Oracle', value: 'oracle' }
    ];
    public selectedTipoBD: SelectItem;

    // Permisisons table
    public permissions: Array<any>;

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
        this.table = new EdaTable({
            contextMenu: new EdaContextMenu({
                contextMenuItems: [
                    new EdaContextMenuItem({
                        label: 'ELIMINAR', command: () => {
                            this.modelPanel.metadata.model_granted_roles =
                                this.modelPanel.metadata.model_granted_roles.filter(r => r.users[0] != this.table.getContextMenuRow()._id[0])
                            this.updateColumn();
                            this.table._hideContexMenu();
                        }
                    })
                ]
            }),
            cols: [
                new EdaColumnContextMenu(),
                new EdaColumnText({ field: 'user', header: $localize`:@@userTable:USUARIO` }),
                new EdaColumnText({ field: 'value', header: $localize`:@@valueTable:VALOR` }),
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
                new EdaColumnFunction( {click: (relation) =>  this.deleteRelation(relation._id)}),
                new EdaColumnText({ field: 'origin', header: $localize`:@@originRel:Origen` }),
                new EdaColumnText({ field: 'dest', header: $localize`:@@targetRel:Destino` })
            ]
        })

    }

    ngOnInit() {
        this.carregarPanels();
    }

    ngOnDestroy(): void {
        this.typePanel = '';
        this.dataModelService.ngOnDestroy();
        this.navigationSubscription.unsubscribe();
        this.navigationSubscription.complete();
    }

    carregarPanels() {
        this.dataModelService.currentTablePanel.subscribe(
            tablePanel => {
                this.tablePanel = tablePanel;
                this.tmpRelations = tablePanel.relations.filter(r => r.visible === true);
                this.relationsTable.value = []
                tablePanel.relations.filter(r => r.visible === true).forEach(relation => {
                    const row = {
                        origin: relation.source_column,
                        dest: `${relation.target_table}.${relation.target_column}`,
                        _id: relation
                    };
                    if (!this.relationsTable.value.map(value => value.dest).includes(row.dest)) {
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

        this.dataModelService.currentColumnPanel.subscribe(
            columnPanel => {
                this.columnPanel = columnPanel;
                this.selectedcolumnType = this.columnPanel.column_type;
                this.selectedAggType = this.columnPanel.aggregation_type;

                this.permissions = this.modelPanel.metadata ? this.modelPanel.metadata.model_granted_roles : [];
                this.table.value = [];
                this.permissions.forEach(permission => {
                    if (this.columnPanel.technical_name === permission.column) {
                        this.table.value.push({ user: permission.usersName, value: permission.value, _id: permission.users });
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
        this.modelPanel.connection.type = this.selectedTipoBD.label;
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
    deleteView(tableName : string){
        this.dataModelService.deleteView(tableName);
        this.typePanel = 'root';
        this.update();
    }

    checkCalculatedColumn(columnPanel: EditColumnPanel) {
        this.spinnerService.on();
        const table = this.dataModelService.getTable(columnPanel);
        const column = table.columns.filter(col => col.column_name === columnPanel.technical_name)[0];

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
    openNewViewDialog(){
        this.viewController = new EdaDialogController({
            params : {user:localStorage.getItem('user'), model_id:this.dataModelService.model_id},
            close: (event, response) => {
                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                    this.dataModelService.addView(response);
                   
                }
                this.viewController = undefined;
            }
        })
    }

    openNewMapDialog(){
        this.mapController = new EdaDialogController({
            params : {},
            close: (event, response) => {
                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                    if(response.newMap){
                        this.dataModelService.addLinkedToMapColumns(response.linkedColumns, response.mapID);
                    }
                   this.dataModelService.updateMaps(response.serverMaps);
                }
                this.mapController = undefined;
            }
        })
    }

    openCSVDialog(){
        this.csvPanelController = new EdaDialogController({
            params : {model_id : this.dataModelService.model_id},
            close: (event, response) => {
                if(response){
                   this.onTableCreated.emit();
                }
                this.csvPanelController = undefined;
            }
        })
    }

    openPermissionsRelationDialog() {
        this.permissionsController = new EdaDialogController({
            params: { column: this.columnPanel, table: this.tablePanel },
            close: (event, response) => {
                if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
                    this.dataModelService.addPermission(response);
                    this.updateColumn();
                }

                this.permissionsController = undefined;
            }
        });
    }
}


