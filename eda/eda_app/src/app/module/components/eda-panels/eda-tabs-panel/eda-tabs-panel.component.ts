import { Component, OnInit, OnDestroy, AfterViewInit, Input, Output, EventEmitter, ViewChild, ElementRef } from "@angular/core";
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
export class EdaTabsPanelComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() id: string;
    @Input() panel: EdaTabsPanel;
    @Input() inject: InjectEdaPanel;
    @Input() globalFilters: any[] = [];
    @Input() panelContent: any = {};
    @Input() panelText: any = {};
    @Input() panelTabAlign: any = {};
    @Output() remove: EventEmitter<any> = new EventEmitter();
    @ViewChild('tabsContainer') tabsContainerRef: ElementRef;

    private resizeObserver?: ResizeObserver;

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

    ngAfterViewInit(): void {
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.updateFontSize());
            this.resizeObserver.observe(this.tabsContainerRef.nativeElement);
        }
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
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
        setTimeout(() => this.updateFontSize(), 0);
    }

    private updateFontSize(): void {
        const el = this.tabsContainerRef?.nativeElement;
        if (!el || !this.filteredDashboards.length) return;

        const w = el.clientWidth;
        const h = el.clientHeight;
        if (!w || !h) return;

        const buttons = (el as HTMLElement).querySelectorAll<HTMLElement>('.tab-button');
        const rowH = buttons.length > 0 ? buttons[0].clientHeight : h;
        if (!rowH) return;

        const isLandscape = w >= h;
        let fontSize: number;
        let paddingV: string;
        let whiteSpace: string;

        if (isLandscape) {
            const canWrap = rowH >= 50;
            const padV = canWrap ? (rowH < 70 ? 4 : 10) : 2;
            paddingV = `${padV}px`;
            whiteSpace = canWrap ? 'normal' : 'nowrap';
            fontSize = canWrap
                ? Math.max(9, Math.min(14, (rowH - padV * 2) / (1.4 * 2)))
                : Math.max(9, Math.min(14, (rowH - padV * 2) / 1.4));
        } else {
            const padV = rowH < 60 ? 4 : 10;
            paddingV = `${padV}px`;
            whiteSpace = 'normal';
            fontSize = Math.max(9, Math.min(14, (rowH - padV * 2) / (1.3 * 2.5)));
        }

        el.style.setProperty('--tab-font-size', `${Math.round(fontSize * 10) / 10}px`);
        el.style.setProperty('--tab-padding-v', paddingV);
        el.style.setProperty('--tab-white-space', whiteSpace);
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

        if (!this.panel.openInNewTab) {
            window.open('#' + relativeUrl, '_blank');
        } else {
            window.open('#' + relativeUrl, '_self');
        }
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
                                availableTags: this.availableTags,
                                isOpeningNewTab: this.panel.openInNewTab || false
                            },
                            close: (event, response) => {
                                if (!_.isEqual(event, EdaDialogCloseEvent.NONE) && response) {
                                    this.panel.selectedDashboardIds = response.selectedDashboardIds;
                                    this.panel.openInNewTab = response.isOpeningNewTab;
                                    this.filterDashboards();
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTabsController = null;
                            }
                        });
                    }
                }),
                this._buildToggleLockItem(),
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

    private _buildToggleLockItem(): EdaContextMenuItem {
        const isLocked = () => (this.panel as any).dragEnabled === false;
        const item = new EdaContextMenuItem({
            label: isLocked() ? $localize`:@@panelOptionsUnlock:Desbloquear panel` : $localize`:@@panelOptionsLock:Bloquear panel`,
            icon: isLocked() ? 'pi pi-lock' : 'pi pi-lock-open',
            command: () => {
                if (isLocked()) {
                    (this.panel as any).dragEnabled = true;
                    (this.panel as any).resizeEnabled = true;
                    item.label = $localize`:@@panelOptionsLock:Bloquear panel`;
                    item.icon = 'pi pi-lock-open';
                } else {
                    (this.panel as any).dragEnabled = false;
                    (this.panel as any).resizeEnabled = false;
                    item.label = $localize`:@@panelOptionsUnlock:Desbloquear panel`;
                    item.icon = 'pi pi-lock';
                }
                this.inject.gridsterOptions?.api?.optionsChanged();
            }
        });
        return item;
    }

    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }
}
