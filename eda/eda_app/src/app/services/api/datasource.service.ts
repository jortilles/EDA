import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { TreeNode } from 'primeng/api';
import { ApiService } from './api.service';
import { EditModelPanel, EditColumnPanel, EditTablePanel, Relation, ValueListSource } from '@eda/models/data-source-model/data-source-models';
import { AlertService } from '../alerts/alert.service';
import { aggTypes } from '../../config/aggretation-types';


@Injectable()
export class DataSourceService extends ApiService implements OnDestroy {

    public void_tablePanel: EditTablePanel = {
        type: '',
        name: '',
        technical_name: '',
        description: '',
        query : '',
        relations: [{
            source_table: '',
            source_column: [],
            target_table: '',
            target_column: [],
            visible: false
        }],
        table_type: '',
        table_granted_roles: '',
        columns: [],
        visible: false,
    };

    private _databaseModel = new BehaviorSubject<any>([]); // [{ display_name: { default: '' }, eda-columns: [] }] --> just in case
    databaseModel = this._databaseModel.asObservable();

    private _modelMetadata = new BehaviorSubject<any>([]);

    private _modelConnection = new BehaviorSubject<any>([]);
    modelConnection = this._modelConnection.asObservable();

    public _unsaved = new BehaviorSubject<boolean>(false);
    unsaved = this._unsaved.asObservable();

    private _modelPanel = new BehaviorSubject<EditModelPanel>(
        {
            type: '',
            connection: {
                type: '', host: '', database: ' ', user: ' ', password: ' ', schema : '', port:null, warehouse:''
            },
            metadata: {
                model_name: ' ', model_granted_roles: [], cache_config:{}, filter:''
            }
        }
    );
    currentModelPanel = this._modelPanel.asObservable();

    private _tablePanel = new BehaviorSubject<EditTablePanel>(this.void_tablePanel);    // Manages tables edit information -> used by edit-model.component
    currentTablePanel = this._tablePanel.asObservable();

    private _columnPanel = new BehaviorSubject(new EditColumnPanel());  // Manages eda-columns edit information -> used by edit-model.component
    currentColumnPanel = this._columnPanel.asObservable();

    private _typePanel = new BehaviorSubject('');                       // Manages panel type to display -> used by edit-model.component
    currentTypePanel = this._typePanel.asObservable();

    private _treeData = new BehaviorSubject<TreeNode[]>([]);            // Manages Tree object generated through dataModel object
    currentTreeData = this._treeData.asObservable();

    private _maps = new BehaviorSubject<Array<Object>>([{}]);
    currentMaps = this._maps.asObservable();

    model_id: string;

    private globalDSRoute = '/datasource';

    constructor(protected http: HttpClient,
        private alertService: AlertService) {
        super(http);
    }

    ngOnDestroy(): void {
        this.cleanAll();
    }

    cleanAll() {
        this._databaseModel.next([]);
        this._modelMetadata.next([]);
        this._modelConnection.next([]);
        this._typePanel.next('');
        this._treeData.next([]);
        this._unsaved.next(false)
    }

    expandNode(node){
        this._treeData.getValue()[0].children.forEach( n => {
            if(node.parent.label === n.label){
                const child = n.children.filter(c => c.label === node.label)[0];
                this._treeData.getValue()[0].expanded = true;
                n.expanded = true;
                child.expanded = true;
            }  
        } );
        //this._treeData.next( this._treeData.getValue())
    }


    /** Generates tree from DataModel */
    generateTree(model_name?: string, table_name?: string, element?:any): Array<TreeNode> {
        // Root node --> Model name
        const root: TreeNode = {
            label: this._modelMetadata.getValue().model_name,
            data: 'root',
            children: [],
            icon: 'fa  fa-sitemap',
            expanded: model_name ? true : false,
            type: element && element.type === 'root' ? 'selected' : 'unselected'
        };

        // table nodes
        const tables: Array<TreeNode> = [];
        this._databaseModel.getValue()
            .forEach((table:any) => {
                const currTable: TreeNode = {};
                currTable.label = table.display_name.default;
                currTable.data = 'tabla';
                currTable.children = [];
                currTable.collapsedIcon = 'fa fa-table';
                currTable.expandedIcon = 'fa fa-table';
                currTable.expanded = table_name === table.display_name.default;
                currTable.type = element &&  element.name === table.display_name.default ? 'selected' : 'unselected'
                tables.push(currTable);

                // Column nodes
                table.columns.forEach((column: { display_name: { default: string; }; }) => {
                    const currCol: TreeNode = {};
                    currCol.label = column.display_name.default;
                    currCol.data = 'columna';
                    currCol.children = [];
                    currCol.icon = 'fa fa-columns';
                    currCol.type = element && element.name === column.display_name.default ? 'selected' : 'unselected'
                    currTable.children.push(currCol);

                });
            });
        // order by name....
        tables.sort((a, b) => {
            return (a.label > b.label) ? 1 : ((b.label > a.label) ? -1 : 0)
        });

        root.children = tables;
        return [root];
    }


    /**
     * Updates all the data when is edited
     * @param tablePanel
     */
    changeTablePanel(tablePanel: EditTablePanel) {
        this._tablePanel.next(tablePanel);
        this.updateDataModel(tablePanel);
    }

    changeColumnPanel(columnPanel: EditColumnPanel) {
        this._columnPanel.next(columnPanel);
        this.updateDataModel(columnPanel);
    }

    changeModel(modelPanel: EditModelPanel) {
        this._modelPanel.next(modelPanel);
        this._modelConnection.next(modelPanel.connection);
        this._modelMetadata.next(modelPanel.metadata);
        this.updateDataModel(modelPanel);
    }

    /* Updates tree with new model **/
    changeTree() {
        this._treeData.next(this.generateTree());
    }

    getModel() {
        return this._databaseModel.getValue();
    }
    getMaps() {
        return this._maps.getValue();
    }

    getTreeColumn(tableLabel: string, col: any, ) {
        const tree = this._treeData.getValue();
        const node: TreeNode = tree[0].children
            .filter(child => child.label === tableLabel)[0]
            .children.filter(child => child.label === col.column_name)[0];
        node.parent = tree[0].children.filter(child => child.label === tableLabel)[0];
        return node;
    }

    editModel(node: TreeNode) {
        const modelPanel = new EditModelPanel();
        modelPanel.type = node.data;        // 'root'
        modelPanel.connection = this._modelConnection.getValue();
        modelPanel.metadata = this._modelMetadata.getValue();
        this._modelPanel.next(modelPanel);
        this._typePanel.next('root');
    }

    editTable(node: TreeNode): void {
        const tablePanel = new EditTablePanel();
        const table: any = this.getTableByName(node.label);
        tablePanel.name = node.label;
        tablePanel.type = node.data;
        tablePanel.description = table.description.default;
        tablePanel.query = table.query,
        tablePanel.relations = table.relations;
        tablePanel.table_granted_roles = table.table_granted_roles;
        tablePanel.technical_name = table.table_name;
        tablePanel.table_type = table.table_type;
        tablePanel.visible = table.visible;
        tablePanel.columns = table.columns;
        this._tablePanel.next(tablePanel);
        this._typePanel.next('tabla');

    }

    editColumn(node: TreeNode): void {
        const columnPanel = new EditColumnPanel();
        const column: any = this.getColumnByName(node.parent.label, node.label);
        columnPanel.type = node.data;
        columnPanel.name = node.label;
        columnPanel.column_type = column.column_type;
        columnPanel.technical_name = column.column_name;
        columnPanel.description = column.description.default;

        columnPanel.SQLexpression = column.SQLexpression;
        columnPanel.computed_column = column.computed_column ? column.computed_column : 'no';

        columnPanel.aggregation_type = column.aggregation_type.map((a: { value: any; }) => a.value);
        columnPanel.column_granted_roles = column.column_granted_roles;
        columnPanel.row_granted_roles = column.row_granted_roles;
        columnPanel.minimumFractionDigits = parseInt(column.minimumFractionDigits);
        columnPanel.visible = column.visible;
        columnPanel.parent = node.parent.label;
        if(column.valueListSource){
            columnPanel.valueListSource =column.valueListSource;
        }
        this._columnPanel.next(columnPanel);
        this._typePanel.next('columna');
    }
  

    // Aux functions
    getTableByName(tableName: string): Array<Relation> {
        return this._databaseModel.getValue().find((n: { display_name: { default: string; }; }) =>
            n.display_name.default === tableName
        );
    }

    getColumnByName(parent: string, child: string) {
        const table: any = this.getTableByName(parent);
        return table.columns.find((col: { display_name: { default: string; }; }) => col.display_name.default === child);
    }

    deleteRelation(rel: Relation) {

        // Relacions visibles/invisibles ??? ---------------------- WARNING !!!!!!!!!!!!!!! 

        // Update TablePanel
        const tmp_panel = this._tablePanel.getValue();
        const tmp_relationIndex = tmp_panel.relations.findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
            return r.source_table === rel.source_table && r.source_column === rel.source_column
                && r.target_table === rel.target_table && r.target_column === rel.target_column;
        });
        tmp_panel.relations[tmp_relationIndex].visible = false;
        this._tablePanel.next(tmp_panel);

        // Update source table
        const srcTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.source_table);
        const srcRelationIndex = this.getRelationIndex(rel, srcTableIndex);
        const tmp_model = this._databaseModel.getValue();
        tmp_model[srcTableIndex].relations[srcRelationIndex].visible = false;
        //tmp_model[srcTableIndex].relations =  tmp_model[srcTableIndex].relations.filter(r => r.visible === true);

        // Update target table
        const tgTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.target_table);
        const targetRelation: Relation = {
            source_table: rel.target_table,
            source_column: rel.target_column,
            target_table: rel.source_table,
            target_column: rel.source_column,
            visible: true
        };

        const targetRelIndex = this.getRelationIndex(targetRelation, tgTableIndex);
        tmp_model[tgTableIndex].relations[targetRelIndex].visible = false;
        //tmp_model[tgTableIndex].relations =  tmp_model[tgTableIndex].relations.filter(r => r.visible === true);
        // Update model
        this._databaseModel.next(tmp_model);
    }

    addRelation(rel: Relation) {
        // Update tablePanel
        const tmp_panel = this._tablePanel.getValue();
        const tmp_relationIndex = tmp_panel.relations.findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
            return r.source_table === rel.source_table && JSON.stringify(r.source_column) === JSON.stringify(rel.source_column)
                && r.target_table === rel.target_table && JSON.stringify(r.target_column) === JSON.stringify(rel.target_column);
        });
        if (tmp_relationIndex >= 0) {
            tmp_panel.relations[tmp_relationIndex].visible = true;
        } else {
            tmp_panel.relations.push(rel);
        }
        this._tablePanel.next(tmp_panel);

        // Update source table
        const srcTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.source_table);
        const relIndex = this.getRelationIndex(rel, srcTableIndex);
        const tmp_model = this._databaseModel.getValue();
        if (relIndex < 0) {
            tmp_model[srcTableIndex].relations.push(rel);
        } else {
            tmp_model[srcTableIndex].relations[relIndex].visible = true;
        }

        // Update target table
        const tgTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.target_table);
        const targetRelation: Relation = {
            source_table: rel.target_table,
            source_column: rel.target_column,
            target_table: rel.source_table,
            target_column: rel.source_column,
            visible: true
        };

        const targetRelIndex = this.getRelationIndex(targetRelation, tgTableIndex);
        if (targetRelIndex < 0) {
            tmp_model[tgTableIndex].relations.push(targetRelation);
        } else {
            tmp_model[tgTableIndex].relations[targetRelIndex].visible = true;
        }

        this._databaseModel.next(tmp_model);
    }

    /** add a value list as the source of a column */
    addValueListSource(ValueListSource: any) {
       const tmp_panel = this._columnPanel.getValue();
       tmp_panel.valueListSource = ValueListSource;
       this._columnPanel.next(tmp_panel);
       this.updateDataModel(tmp_panel);
    }

    addPermission(permission: any) {
        let tmpMetadata = this._modelMetadata.getValue();
        tmpMetadata.model_granted_roles.push(permission);
        this._modelMetadata.next(tmpMetadata);
    }

    addCacheConfig(config:any){
        let tmpMetadata = this._modelMetadata.getValue();
        tmpMetadata.cache_config = config;
        this._modelMetadata.next(tmpMetadata);
    }

    getRelationIndex(rel: Relation, tableIndex: string | number) {
        return this._databaseModel.getValue()[tableIndex].relations
            .findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
                return r.source_table === rel.source_table && JSON.stringify(r.source_column) === JSON.stringify(rel.source_column)
                && r.target_table === rel.target_table && JSON.stringify(r.target_column) === JSON.stringify(rel.target_column);
            });
    }

    updateDataModel(panel: any) {
        if (panel.type === 'tabla') {
            const tableIndex = this._databaseModel.getValue().findIndex((table: { table_name: any; }) => table.table_name === panel.technical_name);
            const tmp_model = this._databaseModel.getValue();

            tmp_model[tableIndex].display_name.default = panel.name;
            tmp_model[tableIndex].description.default = panel.description;
            tmp_model[tableIndex].relations = panel.relations;
            tmp_model[tableIndex].table_type = panel.table_type;
            tmp_model[tableIndex].table_granted_roles = panel.table_granted_roles;
            tmp_model[tableIndex].visible = panel.visible;
            tmp_model[tableIndex].query = panel.query;

            this._databaseModel.next(tmp_model);

        } else if (panel.type === 'columna') {


            const tableIndex = this._databaseModel.getValue().findIndex((table: { display_name: { default: any; }; }) => table.display_name.default === panel.parent);
            const columnindex = this._databaseModel.getValue()[tableIndex].columns.findIndex((col: { column_name: any; }) => col.column_name === panel.technical_name);
            const tmp_model = this._databaseModel.getValue();

            tmp_model[tableIndex].columns[columnindex].display_name.default = panel.name;
            tmp_model[tableIndex].columns[columnindex].column_type = panel.column_type;
            tmp_model[tableIndex].columns[columnindex].description.default = panel.description;
            tmp_model[tableIndex].columns[columnindex].SQLexpression = panel.SQLexpression;

            tmp_model[tableIndex].columns[columnindex].aggregation_type = panel.aggregation_type.map((a: any) => {
                let display_name = aggTypes.filter(tmp => tmp.value === a);
                return { value: a, 'display_name': display_name[0] ? display_name[0].label : 'No' };
            });

            tmp_model[tableIndex].columns[columnindex].minimumFractionDigits = parseInt(panel.minimumFractionDigits) || 0;
            tmp_model[tableIndex].columns[columnindex].column_granted_roles = panel.column_granted_roles;
            tmp_model[tableIndex].columns[columnindex].row_granted_roles = panel.row_granted_roles;
            tmp_model[tableIndex].columns[columnindex].visible = panel.visible;

            if( panel.valueListSource  ){
                tmp_model[tableIndex].columns[columnindex].valueListSource = panel.valueListSource;
            }
            
            this._databaseModel.next(tmp_model);

        } else if (panel.type === 'root') {
        }
        this._unsaved.next(true)
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name, panel.parent, panel));
    }

    addCalculatedColumn(dialogRes: any) {

        const tableIndex = this._databaseModel.getValue().findIndex((table: any) => table.table_name === dialogRes.table_name);
        const tmp_model = this._databaseModel.getValue();

        tmp_model[tableIndex].columns.push(dialogRes.column);
        this._databaseModel.next(tmp_model);
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name));

    }

    addView(table:any){

        const tmp_model = this._databaseModel.getValue();
        tmp_model.push(table);
        this._databaseModel.next(tmp_model);
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name));
    }

    updateMaps(mapList:Array<any>){
        //get map list and model
        this._maps.next(mapList);
        let tmp_model = this.getModel();

        //Map tables to get his index and the array of columns with map link
        let tables = this.getModel()
            .map((table, i) => ({i:i, cols: table.columns.filter(col => col.hasOwnProperty('linkedMap'))}))
            .filter(x=>x.cols.length>0);

        //Get maps ID's
        let maps = mapList.map(map => map.mapID);

        //If column's linkedMap not in id's list delete property
        for (let i = 0; i < tables.length; i++){
            for(let j = 0; j < tables[i].cols.length; j++){
                let col = tmp_model[tables[i].i].columns.filter(col => col.column_name === tables[i].cols[j].column_name)[0];
                if(!maps.includes(col.linkedMap)){
                    delete col.linkedMap;
                }
            }
        }

        //Update model
        this._databaseModel.next(tmp_model);

    }

    addLinkedToMapColumns(columns:Array<any>, linkedMap: string){
        let tmp_model = this.getModel();
        columns.forEach(column => {
            let table = tmp_model.filter(table => table.table_name === column.table)[0];
            table.columns.filter(col => col.column_name === column.col.column_name)[0].linkedMap = linkedMap;
        });
       this._databaseModel.next(tmp_model);
    }

    hideAllTables(){
        let tmp_model = this.getModel();
        tmp_model.forEach(table => table.visible = false);
        this._databaseModel.next(tmp_model);
      
    }

    
    hideAllColumns(tablePanel:any){
        let tmp_model = this.getModel();
        tmp_model.forEach(table => {

            if(table.table_name === tablePanel.technical_name){
                table.columns.forEach(col => col.visible = false);
            }
        });
        this._databaseModel.next(tmp_model);
      
    }

    hideAllRelations(){
        let tmp_model = this.getModel();
        tmp_model.forEach(table => {
            table.relations.forEach(relation => {
                relation.visible = false;
            })
        })
    }

    deleteCalculatedCol(columnPanel: EditColumnPanel) {

        const tmp_model = this._databaseModel.getValue();
        const tableIndex = this._databaseModel.getValue().findIndex((table: any) => table.display_name.default === columnPanel.parent);
        tmp_model[tableIndex].columns = tmp_model[tableIndex].columns.filter(col => col.column_name !== columnPanel.technical_name);
        this._databaseModel.next(tmp_model);
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name, columnPanel.parent));

    }



    deleteValuesList(columnPanel: EditColumnPanel) {
        const tmp_model = this._databaseModel.getValue();
        const tableIndex = this._databaseModel.getValue().findIndex((table: any) => table.display_name.default === columnPanel.parent);
        const colIndex  =  tmp_model[tableIndex].columns.findIndex((column: any) => column.column_name === columnPanel.technical_name);
        tmp_model[tableIndex].columns[colIndex].valueListSource = null;
        this._databaseModel.next(tmp_model);
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name, columnPanel.parent));

    }

    deleteView(tableName : string){
        const tmp_model = this._databaseModel.getValue().filter((table: any) => table.table_name !== tableName);
        this._databaseModel.next(tmp_model);
        this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name));
    }




    getTable(columnPanel: EditColumnPanel) {
        const model = this._databaseModel.getValue();
        const tableIndex = this._databaseModel.getValue().findIndex((table: any) => table.display_name.default === columnPanel.parent);
        return model[tableIndex];
    }
    sendModel() {

        const connection = this._modelConnection.getValue();
        const metadata = this._modelMetadata.getValue();
        const model = { tables: this._databaseModel.getValue(), maps:this._maps.getValue()};

        const body = {
            ds: {
                connection: connection,
                metadata: metadata,
                model: model
            }
        };
        this.updateModelInServer(this.model_id, body).subscribe(
            (r) => this.alertService.addSuccess($localize`:@@ModelSaved:Modelo guardado correctamente`),
            (err) => this.alertService.addError(err)
        );
        this._unsaved.next(false)
    }


    async getModelById(id) {
        return this.get(`${this.globalDSRoute}/${id}`).subscribe(
            async (data: any) => {
                // data is a string
                this.model_id = id;
                this._databaseModel.next(data.dataSource.ds.model.tables);
                this._modelMetadata.next(data.dataSource.ds.metadata);
                this._modelConnection.next(data.dataSource.ds.connection);
                this._maps.next(data.dataSource.ds.model.maps);
                this._treeData.next(this.generateTree());
            }, (err) => this.alertService.addError(err)
        );
    }
    updateModelInServer(id, body): Observable<any> {
        return this.put(`${this.globalDSRoute}/${id}`, body);
    }

    deleteModel(id): Observable<any> {
        return this.delete(`${this.globalDSRoute}/${id}`);
    }

    realoadModelFromDb(id): Observable<any> {
        return this.post(`${this.globalDSRoute}/reload/${id}`, this._modelConnection.getValue());
    }

    testConnection(connection): Observable<any> {
        return this.getParams(`${this.globalDSRoute}/check-connection`, connection);
    }

    testStoredConnection(connection, id): Observable<any> {
        return this.getParams(`${this.globalDSRoute}/check-connection/${id}`, connection);
    }

    addDataSource(connection): Observable<any> {
        return this.post(`${this.globalDSRoute}/add-data-source`, connection);
    }

    executeQuery(body): Observable<any> {
        return this.post(`${this.globalDSRoute}/query`, body);
    }

    getViewResults(body): Observable<any>{
        return this.post(`${this.globalDSRoute}/get-view-results`, body);
    }


    removeCache(id:string): Observable<any> {
        return this.post(`${this.globalDSRoute}/remove-cache`, {id:id});
    }


}
