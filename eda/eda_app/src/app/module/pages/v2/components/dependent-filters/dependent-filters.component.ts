import { Component, EventEmitter, Input, input, OnInit, Output } from "@angular/core";
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";

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

    public display: boolean = false;

    options: GridsterConfig;
    dashboard: GridsterItem[];
    itemToPush: GridsterItemComponent;

    constructor() {}

    ngOnInit(): void {
        this.display = true;
        console.log('MI dashboardPage: ', this.dashboardPage);


        this.options = {
        gridType: GridType.Fit,        // mantienes Fit si quieres que siga llenando el contenedor
        compactType: CompactType.None,
        displayGrid: DisplayGrid.Always,
        pushItems: false,
        draggable: { enabled: true },
        resizable: { enabled: false },

        // ---- Mobile control ----
        mobileBreakpoint: 150,

        // Evita que los items cambien sus dimensiones en mobile:
        // Si quieres que en mobile conserven el ancho/alto definidos por fixedCol/Row:
        fixedColWidth: 90,           // ancho "base" que Gridster usará si keep...InMobile = true
        fixedRowHeight: 50,          // alto "base" que Gridster usará si keep...InMobile = true
        keepFixedWidthInMobile: true, // conserva el ancho fijo al entrar en mobile
        keepFixedHeightInMobile: true,// conserva la altura fija al entrar en mobile

        // Opciones útiles extra
        disableWindowResize: false,   // false por defecto; si true evitaría recálculos automáticos
        mobileModeEnabled: true,       // por claridad (no todas las versiones tienen esta prop)

            minCols: 10,
            maxCols: 10,
            minRows: 9, // Make this value dynamic - pending
            maxRows: 9, // Make this value dynamic - pending
            margin: 0.2, // Reduce the margin between cells
        };

        this.dashboard = [
        { cols: 2, rows: 1, y: 0, x: 0, initCallback: this.initItem.bind(this) },
        { cols: 2, rows: 2, y: 0, x: 2 },
        { cols: 1, rows: 1, y: 0, x: 4 },
        { cols: 3, rows: 2, y: 1, x: 4 },
        { cols: 1, rows: 1, y: 4, x: 5 },
        { cols: 1, rows: 1, y: 2, x: 1 },
        { cols: 2, rows: 2, y: 5, x: 5 },
        { cols: 2, rows: 2, y: 3, x: 2 },
        { cols: 2, rows: 1, y: 2, x: 2 },
        { cols: 1, rows: 1, y: 3, x: 4 },
        { cols: 1, rows: 1, y: 0, x: 6 }
        ];
        
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




