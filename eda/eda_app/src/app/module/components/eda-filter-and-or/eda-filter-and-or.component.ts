import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewEncapsulation,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import {
  GridsterModule,
  GridsterConfig,
  GridsterItem,
  GridsterItemComponent,
  GridsterPush,
  CompactType,
  DisplayGrid,
  GridType,
} from 'angular-gridster2';
import * as _ from 'lodash';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TooltipModule, SelectButtonModule, GridsterModule, ScrollPanelModule],
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

  @Input() selectedFilters: any[] = [];
  @Input() globalFilters: any[] = [];
  @Input() tables: any[] = [];
  @Input() sortedFilters: any[] = [];
  @Output() dashboardChanged: EventEmitter<any> = new EventEmitter<any>();

  options: GridsterConfig;
  dashboard: GridsterItem[] = [];
  dashboardClone: GridsterItem[] = [];
  itemToPush!: GridsterItemComponent;
  selectedButton: any[];
  selectedButtonInitialValue: string;
  stringQuery: string = '';
  existeIntercambioItems: boolean = false;
  public textBetween: string = $localize`:@@textBetween:Entre`;

  constructor(private cdr: ChangeDetectorRef) {
    let rowHeight = 0;
    let colWidth = 0;
    const widthScreen = window.innerWidth;

    if (widthScreen < 1370) {
      rowHeight = 27; colWidth = 84;
    } else if (widthScreen >= 1370 && widthScreen < 1500) {
      rowHeight = 30; colWidth = 88;
    } else {
      rowHeight = 44; colWidth = 106;
    }

    this.options = {
      gridType: GridType.Fit,
      compactType: CompactType.None,
      displayGrid: DisplayGrid.Always,
      pushItems: false,
      draggable: { enabled: true },
      resizable: { enabled: false },
      mobileBreakpoint: 150,// ---- Mobile control ----
      minCols: 11,
      maxCols: 11,
      minRows: 9,
      maxRows: 9,
      margin: 0.2,
      fixedRowHeight: rowHeight,
      fixedColWidth: colWidth,
      itemChangeCallback: (item: GridsterItem) => this.onItemChange(item),
    };

    this.selectedButton = [
      { label: 'AND', value: 'and' },
      { label: 'OR', value: 'or' },
    ];
  }

  ngOnInit(): void {
    const previousDashboard = EdaFilterAndOrComponent.previousDashboard;

    if (this.sortedFilters === undefined) this.sortedFilters = [];

    if(this.sortedFilters.length===0){
      this.initAndOrFilters();
    } else {
      if(previousDashboard) {
        this.dashboard = _.cloneDeep(this.sortedFilters);
        this.dashboardClone = _.cloneDeep(this.sortedFilters);
        this.updateGridDimensions();
        this.creacionQueryFiltros(this.dashboard);
      } else {
        if(this.sortedFilters.length !== 0) {
          this.dashboard = _.cloneDeep(this.sortedFilters);
          this.dashboardClone = _.cloneDeep(this.sortedFilters);
          this.updateGridDimensions();
          this.creacionQueryFiltros(this.sortedFilters);
        } else {
          this.initAndOrFilters();
        }
      }
      this.addMissingFilters();
    }
  }

  private addMissingFilters(): void {
    const existingIds = new Set(this.dashboard.map((d: any) => d.filter_id));

    const allFilters = [
      ...this.selectedFilters.filter(sf => sf.filterBeforeGrouping !== false),
      ...this.globalFilters.filter(gf => gf.filterBeforeGrouping !== false),
    ];

    const missing = allFilters.filter(f => !existingIds.has(f.filter_id));

    if (missing.length === 0) return;

    const maxY = this.dashboard.length > 0
      ? Math.max(...this.dashboard.map((d: any) => d.y)) + 1
      : 0;

    missing.forEach((f, i) => {
      this.dashboard.push({
        cols: 3, rows: 1, y: maxY + i, x: 0,
        filter_table: f.filter_table,
        filter_column: f.filter_column,
        filter_type: f.filter_type,
        filter_column_type: f.filter_column_type,
        filter_elements: f.filter_elements,
        filter_id: f.filter_id,
        isGlobal: f.isGlobal,
        value: 'and',
      });
    });

    this.dashboardClone = _.cloneDeep(this.dashboard);
    this.creacionQueryFiltros(this.dashboard);
  }

  initAndOrFilters() {
    this.dashboard = [];
    let k = 0;

    this.selectedFilters.forEach((sf) => {
      if (sf.filterBeforeGrouping !== false) {
        this.dashboard.push({
          cols: 3, 
          rows: 1, 
          y: k, 
          x: 0,
          filter_table: sf.filter_table,
          filter_column: sf.filter_column,
          filter_type: sf.filter_type,
          filter_column_type: sf.filter_column_type,
          filter_elements: sf.filter_elements,
          filter_codes: sf.filter_codes,
          filter_id: sf.filter_id,
          isGlobal: sf.isGlobal,
          value: 'and',
        });
        k++;
      }
    });

    const temporalLength = k;
    k = 0;

    this.globalFilters.forEach((gf) => {
      if (gf.filterBeforeGrouping !== false) {
        this.dashboard.push({
          cols: 3, 
          rows: 1, 
          y: k + temporalLength, 
          x: 0,
          filter_table: gf.filter_table,
          filter_column: gf.filter_column,
          filter_type: gf.filter_type,
          filter_column_type: gf.filter_column_type,
          filter_elements: gf.filter_elements,
          filter_codes: gf.filter_codes,
          filter_id: gf.filter_id,
          isGlobal: gf.isGlobal,
          value: 'and',
        });
        k++;
      }
    });

    this.dashboardClone = _.cloneDeep(this.dashboard);
    this.updateGridDimensions();
    this.creacionQueryFiltros(this.dashboard);
  }

  onItemChange(item: GridsterItem): void {
    let contadorIntercambioItems = 0;
    for (let i = 0; i < this.dashboard.length; i++) {
      if (item.x === this.dashboard[i].x && item.y === this.dashboard[i].y) {
        contadorIntercambioItems++;
      }
    }
    if (contadorIntercambioItems === 2) {
      this.existeIntercambioItems = true;
      return;
    }

    for (let i = 0; i < this.dashboard.length; i++) {
      if (item.y === this.dashboard[i].y) {
        if (this.dashboard[i].x - 2 === item.x) { this.existeIntercambioItems = true; return; }
        if (this.dashboard[i].x - 1 === item.x) { this.existeIntercambioItems = true; return; }
        if (this.dashboard[i].x + 1 === item.x) { this.existeIntercambioItems = true; return; }
        if (this.dashboard[i].x + 2 === item.x) { this.existeIntercambioItems = true; return; }
      }
    }

    let verificacionItemInicial = false;
    for (let i = 0; i < this.dashboard.length; i++) {
      if (this.dashboard[i].x === 0 && this.dashboard[i].y === 0) {
        verificacionItemInicial = true;
        break;
      }
    }

    if (verificacionItemInicial) {
      if (this.verificacionHorizontal(item, this.dashboardClone)) {
        if (this.verificacionVertical(this.dashboard)) {
          this.dashboardClone = _.cloneDeep(this.dashboard);
          this.dashboard = this.verificacionVerticalRetroceso(this.dashboardClone);

          if (this.existeIntercambioItems) {
            this.dashboard = this.correccionIntercambioItems(this.dashboardClone);
            this.dashboardClone = _.cloneDeep(this.dashboard);
          } else {
            this.dashboard = _.cloneDeep(this.dashboardClone);
          }
          this.existeIntercambioItems = false;
        } else {
          this.dashboard = _.cloneDeep(this.dashboardClone);
        }
      } else {
        const itemX = this.dashboardClone.find((it: any) => it.filter_id === item.filter_id);
        const itemSuperior = this.dashboardClone.find((it: any) => it.y === item.y - 1);

        // Movimiento puramente horizontal demasiado a la derecha: intentar itemX.x + 1
        if (itemX && item.y === itemX.y && itemSuperior && item.x > 1 + itemSuperior.x) {
          const targetX = itemX.x + 1;
          if (targetX <= 1 + itemSuperior.x) {
            const newDashboard = _.cloneDeep(this.dashboardClone);
            newDashboard.find((it: any) => it.filter_id === item.filter_id).x = targetX;
            this.dashboardClone = _.cloneDeep(newDashboard);
            this.dashboard = _.cloneDeep(newDashboard);
          } else {
            this.dashboard = _.cloneDeep(this.dashboardClone);
          }
        } else {
          this.dashboard = _.cloneDeep(this.dashboardClone);
        }
      }
    } else {
      this.dashboard = _.cloneDeep(this.dashboardClone);
    }

    this.creacionQueryFiltros(this.dashboard);
    this.cdr.detectChanges();
  }

  verificacionVerticalRetroceso(dashboardClonado: any) {
    for (let j = 1; j < dashboardClonado.length - 1; j++) {
      if (dashboardClonado.find((item: any) => item.y === j).x + 1 >= dashboardClonado.find((item: any) => item.y === j + 1).x) {
        continue;
      } else {
        dashboardClonado.find((item: any) => item.y === j + 1).x = dashboardClonado.find((item: any) => item.y === j).x + 1;
      }
    }
    return dashboardClonado;
  }

  correccionIntercambioItems(dashboardClonado: any) {
    for (let i = 1; i < dashboardClonado.length; i++) {
      if (dashboardClonado.find((item: any) => item.y === i).x <= (dashboardClonado.find((item: any) => item.y === (i - 1)).x) + 1) {
        continue;
      } else {
        dashboardClonado.find((item: any) => item.y === i).x = (dashboardClonado.find((item: any) => item.y === (i - 1)).x) + 1;
      }
    }
    return dashboardClonado;
  }

  verificacionVertical(dashboard: any) {
    let verticalY = [];
    for (let j = 0; j < dashboard.length; j++) { verticalY[j] = j; }
    return verticalY.every(valorY => dashboard.some((item: any) => item.y === valorY));
  }

  verificacionHorizontal(item: any, dashboardClonado: any) {
    let itemX = dashboardClonado.filter((it: any) => item.filter_id === it.filter_id)[0];
    let itemSuperior = dashboardClonado.filter((it: any) => it.y === item.y - 1)[0];

    if (item.y === itemX.y) {
      if (!itemSuperior) return item.x === 0;
      return (item.x >= 0) && (item.x <= 1 + itemSuperior.x);
    } else {
      return true;
    }
  }

  creacionQueryFiltros(queries: any) {
    queries.sort((a: any, b: any) => a.y - b.y);

    let stringQuery = 'where ';

    function cadenaRecursiva(item: any) {
      const { y, x, filter_table, filter_column, filter_type, filter_column_type, filter_elements } = item;

      let filter_type_value = '';
      if (filter_type === 'not_in') filter_type_value = 'not in';
      else if (filter_type === 'not_like') filter_type_value = 'not like';
      else if (filter_type === 'not_null') filter_type_value = 'is not null';
      else filter_type_value = filter_type;

      let filter_elements_value = '';
      if (filter_elements.length > 0) {
        if (filter_elements[0].value1.length === 1) {
          if (filter_column_type === 'text') {
            filter_elements_value = `'${filter_type === 'like' || filter_type === 'not_like' ? '%' : ''}${filter_elements[0].value1[0]}${filter_type === 'like' || filter_type === 'not_like' ? '%' : ''}'`;
          } else if (filter_column_type === 'numeric') {
            filter_elements_value = `${filter_elements[0].value1[0]}`;
          }
        } else {
          filter_elements_value = '(';
          if (filter_column_type === 'text') {
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index === (filter_elements[0].value1.length - 1) ? ')' : ','}`;
            });
          } else if (filter_column_type === 'numeric') {
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `${element}` + `${index === (filter_elements[0].value1.length - 1) ? ')' : ','}`;
            });
          } else {
            filter_elements[0].value1.forEach((element: any, index: number) => {
              filter_elements_value += `'${element}'` + `${index === (filter_elements[0].value1.length - 1) ? ')' : ','}`;
            });
          }
        }
      }

      let resultado = `\"${filter_table}\".\"${filter_column}\" ${filter_type_value} ${filter_elements_value}`;

      let elementosHijos: any[] = [];
      for (let n = y + 1; n < queries.length; n++) {
        if (queries[n].x === x) break;
        if (y < queries[n].y && queries[n].x === x + 1) elementosHijos.push(queries[n]);
      }
      
      const itemGenerico = queries.filter((i: any) => i.y === y + 1)[0];
      
      if (elementosHijos.length > 0) {
        let space = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
        let variableSpace = space.repeat(x + 1);
        
        let hijoArreglo = elementosHijos.map(itemHijo => cadenaRecursiva(itemHijo));
        let hijosCadena = '';
        hijoArreglo.forEach((hijo, index) => {
          hijosCadena = hijosCadena + hijo;
          if (index < elementosHijos.length - 1) {
            hijosCadena = hijosCadena + ` <br> ${variableSpace} ${elementosHijos[index + 1].value.toUpperCase()} `;
          }
        });

        resultado = `(${resultado} <br> ${variableSpace} ${itemGenerico.value.toUpperCase()} (${hijosCadena}))`;
      }
      return resultado;
    }

    let itemsString = '( ';
    for (let r = 0; r < queries.length; r++) {
      if (queries[r].x === 0) {
        itemsString = itemsString + (r === 0 ? '' : ' ' + queries[r].value.toUpperCase() + ' ') + queries.filter((e: any) => e.y === r).map(cadenaRecursiva)[0] + `<br>`;
      }
    }
    itemsString = itemsString + ' )';
    stringQuery = stringQuery + itemsString;

    this.stringQuery = _.cloneDeep(stringQuery);
    this.dashboardChanged.emit(this.dashboard);
  }

  onButtonClick() {
    this.creacionQueryFiltros(this.dashboard);
    this.dashboardClone = _.cloneDeep(this.dashboard);
  }

  public getDisplayFilterStrAndOr(item: any) {
    let str = '';
    const table = this.tables.find(t => t.table_name === item.filter_table.split('.')[0])
                || this.tables.find(t => t.table_name === item.filter_table);

    if (table) {
      const tableName = table.display_name?.default || item.filter_table;
      const columnName = table.columns.find((c: any) => c.column_name === item.filter_column)?.display_name?.default || item.filter_column;
      const checksum = (tableName + columnName).length;
      const widthScreen = window.innerWidth;

      if (checksum <= 23) {
        str = `<strong>${tableName}</strong>&nbsp>&nbsp<strong>${columnName}</strong>`;
      } else if (widthScreen < 1370) {
        str = `<strong>${tableName.substring(0, 11)} ...</strong>&nbsp>&nbsp<strong>${columnName.substring(0, 11)} ...</strong>`;
      } else {
        str = `<strong>${tableName.substring(0, 14)} ...</strong>&nbsp>&nbsp<strong>${columnName.substring(0, 14)} ...</strong>`;
      }
    } else {
      str = `<strong>${item.filter_table}</strong>&nbsp>&nbsp<strong>${item.filter_column}</strong>`;
    }
    return str;
  }

  public tooltipDescription(item: any) {
    let str = '';
    const table = this.tables.find(t => t.table_name === item.filter_table.split('.')[0])
                || this.tables.find(t => t.table_name === item.filter_table);

    const tableName = table?.display_name?.default || item.filter_table;
    const columnName = table?.columns.find((c: any) => c.column_name === item.filter_column)?.display_name?.default || item.filter_column;

    const values = item.filter_elements[0]?.value1;
    const values2 = item.filter_elements[1]?.value2;

    let valueStr = '';
    if (values) {
      if (values.length === 1 && !['in', 'not_in'].includes(item.filter_type)) {
        valueStr = `"${values[0]}"`;
      } else if (values.length > 1 || ['in', 'not_in'].includes(item.filter_type)) {
        valueStr = `[${values.map((v: string) => `"${v}"`).join(', ')}]`;
      }
      if (values2) {
        if (values2.length === 1) valueStr = `"${values[0]}" - "${values2[0]}"`;
        else if (values2.length > 1) valueStr = `AND [${values2.map((v: string) => `"${v}"`).join(', ')}]`;
      }
    }

    let filterType = item.filter_type;
    if (filterType === 'between') filterType = this.textBetween;

    const filterDescription = item.isGlobal ? 'Filtro Global' : 'Filtro Panel';
    str = `${tableName} [${columnName}] ${filterType} ${valueStr} > ${filterDescription}`;
    return str;
  }

  public getFilterJoins(item: any) {
    const filter = this.globalFilters.find((gf: any) => gf.filter_id === item.filter_id);

    if (!item.isGlobal) return '';
    let pathStr = '';

    if (filter?.joins?.length > 0) {
      for (const path of filter.joins) {
        const table = (path[0] || '');
        let tableName = this.getNiceTableName(table);
        if (!tableName) tableName = this.getNiceTableName(table.split('.')[0]);
        pathStr += ` ${tableName} > `;
      }
    } else if (filter?.valueListSource) {
      const tableName = this.getNiceTableName(filter.valueListSource.target_table);
      if (tableName) pathStr += ` ${tableName} → `;
    }

    return pathStr;
  }

  public getNiceTableName(table: any) {
    return this.tables.find(t => t.table_name === table)?.display_name?.default;
  }

  private updateGridDimensions(): void {
    const base = 9;
    const extra = Math.max(0, this.dashboard.length - base);
    
    this.options = {
      ...this.options,
      minCols: 11 + extra,
      maxCols: 11 + extra,
      minRows: base + extra,
      maxRows: base + extra,
    };

  }
}
