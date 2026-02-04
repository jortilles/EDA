import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import * as _ from 'lodash';

import { InjectEdaPanel, EdaTabsPanel } from '@eda/models/model.index';
import { DashboardService } from '@eda/services/api/dashboard.service';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { EditTabsDialogComponent } from './edit-tabs/edit-tabs-dialog.component';

interface DashboardTab {
    id: string;
    title: string;
    tags: string[];
    source?: 'manual' | 'tag';
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

            const allDashboards = [
                ...(response.publics || []),
                ...(response.shared || []),
                ...(response.dashboards || []),
                ...(response.group || [])
            ];

            this.allDashboards = allDashboards.map(db => ({
                id: db._id,
                title: db.config?.title,
                tags: this.normalizeTags(db.config?.tag)
            }));

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
        const result: DashboardTab[] = [];
        const addedIds = new Set<string>();
        const excludedIds = this.panel.excludedDashboardIds || [];

        // Añadir dashboards seleccionados manualmente
        const manualIds = this.panel.selectedDashboardIds || [];
        for (const id of manualIds) {
            if (!excludedIds.includes(id)) {
                const db = this.allDashboards.find(d => d.id === id);
                if (db && !addedIds.has(id)) {
                    result.push({ ...db, source: 'manual' });
                    addedIds.add(id);
                }
            }
        }

        // Añadir dashboards por tag
        const selectedTags = this.panel.selectedTags || [];
        if (selectedTags.length > 0) {
            for (const db of this.allDashboards) {
                if (!addedIds.has(db.id) && !excludedIds.includes(db.id)) {
                    const hasMatchingTag = db.tags.some(tag => selectedTags.includes(tag));
                    if (hasMatchingTag) {
                        result.push({ ...db, source: 'tag' });
                        addedIds.add(db.id);
                    }
                }
            }
        }

        this.filteredDashboards = result;
    }

    public openDashboard(dashboard: DashboardTab): void {
        const urlTree = this.router.createUrlTree(['/dashboard', dashboard.id]);
        const relativeUrl = this.router.serializeUrl(urlTree);
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
                    label: $localize`:@@tabsPanelConfig:Configurar pestanas`,
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.editTabsController = new EdaDialogController({
                            params: {
                                allDashboards: this.allDashboards.map(db => ({
                                    id: db.id,
                                    title: db.title,
                                    tags: db.tags
                                })),
                                selectedTags: [...(this.panel.selectedTags || [])],
                                selectedDashboardIds: [...(this.panel.selectedDashboardIds || [])],
                                excludedDashboardIds: [...(this.panel.excludedDashboardIds || [])],
                                availableTags: this.availableTags,
                                tabStyle: { ...(this.panel.tabStyle || {
                                    backgroundColor: '#ffffff',
                                    textColor: '#333333',
                                    activeColor: '#00bfb3'
                                })}
                            },
                            close: (event, response) => {
                                if (!_.isEqual(event, EdaDialogCloseEvent.NONE) && response) {
                                    this.panel.selectedTags = response.selectedTags;
                                    this.panel.selectedDashboardIds = response.selectedDashboardIds;
                                    this.panel.excludedDashboardIds = response.excludedDashboardIds;
                                    this.panel.tabStyle = response.tabStyle;
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

    public getTabStyle(): any {
        return {
            'background-color': this.panel.tabStyle?.backgroundColor || '#ffffff',
            'color': this.panel.tabStyle?.textColor || '#333333'
        };
    }

    public getActiveTabStyle(): any {
        return {
            'border-bottom-color': this.panel.tabStyle?.activeColor || '#00bfb3',
            'color': this.panel.tabStyle?.activeColor || '#00bfb3'
        };
    }
}
