import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { EdaDialog2Component, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { DashboardPrivacy } from '@eda/models/dashboard-models/eda-tabs-panel';

interface DashboardOption {
    id: string;
    title: string;
    tags: string[];
    privacy: DashboardPrivacy;
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
        InputTextModule
    ]
})
export class EditTabsDialogComponent implements OnInit {
    @Input() controller: any;

    public header = $localize`:@@TabsPanelConfig:Configuración de pestañas`;

    public allDashboards: DashboardOption[] = [];
    public availableTags: any[] = [];

    public filterTags: string[] = [];
    public filterPrivacy: DashboardPrivacy[] = [];
    public selectedDashboardIds: string[] = [];

    public privacyOptions = [
        { label: 'Público', value: 'public' as DashboardPrivacy },
        { label: 'Compartido', value: 'shared' as DashboardPrivacy },
        { label: 'Privado', value: 'private' as DashboardPrivacy },
        { label: 'Grupo', value: 'group' as DashboardPrivacy }
    ];

    // Dashboards disponibles filtrados (excluyendo los ya seleccionados)
    public get availableDashboards(): DashboardOption[] {
        const hasTags = this.filterTags.length > 0;
        const hasPrivacy = this.filterPrivacy.length > 0;

        // Si no hay filtros, no mostrar nada
        if (!hasTags && !hasPrivacy) return [];

        return this.allDashboards.filter(db => {
            // Excluir los ya seleccionados
            if (this.selectedDashboardIds.includes(db.id)) return false;

            // Si solo filtras por tags → privacidad = todos
            // Si solo filtras por privacidad → tags = todos
            // Si filtras por ambos → OR
            const matchesTag = hasTags ? db.tags.some(tag => this.filterTags.includes(tag)) : true;
            const matchesPrivacy = hasPrivacy ? this.filterPrivacy.includes(db.privacy) : true;

            if (hasTags && hasPrivacy) {
                return matchesTag || matchesPrivacy;
            }
            return matchesTag && matchesPrivacy;
        });
    }

    // Dashboards seleccionados con su info
    public get selectedDashboards(): DashboardOption[] {
        return this.selectedDashboardIds
            .map(id => this.allDashboards.find(db => db.id === id))
            .filter(db => !!db);
    }

    ngOnInit(): void {
        this.allDashboards = this.controller.params.allDashboards || [];
        this.availableTags = (this.controller.params.availableTags || []).map(tag => ({
            label: tag,
            value: tag
        }));
        this.selectedDashboardIds = [...(this.controller.params.selectedDashboardIds || [])];
    }

    public addDashboard(db: DashboardOption): void {
        if (!this.selectedDashboardIds.includes(db.id)) {
            this.selectedDashboardIds.push(db.id);
        }
    }

    public removeDashboard(db: DashboardOption): void {
        this.selectedDashboardIds = this.selectedDashboardIds.filter(id => id !== db.id);
    }

    public getPrivacyLabel(privacy: DashboardPrivacy): string {
        return this.privacyOptions.find(o => o.value === privacy)?.label || privacy;
    }

    public onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    public saveConfig(): void {
        this.onClose(EdaDialogCloseEvent.UPDATE, {
            selectedDashboardIds: this.selectedDashboardIds
        });
    }

    public closeConfig(): void {
        this.onClose(EdaDialogCloseEvent.NONE);
    }
}
