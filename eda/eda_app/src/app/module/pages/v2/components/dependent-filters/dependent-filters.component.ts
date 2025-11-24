import { Component, EventEmitter, Input, input, OnInit, Output } from "@angular/core";
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";
import * as _ from 'lodash';

import {
  CompactType,
  GridsterConfig,
  DisplayGrid,
  GridsterItem,
  GridsterItemComponent,
  GridsterModule,
  GridsterPush,
  GridType
} from 'angular-gridster2';

@Component({
    selector:'app-dependent-filters',
    standalone: true,
    templateUrl: './dependent-filters.component.html',
    imports: [SharedModule, ReactiveFormsModule, SelectButtonModule, CommonModule, GridsterModule],
    styleUrls: ["./dependent-filters.component.css"],

})


export class DependentFilters implements OnInit {

    @Input() dashboard: DashboardPageV2
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    options: GridsterConfig;
    dependentFilterGrid: GridsterItem[]; // Ordenamiento de los filtros dependientes
    itemToPush: GridsterItemComponent;

    public display: boolean = false;
    private dependentFilterGridPrev: any = []; // Variable que almacena una copia del dependentFilterGrid

    constructor() {}

    ngOnInit(): void {
        this.display = true;

        // Si existe una configuración previa de los filtros dependientes debería prevalecer
        if(this.dashboard.globalFilter.orderDependentFilters.length !== 0) {

            this.dependentFilterGrid = _.cloneDeep(this.dashboard.globalFilter.orderDependentFilters);
            this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);

        } else {
            // inicializando el initDashboard
            this.initDashboard();
        }

        this.options = {
            gridType: GridType.Fit,
            compactType: CompactType.None,
            displayGrid: DisplayGrid.Always,
            pushItems: false,
            draggable: { enabled: true },
            resizable: { enabled: false },

            // ---- Mobile control ----
            mobileBreakpoint: 150,

            // Evita que los items cambien sus dimensiones en mobile:
            // Si quieres que en mobile conserven el ancho/alto definidos por fixedCol/Row:
            fixedColWidth: 130,    
            fixedRowHeight: 50,
            keepFixedWidthInMobile: true, // conserva el ancho fijo al entrar en mobile
            keepFixedHeightInMobile: true,// conserva la altura fija al entrar en mobile

            // Opciones útiles extra
            disableWindowResize: false,   // false por defecto; si true evitaría recálculos automáticos
            mobileModeEnabled: true,       // por claridad (no todas las versiones tienen esta prop)

            minCols: 12,
            maxCols: 12,
            minRows: 10, // Hacer este valor dinamico - Pendiente
            maxRows: 10, // Hacer este valor dinamico - Pendiente
            margin: 1, // Margen entre los bloques

            itemChangeCallback: this.onItemChange.bind(this)
        };
        
    }

    initDashboard() {
        this.dependentFilterGrid = [];
        let k = 0;

        this.dashboard.globalFilter.globalFilters.forEach((gf: any) => {
            this.dependentFilterGrid.push(
                {
                    cols: 3,
                    rows: 1,
                    y: k,
                    x: 0,
                    filter_table: gf.selectedTable?.table_name ||gf.table?.value,
                    filter_column: gf.selectedColumn?.column_name || gf.column?.value?.column_name,
                    filter_type: gf.selectedColumn?.column_type || gf.column?.value?.column_type,
                    filter_id: gf.id,
                }
            );
            k++;
        });
        
        // COPIA DEL DASHBOARD, PARA TENER UN DASHBOARD PREVIO
        this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);
    }

    onItemChange(item: GridsterItem): void {

        const x = this.dependentFilterGrid.length;
        let arregloY = [...Array(x).keys()];
        let controlDashY = [...Array(x).keys()];
        let controlDashPrevY = [...Array(x).keys()];

        if(item.y >= this.dependentFilterGrid.length){
            // VERIFICAMOS QUE LOS BLOQUES NO SE ESCAPEN FUERA DE LA LONGITUD DE LA VARIABLE DASHBOARD
            for(let i=0; i<this.dependentFilterGrid.length; i++) {
                if(this.dependentFilterGrid[i].y >= this.dependentFilterGrid.length) {
                } else {
                    arregloY = arregloY.filter(index => index !== this.dependentFilterGrid[i].y);
                }
            }

            item.x = this.dependentFilterGridPrev.find((gf: any) => gf.filter_column === item.filter_column).x;
            item.y = arregloY[0];

            // Gridster que actualice la posición
            if (this.options.api?.optionsChanged) {
                this.options.api.optionsChanged();
            }            
    
        } else {
            // CONTROL PARA LOS BLOQUES AL INTERIOR DE LA LOGINTUD DE LA VARIABLE DASHBOARD
            controlDashY = [...Array(x).keys()];
            controlDashPrevY = [...Array(x).keys()];

            // verificando que siempre tengamos un filtro en todos los puntos verticales: { y=0, y=1, y=2, ..., y=n-1, y=n };
            this.dependentFilterGrid.forEach((gf: any) => { controlDashY = controlDashY.filter(index => index !== gf.y); })
            this.dependentFilterGridPrev.forEach((gf: any) => { controlDashPrevY = controlDashPrevY.filter(index => index !== gf.y); })

            // VERIFICACION PARA EL INTERCAMBIO O TRANSLAPE DE LOS ELEMENTOS EN EL GRID VAYAN POR EL ELSE
            if(controlDashY.length === 0 && controlDashPrevY.length === 0) {

                //////////////////////////////////
                // INICIO MOVIMIENTO HORIZONTAL //
                //////////////////////////////////

                const index = this.dependentFilterGrid.findIndex(gf => gf.filter_column === item.filter_column);
                const preItem = this.dependentFilterGrid.find((gf: any) => gf.y === (item.y-1));

                if(item.y === 0) {
                    // CONTROL DE MOVIMIENTO HORIZONTAL PARA EL ELEMENTO (x=0; y=0)
                    item.x = 0;
                    item.y = 0;
                    if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                } else {

                    if(item.x > this.dependentFilterGridPrev[index].x) {
                        // CONTROL DE MOVIMIENTO HORIZONTAL =>  DERECHA
                        if(item.x > preItem.x + 1) {
                            item.x = preItem.x + 1;
                            if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                        }
                    } else {
                        // CONTROL DE MOVIMIENTO HORIZONTAL =>  IZQUIERDA
                        for(let j=item.y+1; j<this.dependentFilterGridPrev.length; j++) {
                            if(this.dependentFilterGridPrev.find((gl: any) => gl.y===item.y).x <= this.dependentFilterGridPrev.find((gl: any) => gl.y===j).x ) {
                                this.dependentFilterGrid.find((gl: any) => gl.y===j).x = this.dependentFilterGrid.find((gl: any) => gl.y===j).x - (this.dependentFilterGridPrev.find((gl: any) => gl.y===(item.y)).x - item.x);
                                if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                            } else {
                                break;
                            }
                        }

                    }

                }

                ///////////////////////////////
                // FIN MOVIMIENTO HORIZONTAL //
                ///////////////////////////////
                
            } else {
                ////////////////////////////////////////////////////////
                // INICIO INTERCAMBIO DE VALORES CON CONTROL VERTICAL //
                ////////////////////////////////////////////////////////

                // Bloque de inicio de movimiento y de final de movimiento (Variables temporales)
                const iniBlo = _.cloneDeep(this.dependentFilterGridPrev).find((gf: any) => item.filter_id === gf.filter_id);
                const finBlo = _.cloneDeep(this.dependentFilterGridPrev).find((gf: any) => item.y === gf.y);

                const ini = this.dependentFilterGrid.find(gf => gf.filter_id === iniBlo.filter_id);
                ini.x = finBlo.x
                ini.y = finBlo.y
                const fin = this.dependentFilterGrid.find(gf => gf.filter_id === finBlo.filter_id);
                fin.x = iniBlo.x
                fin.y = iniBlo.y

                if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                
                /////////////////////////////////////////////////////
                // FIN INTERCAMBIO DE VALORES CON CONTROL VERTICAL //
                /////////////////////////////////////////////////////
                
            }
        }

        // EL DASHBOARD PREVIO ADQUIERE EL VALOR ACTUAL:
        this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);
    }

    // FUNCION RECURSIVA QUE CONSTRUYE EL ORDERITEM
    buildOrderChildren(globalFilters, ordenamiento) {
        // Map rápido por filter_column => nodo en ordenamiento
        const byColumn = new Map(ordenamiento.map(n => [n.filter_id, n]));

        // Agrupar nodos por x (columna) y ordenar cada grupo por y asc
        const colsMap = new Map();
        for (const node of ordenamiento) {
            if (!colsMap.has(node.x)) colsMap.set(node.x, []);
            colsMap.get(node.x).push(node);
        }
        for (const [x, arr] of colsMap.entries()) {
            arr.sort((a, b) => a.y - b.y);
        }

        // lista de x's ordenados asc
        const xs = Array.from(colsMap.keys()).sort((a, b) => a - b);

        // Para acelerar, map x -> array de nodos (ya ordenados por y)
        const nodesByX = new Map(xs.map(x => [x, colsMap.get(x) || []]));

        // Construcción recursiva con memo (memoKey = filter_column)
        const memo = new Map();

        function buildChildrenFor(node) {
            if (!node) return [];
            const key = node.filter_id;
            if (memo.has(key)) return memo.get(key);

            const currentX = node.x;
            // encontrar siguiente columna existente
            const ix = xs.indexOf(currentX);
            if (ix === -1 || ix === xs.length - 1) {
                memo.set(key, []);
                return [];
            }
            const nextX = xs[ix + 1];
            const candidates = nodesByX.get(nextX) || [];

            // Si no hay candidatos -> sin hijos
            if (candidates.length === 0) {
                memo.set(key, []);
                return [];
            }

            // Filtrar los candidatos que CAEN sobre este padre según la regla:
            // un candidato se asigna a este padre si, al buscar entre todos los padres
            // de la columna currentX el que tenga mayor y <= candidato.y, ese padre es este node.
            // Para hacer eso de forma eficiente, necesitamos la lista de padres (col currentX) ordenada por y.
            const parents = nodesByX.get(currentX) || [];
            if (parents.length === 0) {
                memo.set(key, []);
                return [];
            }

            // Para cada candidato, encontrar su padre "designado" en la columna currentX
            // (padre con mayor y <= candidate.y). Si no existe, el primer padre (fallback).
            const assigned = [];
            for (const cand of candidates) {
                // binary search opcional para padres (parents ordenados por y)
                let lo = 0, hi = parents.length - 1, foundIndex = -1;
                while (lo <= hi) {
                    const mid = Math.floor((lo + hi) / 2);
                    if (parents[mid].y <= cand.y) {
                    foundIndex = mid;
                    lo = mid + 1;
                    } else {
                    hi = mid - 1;
                    }
                }
                const parentIndex = (foundIndex === -1) ? 0 : foundIndex;
                const designatedParent = parents[parentIndex];

                // si el padre designado es el nodo actual, cand es hijo del node
                if (designatedParent.filter_id === node.filter_id) {
                    assigned.push(cand);
                }
            }

            // Orden de children: por y asc (mantener consistencia)
            assigned.sort((a, b) => a.y - b.y);

            const children = assigned.map(cn => ({
                column_name: cn.filter_column,
                filter_id: cn.filter_id,
                children: buildChildrenFor(cn)
            }));

            memo.set(key, children);
            return children;
        }

        // Helper para obtener el "nombre" clave dentro de globalFilter
        function getFilterKey(gf) {
            if (!gf) return undefined;
            if (gf.filter_id) return gf.filter_id;
            // soporte opcional para gf.selectedColumn.display_name.default
            try {
                return gf.id;
            } catch (e) {
                return undefined;
            }
        }

        // Construir resultado manteniendo el orden de globalFilters
        const result = globalFilters.map(gf => {
            const key = getFilterKey(gf);
            const node = key ? byColumn.get(key) : undefined;
            const children = node ? buildChildrenFor(node) : [];
            return { ...gf, children };
        });

        return result;
    }


    initItem(item: GridsterItem, itemComponent: GridsterItemComponent): void {
        this.itemToPush = itemComponent;
    }

    removeItem($event: MouseEvent | TouchEvent, item): void {
        $event.preventDefault();
        $event.stopPropagation();
        this.dependentFilterGrid.splice(this.dependentFilterGrid.indexOf(item), 1);
    }   


    //////////////////////////////////////////////////////////////////////
    //////////////////// INICIO DEL CONTROL DEL DIALOG ///////////////////
    //////////////////////////////////////////////////////////////////////

    public disableApply(): boolean { return false; }

    public onApply() {
        this.display = false;

        // Generando el ordenamiento children (tipo arbol) por cada filtro global (por cada item).
        const globalFilters = this.buildOrderChildren(this.dashboard.globalFilter.globalFilters, this.dependentFilterGrid)
        const orderDependentFilters = this.dependentFilterGrid;

        this.close.emit(
            {
                globalFilters : globalFilters, 
                orderDependentFilters: orderDependentFilters
            }
        );
    }

    public onClose(): void {
        this.display = false;
        this.close.emit({});
    }

    //////////////////////////////////////////////////////////////////////
    ///////////////////// FIN DEL CONTROL DEL DIALOG /////////////////////
    //////////////////////////////////////////////////////////////////////

}




