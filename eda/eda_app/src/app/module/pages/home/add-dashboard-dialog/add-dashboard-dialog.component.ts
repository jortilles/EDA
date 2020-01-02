import {Component} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {AlertService, DashboardService} from '@eda_services/service.index';
import {EdaDialog, EdaDialogCloseEvent, EdaDialogAbstract} from '@eda_shared/components/shared-components.index';

@Component({
    selector: 'app-add-dashboard-dialog',
    templateUrl: './add-dashboard-dialog.component.html'
})

export class AddDashboardDialogComponent extends EdaDialogAbstract {
    public dialog: EdaDialog;
    public form: FormGroup;
    public dss: any[] = [];
    constructor( private dashboardService: DashboardService,
                 private formBuilder: FormBuilder,
                 private alertService: AlertService) {
        super();

        this.dialog = new EdaDialog({
            show: () => this.onShow(),
            hide: () => this.onClose(EdaDialogCloseEvent.NONE),
            title: 'CREA TU NUEVO DASHBOARD'
        });

        this.form = this.formBuilder.group({
            id: [null],
            name: [null, Validators.required],
            ds: [null, Validators.required]
        });
    }

    onShow(): void {
        this.dss = this.controller.params.data_sources;
    }

    createNewDashboard() {
        if (this.form.invalid) {
            return this.alertService.addError('Recuerde llenar los campos obligatorios');
        } else {
            const ds = { _id: this.form.value.ds._id };
            const body = {config: {title: this.form.value.name, ds }};

            this.dashboardService.addNewDashboard(body).subscribe(
                r => this.onClose(EdaDialogCloseEvent.NEW, r.dashboard),
                err => this.alertService.addError(err)
            );

        }
    }

    closeDialog() {
        this.form.reset();
        this.onClose(EdaDialogCloseEvent.NONE);
    }

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

}
