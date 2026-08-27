import { Component, EventEmitter, Input, input, OnInit, Output } from "@angular/core";
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectButtonModule } from "primeng/selectbutton";
import { TooltipModule } from "primeng/tooltip";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";
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
    imports: [SharedModule, ReactiveFormsModule, SelectButtonModule, CommonModule, GridsterModule, EdaDialog2Component, TooltipModule],
    styleUrls: ["./dependent-filters.component.css"],

})


export class DependentFilters implements OnInit {

    @Input() dashboard: DashboardPage
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    options: GridsterConfig;
    dependentFilterGrid: GridsterItem[]; // Ordering of dependent filters
    itemToPush: GridsterItemComponent;

    public display: boolean = false;
    private dependentFilterGridPrev: any = []; // Variable that stores a copy of dependentFilterGrid

    constructor() {}

    ngOnInit(): void {
        this.display = true;

        // If there is a previous configuration of dependent filters it should prevail
        if(this.dashboard.globalFilter.orderDependentFilters.length !== 0) {

            const saved = _.cloneDeep(this.dashboard.globalFilter.orderDependentFilters);
            const currentFilters = this.dashboard.globalFilter.globalFilters;
            const currentIds = new Set(currentFilters.map((gf: any) => gf.id));
            const savedIds = new Set(saved.map((item: any) => item.filter_id));

            // 1. Remove grid items that no longer exist in globalFilters
            let reconciled = saved.filter((item: any) => currentIds.has(item.filter_id));

            // 1.5. Add description to items that lack it
            for (const item of reconciled) {
                if (!item.description_column || !item.description_table) {
                    const gf = currentFilters.find((f: any) => f.id === item.filter_id) as any;
                    if (gf) {
                        item.description_table = item.description_table || gf.selectedTable?.display_name?.default || gf.table?.label || gf.selectedTable?.table_name;
                        item.description_column = item.description_column || gf.selectedColumn?.display_name?.default || gf.column?.label || gf.selectedColumn?.column_name;
                    }
                }
            }

            // 2. Normalize values so they are consecutive 0..n-1 after removal
            reconciled.sort((a: any, b: any) => a.y - b.y);
            reconciled.forEach((item: any, index: number) => { item.y = index; });

            // 3. Add new filters that are not in the saved grid
            let k = reconciled.length;
            for (const gf of currentFilters) {
                if (!savedIds.has((gf as any).id)) {
                    reconciled.push({
                        cols: 3, rows: 1, y: k++, x: 0,
                        filter_table: (gf as any).selectedTable?.table_name || (gf as any).table?.value,
                        filter_column: (gf as any).selectedColumn?.column_name || (gf as any).column?.value?.column_name,
                        filter_type: (gf as any).selectedColumn?.column_type || (gf as any).column?.value?.column_type,
                        filter_id: (gf as any).id,
                        description_table: (gf as any).selectedTable?.display_name?.default || (gf as any).table?.label,
                        description_column: (gf as any).selectedColumn?.display_name?.default || (gf as any).column?.label,
                    });
                }
            }

            this.dependentFilterGrid = reconciled;
            this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);

        } else {
            // initializing the dashboard
            this.initDashboard();
        }

        const filterCount = this.dependentFilterGrid.length;
        const dynamicRows = Math.max(10, filterCount);
        const dynamicCols = Math.max(12, filterCount + 2);

        this.options = {
            gridType: GridType.Fit,
            compactType: CompactType.None,
            displayGrid: DisplayGrid.Always,
            pushItems: false,
            draggable: { enabled: true },
            resizable: { enabled: false },

            // ---- Mobile control ----
            mobileBreakpoint: 150,

            // Prevent items from changing size on mobile:
            // If you want them to keep width/height defined by fixedCol/Row:
            fixedColWidth: 130,
            fixedRowHeight: 50,
            keepFixedWidthInMobile: true, // keep fixed width when entering mobile
            keepFixedHeightInMobile: true,// keep fixed height when entering mobile

            // Extra useful options
            disableWindowResize: false,   // false by default; if true would avoid automatic recalculations
            mobileModeEnabled: true,       // explicit (not all versions have this prop)

            minCols: dynamicCols,
            maxCols: dynamicCols,
            minRows: dynamicRows,
            maxRows: dynamicRows,
            margin: 1, // Margin between blocks

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
                    description_table: gf.selectedTable?.display_name?.default || gf.table?.label,
                    description_column: gf.selectedColumn?.display_name?.default || gf.column?.label,
                }
            );
            k++;
        });
        
        // COPY OF THE DASHBOARD TO HAVE A PREVIOUS DASHBOARD
        this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);
    }

    onItemChange(item: GridsterItem): void {

        const x = this.dependentFilterGrid.length;
        let arregloY = [...Array(x).keys()];
        let controlDashY = [...Array(x).keys()];
        let controlDashPrevY = [...Array(x).keys()];

        if(item.y >= this.dependentFilterGrid.length){
            // WE VERIFY THAT BLOCKS DO NOT ESCAPE OUTSIDE THE LENGTH OF THE DASHBOARD VARIABLE
            for(let i=0; i<this.dependentFilterGrid.length; i++) {
                if(this.dependentFilterGrid[i].y >= this.dependentFilterGrid.length) {
                } else {
                    arregloY = arregloY.filter(index => index !== this.dependentFilterGrid[i].y);
                }
            }

            item.x = this.dependentFilterGridPrev.find((gf: any) => gf.filter_column === item.filter_column).x;
            item.y = arregloY[0];

            // Make Gridster update the position
            if (this.options.api?.optionsChanged) {
                this.options.api.optionsChanged();
            }            
    
        } else {
            // CONTROL FOR BLOCKS INSIDE THE LENGTH OF THE DASHBOARD VARIABLE
            controlDashY = [...Array(x).keys()];
            controlDashPrevY = [...Array(x).keys()];

            // ensuring we always have a filter at every vertical point: { y=0, y=1, y=2, ..., y=n-1, y=n };
            this.dependentFilterGrid.forEach((gf: any) => { controlDashY = controlDashY.filter(index => index !== gf.y); })
            this.dependentFilterGridPrev.forEach((gf: any) => { controlDashPrevY = controlDashPrevY.filter(index => index !== gf.y); })

            // CHECK FOR SWAPPING OR OVERLAPPING ELEMENTS IN THE GRID -> go to else
            if(controlDashY.length === 0 && controlDashPrevY.length === 0) {

                //////////////////////////////////
                // START HORIZONTAL MOVEMENT    //
                //////////////////////////////////

                const index = this.dependentFilterGrid.findIndex(gf => gf.filter_column === item.filter_column);
                const preItem = this.dependentFilterGrid.find((gf: any) => gf.y === (item.y-1));

                if(item.y === 0) {
                    // HORIZONTAL MOVEMENT CONTROL FOR THE ELEMENT (x=0; y=0)
                    item.x = 0;
                    item.y = 0;
                    if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                } else {

                    if(item.x > this.dependentFilterGridPrev[index].x) {
                        // HORIZONTAL MOVEMENT CONTROL =>  RIGHT
                        if(item.x > preItem.x + 1) {
                            item.x = preItem.x + 1;
                            if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                        }
                    } else {
                        // HORIZONTAL MOVEMENT CONTROL =>  LEFT
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
                // END HORIZONTAL MOVEMENT   //
                ///////////////////////////////
                
            } else {
                ////////////////////////////////////////////////////////
                // START SWAPPING VALUES WITH VERTICAL CONTROL        //
                ////////////////////////////////////////////////////////

                // Start and end blocks of movement (temporary variables)
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
                // END SWAPPING VALUES WITH VERTICAL CONTROL       //
                /////////////////////////////////////////////////////
                
            }
        }

        // THE PREVIOUS DASHBOARD ACQUIRES THE CURRENT VALUE:
        this.dependentFilterGridPrev = _.cloneDeep(this.dependentFilterGrid);
    }

    // RECURSIVE FUNCTION THAT BUILDS THE ORDERITEM
    buildOrderChildren(globalFilters, ordenamiento) {
        // Fast map by filter_column => node in ordering
        const byColumn = new Map(ordenamiento.map(n => [n.filter_id, n]));

        // Group nodes by x (column) and sort each group by ascending y
        const colsMap = new Map();
        for (const node of ordenamiento) {
            if (!colsMap.has(node.x)) colsMap.set(node.x, []);
            colsMap.get(node.x).push(node);
        }
        for (const [x, arr] of colsMap.entries()) {
            arr.sort((a, b) => a.y - b.y);
        }

        // list of x's sorted asc
        const xs = Array.from(colsMap.keys()).sort((a, b) => a - b);

        // To speed up, map x -> array of nodes (already sorted by y)
        const nodesByX = new Map(xs.map(x => [x, colsMap.get(x) || []]));

        // Recursive construction with memo (memoKey = filter_column)
        const memo = new Map();

        function buildChildrenFor(node) {
            if (!node) return [];
            const key = node.filter_id;
            if (memo.has(key)) return memo.get(key);

            const currentX = node.x;
            // find next existing column
            const ix = xs.indexOf(currentX);
            if (ix === -1 || ix === xs.length - 1) {
                memo.set(key, []);
                return [];
            }
            const nextX = xs[ix + 1];
            const candidates = nodesByX.get(nextX) || [];

            // If there are no candidates -> no children
            if (candidates.length === 0) {
                memo.set(key, []);
                return [];
            }

            // Filter candidates that FALL under this parent according to the rule:
            // a candidate is assigned to this parent if, when searching among all parents
            // of column currentX the one with greatest y <= candidate.y, that parent is this node.
            // To do this efficiently, we need the list of parents (col currentX) ordered by y.
            const parents = nodesByX.get(currentX) || [];
            if (parents.length === 0) {
                memo.set(key, []);
                return [];
            }

            // For each candidate, find its "designated" parent in column currentX
            // (parent with greatest y <= candidate.y). If none exists, use first parent (fallback).
            const assigned = [];
            for (const cand of candidates) {
                // optional binary search for parents (parents ordered by y)
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

                // if the designated parent is the current node, cand is a child of node
                if (designatedParent.filter_id === node.filter_id) {
                    assigned.push(cand);
                }
            }

            // Order of children: by ascending y (to keep consistency)
            assigned.sort((a, b) => a.y - b.y);

            const children = assigned.map(cn => ({
                column_name: cn.filter_column,
                filter_id: cn.filter_id,
                children: buildChildrenFor(cn)
            }));

            memo.set(key, children);
            return children;
        }

        // Helper to get the key of the globalFilter (globalFilters use gf.id)
        function getFilterKey(gf) {
            if (!gf) return undefined;
            return gf.id ?? undefined;
        }

        // Build result keeping the order of globalFilters
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
    //////////////////// START OF DIALOG CONTROL /////////////////////////
    //////////////////////////////////////////////////////////////////////

    public disableApply(): boolean { return false; }

    public onApply() {
        this.display = false;

        // Generating the children ordering (tree type) for each global filter (for each item).
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
    ///////////////////// END OF DIALOG CONTROL //////////////////////////
    //////////////////////////////////////////////////////////////////////

}
