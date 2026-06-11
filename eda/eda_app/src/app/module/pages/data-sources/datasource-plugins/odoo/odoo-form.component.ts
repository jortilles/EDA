import { Component, Input, OnInit, OnDestroy, inject, LOCALE_ID } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import { PluginFormService } from '../plugin-form.service';

@Component({
    standalone: true,
    selector: 'eda-odoo-form',
    templateUrl: './odoo-form.component.html',
    imports: [CommonModule, ReactiveFormsModule],
})
export class OdooFormComponent implements OnInit, OnDestroy {
    @Input() connectionForm!: FormGroup;

    private dataSourceService = inject(DataSourceService);
    private spinnerService    = inject(SpinnerService);
    private alertService      = inject(AlertService);
    private router            = inject(Router);
    private pluginFormService = inject(PluginFormService);
    private localeId          = inject(LOCALE_ID);

    public showPassword = false;
    private saveSub!: Subscription;

    ngOnInit(): void {
        this.saveSub = this.pluginFormService.onSave$.subscribe(() => this.save());
    }

    ngOnDestroy(): void {
        this.saveSub?.unsubscribe();
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    async save(): Promise<void> {
        const value = this.connectionForm.value;

        if (!value.name) {
            this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
            return;
        }
        if (!value.host || !value.database || !value.user || !value.password) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
            return;
        }

        this.spinnerService.on();
        try {
            const payload = {
                name: value.name,
                description: value.description || '',
                url: value.host,
                db: value.database,
                username: value.user,
                password: value.password,
                optimize: value.optimize ? 1 : 0,
                allowCache: value.allowCache ? 1 : 0,
                locale: this.localeId,
            };

            const res = await lastValueFrom(this.dataSourceService.addOdooDataSource(payload));
            this.spinnerService.off();
            this.alertService.addSuccess($localize`:@@odooCreated:Fuente de datos Odoo creada correctamente`);
            this.router.navigate(['/data-source/', res.data_source_id]);
        } catch (err) {
            this.spinnerService.off();
            this.alertService.addError(err);
        }
    }
}
