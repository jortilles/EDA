import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { lastValueFrom, Subscription } from 'rxjs';
import { DataSourceService, SpinnerService, AlertService } from '@eda/services/service.index';
import { PluginFormService } from '../plugin-form.service';

interface AocAmbito {
    technicalName: string;
    label: string;
}

@Component({
    standalone: true,
    selector: 'eda-aoc-form',
    templateUrl: './aoc-form.component.html',
    imports: [CommonModule, ReactiveFormsModule],
})
export class AocFormComponent implements OnInit, OnDestroy {
    @Input() connectionForm!: FormGroup;
    @Input() apiBasePath!: string;

    private dataSourceService = inject(DataSourceService);
    private spinnerService    = inject(SpinnerService);
    private alertService      = inject(AlertService);
    private router            = inject(Router);
    private pluginFormService = inject(PluginFormService);

    public showPassword = false;
    public detecting = false;
    public ambitos: AocAmbito[] = [];
    public selectedAmbito: AocAmbito | null = null;
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

    async detectAmbitos(): Promise<void> {
        const value = this.connectionForm.value;
        if (!value.host || !value.database || !value.user || !value.password) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
            return;
        }

        this.detecting = true;
        this.ambitos = [];
        this.selectedAmbito = null;
        try {
            const res = await lastValueFrom(this.dataSourceService.callPluginPost(this.apiBasePath, '/ambitos', {
                host: value.host,
                port: value.port,
                database: value.database,
                user: value.user,
                password: value.password,
            }));
            this.ambitos = res.ambitos || [];
            if (this.ambitos.length === 0) {
                this.alertService.addError($localize`:@@aocNoAmbitosFound:No se ha detectado ningún ámbito reconocido en este datalake.`);
            }
        } catch (err) {
            this.alertService.addError(err);
        } finally {
            this.detecting = false;
        }
    }

    selectAmbito(ambito: AocAmbito): void {
        this.selectedAmbito = ambito;
        // El usuario nunca escribe el nombre técnico: se sugiere el nombre legible, editable como el resto de conectores
        if (!this.connectionForm.value.name) {
            this.connectionForm.patchValue({ name: ambito.label });
        }
    }

    async save(): Promise<void> {
        const value = this.connectionForm.value;

        if (!this.selectedAmbito) {
            this.alertService.addError($localize`:@@aocNoAmbitoSelected:Debe detectar y seleccionar un ámbito antes de guardar.`);
            return;
        }
        if (!value.name) {
            this.alertService.addError($localize`:@@noNameProvided:Debe proporcionar un nombre para el datasource`);
            return;
        }

        this.spinnerService.on();
        try {
            const payload = {
                name: value.name,
                description: value.description || '',
                host: value.host,
                port: value.port,
                database: value.database,
                user: value.user,
                password: value.password,
                schema: this.selectedAmbito.technicalName,
                optimize: value.optimize ? 1 : 0,
                allowCache: value.allowCache ? 1 : 0,
                filter: value.filter || '',
            };

            const res = await lastValueFrom(this.dataSourceService.callPluginPost(this.apiBasePath, '/add-data-source', payload));
            this.spinnerService.off();
            this.alertService.addSuccess($localize`:@@aocCreated:Fuente de datos AOC creada correctamente`);
            this.router.navigate(['/data-source/', res.data_source_id]);
        } catch (err) {
            this.spinnerService.off();
            this.alertService.addError(err);
        }
    }
}
