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

  options: GridsterConfig;
  dashboard: GridsterItem[];
  itemToPush!: GridsterItemComponent;
  selectedButton: any[]; 
  selectedButtonInitialValue: string; // Valor seleccionado por defecto


  public height: number = 0;

  @Input() selectedFilters: any[] = []; // Valor que es 
  @Input() globalFilters: any[] = []; // Valor que es 

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
      itemResizeCallback: (item: GridsterItem) => this.onItemChange(item),
    };

    // Valores and y or
    this.selectedButton = [ 
      { label: "AND", value: "and" }, 
      { label: "OR", value: "or" } 
    ]; 

  }

  ngOnInit(): void {
    // console.log('Global Filter: ', this.globalFilters);
    // console.log('Panel Filter: ', this.selectedFilters);

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

    // this.dashboard = [
    //   { cols: 3, rows: 1, y: 0, x: 0, name: 'Edalitics 1' },
    //   { cols: 3, rows: 1, y: 1, x: 0, name: 'Edalitics 2' },
    //   { cols: 3, rows: 1, y: 2, x: 0, name: 'Edalitics 3'},
    //   { cols: 3, rows: 1, y: 3, x: 0, name: 'Edalitics 4'},
    //   { cols: 3, rows: 1, y: 4, x: 0, name: 'Edalitics 5'},
    // ];

  }

  
  changedOptions(): void {
    if (this.options.api && this.options.api.optionsChanged) {
      this.options.api.optionsChanged();
    }
  }

  removeItem($event: MouseEvent | TouchEvent, item: any): void {
    $event.preventDefault();
    $event.stopPropagation();
    this.dashboard.splice(this.dashboard.indexOf(item), 1);
    this.onItemChange(item);
  }

  addItem(): void {
    this.dashboard.push({ x: 0, y: 0, cols: 1, rows: 1 });
  }

  initItem(item: GridsterItem, itemComponent: any): void {
    this.itemToPush = itemComponent;
  }

  pushItem(): void {
    const push = new GridsterPush(this.itemToPush); // init the service
    this.itemToPush.$item.rows += 4; // move/resize your item
    if (push.pushItems(push.fromNorth)) {
      // push items from a direction
      push.checkPushBack(); // check for items can restore to original position
      push.setPushedItems(); // save the items pushed
      this.itemToPush.setSize();
      this.itemToPush.checkItemChanges(
        this.itemToPush.$item,
        this.itemToPush.item
      );
    } else {
      this.itemToPush.$item.rows -= 4;
      push.restoreItems(); // restore to initial state the pushed items
    }
    push.destroy(); // destroy push instance
    // similar for GridsterPushResize and GridsterSwap
  }

  getItemComponent(): void {
    if (this.options.api && this.options.api.getItemComponent) {
      console.log('this.dashboard: ',this.dashboard)
      console.log(this.options.api.getItemComponent(this.dashboard[0]));
    }
  }

  onItemChange(item: GridsterItem): void {
    console.log('Cambio en el ítem:', item);
    console.log('Todos los valores:', this.dashboard);

    const topMostItem = this.getTopMostItem();
    const bottomMostItem = this.getBottomMostItem()
    let altura = (bottomMostItem!.y + bottomMostItem!.cols + 3) * 250;
    if(altura<5){
      this.height = 4*250;
    } else {
      this.height = altura;
    }

    // this.height = 4 * 250

    // this.getBottomMostItem(); // Actualizamos el ítem más bajo cada vez que algo cambia
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
