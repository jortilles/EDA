import { Component, HostBinding, inject, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgStyle } from '@angular/common';
import { Subscription } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import type { DashboardPage } from '../dashboard.page';
import { isDashboardEditable, isDashboardReadOnly } from '../dashboard-permissions.util';
import { canUseDashboardAction, DASHBOARD_DOWNLOAD_FORMATS, DashboardAction, getDashboardAction } from '../dashboard-actions';
import { QuickActionsPrefsService } from '../quick-actions-prefs.service';

// Always-visible shortcuts next to the dashboard ⋮ menu: the actions each user pinned from the menu
@Component({
  selector: 'app-dashboard-quick-actions',
  standalone: true,
  imports: [NgStyle, TooltipModule, MenuModule],
  templateUrl: './dashboard-quick-actions.component.html',
  styles: `
    /* Hidden until the dashboard header is hovered or a button gets keyboard focus */
    .qa-fade {
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    :host-context(.dashboard-header:hover) .qa-fade,
    :host:focus-within .qa-fade,
    :host(.qa-always-visible) .qa-fade {
      opacity: 1;
    }
    /* The "keep visible" toggle itself only shows on hover/focus, whatever the mode */
    .qa-mode-toggle {
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    :host-context(.dashboard-header:hover) .qa-mode-toggle,
    .qa-mode-toggle:focus {
      opacity: 1;
    }
    /* Touch screens have no hover: always visible */
    @media (hover: none) {
      .qa-fade, .qa-mode-toggle { opacity: 1; }
    }
  `,
})
export class DashboardQuickActionsComponent implements OnInit, OnDestroy {
  private prefs = inject(QuickActionsPrefsService);
  private subscriptions = new Subscription();

  /** Bar mode chosen by the user: always visible, or only while the header is hovered */
  @HostBinding('class.qa-always-visible') alwaysVisible = false;

  @Input() dashboard: DashboardPage;
  @Input() notSaved = false;
  @Input() buttonStyle: any = {};

  @ViewChild('actionMenu') actionMenu: Menu;

  /** Pinned actions the current user is allowed to use, in pinned order */
  actions: DashboardAction[] = [];
  canEdit = false;
  menuItems: MenuItem[] = [];

  labels = {
    notSaved: $localize`:@@notSavedChanges:Hay cambios sin guardar...`,
    keepVisible: $localize`:@@quickActionsKeepVisible:Mantener la barra siempre visible`,
    autoHide: $localize`:@@quickActionsAutoHide:Ocultar la barra cuando no se use`,
  };

  private perms = { readOnly: true, editable: false };

  ngOnInit(): void {
    const readOnly = isDashboardReadOnly(this.dashboard.dashboard);
    this.perms = { readOnly, editable: isDashboardEditable(this.dashboard.dashboard) };
    this.canEdit = !readOnly && this.perms.editable;

    this.prefs.reloadForCurrentUser();
    this.subscriptions.add(this.prefs.pinned$.subscribe(ids => {
      this.actions = ids
        .map(id => getDashboardAction(id))
        .filter(action => action?.pinnable && canUseDashboardAction(action.id, this.perms));
    }));
    this.subscriptions.add(this.prefs.alwaysVisible$.subscribe(value => this.alwaysVisible = value));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  toggleAlwaysVisible(): void {
    this.prefs.toggleAlwaysVisible();
  }

  /** Unsaved changes must stay visible even if the user unpinned "Save" */
  get showStandaloneUnsavedDot(): boolean {
    return this.notSaved && this.canEdit && !this.actions.some(action => action.id === 'save');
  }

  hasDropdown(id: string): boolean {
    return id === 'editFilters' || id === 'download';
  }

  run(action: DashboardAction, event: Event): void {
    if (action.id === 'editFilters') return this.openMenu(this.buildFiltersMenu(), event);
    if (action.id === 'download') return this.openMenu(this.buildDownloadMenu(), event);
    this.dashboard.sidebar?.runAction(action.id);
  }

  save(): void {
    this.dashboard.sidebar?.runAction('save');
  }

  private openMenu(items: MenuItem[], event: Event): void {
    this.menuItems = items;
    this.actionMenu.toggle(event);
  }

  // Built on every open so it always lists the dashboard's current filters
  private buildFiltersMenu(): MenuItem[] {
    const globalFilter = this.dashboard.globalFilter;
    const existingFilters: MenuItem[] = globalFilter.globalFilters.map((f: any) => ({
      label: f?.selectedColumn?.display_name?.default || f?.column?.value?.description?.default,
      icon: 'pi pi-pencil',
      command: () => globalFilter.onShowGlobalFilter(false, f),
    }));
    const newFilter = getDashboardAction('newFilter');
    const dependentFilters = getDashboardAction('dependentFilters');

    return [
      { label: newFilter.label, icon: 'pi pi-plus-circle', command: () => this.dashboard.sidebar?.runAction(newFilter.id) },
      ...(existingFilters.length ? [{ separator: true }, ...existingFilters] : []),
      { separator: true },
      { label: dependentFilters.label, icon: dependentFilters.icon, command: () => this.dashboard.sidebar?.runAction(dependentFilters.id) },
    ];
  }

  private buildDownloadMenu(): MenuItem[] {
    return DASHBOARD_DOWNLOAD_FORMATS.map(format => ({
      label: format.label,
      icon: `${format.icon} ${format.color}`,
      command: () => this.dashboard.sidebar?.runAction(format.id),
    }));
  }
}
