import { Component, EventEmitter, Input, input, OnInit, Output } from "@angular/core";
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPageV2 } from "../../dashboard/dashboard.page";


@Component({
    selector:'app-dependent-filters',
    standalone: true,
    templateUrl: './dependent-filters.html',
    imports: [SharedModule, ReactiveFormsModule, SelectButtonModule]
})


export class DependentFilters implements OnInit {

    @Input() dashboard: DashboardPageV2
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    public display: boolean = false;

    constructor() {}

    ngOnInit(): void {
        this.display = true;
        console.log('MI dashboard: ', this.dashboard);
    }

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

}




