import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { TreeNode } from 'primeng/api';
import { ApiService } from './api.service';
import { EditModelPanel, EditColumnPanel, EditTablePanel, Relation } from '@eda_models/data-source-model/data-source-models';


@Injectable()
export class DataSourceService extends ApiService implements OnDestroy {

  void_tablePanel: EditTablePanel = {
    type: '',
    name: '',
    technical_name: '',
    description: '',
    relations: [{
      source_table: '',
      source_column: '',
      target_table: '',
      target_column: '',
      visible: false
    }],
    table_type: '',
    table_granted_roles: '',
    columns: [],
    visible: false,
  };

  private _databaseModel = new BehaviorSubject<any>([]); //[{ display_name: { default: '' }, eda-columns: [] }] --> just in case
  databaseModel = this._databaseModel.asObservable();

  private _modelMetadata = new BehaviorSubject<any>([]);
  // modelMetadata = this._modelMetadata.asObservable();
  private _modelConnection = new BehaviorSubject<any>([]);
  modelConnection = this._modelConnection.asObservable();

  private _modelPanel = new BehaviorSubject<EditModelPanel>(
    {
      type: '',
      connection: {
        type: '', host: '', database: ' ', user: ' ', password: ' '
      },
      metadata: {
        model_name: ' ', model_granted_roles: []
      }
    }
  );
  currentModelPanel = this._modelPanel.asObservable();

  private _tablePanel = new BehaviorSubject<EditTablePanel>(this.void_tablePanel);    //Manages tables edit information -> used by edit-model.component
  currentTablePanel = this._tablePanel.asObservable();

  private _columnPanel = new BehaviorSubject(new EditColumnPanel());  //Manages eda-columns edit information -> used by edit-model.component
  currentColumnPanel = this._columnPanel.asObservable();

  private _typePanel = new BehaviorSubject('');                       //Manages panel type to display -> used by edit-model.component
  currentTypePanel = this._typePanel.asObservable();

  private _treeData = new BehaviorSubject<TreeNode[]>([]);            //Manages Tree object generated through dataModel object
  currentTreeData = this._treeData.asObservable();

  model_id: string;

  constructor(protected http: HttpClient) {
    super(http);
  }

  ngOnDestroy(): void {
    this.cleanAll();
  }

  /** Database model loaded from server's-API **/
  private globalDSRoute = '/data-source';


  async getModelById(id) {
    return this.get(`${this.globalDSRoute}/${id}`).subscribe(async (data: any) => {   // data is a string   
      this.model_id = id;

      this._databaseModel.next(data.dataSource.ds.model.tables);
      this._modelMetadata.next(data.dataSource.ds.metadata);
      this._modelConnection.next(data.dataSource.ds.connection);
      this._treeData.next(this.generateTree());

    });
  }

  cleanAll() {
    this._databaseModel.next([]);
    this._modelMetadata.next([]);
    this._modelConnection.next([]);
    this._typePanel.next('');
    this._treeData.next([]);
  }

  updateModelInServer(id, body): Observable<any> {
    return this.put(`${this.globalDSRoute}/${id}`, body);
  }

  /** Generates tree from DataModel */
  generateTree(model_name?: string, table_name?: string): Array<TreeNode> {
    //Root node --> Model name
    let root: TreeNode = {
      label: this._modelMetadata.getValue().model_name,
      data: 'root',
      children: [],
      icon: 'fa  fa-sitemap',
      expanded: model_name ? true : false
    };

    //table nodes
    let tables: Array<TreeNode> = [];
    this._databaseModel.getValue()
      .forEach((table: { display_name: { default: string; }; columns: { forEach: (arg0: (column: { display_name: { default: string; }; }) => void) => void; }; }) => {
        let currTable: TreeNode = {};
        currTable.label = table.display_name.default;
        currTable.data = "tabla";
        currTable.children = [];
        currTable.collapsedIcon = 'fa fa-table';
        currTable.expandedIcon = 'fa fa-table';
        currTable.expanded = table_name === table.display_name.default ? true : false;
        tables.push(currTable);

        //Column nodes
        table.columns.forEach((column: { display_name: { default: string; }; }) => {
          let currCol: TreeNode = {};
          currCol.label = column.display_name.default;
          currCol.data = 'columna';
          currCol.children = [];
          currCol.icon = 'fa fa-eda-columns ';
          currTable.children.push(currCol);
        })
      })
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

  /** Updates tree with new model **/
  changeTree() {
    this._treeData.next(this.generateTree());
  }

  getModel() {
    return this._databaseModel.getValue();
  }

  editModel(node: TreeNode) {
    let modelPanel = new EditModelPanel();
    modelPanel.type = node.data;        //'root'
    modelPanel.connection = this._modelConnection.getValue();
    modelPanel.metadata = this._modelMetadata.getValue();
    this._modelPanel.next(modelPanel);
    this._typePanel.next('root');
  }

  editTable(node: TreeNode): void {
    let tablePanel = new EditTablePanel();
    let table: any = this.getTableByName(node.label);
    tablePanel.name = node.label;
    tablePanel.type = node.data;
    tablePanel.description = table.description.default;
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
    let columnPanel = new EditColumnPanel();
    let column: any = this.getColumnByName(node.parent.label, node.label);
    columnPanel.type = node.data;
    columnPanel.name = node.label;
    columnPanel.column_type = column.column_type === 'varchar' ? 'text' : column.column_type;
    columnPanel.technical_name = column.column_name;
    columnPanel.description = column.description.default;
    columnPanel.aggregation_type = column.aggregation_type.map((a: { value: any; }) => a.value);
    columnPanel.column_granted_roles = column.column_granted_roles;
    columnPanel.row_granted_roles = column.row_granted_roles;
    columnPanel.visible = column.visible;
    columnPanel.parent = node.parent.label;
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
    let table: any = this.getTableByName(parent);
    return table.columns.find((col: { display_name: { default: string; }; }) => col.display_name.default === child);
  }

  deleteRelation(rel: Relation) {
    // Update TablePanel
    let tmp_panel = this._tablePanel.getValue();
    let tmp_relationIndex = tmp_panel.relations.findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
      return r.source_table === rel.source_table && r.source_column === rel.source_column
        && r.target_table === rel.target_table && r.target_column === rel.target_column;
    });
    tmp_panel.relations[tmp_relationIndex].visible = false;
    this._tablePanel.next(tmp_panel);

    // Update source table
    let srcTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.source_table);
    let srcRelationIndex = this.getRelationIndex(rel, srcTableIndex);
    let tmp_model = this._databaseModel.getValue();
    tmp_model[srcTableIndex].relations[srcRelationIndex].visible = false;

    // Update target table
    let tgTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.target_table);
    let targetRelation: Relation = {
      source_table: rel.target_table,
      source_column: rel.target_column,
      target_table: rel.source_table,
      target_column: rel.source_column,
      visible: true
    };

    let targetRelIndex = this.getRelationIndex(targetRelation, tgTableIndex);
    tmp_model[tgTableIndex].relations[targetRelIndex].visible = false;

    // Update model
    this._databaseModel.next(tmp_model);
  }

  addRelation(rel: Relation) {
    // Update tablePanel
    let tmp_panel = this._tablePanel.getValue();
    let tmp_relationIndex = tmp_panel.relations.findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
      return r.source_table === rel.source_table && r.source_column === rel.source_column
        && r.target_table === rel.target_table && r.target_column === rel.target_column;
    });
    if (tmp_relationIndex >= 0) {
      tmp_panel.relations[tmp_relationIndex].visible = true;
    } else {
      tmp_panel.relations.push(rel);
    }
    this._tablePanel.next(tmp_panel);

    // Update source table
    let srcTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.source_table);
    let relIndex = this.getRelationIndex(rel, srcTableIndex);

    let tmp_model = this._databaseModel.getValue();
    if (relIndex < 0) {
      tmp_model[srcTableIndex].relations.push(rel);
    } else {
      tmp_model[srcTableIndex].relations[relIndex].visible = true;
    }

    // Update target table
    let tgTableIndex = this._databaseModel.getValue().findIndex((table: { table_name: string; }) => table.table_name === rel.target_table);
    let targetRelation: Relation = {
      source_table: rel.target_table,
      source_column: rel.target_column,
      target_table: rel.source_table,
      target_column: rel.source_column,
      visible: true
    };

    let targetRelIndex = this.getRelationIndex(targetRelation, tgTableIndex);
    if (targetRelIndex < 0) {
      tmp_model[tgTableIndex].relations.push(targetRelation);
    } else {
      tmp_model[tgTableIndex].relations[targetRelIndex].visible = true;
    }

    this._databaseModel.next(tmp_model);
  }

  getRelationIndex(relation: Relation, tableIndex: string | number) {
    return this._databaseModel.getValue()[tableIndex].relations.findIndex((r: { source_table: any; source_column: any; target_table: any; target_column: any; }) => {
      return r.source_table === relation.source_table && r.source_column === relation.source_column
        && r.target_table === relation.target_table && r.target_column === relation.target_column;
    });
  }

  updateDataModel(panel: any) {
    if (panel.type === 'tabla') {
      let tableIndex = this._databaseModel.getValue().findIndex((table: { table_name: any; }) => table.table_name === panel.technical_name);
      let tmp_model = this._databaseModel.getValue();

      tmp_model[tableIndex].display_name.default = panel.name;
      tmp_model[tableIndex].description.default = panel.description;
      tmp_model[tableIndex].relations = panel.relations;
      tmp_model[tableIndex].table_type = panel.table_type;
      tmp_model[tableIndex].table_granted_roles = panel.table_granted_roles;
      tmp_model[tableIndex].visible = panel.visible;

      this._databaseModel.next(tmp_model);

    } else if (panel.type === 'columna') {

      let tableIndex = this._databaseModel.getValue().findIndex((table: { display_name: { default: any; }; }) => table.display_name.default === panel.parent);
      let columnindex = this._databaseModel.getValue()[tableIndex].columns.findIndex((col: { column_name: any; }) => col.column_name === panel.technical_name);
      let tmp_model = this._databaseModel.getValue();

      tmp_model[tableIndex].columns[columnindex].display_name.default = panel.name;
      tmp_model[tableIndex].columns[columnindex].column_type = panel.column_type;
      tmp_model[tableIndex].columns[columnindex].description.default = panel.description;
      tmp_model[tableIndex].columns[columnindex].aggregation_type = panel.aggregation_type.map((a: any) => {
        return { value: a, 'display_name': a };
      });
      tmp_model[tableIndex].columns[columnindex].column_granted_roles = panel.column_granted_roles;
      tmp_model[tableIndex].columns[columnindex].row_granted_roles = panel.row_granted_roles;
      tmp_model[tableIndex].columns[columnindex].visible = panel.visible;

      this._databaseModel.next(tmp_model);

    } else if (panel.type === 'root') {
    }
    this._treeData.next(this.generateTree(this._modelPanel.getValue().metadata.model_name, panel.parent));
  }

  sendModel() {
    let body = {
      ds: {
        connection: this._modelConnection.getValue(),
        metadata: this._modelMetadata.getValue(),
        model: { tables: this._databaseModel.getValue() }
      }
    }
    this.updateModelInServer(this.model_id, body).subscribe(
      r => alert(r.message)
    );
  }

  deleteModel(id): Observable<any> {
    return this.delete(`${this.globalDSRoute}/${id}`);
  }

  realoadModelFromDb(id) : Observable<any> {
    let body = this._modelConnection.getValue();
    
    return this.post(`${this.globalDSRoute}/reload/${id}`, body);
  }

  testConnection( connection ): Observable<any> {
    return this.getParams( `${this.globalDSRoute}/check-connection`, connection );
  }

  addDataSource( connection ): Observable<any> {
    return this.post(`${this.globalDSRoute}/`, connection);
  }

}
