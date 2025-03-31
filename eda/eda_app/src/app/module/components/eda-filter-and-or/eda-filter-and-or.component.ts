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
  
  @Input() selectedFilters: any[] = []; // Filtros de los paneles
  @Input() globalFilters: any[] = []; // Filtros globales
  @Output() dashboardChanged: EventEmitter<any> = new EventEmitter<any>();

  options: GridsterConfig;
  dashboard: GridsterItem[];
  dashboardClone: GridsterItem[];
  itemToPush!: GridsterItemComponent;
  selectedButton: any[]; 
  selectedButtonInitialValue: string; // Valor seleccionado por defecto
  stringQuery: string = '';

  existeIntercambioItems: boolean = false;

  constructor() { 
    this.options = {
      gridType: GridType.Fixed,
      compactType: CompactType.None,
      displayGrid: DisplayGrid.Always,
      pushItems: false,
      // disableScrollVertical: true, // Desactiva scroll interno
      draggable: {
        enabled: true
      },
      resizable: {
        enabled: false // Elemento para que no se redimensione
      },
      minCols: 10,
      maxCols: 10,
      minRows: 9, // Hacer dinámico este valor
      maxRows: 9, // Hacer dinámico este valor
      margin: 0.2, // Reduce el margen entre celdas
      fixedRowHeight: 29, // Altura del elemento
      fixedColWidth: 80, // Anchura del elemento
      // disableScrollHorizontal: true, // Desactiva scroll horizontal si es necesario
      // disableScrollVertical: true, // Desactiva scroll horizontal si es necesario
      itemChangeCallback: (item: GridsterItem) => this.onItemChange(item),
    };

    // Valores and y or
    this.selectedButton = [ 
      { label: "AND", value: "and" }, 
      { label: "OR", value: "or" } 
    ]; 


  }

  ngOnInit(): void {

    // Integración:
    this.dashboard = [];

    console.log('this.selectedFilters: ', this.selectedFilters);
    console.log('this.globalFilters: ', this.globalFilters);

    // Agregado de Filtros de Panel
    this.selectedFilters.forEach((sf, j) => {
      this.dashboard.push({cols: 3, rows:1, y: j, x:0, filter_table: sf.filter_table, filter_column: sf.filter_column, filter_type: sf.filter_type, filter_column_type: sf.filter_column_type, filter_elements: sf.filter_elements, value: "and"})
    })

    // Agregado de Filtros Globales
    this.globalFilters.forEach((gf, i) => {
      this.dashboard.push({cols: 3, rows:1, y: i + this.selectedFilters.length, x:0, filter_table: gf.filter_table ,filter_column: gf.filter_column, filter_type: gf.filter_type, filter_column_type: gf.filter_column_type, filter_elements: gf.filter_elements, value: "and"})
    })

    // Se crea una clonación del dashboard
    this.dashboardClone = _.cloneDeep(this.dashboard);

    // Enviando el dashboard inicial al componente <filter-and-or-dialog>
    this.dashboardChanged.emit(this.dashboard);

    // Al inicio de la ejecución
    // this.creacionQueryFiltros(this.dashboard);
    // console.log('dashboard: ',this.dashboard)

  }

  onItemChange(item: GridsterItem): void {

    //---------------------------------------------------------------------------------
    // Verificación del intercambio de items, para evitar que se duplique la ejecución
    // 1. Cuando los items intercambian de posición
    let contadorIntercambioItems = 0;
    for( let i = 0; i < this.dashboard.length; i++ ) {
      if(item.x === this.dashboard[i].x && item.y === this.dashboard[i].y){
        contadorIntercambioItems++; 
      }
    }
    // Termina la iteración del primer item que se intercambia
    if(contadorIntercambioItems===2) {
      this.existeIntercambioItems = true;
      return;
    };

    // 2. Cuando los items intercambian de posición pero un desplazamiento.
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

    // Verificación del item superior en la posición x=0, y=0
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
          this.existeIntercambioItems = false; // Al terminar toda la iteración
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

    // console.log('ITEM:', item);
    // console.log('TOTAL DE ITEMS:', this.dashboard);
    // console.log('TOTAL DE ITEMS - CLONACIÓN', this.dashboardClone);
    // variable dashboard lista para la creación de la query de filtros and/or
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

    // Comenzamos la iteración sobre el segundo elemento
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
    let itemX = dashboardClonado.filter((it: any) => item.filter_column === it.filter_column)[0];
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

  // Función de generación de la cadena de los filtros AND/OR anidados correspondido con el diseño gráfico de los items.
  creacionQueryFiltros(dashboard: any) {

    console.log('<<<>>> : ', dashboard);
    
    // Ordenamiento del dashboard en el eje y de menor a mayor. 
    dashboard.sort((a: any, b: any) => a.y - b.y); 

    // Variable que contiene la nueva cadena de los filtros AND/OR anidados correspondido con el diseño gráfico de los items.
    let stringQuery = 'where ';

    // Función recursiva para la anidación necesaria según el gráfico de los filtros AND/OR.
    function cadenaRecursiva(item: any) {
      // item recursivo
      const { cols, rows, y, x, filter_table, filter_column, filter_type, filter_column_type, filter_elements, value } = item;

      // Verificar  (Hay dos filtros por revisar ==> | not_null_nor_empty | null_nor_empty | )
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
      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      ////////////////////////////////////////////////// filter_elements ////////////////////////////////////////////////// 
      let filter_elements_value = '';
      // console.log('longitud: ',filter_elements.length)
      if(filter_elements.length === 0) {}
      else {
        console.log('valores: ', filter_elements[0].value1)
        if(filter_elements[0].value1.length === 1){
          // Para solo un valor  ==> Agregar mas tipos de valores si fuera necesario

          // Valor de tipo text
          if(filter_column_type === 'text'){
            filter_elements_value = filter_elements_value + `'${filter_type === 'like' || filter_type === 'not_like'? '%': ''}${filter_elements[0].value1[0]}${filter_type === 'like' || filter_type === 'not_like'? '%': ''}'`;
          } 

          // Valor de tipo numeric
          if(filter_column_type === 'numeric'){
            filter_elements_value = filter_elements_value + `${filter_elements[0].value1[0]}`;
          } 

        } else {
          // Para varios valores
          filter_elements_value = filter_elements_value + '('

          console.log('filter_column_type: ', filter_column_type);

          // Valores de tipo text
          if(filter_column_type === 'text'){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }

          // Valores de tipo numeric
          if(filter_column_type === 'numeric'){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `${element}` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }

          // Valores que no tengan definido un filter_column_type
          if(filter_column_type === undefined){
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index===(filter_elements[0].value1.length-1)? ')': ','}`;
            })
          }
        }
      }
      /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      // RESULTADO DE TODO EL STRING
      let resultado = `\"${filter_table}\".\"${filter_column}\" ${filter_type_value} ${filter_elements_value}`;
      

      let elementosHijos = []; // Arreglo de items hijos

      for(let n = y+1; n<dashboard.length; n++){
        if(dashboard[n].x === x) break;
        if(y < dashboard[n].y && dashboard[n].x === x+1) elementosHijos.push(dashboard[n]);
      }

      // variable que contiene el siguiente item del item tratado por la función recursiva.
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


    // Iteración del dashboard para conseguir el string anidado correcto
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

    console.log('stringQuery: ',stringQuery)
    this.dashboardChanged.emit(this.dashboard); // Envio del dashboard - Se puede cambiar el envio. 
  }

  // Función que se ejecuta cuando se hace click en el p-selectButton AND | OR
  onButtonClick() {
    this.creacionQueryFiltros(this.dashboard);
    this.dashboardClone = _.cloneDeep(this.dashboard);
  }

}
