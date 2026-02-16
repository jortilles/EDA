import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';

import { InjectEdaPanel, EdaTabsPanel } from '@eda/models/model.index';
import { DashboardPrivacy } from '@eda/models/dashboard-models/eda-tabs-panel';
import { DashboardService } from '@eda/services/api/dashboard.service';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { EditTabsDialogComponent } from './edit-tabs/edit-tabs-dialog.component';

interface DashboardTab {
    id: string;
    title: string;
    tags: string[];
    privacy: DashboardPrivacy;
}

@Component({
    standalone: true,
    selector: 'eda-tabs-panel',
    templateUrl: './eda-tabs-panel.component.html',
    styleUrls: ['./eda-tabs-panel.component.css'],
    imports: [CommonModule, FormsModule, EdaContextMenuComponent, EditTabsDialogComponent]
})
export class EdaTabsPanelComponent implements OnInit {
    @Input() id: string;
    @Input() panel: EdaTabsPanel;
    @Input() inject: InjectEdaPanel;
    @Input() globalFilters: any[] = [];
    @Input() panelContent: any = {};
    @Input() panelText: any = {};
    @Input() panelTabAlign: any = {};
    @Output() remove: EventEmitter<any> = new EventEmitter();

    contextMenu: EdaContextMenu;
    editTabsController: EdaDialogController;

    allDashboards: DashboardTab[] = [];
    filteredDashboards: DashboardTab[] = [];
    availableTags: string[] = [];
    isLoading: boolean = true;

    display: any = {
        editMode: true
    };

    constructor(
        private dashboardService: DashboardService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.initContextMenu();
        this.setEditMode();
        this.loadDashboards();
    }

    private async loadDashboards(): Promise<void> {
        try {
            this.isLoading = true;
            const response = await lastValueFrom(this.dashboardService.getDashboards());

            const mapDashboards = (list: any[], privacy: DashboardPrivacy): DashboardTab[] =>
                (list || []).map(db => ({
                    id: db._id,
                    title: db.config?.title,
                    tags: this.normalizeTags(db.config?.tag),
                    privacy
                }));

            this.allDashboards = [
                ...mapDashboards(response.publics, 'public'),
                ...mapDashboards(response.shared, 'shared'),
                ...mapDashboards(response.dashboards, 'private'),
                ...mapDashboards(response.group, 'group')
            ];

            this.availableTags = this.extractUniqueTags(this.allDashboards);
            this.filterDashboards();
        } catch (error) {
            console.error('Error loading dashboards:', error);
        } finally {
            this.isLoading = false;
        }
    }

    private normalizeTags(tag: any): string[] {
        if (!tag) return [];
        if (Array.isArray(tag)) {
            return tag.map(t => typeof t === 'string' ? t : (t.value || t.label || '')).filter(t => t);
        }
        return typeof tag === 'string' ? [tag] : [];
    }

    private extractUniqueTags(dashboards: DashboardTab[]): string[] {
        const allTags = dashboards.flatMap(db => db.tags);
        return [...new Set(allTags)].sort();
    }

    private filterDashboards(): void {
        const selectedIds = this.panel.selectedDashboardIds || [];
        this.filteredDashboards = selectedIds
            .map(id => this.allDashboards.find(db => db.id === id))
            .filter(db => !!db);
    }

    public openDashboard(dashboard: DashboardTab): void {
        const urlTree = this.router.createUrlTree(['/dashboard', dashboard.id]);
        let relativeUrl = this.router.serializeUrl(urlTree);

        // Si hay filtros globales con valores seleccionados, los añadimos como query params
        const activeFilters = (this.globalFilters || []).filter(f => f.selectedItems && f.selectedItems.length > 0);

        if (activeFilters.length > 0) {
            const params = activeFilters.map(f => {
                const table = f.selectedTable?.table_name || f.table?.value;
                const column = f.selectedColumn?.column_name || f.column?.value?.column_name;
                const values = f.selectedItems.join('|');
                return `${table}.${column}=${values}`;
            });
            relativeUrl += '?' + params.join('&');
        }

        window.open('#' + relativeUrl, '_blank');
    }

    public setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject?.isObserver);
    }

    public initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: $localize`:@@TabsPanelConfig2:Configuración de pestañas`,
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.editTabsController = new EdaDialogController({
                            params: {
                                allDashboards: this.allDashboards,
                                selectedDashboardIds: [...(this.panel.selectedDashboardIds || [])],
                                availableTags: this.availableTags
                            },
                            close: (event, response) => {
                                if (!_.isEqual(event, EdaDialogCloseEvent.NONE) && response) {
                                    this.panel.selectedDashboardIds = response.selectedDashboardIds;
                                    this.filterDashboards();
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTabsController = null;
                            }
                        });
                    }
                }),
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions4:Eliminar panel`,
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                })
            ]
        });
    }

    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }
}
