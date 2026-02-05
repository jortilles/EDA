import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
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
        DropdownModule,
        InputTextModule
    ]
})
export class EditTabsDialogComponent implements OnInit {
    @Input() controller: any;

    public header = $localize`:@@TabsPanelConfig:Configuración de pestañas`;

    public allDashboards: DashboardOption[] = [];
    public availableTags: any[] = [];

    public filterTag: string = null;
    public filterPrivacy: DashboardPrivacy = null;
    public selectedDashboardIds: string[] = [];

    public privacyOptions = [
        { label: 'Público', value: 'public' as DashboardPrivacy },
        { label: 'Compartido', value: 'shared' as DashboardPrivacy },
        { label: 'Privado', value: 'private' as DashboardPrivacy },
        { label: 'Grupo', value: 'group' as DashboardPrivacy }
    ];

    public get availableDashboards(): DashboardOption[] {
        if (!this.filterTag && !this.filterPrivacy) return [];

        return this.allDashboards.filter(db => {
            if (this.selectedDashboardIds.includes(db.id)) return false;

            if (this.filterTag) {
                return db.tags.includes(this.filterTag);
            }
            return db.privacy === this.filterPrivacy;
        });
    }

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

    public onPrivacyChange(): void {
        if (this.filterPrivacy) {
            this.filterTag = null;
        }
    }

    public onTagChange(): void {
        if (this.filterTag) {
            this.filterPrivacy = null;
        }
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
