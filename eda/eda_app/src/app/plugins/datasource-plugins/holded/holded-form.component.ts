import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import { PluginFormService, sanitizeDuckdbFolderName, currentAppLocale } from '../plugin-form.service';

@Component({
    standalone: true,
    selector: 'eda-holded-form',
    templateUrl: './holded-form.component.html',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class HoldedFormComponent implements OnInit, OnDestroy {
    @Input() connectionForm!: FormGroup;
    @Input() apiBasePath!: string;

    private dataSourceService = inject(DataSourceService);
    private spinnerService    = inject(SpinnerService);
    private alertService      = inject(AlertService);
    private router            = inject(Router);
    private pluginFormService = inject(PluginFormService);

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
        if (!value.database) {
            this.alertService.addError($localize`:@@holdedFolderRequired:Debe indicar el nombre de la carpeta`);
            return;
        }
        if (!value.password) {
            this.alertService.addError($localize`:@@holdedApiKeyRequired:Debe proporcionar la API Key de Holded`);
            return;
        }

        const folderName = sanitizeDuckdbFolderName(value.database);
        if (await this.pluginFormService.duckdbFolderExists(this.dataSourceService, folderName)) {
            this.alertService.addError(this.pluginFormService.folderExistsMessage(folderName));
            return;
        }

        this.spinnerService.on();
        try {
            const payload = {
                name: value.name,
                description: value.description || '',
                folderName,
                apiKey: value.password,
                optimize: value.optimize ? 1 : 0,
                allowCache: value.allowCache ? 1 : 0,
                locale: currentAppLocale(),
            };

            const res = await lastValueFrom(this.dataSourceService.callPluginPost(this.apiBasePath, '/add-data-source', payload));
            this.spinnerService.off();
            this.alertService.addSuccess($localize`:@@holdedCreated:Fuente de datos Holded creada correctamente`);
            this.router.navigate(['/data-source/', res.data_source_id]);
        } catch (err) {
            this.spinnerService.off();
            this.alertService.addError(this.pluginFormService.isFolderExistsError(err)
                ? this.pluginFormService.folderExistsMessage(folderName)
                : err);
        }
    }
}
