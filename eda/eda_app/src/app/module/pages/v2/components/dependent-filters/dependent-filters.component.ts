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

    @Input() dashboardPage: DashboardPageV2
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    options: GridsterConfig;
    dashboard: GridsterItem[];
    itemToPush: GridsterItemComponent;

    public display: boolean = false;
    private dashboardPrev: any = [];

    constructor() {}

    ngOnInit(): void {
        this.display = true;
        console.log('MI dashboardPage: ', this.dashboardPage);

        // inicializando el initDashboard
        this.initDashboard();

        this.options = {
        gridType: GridType.Fit,        // mantienes Fit si quieres que siga llenando el contenedor
        compactType: CompactType.None,
        // displayGrid: DisplayGrid.Always,
        pushItems: false,
        draggable: { enabled: true },
        resizable: { enabled: false },

        // ---- Mobile control ----
        mobileBreakpoint: 150,

        // Evita que los items cambien sus dimensiones en mobile:
        // Si quieres que en mobile conserven el ancho/alto definidos por fixedCol/Row:
        fixedColWidth: 90,    
        fixedRowHeight: 50,
        keepFixedWidthInMobile: true, // conserva el ancho fijo al entrar en mobile
        keepFixedHeightInMobile: true,// conserva la altura fija al entrar en mobile

        // Opciones útiles extra
        disableWindowResize: false,   // false por defecto; si true evitaría recálculos automáticos
        mobileModeEnabled: true,       // por claridad (no todas las versiones tienen esta prop)

        minCols: 10,
        maxCols: 10,
        minRows: 10, // Make this value dynamic - pending
        maxRows: 10, // Make this value dynamic - pending
        margin: 1, // Reduce the margin between cells

        itemChangeCallback: this.onItemChange.bind(this)
        };


        // MANTENER COMO REFERENCIA EN EL DESARROLLO
        // this.dashboard = [
        // { cols: 3, rows: 1, y: 0, x: 0, initCallback: this.initItem.bind(this) },
        // { cols: 3, rows: 1, y: 1, x: 0 },
        // { cols: 3, rows: 1, y: 2, x: 0 },
        // { cols: 3, rows: 1, y: 3, x: 0 },
        // { cols: 3, rows: 1, y: 4, x: 0 },
        // { cols: 3, rows: 1, y: 5, x: 0 },
        // { cols: 3, rows: 1, y: 6, x: 0 },
        // { cols: 3, rows: 1, y: 7, x: 0 },
        // { cols: 3, rows: 1, y: 8, x: 0 },
        // { cols: 3, rows: 1, y: 9, x: 0 },
        // ];
        
    }

    initDashboard() {
        this.dashboard = [];
        let k = 0;

        this.dashboardPage.globalFilter.globalFilters.forEach((gf: any) => {
            this.dashboard.push(
                {
                    cols: 3,
                    rows: 1,
                    y: k,
                    x: 0,
                    filter_table: gf.selectedTable.display_name.default,
                    filter_column: gf.selectedColumn.display_name.default,
                    filter_type: gf.selectedColumn.column_type,
                    filter_id: gf.id,
                }
            );
            k++;
        });

        // COPIA DEL DASHBOARD, PARA TENER UN DASHBOARD PREVIO
        this.dashboardPrev = _.cloneDeep(this.dashboard);

    }

    onItemChange(item: GridsterItem): void {

        // console.log('this.dashboard: ', this.dashboard);
        // console.log('item: ', item);

        const x = this.dashboard.length;
        let arregloY = [...Array(x).keys()];
        let controlDashY = [...Array(x).keys()];
        let controlDashPrevY = [...Array(x).keys()];

        // console.log('this.dashboardPrev: ', this.dashboardPrev);


        if(item.y >= this.dashboard.length){
            
            for(let i=0; i<this.dashboard.length; i++) {
                if(this.dashboard[i].y >= this.dashboard.length) {
                    // console.log('gf: ', this.dashboard[i]);
                } else {
                    arregloY = arregloY.filter(index => index !== this.dashboard[i].y);
                }
            }

            item.x = this.dashboardPrev.find((gf: any) => gf.filter_column === item.filter_column).x;
            item.y = arregloY[0];

            // Gridster que actualice la posición
            if (this.options.api?.optionsChanged) {
                this.options.api.optionsChanged();
            }            
    
            // console.log('arregloY: 2', arregloY);
            console.log('Arreglo de salto de linea ............ ');

        } else {
            // console.log('AQUI NO DEBE HABER ESTE ANALISIS')
            // console.log('AUQIIII dashboard: ', this.dashboard);
            controlDashY = [...Array(x).keys()];
            controlDashPrevY = [...Array(x).keys()];

            console.log('this.dashboard ==>>', this.dashboard);
            console.log('this.dashboardPrev ==>>', this.dashboardPrev);
            console.log('item ==>>', item);

            // verificando que siempre tengamos un filtro en todos los puntos verticales: { y=0, y=1, y=2, ..., y=n-1, y=n };
            this.dashboard.forEach((gf: any) => { controlDashY = controlDashY.filter(index => index !== gf.y); })
            this.dashboardPrev.forEach((gf: any) => { controlDashPrevY = controlDashPrevY.filter(index => index !== gf.y); })

            console.log('controlDashY ::: ', controlDashY);
            console.log('controlDashPrevY ::: ', controlDashPrevY);
            debugger;

            // VERIFICACION PARA EL INTERCAMBIO O TRANSLAPE DE LOS ELEMENTOS EN EL GRID
            if(controlDashY.length === 0 && controlDashPrevY.length === 0) {

                //////////////////////////////////
                // INICIO MOVIMIENTO HORIZONTAL //
                //////////////////////////////////
                console.log('CONTROL ----------- HORIZONTAL -----------')

                const index = this.dashboard.findIndex(gf => gf.filter_column === item.filter_column);

                if(index === 0) {
                    console.log('es cerooo')
                    item.x = 0;
                    item.y = 0;
                    if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                } else {

                    if(item.x > this.dashboardPrev[index].x) {
                        console.log('DERECHAAAAAAAAAA')
                        if(item.x > this.dashboard[index - 1].x + 1) {
                            item.x = this.dashboard[index - 1].x + 1;
                            if (this.options.api?.optionsChanged) this.options.api.optionsChanged();   
                        }
                    } else {
                        console.log('IZQUIERDAAAAAAAA')
                        console.log('this.dashboard: ', this.dashboard);
                        console.log('this.dashboardPrev: ', this.dashboardPrev);
                        console.log('item: ', item);
                        console.log('index: ', index);
                        debugger;




                    }





                }


                ///////////////////////////////
                // FIN MOVIMIENTO HORIZONTAL //
                ///////////////////////////////

                
            } else {

                ///////////////////////////////////////////////////
                // INTERCAMBIO DE VALORES - CON CONTROL VERTICAL //
                ///////////////////////////////////////////////////

                console.log('CONTROL ----------- VERTICAL -----------')
                console.log('this.dashboard: ', this.dashboard);
                console.log('this.dashboardPrev: ', this.dashboardPrev);
                console.log('item: ', item);
                console.log('arregloY: ', arregloY);
            }
            
            // OTRO DESARROLLO

        }

        // EL DASHBOARD PREVIO ADQUIERE EL VALOR ACTUAL:
        this.dashboardPrev = _.cloneDeep(this.dashboard);
    }

    configurationDependentFilters(dashboard: any, item) {
        // this.dashboard.splice(this.dashboard.indexOf(item), 1);
    }


    initItem(item: GridsterItem, itemComponent: GridsterItemComponent): void {
        this.itemToPush = itemComponent;
    }

    removeItem($event: MouseEvent | TouchEvent, item): void {
        $event.preventDefault();
        $event.stopPropagation();
        this.dashboard.splice(this.dashboard.indexOf(item), 1);
    }   


    ////////////////////////////////////////////////////////////////////////////
    //////////////////// INICIO CONFIGURACION DEL COMPONENTE ///////////////////
    ////////////////////////////////////////////////////////////////////////////

    public disableApply(): boolean { return false; }

    public onApply() {
        console.log('---- onApply ----');
        this.display = false;
        this.close.emit('APLICANDO CAMBIOS AL DASHBOARD .....');
    }

    public onClose(): void {
        console.log('---- onClose ----');
        this.display = false;
        this.close.emit('DASHBOARD SIN MODIFICAR.....');
    }

    ////////////////////////////////////////////////////////////////////////////
    ///////////////////// FIN CONFIGURACION DEL COMPONENTE /////////////////////
    ////////////////////////////////////////////////////////////////////////////

}




