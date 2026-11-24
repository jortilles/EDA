import { Component, Input, OnInit, OnDestroy, inject } from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MultiSelectModule } from 'primeng/multiselect';
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
    styleUrls: ['./aoc-form.component.css'],
    imports: [CommonModule, ReactiveFormsModule, FormsModule, MultiSelectModule],
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
    public selectedAmbitos: AocAmbito[] = [];
    /** Label shown in the multiselect when more than one scope is selected ({0} = count) */
    public selectedItemsLabel = $localize`:@@aocSelectedAmbitos:{0} ámbitos seleccionados`;
    /** Up to this many scopes are shown as chips; above it the "{0} selected" label is shown */
    public readonly maxChips = 4;
    private saveSub!: Subscription;

    ngOnInit(): void {
        this.saveSub = this.pluginFormService.onSave$.subscribe(() => this.save());
        // Diferido: si se hace en el mismo ciclo que el padre ya comprobó "disabled" en el botón
        // Confirmar, Angular lanza ExpressionChangedAfterItHasBeenCheckedError (NG0100).
        Promise.resolve().then(() => this.pluginFormService.setReady(false));
    }

    ngOnDestroy(): void {
        this.saveSub?.unsubscribe();
        // No dejar el formulario de otro tipo de datasource bloqueado por este estado
        this.pluginFormService.setReady(true);
    }

    /** Detection is only allowed when both credentials are filled and no detection is running */
    get canDetect(): boolean {
        const { user, password } = this.connectionForm?.value || {};
        return !this.detecting && !!String(user ?? '').trim() && !!String(password ?? '').trim();
    }

    togglePasswordVisibility(): void {
        this.showPassword = !this.showPassword;
    }

    async detectAmbitos(): Promise<void> {
        const value = this.connectionForm.value;
        if (!value.user || !value.password) {
            this.alertService.addError($localize`:@@IncorrectForm:Formulario incorrecto. Revise los campos obligatorios.`);
            return;
        }

        this.detecting = true;
        this.ambitos = [];
        this.selectAmbitos([]);
        try {
            const res = await lastValueFrom(this.dataSourceService.callPluginPost(this.apiBasePath, '/ambitos', {
                user: value.user,
                password: value.password,
            }));
            // Alphabetical order (Catalan collation, accent-aware) so scopes are easier to find
            this.ambitos = [...(res.ambitos || [])]
                .sort((a: AocAmbito, b: AocAmbito) => a.label.localeCompare(b.label, 'ca', { sensitivity: 'base' }));
            if (this.ambitos.length === 0) {
                this.alertService.addError($localize`:@@aocNoAmbitosFound:No se ha detectado ningún ámbito reconocido en este datalake.`);
            }
        } catch (err) {
            this.alertService.addError(err);
        } finally {
            this.detecting = false;
        }
    }

    get allSelected(): boolean {
        return this.ambitos.length > 0 && this.selectedAmbitos.length === this.ambitos.length;
    }

    selectAmbitos(ambitos: AocAmbito[]): void {
        // The scope only determines the schema to query; the datasource name comes from the
        // "Name" field above (see buildName), it is never overwritten here.
        this.selectedAmbitos = ambitos || [];
        this.pluginFormService.setReady(this.selectedAmbitos.length > 0);
    }

    /** "Tots": selects every detected scope, or clears the selection if all were already selected */
    toggleAll(): void {
        this.selectAmbitos(this.allSelected ? [] : [...this.ambitos]);
    }

    /**
     * Datasource name for a scope. With a single scope the typed name is used as is; with several,
     * each datasource gets "<name> - <scope>" so they can be told apart. Without a typed name the
     * scope label is used.
     */
    private buildName(typedName: string, ambito: AocAmbito, multiple: boolean): string {
        const name = String(typedName ?? '').trim();
        if (!name) return ambito.label;
        return multiple ? `${name} - ${ambito.label}` : name;
    }

    async save(): Promise<void> {
        const value = this.connectionForm.value;
        const ambitos = this.selectedAmbitos;

        if (ambitos.length === 0) {
            this.alertService.addError($localize`:@@aocNoAmbitoSelected:Debe detectar y seleccionar un ámbito antes de guardar.`);
            return;
        }

        const multiple = ambitos.length > 1;
        const created: string[] = [];
        const failed: string[] = [];

        this.spinnerService.on();
        // Sequential on purpose: each import reads the whole schema metadata from the datalake
        for (const [index, ambito] of ambitos.entries()) {
            if (multiple) {
                const current = index + 1;
                const total = ambitos.length;
                this.spinnerService.setMessage($localize`:@@aocImportProgress:Importando ${current}:CURRENT: de ${total}:TOTAL: (${ambito.label}:SCOPE:)`);
            }
            const payload = {
                name: this.buildName(value.name, ambito, multiple),
                description: value.description || '',
                user: value.user,
                password: value.password,
                schema: ambito.technicalName,
                optimize: value.optimize ? 1 : 0,
                allowCache: value.allowCache ? 1 : 0,
                filter: value.filter || '',
            };
            try {
                const res = await lastValueFrom(this.dataSourceService.callPluginPost(this.apiBasePath, '/add-data-source', payload));
                created.push(res.data_source_id);
            } catch (err) {
                failed.push(ambito.label);
                // A single import keeps the original behaviour: show the API error as is
                if (!multiple) this.alertService.addError(err);
            }
        }
        this.spinnerService.off();

        if (!multiple) {
            if (created.length) {
                this.alertService.addSuccess($localize`:@@aocCreated:Fuente de datos AOC creada correctamente`);
                this.router.navigate(['/data-source/', created[0]]);
            }
            return;
        }

        if (created.length) {
            const count = created.length;
            this.alertService.addSuccess($localize`:@@aocCreatedMultiple:Se han creado ${count}:COUNT: fuentes de datos AOC`);
        }
        if (failed.length) {
            const scopes = failed.join(', ');
            this.alertService.addError($localize`:@@aocCreateFailedAmbitos:No se han podido importar los ámbitos: ${scopes}:SCOPES:`);
        }
        if (created.length) {
            this.router.navigate(['/admin/data-source']);
        }
    }
}
