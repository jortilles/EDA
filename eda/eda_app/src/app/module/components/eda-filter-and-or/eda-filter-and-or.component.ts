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

  }

  onItemChange(item: GridsterItem): void {
    
    const topMostItem = this.getTopMostItem();
    const bottomMostItem = this.getBottomMostItem()
    
    console.log('Cambio en el ítem:', item);
    console.log('Todos los valores:', this.dashboard);
    console.log('Ítem más alto:', topMostItem);
    console.log('Ítem más bajo:', bottomMostItem);
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
