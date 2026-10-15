import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { NgStyle } from '@angular/common';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import type { DashboardPage } from '../dashboard.page';
import { isDashboardEditable, isDashboardReadOnly } from '../dashboard-permissions.util';

// Always-visible shortcuts next to the dashboard ⋮ menu (same actions and permissions as the menu)
@Component({
  selector: 'app-dashboard-quick-actions',
  standalone: true,
  imports: [NgStyle, TooltipModule, MenuModule],
  templateUrl: './dashboard-quick-actions.component.html',
})
export class DashboardQuickActionsComponent implements OnInit {
  @Input() dashboard: DashboardPage;
  @Input() notSaved = false;
  @Input() buttonStyle: any = {};

  @ViewChild('filtersMenu') filtersMenu: Menu;

  canEdit = false;
  canRefresh = false;
  filtersMenuItems: MenuItem[] = [];

  // Same i18n ids and texts as the sidebar menu items
  labels = {
    save: $localize`:@@dashboardSidebarSave: Guardar`.trim(),
    notSaved: $localize`:@@notSavedChanges:Hay cambios sin guardar...`,
    newPanel: $localize`:@@newPanelTitle:Nuevo panel`.trim(),
    refresh: $localize`:@@dashboardSidebarRefreshDashboard: Recargar informe`.trim(),
    filters: $localize`:@@dashboardSidebarEditFilter:Editar filtros`.trim(),
    newFilter: $localize`:@@dashboardSidebarNewFilter:Nuevo filtro`.trim(),
    dependentFilters: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`.trim(),
  };

  ngOnInit(): void {
    const readOnly = isDashboardReadOnly(this.dashboard.dashboard);
    this.canEdit = !readOnly && isDashboardEditable(this.dashboard.dashboard);
    this.canRefresh = !readOnly;
  }

  save(): void {
    this.dashboard.sidebar?.saveDashboard();
  }

  newPanel(): void {
    this.dashboard.sidebar?.onAddWidget();
  }

  refresh(): void {
    this.dashboard.sidebar?.cleanPanelsCache();
  }

  // Built on every open so it always lists the dashboard's current filters
  toggleFiltersMenu(event: Event): void {
    const globalFilter = this.dashboard.globalFilter;
    const existingFilters: MenuItem[] = globalFilter.globalFilters.map((f: any) => ({
      label: f?.selectedColumn?.display_name?.default || f?.column?.value?.description?.default,
      icon: 'pi pi-pencil',
      command: () => globalFilter.onShowGlobalFilter(false, f),
    }));

    this.filtersMenuItems = [
      { label: this.labels.newFilter, icon: 'pi pi-plus-circle', command: () => this.dashboard.sidebar?.onAddGlobalFilter() },
      ...(existingFilters.length ? [{ separator: true }, ...existingFilters] : []),
      { separator: true },
      { label: this.labels.dependentFilters, icon: 'pi pi-sitemap', command: () => this.dashboard.sidebar?.dependentFilters() },
    ];
    this.filtersMenu.toggle(event);
  }
}
