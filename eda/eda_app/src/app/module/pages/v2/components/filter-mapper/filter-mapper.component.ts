import { Component, EventEmitter, inject, Input, Output } from "@angular/core"
import { CommonModule } from "@angular/common"
import { AlertService } from "@eda/services/service.index"

export interface Connection {
  id: string
  sourceId: string
  targetId: string
  sourcePanel: "panel" | "dashboard"
  targetPanel: "panel" | "dashboard"
  color: string
}

export interface FilterItem {
  id: string
  label: string
  color: string
  type: 'numeric' | 'date' | 'text'
}

@Component({
  selector: "eda-filter-mapper",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./filter-mapper.component.html",
  styleUrls: ["./filter-mapper.component.css"],
})
export class FilterMapperComponent {
  private alertService = inject(AlertService);
  @Input() panel;
  @Input() dashboard;
  @Input() dashboardFilter;
  @Input() panelFilters: FilterItem[] = [];
  @Input() dashboardFilters: FilterItem[] = [];
  @Input() connections: Connection[] = [];
  @Output() connectionsChange: EventEmitter<any> = new EventEmitter();

  allSelectedConnexions: any[] = [];
  selectedSource: { id: string; panel: "panel" | "dashboard" } | null = null
  hoveredConnection: string | null = null

  private connectionColors: string[] = [
    "#64748b", // slate
    "#6366f1", // indigo
    "#059669", // emerald
    "#dc2626", // red
  ]

  ngOnDestroy() {
    console.log('Todos los paneles:', this.dashboard.dashboard.config.panel);
    console.log('Todas las conexiones:', this.allSelectedConnexions);

    this.dashboard.dashboard.config.panel.forEach((panel, panelIndex) => {
      const panelFilters = panel.content?.query?.query?.filters;

      if (!panelFilters?.length) {
        return;
      }

      panelFilters.forEach((filter) => {
        const connection = this.allSelectedConnexions.find(
          conn => conn.sourceId === filter.filter_id
        );
        if (!connection) { return;}

        const dashboardFilter = this.dashboardFilter.find(f => f.id === connection.targetId);
        if (!dashboardFilter) { return;}

        filter.filter_elements[0].value1 = [...dashboardFilter.selectedItems];

      });
    });

  }




  handleItemClick(itemId: string, panel: "panel" | "dashboard"): void {
    console.log('handle item click  ')
    if (this.isItemConnected(itemId)) {
      return
    }

    if (!this.selectedSource) {
      this.selectedSource = { id: itemId, panel }
    } else {
      if (this.selectedSource.panel !== panel) {
        if (!this.isItemConnected(this.selectedSource.id)) {

          if (!this.isItemSameType(itemId)) {
            return this.alertService.addWarning('No se pueden vincular filtros de tipos distintos.')
          }

          const newConnection: Connection = {
            id: `c${Date.now()}`,
            sourceId: this.selectedSource.panel === "panel" ? this.selectedSource.id : itemId,
            targetId: this.selectedSource.panel === "panel" ? itemId : this.selectedSource.id,
            sourcePanel: "panel",
            targetPanel: "dashboard",
            color: this.connectionColors[this.connections.length % this.connectionColors.length],
          }
          this.connections.push(newConnection);
          this.allSelectedConnexions.push(newConnection)
          this.connectionsChange.emit(this.connections);
        }
      }
      this.selectedSource = null
    }
  }

  removeConnection(connectionId: string): void {
    this.connections = this.connections.filter((conn) => conn.id !== connectionId)
    this.connectionsChange.emit(this.connections);
    this.selectedSource = null
  }

  clearAllConnections(): void {
    this.connections = []
    this.connectionsChange.emit(this.connections);
    this.selectedSource = null
  }

  getItemLabel(itemId: string, panel: "panel" | "dashboard"): string {
    const items = panel === "panel" ? this.panelFilters : this.dashboardFilters
    return items.find((item) => item.id === itemId)?.label || ""
  }

  isItemConnected(itemId: string): boolean {
    return this.connections.some((conn) => conn.sourceId === itemId || conn.targetId === itemId)
  }

  isItemSameType(targetId: string): boolean {
    const fromPanel = this.selectedSource.panel === 'panel';

    const sourceList = fromPanel
      ? this.getAvailablePanelFilters()
      : this.getAvailableDashboardFilters();

    const targetList = fromPanel
      ? this.getAvailableDashboardFilters()
      : this.getAvailablePanelFilters();

    const sourceFilter = sourceList.find(f => f.id === this.selectedSource.id);
    const targetFilter = targetList.find(f => f.id === targetId);

    return sourceFilter?.type === targetFilter?.type;
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedSource?.id === itemId
  }

  getAvailablePanelFilters(): FilterItem[] {
    return this.panelFilters.filter((item) => !this.isItemConnected(item.id))
  }

  getAvailableDashboardFilters(): FilterItem[] {
    return this.dashboardFilters.filter((item) => !this.isItemConnected(item.id))
  }

  onConnectionHover(connectionId: string | null): void {
    this.hoveredConnection = connectionId
  }

  getConnectionBackgroundColor(connection: Connection): string {
    return `${connection.color}10`
  }

  getConnectionBorderColor(connection: Connection): string {
    return `${connection.color}40`
  }

  getAttributeTypeIcon(type: string) {
    const icons = {
      numeric: 'mdi-numeric',
      date: 'mdi-calendar-text',
      text: 'mdi-alphabetical'
    };
    return icons[type as keyof typeof icons] || '';
  }
}
