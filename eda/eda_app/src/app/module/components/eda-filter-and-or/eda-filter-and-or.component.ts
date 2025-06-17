import { 
  ChangeDetectionStrategy,
  Component, 
  OnInit,
  ViewEncapsulation,
  Input, 
  Output,
  EventEmitter,
} from '@angular/core';

import {
  CompactType,
  DisplayGrid,
  GridsterConfig,
  GridsterItem,
  GridsterItemComponent,
  GridsterPush,
  GridType
} from 'angular-gridster2';

import _ from 'lodash';


@Component({
  selector: 'eda-filter-and-or',
  templateUrl: './eda-filter-and-or.component.html',
  styleUrls: ['./eda-filter-and-or.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class EdaFilterAndOrComponent implements OnInit {

  private static previousDashboard: GridsterItem[] | null = null;

  public static guardarDashboard(dashboard: GridsterItem[]): void {
    EdaFilterAndOrComponent.previousDashboard = _.cloneDeep(dashboard);
  }

  public static reiniciarDashboard(): void {
    EdaFilterAndOrComponent.previousDashboard = null;
  }
  
  @Input() selectedFilters: any[] = []; // Panel filters
  @Input() globalFilters: any[] = []; // Global filters
  @Input() tables: any[] = []; // Eda-Blank-Panel tables
  @Input() sortedFilters: any[] = []; // sortedFilters received from the server
  @Output() dashboardChanged: EventEmitter<any> = new EventEmitter<any>();

  options: GridsterConfig;
  dashboard: GridsterItem[];
  dashboardClone: GridsterItem[];
  itemToPush!: GridsterItemComponent;
  selectedButton: any[]; 
  selectedButtonInitialValue: string; // Default value selected
  stringQuery: string = '';
  existeIntercambioItems: boolean = false;
  public textBetween: string = $localize`:@@textBetween:Entre`


  constructor() { 
    
    let rowHeight = 0;
    let colWidth = 0;
    const widthScreen = window.innerWidth; // screen width 

    if (widthScreen<1370) {
      rowHeight = 27;
      colWidth = 84;
    } else if(widthScreen>=1370 && widthScreen<1500) {
      rowHeight = 30;
      colWidth = 88;
    } else if(widthScreen>=1500) {
      rowHeight = 44;
      colWidth = 106;
    }

    this.options = {
      gridType: GridType.Fixed,
      compactType: CompactType.None,
      displayGrid: DisplayGrid.Always,
      pushItems: false,
      // disableScrollVertical: true, // Disable internal scroll
      draggable: {
        enabled: true
      },
      resizable: {
        enabled: false // Element that is not resized
      },
      minCols: 10,
      maxCols: 10,
      minRows: 9, // Make this value dynamic - pending
      maxRows: 9, // Make this value dynamic - pending
      margin: 0.2, // Reduce the margin between cells
      fixedRowHeight: rowHeight, // Element height
      fixedColWidth: colWidth, // Element width
      // disableScrollHorizontal: true, // Disable horizontal scrolling if necessary
      // disableScrollVertical: true, // Disable vertical scrolling if necessary
      itemChangeCallback: (item: GridsterItem) => this.onItemChange(item),
    };

    // (and & or) => values 
    this.selectedButton = [ 
      { label: "AND", value: "and" }, 
      { label: "OR", value: "or" } 
    ]; 

  }

  ngOnInit(): void {
    
    const previousDashboard = EdaFilterAndOrComponent.previousDashboard;

    if(this.sortedFilters === undefined) this.sortedFilters = []; // if it is an old report, we define the report as empty

    if(this.sortedFilters.length===0){
      this.initAndOrFilters();
    } else {
      if(previousDashboard) {
        this.dashboard = _.cloneDeep(this.sortedFilters);
        this.dashboardClone = _.cloneDeep(this.sortedFilters);
        this.creacionQueryFiltros(this.dashboard);
      } else {
        if(this.sortedFilters.length !== 0) {  
          this.dashboard = _.cloneDeep(this.sortedFilters);
          this.dashboardClone = _.cloneDeep(this.sortedFilters);
          this.creacionQueryFiltros(this.sortedFilters);
          
        } else {
          this.initAndOrFilters();
        }
      }
    }

  }

  initAndOrFilters () {

    // Integration:
    this.dashboard = [];

    // Adding Panel Filters
    this.selectedFilters.forEach((sf, j) => {
      this.dashboard.push(
        {
          cols: 3, 
          rows:1, 
          y: j, 
          x:0, 
          filter_table: sf.filter_table, 
          filter_column: sf.filter_column, 
          filter_type: sf.filter_type, 
          filter_column_type: sf.filter_column_type, 
          filter_elements: sf.filter_elements, 
          filter_id: sf.filter_id, 
          isGlobal: sf.isGlobal,
          value: "and"
        }
      )
    });

    // Adding Global Filters
    this.globalFilters.forEach((gf, i) => {
      this.dashboard.push(
        {
          cols: 3, 
          rows:1, 
          y: i + this.selectedFilters.length, 
          x: 0, 
          filter_table: gf.filter_table,
          filter_column: gf.filter_column, 
          filter_type: gf.filter_type, 
          filter_column_type: gf.filter_column_type, 
          filter_elements: gf.filter_elements, 
          filter_id: gf.filter_id,
          isGlobal: gf.isGlobal,
          value: "and"
        }
      )
    });

    // A clone of the dashboard is created
    this.dashboardClone = _.cloneDeep(this.dashboard);

    // At the beginning of the execution
    this.creacionQueryFiltros(this.dashboard);

  }

  onItemChange(item: GridsterItem): void {

    //---------------------------------------------------------------------------------
    // Verification of item exchange, to avoid duplicate execution
    // 1. When items swap positions
    let contadorIntercambioItems = 0;
    for( let i = 0; i < this.dashboard.length; i++ ) {
      if(item.x === this.dashboard[i].x && item.y === this.dashboard[i].y){
        contadorIntercambioItems++; 
      }
    }
    // Ends the iteration of the first item to be exchanged
    if(contadorIntercambioItems===2) {
      this.existeIntercambioItems = true;
      return;
    };

    // 2. When items exchange position but a displacement
    for( let i = 0; i < this.dashboard.length; i++ ) {
      if(item.y === this.dashboard[i].y){
          if(this.dashboard[i].x-2 === item.x) {
            this.existeIntercambioItems = true;
            return};
          if(this.dashboard[i].x-1 === item.x) {
            this.existeIntercambioItems = true;
            return};
          if(this.dashboard[i].x+1 === item.x) {
            this.existeIntercambioItems = true;
            return};
          if(this.dashboard[i].x+2 === item.x) {
            this.existeIntercambioItems = true;
            return};
      }
    }
    //---------------------------------------------------------------------------------

    // Checking the top item at position x=0, y=0
    let verificacionItemInicial = false;
    for( let i = 0; i < this.dashboard.length; i++ ) {
      if(this.dashboard[i].x === 0 && this.dashboard[i].y === 0){
        verificacionItemInicial = true;
        break;
      }
    }

    if(verificacionItemInicial) {

      let verificacionHorizontalValor: boolean;
      verificacionHorizontalValor = this.verificacionHorizontal(item, this.dashboardClone);

      if(verificacionHorizontalValor) {

        let verificacionVerticalValor: boolean;
        verificacionVerticalValor = this.verificacionVertical(this.dashboard);

        if(verificacionVerticalValor) {

          this.dashboardClone = _.cloneDeep(this.dashboard);
          this.dashboard = this.verificacionVerticalRetroceso(this.dashboardClone)

          // Verificamos si existe un intercambio de items
          if(this.existeIntercambioItems) {
            this.dashboard = this.correccionIntercambioItems(this.dashboardClone)
            this.dashboardClone = _.cloneDeep(this.dashboard);
          } else {
            this.dashboard = _.cloneDeep(this.dashboardClone);
          }
          //*********************************************************************** */
          this.existeIntercambioItems = false; // At the end of the entire iteration
          //*********************************************************************** */
        } else {
          this.dashboard = _.cloneDeep(this.dashboardClone);
        }
      } else {
        this.dashboard = _.cloneDeep(this.dashboardClone);
      }
    
    } else {
      this.dashboard = _.cloneDeep(this.dashboardClone);
    }

    // Dashboard variable ready for creating the and/or filter query
    this.creacionQueryFiltros(this.dashboard);
  }

  verificacionVerticalRetroceso(dashboardClonado: any){

    for(let j=1; j<dashboardClonado.length-1; j++){
      if(dashboardClonado.find((item:any) => item.y === j).x+1 >= dashboardClonado.find((item:any) => item.y === j+1).x) {
        continue;
      } else {
        dashboardClonado.find((item:any) => item.y === j+1).x = dashboardClonado.find((item:any) => item.y === j).x+1
      }
    }

    return dashboardClonado;
  }

  correccionIntercambioItems(dashboardClonado: any) {

    // We start the iteration on the second element
    for(let i=1; i<dashboardClonado.length; i++) {
      if(dashboardClonado.find((item: any) => item.y === i).x <= (dashboardClonado.find((item: any) => item.y === (i-1)).x) + 1){
        continue;
      }  else {
        dashboardClonado.find((item: any) => item.y === i).x = (dashboardClonado.find((item: any) => item.y === (i-1)).x) + 1
      }
    }

    return dashboardClonado;
  }

  verificacionVertical(dashboard: any){
    let verticalY = []
    for(let j=0; j<dashboard.length; j++) { verticalY[j] = j }
    return verticalY.every(valorY => dashboard.some(item => item.y === valorY))
  }

  verificacionHorizontal(item: any, dashboardClonado: any) {

    let itemX = dashboardClonado.filter((it: any) => item.filter_id === it.filter_id)[0];
    let itemSuperior = dashboardClonado.filter((it: any) => it.y === item.y-1)[0];

    if(item.y === itemX.y) {
      if((item.x >= 0) && (item.x <= 1 + itemSuperior.x)) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  // Function for generating the chain of nested AND/OR filters corresponding to the graphic design of the items.
  creacionQueryFiltros(dashboard: any) {
    
    // Ordering the dashboard on the y-axis from lowest to highest.
    dashboard.sort((a: any, b: any) => a.y - b.y); 

    // Variable containing the new string of nested AND/OR filters corresponding to the graphic design of the items.
    let stringQuery = 'where ';

    // Recursive function for the necessary nesting according to the AND/OR filter graph.
    function cadenaRecursiva(item: any) {
      // recursive item
      const { cols, rows, y, x, filter_table, filter_column, filter_type, filter_column_type, filter_elements, filter_id, isGlobal, value } = item;

      // Verify  (There are two filters to check ==> | not_null_nor_empty | null_nor_empty | )
      ////////////////////////////////////////////////// filter_type ////////////////////////////////////////////////// 
      let filter_type_value = '';
      if(filter_type === 'not_in'){
        filter_type_value = 'not in';
      } else {
        if(filter_type === 'not_like') {
          filter_type_value = 'not like';
        } else {
          if(filter_type === 'not_null') {
            filter_type_value = 'is not null';
          } else {
            if(true){
              filter_type_value = filter_type;
            }
          }
        }
      }

      ////////////////////////////////////////////////// filter_elements ////////////////////////////////////////////////// 
      let filter_elements_value = '';

      if(filter_elements.length === 0) {}
      else {
        if(filter_elements[0].value1.length === 1){
          // For just one value ==> Add more value types if needed

          // Value of type text
          if(filter_column_type === 'text'){
            filter_elements_value = filter_elements_value + `'${filter_type === 'like' || filter_type === 'not_like'? '%': ''}${filter_elements[0].value1[0]}${filter_type === 'like' || filter_type === 'not_like'? '%': ''}'`;
          } 

          // Value of type numeric
          if(filter_column_type === 'numeric'){
            filter_elements_value = filter_elements_value + `${filter_elements[0].value1[0]}`;
          } 

        } else {
          // For several values
          filter_elements_value = filter_elements_value + '(';

          // Value of type text
          if(filter_column_type === 'text'){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }

          // Value of type numeric
          if(filter_column_type === 'numeric'){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `${element}` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }

          // Values ​​that do not have a filter_column_type defined
          if(filter_column_type === undefined){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }
        }
      }
      
      /////////////////////////////////////// RESULT OF THE WHOLE STRING ////////////////////////////////////////////////// 
      let resultado = `\"${filter_table}\".\"${filter_column}\" ${filter_type_value} ${filter_elements_value}`;
      

      let elementosHijos = []; // Array of child items

      for(let n = y+1; n<dashboard.length; n++){
        if(dashboard[n].x === x) break;
        if(y < dashboard[n].y && dashboard[n].x === x+1) elementosHijos.push(dashboard[n]);
      }

      // variable that contains the next item of the item treated by the recursive function.
      const itemGenerico = dashboard.filter((item: any) => item.y === y + 1)[0];

      if(elementosHijos.length>0) {
        let space = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
        let variableSpace = space.repeat(x+1);

        let hijoArreglo = elementosHijos.map(itemHijo => {
          return cadenaRecursiva(itemHijo);
        })

        let hijosCadena = '';
        hijoArreglo.forEach((hijo, index) => {
          hijosCadena = hijosCadena + hijo;
          if(index<elementosHijos.length-1){
            hijosCadena = hijosCadena + ` <br> ${variableSpace} ${elementosHijos[index+1].value.toUpperCase()} `
          }
        })

        resultado = `(${resultado} <br> ${variableSpace} ${itemGenerico.value.toUpperCase()} (${hijosCadena}))`;
      }
      return resultado;
    }


    // Iterating the dashboard to get the correct nested string
    let itemsString = '( '
    for(let r=0; r<dashboard.length; r++){
      if(dashboard[r].x === 0){
        itemsString = itemsString +  (r === 0 ? '' : ' ' + dashboard[r].value.toUpperCase() + ' ' ) + dashboard.filter((e: any) => e.y===r).map(cadenaRecursiva)[0] + `<br>`;
      } else {
        continue;
      }
    }

    itemsString = itemsString + ' )';
    stringQuery = stringQuery + itemsString

    this.stringQuery = _.cloneDeep(stringQuery);

    this.dashboardChanged.emit(this.dashboard); // Dashboard Shipping - Shipping can be changed.
  }

  // Function that is executed when the p-selectButton is clicked AND | OR
  onButtonClick() {
    this.creacionQueryFiltros(this.dashboard);
    this.dashboardClone = _.cloneDeep(this.dashboard);
  }

  // Function that displays the table and column names of AND | OR filters
  public getDisplayFilterStrAndOr(item: any) {

      let str = '';
      const table = this.tables.find(table => table.table_name === item.filter_table.split('.')[0]);

      if (table && table.table_name) {
          const tableName = table.display_name?.default;
          const columnName = table.columns.find((c) => c.column_name == item.filter_column)?.display_name?.default;
          
          let checksum = (tableName + columnName).length;
          const widthScreen = window.innerWidth; // screen width 

          if(checksum <= 23) {
            str = `<strong>${tableName}</strong>&nbsp>&nbsp<strong>${columnName}</strong>`;
          } else {
            if(widthScreen<1370) {
              str = `<strong>${tableName.substring(0, 11)} ...</strong>&nbsp>&nbsp<strong>${columnName.substring(0, 11)} ...</strong>`;
            } else {
              str = `<strong>${tableName.substring(0, 14)} ...</strong>&nbsp>&nbsp<strong>${columnName.substring(0, 14)} ...</strong>`;
            }
          }
      }

      return str;
  }

  private findTable(t: string): any {
    return this.tables.find(table => table.table_name === t);
  }

  public tooltipDescription(item: any) {
        let str = '';

        const table = this.findTable(item.filter_table.split('.')[0]);

        if (table && table.table_name) {
            const tableName = table.display_name?.default;
            const columnName = table.columns.find((c) => c.column_name == item.filter_column)?.display_name?.default;

            const values = item.filter_elements[0]?.value1;
            const values2 = item.filter_elements[1]?.value2;

            let valueStr = '';

            if (values) {
                if (values.length == 1 && !['in', 'not_in'].includes(item.filter_type)) {
                    valueStr = `"${values[0]}"`;
                }  else if (values.length > 1 || ['in', 'not_in'].includes(item.filter_type)) {
                    valueStr = `[${values.map((v: string) => (`"${v}"`) ).join(', ')}]`;
                }

                if (values2) {
                    if (values2.length == 1) {
                        valueStr = `"${values[0]}" - "${values2[0]}"`;
                    }  else if (values2.length > 1) {
                        valueStr = `AND [${values2.map((v: string) => (`"${v}"`) ).join(', ')}]`;
                    }
                }
            }

            let filterType = item.filter_type
            if(filterType === 'between') filterType = this.textBetween;

            let filterDescription = item.isGlobal ? 'Filtro Global' : 'Filtro Panel';

            str = `${tableName} [${columnName}] ${filterType} ${valueStr} > ${filterDescription}`;
        }

        return str;
  }

  public getFilterJoins(item: any) {

    let filter: any;
    filter = this.globalFilters.find((gf: any) => gf.filter_id === item.filter_id )

    if(!item.isGlobal) return '';

    let pathStr = '';
    if (filter.joins?.length > 0) {

        for (const path of filter.joins) {
            const table = (path[0]||'');
            let tableName = this.getNiceTableName(table);
            if (!tableName) tableName = this.getNiceTableName(table.split('.')[0]);

            pathStr += ` ${tableName} > `;
        }
    } else if (filter.valueListSource) {
        const tableName = this.getNiceTableName(filter.valueListSource.target_table);
        if (tableName) pathStr += ` ${tableName} → `;
    }

    return pathStr;
  }

  public getNiceTableName(table: any) {
    return this.tables.find( t => t.table_name === table)?.display_name?.default;
  }

}
