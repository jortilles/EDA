import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import { PluginFormService } from '../plugin-form.service';

@Component({
    standalone: true,
    selector: 'eda-ga4-form',
    templateUrl: './ga4-form.component.html',
    imports: [CommonModule, FormsModule],
})
export class Ga4FormComponent implements OnInit, OnDestroy {
    @Input() connectionForm!: FormGroup;

    private dataSourceService = inject(DataSourceService);
    private spinnerService    = inject(SpinnerService);
    private alertService      = inject(AlertService);
    private router            = inject(Router);
    private cdr               = inject(ChangeDetectorRef);
    private pluginFormService = inject(PluginFormService);

    public ga4PropertyId: string = '';
    public ga4FolderName: string = '';
    public ga4CredentialsJson: string = '';
    public ga4AuthState: 'idle' | 'waiting' | 'authorized' | 'error' = 'idle';
    private ga4PollInterval: any = null;
    private saveSub!: Subscription;

    ngOnInit(): void {
        this.saveSub = this.pluginFormService.onSave$.subscribe(() => this.save());
    }

    ngOnDestroy(): void {
        this.saveSub?.unsubscribe();
        if (this.ga4PollInterval) clearInterval(this.ga4PollInterval);
    }

    async authorizeGA4(): Promise<void> {
        try {
            const res = await lastValueFrom(this.dataSourceService.getGA4AuthUrl());
            const { authUrl, state } = res;

            const popup = window.open(authUrl, 'ga4-auth', 'width=520,height=640,resizable=yes');

            this.ga4AuthState = 'waiting';
            this.ga4PollInterval = setInterval(async () => {
                try {
                    const poll = await lastValueFrom(this.dataSourceService.pollGA4Token(state));
                    if (poll?.ready && poll.credentialsJson) {
                        clearInterval(this.ga4PollInterval);
                        this.ga4PollInterval = null;
                        this.ga4CredentialsJson = poll.credentialsJson;
                        this.ga4AuthState = 'authorized';
                        if (popup && !popup.closed) popup.close();
                        this.cdr.detectChanges();
                    } else if (popup?.closed) {
                        clearInterval(this.ga4PollInterval);
                        this.ga4PollInterval = null;
                        if (this.ga4AuthState === 'waiting') {
                            this.ga4AuthState = 'idle';
                            this.cdr.detectChanges();
                        }
                    }
                } catch {
                    clearInterval(this.ga4PollInterval);
                    this.ga4PollInterval = null;
                    this.ga4AuthState = 'error';
                    this.cdr.detectChanges();
                }
            }, 1500);
        } catch (err) {
            this.ga4AuthState = 'error';
            this.alertService.addError(err);
        }
    }

    async save(): Promise<void> {
        const value = this.connectionForm.value;

        if (!value.name) {
            this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
            return;
        }
        if (!this.ga4PropertyId) {
            this.alertService.addError($localize`:@@ga4PropertyIdRequired:Debe indicar el ID de propiedad de Google Analytics 4`);
            return;
        }
        if (!this.ga4CredentialsJson) {
            this.alertService.addError($localize`:@@ga4AuthRequired:Debes autorizar el acceso a Google Analytics primero`);
            return;
        }
        if (!this.ga4FolderName) {
            this.alertService.addError($localize`:@@noFolderName:Debe proporcionar el nombre de la carpeta`);
            return;
        }

        this.spinnerService.on();
        try {
            const payload = {
                name: value.name,
                description: value.description || '',
                propertyId: this.ga4PropertyId,
                credentialsJson: this.ga4CredentialsJson,
                folderName: this.ga4FolderName,
                optimize: value.optimize ? 1 : 0,
                allowCache: value.allowCache ? 1 : 0,
            };

            const res = await lastValueFrom(this.dataSourceService.addGoogleAnalyticsDataSource(payload));
            this.spinnerService.off();
            this.alertService.addSuccess($localize`:@@ga4Created:Fuente de datos Google Analytics 4 creada correctamente`);
            this.router.navigate(['/data-source/', res.data_source_id]);
        } catch (err) {
            this.spinnerService.off();
            this.alertService.addError(err);
        }
    }
}
