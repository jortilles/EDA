import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ListboxModule } from 'primeng/listbox';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { EdaDialog2Component, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';

interface DashboardOption {
    id: string;
    title: string;
    tags: string[];
}

interface SelectedDashboard {
    id: string;
    title: string;
    source: 'manual' | 'tag';
}

@Component({
    standalone: true,
    selector: 'app-edit-tabs-dialog',
    templateUrl: './edit-tabs-dialog.component.html',
    imports: [
        FormsModule,
        CommonModule,
        DialogModule,
        EdaDialog2Component,
        MultiSelectModule,
        ColorPickerModule,
        ListboxModule,
        ButtonModule,
        InputTextModule
    ]
})
export class EditTabsDialogComponent implements OnInit {
    @Input() controller: any;

    public header = $localize`:@@TabsPanelConfig:CONFIGURACION DE PESTAÑAS`;

    // Tab activa
    public activeTab: number = 0;

    // Dashboards disponibles
    public allDashboards: DashboardOption[] = [];
    public availableTags: any[] = [];

    // Selecciones
    public selectedTags: string[] = [];
    public manuallySelectedIds: string[] = [];
    public excludedIds: string[] = [];

    // Para búsqueda
    public searchTerm: string = '';

    // Estilos
    public tabStyle: {
        backgroundColor: string;
        textColor: string;
        activeColor: string;
    };

    // Dashboards combinados resultado
    public get combinedDashboards(): SelectedDashboard[] {
        const result: SelectedDashboard[] = [];
        const addedIds = new Set<string>();

        // Añadir dashboards manuales
        for (const id of this.manuallySelectedIds) {
            if (!this.excludedIds.includes(id)) {
                const db = this.allDashboards.find(d => d.id === id);
                if (db && !addedIds.has(id)) {
                    result.push({ id: db.id, title: db.title, source: 'manual' });
                    addedIds.add(id);
                }
            }
        }

        // Añadir dashboards por tag
        if (this.selectedTags.length > 0) {
            for (const db of this.allDashboards) {
                if (!addedIds.has(db.id) && !this.excludedIds.includes(db.id)) {
                    const hasMatchingTag = db.tags.some(tag => this.selectedTags.includes(tag));
                    if (hasMatchingTag) {
                        result.push({ id: db.id, title: db.title, source: 'tag' });
                        addedIds.add(db.id);
                    }
                }
            }
        }

        return result;
    }

    // Dashboards filtrados para selección manual
    public get filteredDashboards(): DashboardOption[] {
        let filtered = this.allDashboards;
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(db => db.title.toLowerCase().includes(term));
        }
        return filtered;
    }

    ngOnInit(): void {
        this.allDashboards = this.controller.params.allDashboards || [];
        this.availableTags = (this.controller.params.availableTags || []).map(tag => ({
            label: tag,
            value: tag
        }));
        this.selectedTags = this.controller.params.selectedTags || [];
        this.manuallySelectedIds = this.controller.params.selectedDashboardIds || [];
        this.excludedIds = this.controller.params.excludedDashboardIds || [];
        this.tabStyle = this.controller.params.tabStyle || {
            backgroundColor: '#ffffff',
            textColor: '#333333',
            activeColor: '#00bfb3'
        };
    }

    public toggleManualDashboard(dashboard: DashboardOption): void {
        const index = this.manuallySelectedIds.indexOf(dashboard.id);
        if (index > -1) {
            this.manuallySelectedIds.splice(index, 1);
        } else {
            this.manuallySelectedIds.push(dashboard.id);
            // Si estaba excluido, quitarlo de excluidos
            const excludedIndex = this.excludedIds.indexOf(dashboard.id);
            if (excludedIndex > -1) {
                this.excludedIds.splice(excludedIndex, 1);
            }
        }
    }

    public isManuallySelected(id: string): boolean {
        return this.manuallySelectedIds.includes(id);
    }

    public removeDashboard(dashboard: SelectedDashboard): void {
        if (dashboard.source === 'manual') {
            // Quitar de selección manual
            const index = this.manuallySelectedIds.indexOf(dashboard.id);
            if (index > -1) {
                this.manuallySelectedIds.splice(index, 1);
            }
        } else {
            // Añadir a excluidos
            if (!this.excludedIds.includes(dashboard.id)) {
                this.excludedIds.push(dashboard.id);
            }
        }
    }

    public onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    public saveConfig(): void {
        this.onClose(EdaDialogCloseEvent.UPDATE, {
            selectedTags: this.selectedTags,
            selectedDashboardIds: this.manuallySelectedIds,
            excludedDashboardIds: this.excludedIds,
            tabStyle: this.tabStyle
        });
    }

    public closeConfig(): void {
        this.onClose(EdaDialogCloseEvent.NONE);
    }
}
