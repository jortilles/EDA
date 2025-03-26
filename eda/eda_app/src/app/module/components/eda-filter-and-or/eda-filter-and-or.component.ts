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
      minCols: 12,
      maxCols: 12,
      minRows: 10,
      maxRows: 10,
      margin: 0.2, // Reduce el margen entre celdas
      fixedRowHeight: 23, // Altura del elemento
      fixedColWidth: 56, // Anchura del elemento
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

    // Agregado de Filtros de Panel
    this.selectedFilters.forEach((sf, j) => {
      this.dashboard.push({cols: 3, rows:1, y: j, x:0, filter_table: sf.filter_table, filter_column: sf.filter_column, filter_type: sf.filter_type, filter_elements: sf.filter_elements, value: "and"})
    })

    // Agregado de Filtros Globales
    this.globalFilters.forEach((gf, i) => {
      this.dashboard.push({cols: 3, rows:1, y: i + this.selectedFilters.length, x:0, filter_table: gf.filter_table ,filter_column: gf.filter_column, filter_type: gf.filter_type, filter_elements: gf.filter_elements, value: "and"})
    })

    // Se crea una clonación del dashboard
    this.dashboardClone = _.cloneDeep(this.dashboard);

    // Enviando el dashboard inicial al componente <filter-and-or-dialog>
    this.dashboardChanged.emit(this.dashboard);

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
    
    // Ordenamiento del dashboard en el eje y de menor a mayor. 
    dashboard.sort((a: any, b: any) => a.y - b.y); 

    // Variable que contiene la nueva cadena de los filtros AND/OR anidados correspondido con el diseño gráfico de los items.
    let stringQuery = 'where ';

    // Función recursiva para la anidación necesaria según el gráfico de los filtros AND/OR.
    function cadenaRecursiva(item: any) {
      const { cols, rows, y, x, filter_table, filter_column, filter_type, filter_elements, value } = item; // item recursivo
      let resultado = filter_column;
      let elementosHijos = [];

      for(let n = y+1; n<dashboard.length; n++){
        if(dashboard[n].x === x) break;
        if(y < dashboard[n].y && dashboard[n].x === x+1) elementosHijos.push(dashboard[n]);
      }

      // variable que contiene el siguiente item del item tratado por la función recursiva.
      const itemGenerico = dashboard.filter((item: any) => item.y === y + 1)[0];

      if(elementosHijos.length>0) {
        let hijoArreglo = elementosHijos.map(itemHijo => {
          return cadenaRecursiva(itemHijo);
        })

        let hijosCadena = '';
        hijoArreglo.forEach((hijo, index) => {
          hijosCadena = hijosCadena + hijo;
          if(index<elementosHijos.length-1){
            hijosCadena = hijosCadena + ` ${elementosHijos[index+1].value.toUpperCase()} `
          }
        })

        resultado = `(${resultado} ${itemGenerico.value.toUpperCase()} (${hijosCadena}))`;
      }
      return resultado;
    }


    // Iteración del dashboard para conseguir el string anidado correcto
    let itemsString = '( '
    for(let r=0; r<dashboard.length; r++){
      if(dashboard[r].x === 0){
        itemsString = itemsString +  (r === 0 ? '' : ' ' + dashboard[r].value.toUpperCase() + ' ' ) + dashboard.filter((e: any) => e.y===r).map(cadenaRecursiva)[0]
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

  onButtonClick() {
    this.creacionQueryFiltros(this.dashboard);
  }

}
