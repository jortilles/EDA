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
            gridType: GridType.Fit,
            compactType: CompactType.None,
            pushItems: true,
            draggable: {
                enabled: true
            },
            resizable: {
                enabled: true
            }
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




