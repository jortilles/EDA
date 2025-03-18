import { 
  ChangeDetectionStrategy,
  Component, 
  OnInit,
  ViewEncapsulation,
  Input, 
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
  
  @Input() selectedFilters: any[] = []; // Valor que es 
  @Input() globalFilters: any[] = []; // Valor que es 

  options: GridsterConfig;
  dashboard: GridsterItem[];
  dashboardClone: GridsterItem[];
  itemToPush!: GridsterItemComponent;
  selectedButton: any[]; 
  selectedButtonInitialValue: string; // Valor seleccionado por defecto

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
      minRows: 14,
      maxRows: 14,
      margin: 0, // Reduce el margen entre celdas
      fixedRowHeight: 35, // Altura del elemento
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

    // Agregado de Filtros Globales
    this.globalFilters.forEach((gf, i) => {
      this.dashboard.push({cols: 3, rows:1, y:i, x:0, filter_column: gf.filter_column, value: "and"})
    })

    // Agregado de Filtros de Panel
    this.selectedFilters.forEach((sf, j) => {
      this.dashboard.push({cols: 3, rows:1, y: this.globalFilters.length + j, x:0, filter_column: sf.filter_column, value: "and"})
    })

    // Se crea una clonación del dashboard
    this.dashboardClone = _.cloneDeep(this.dashboard);
  }

  onItemChange(item: GridsterItem): void {
    
    const topMostItem = this.getTopMostItem();
    const bottomMostItem = this.getBottomMostItem()

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
    if(contadorIntercambioItems===2) return;

    // 2. Cuando los items intercambian de posición pero un desplazamiento.
    for( let i = 0; i < this.dashboard.length; i++ ) {
      if(item.y === this.dashboard[i].y){
          if(this.dashboard[i].x-2 === item.x) return;
          if(this.dashboard[i].x-1 === item.x) return;
          if(this.dashboard[i].x+1 === item.x) return;
          if(this.dashboard[i].x+2 === item.x) return;
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
        this.dashboardClone = _.cloneDeep(this.dashboard);
      } else {
        this.dashboard = _.cloneDeep(this.dashboardClone);
      }

      console.log('Item:', item);
      console.log('Todos los items:', this.dashboard);
      console.log('Todos los items clonación:', this.dashboardClone);
      // this.dashboardClone = _.cloneDeep(this.dashboard);
    
    } else {
      this.dashboard = _.cloneDeep(this.dashboardClone);
      console.log('.... MOVIMIENTO NO DISPONIBLE ....')
      console.log('Item:', item);
      console.log('Todos los items:', this.dashboard);
      console.log('Todos los items clonación:', this.dashboardClone);
    }

  }

  verificacionHorizontal(item: any, dashboardClonado: any) {
    let itemX = dashboardClonado.filter((it: any) => item.filter_column === it.filter_column)[0];
    let itemSuperior = dashboardClonado.filter((it: any) => it.y === item.y-1)[0];

    if(item.y === itemX.y) {
      if((item.x >= 0) && (item.x <= 1 + itemSuperior.x)) {
        return true;
        console.log('MOVIMIENTO PERMITIDO ....')
      } else {
        return false;
        console.log('Movimiento NO PERMITIDO ....')
      }
    } else {
      return true;
      console.log('Los valores no estan a la misma altura')
    }

    console.log('itemSuperior: ', itemSuperior);
    console.log('itemX: ', itemX);
  }

    // Función para detectar el ítem más bajo
  getBottomMostItem(): GridsterItem | undefined {
    let bottomMostItem: GridsterItem | undefined;
    let maxBottom = -1; // Inicializamos con un valor bajo

    for (let item of this.dashboard) {
      // Calculamos la posición final en Y (bottom) del ítem
      const bottom = item.y + item.rows;

      // Si el ítem actual es más bajo, lo actualizamos
      if (bottom > maxBottom) {
        maxBottom = bottom;
        bottomMostItem = item;
      }
    }
    return bottomMostItem;
  }

  // Función para detectar el ítem más alto
  getTopMostItem(): GridsterItem | undefined {
    let topMostItem: GridsterItem | undefined;
    let minTop = Number.MAX_VALUE; // Inicializamos con un valor alto para buscar el mínimo

    for (let item of this.dashboard) {
      // Si encontramos un ítem cuyo valor de `y` es menor, lo actualizamos
      if (item.y < minTop) {
        minTop = item.y;
        topMostItem = item;
      }
    }

    return topMostItem;
  }

}
