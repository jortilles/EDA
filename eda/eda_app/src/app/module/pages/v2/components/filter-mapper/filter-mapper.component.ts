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
  @Input() panelFilters: FilterItem[] =  [];
  @Input() dashboardFilters: FilterItem[] =  [];
  @Input() connections: Connection[] = [];
  @Output() connectionsChange: EventEmitter<any> = new EventEmitter();
  // panelFilters: PanelItem[] = [
  //   { id: "l1", label: "Usuario", color: "bg-slate-500" },
  //   { id: "l2", label: "Producto", color: "bg-slate-500" },
  //   { id: "l3", label: "Pedido", color: "bg-slate-500" },
  //   { id: "l4", label: "Pago", color: "bg-slate-500" },
  //   { id: "l5", label: "Inventario", color: "bg-slate-500" },
  // ]

  // dashboardFilters: PanelItem[] = [
  //   { id: "r1", label: "Base de Datos", color: "bg-slate-500" },
  //   { id: "r2", label: "API Externa", color: "bg-slate-500" },
  //   { id: "r3", label: "Servicio Email", color: "bg-slate-500" },
  //   { id: "r4", label: "Analytics", color: "bg-slate-500" },
  //   { id: "r5", label: "Cache Redis", color: "bg-slate-500" },
  // ]

  // connections: Connection[] = [
  //   {
  //     id: "c1",
  //     sourceId: "l1",
  //     targetId: "r1",
  //     sourcePanel: "panel",
  //     targetPanel: "dashboard",
  //     color: "#64748b",
  //   },
  //   {
  //     id: "c2",
  //     sourceId: "l2",
  //     targetId: "r2",
  //     sourcePanel: "panel",
  //     targetPanel: "dashboard",
  //     color: "#6366f1",
  //   },
  // ]

  selectedSource: { id: string; panel: "panel" | "dashboard" } | null = null
  hoveredConnection: string | null = null

  private connectionColors: string[] = [
    "#64748b", // slate
    "#6366f1", // indigo
    "#059669", // emerald
    "#dc2626", // red
  ]

ngOnDestroy() {
  this.connections.forEach(element => {
    const panelFilter = this.panel.find(f => f.filter_id === element.sourceId);
    const dashboardFilter = this.dashboardFilter.find(f => f.id === element.targetId);

    if (!panelFilter || !dashboardFilter) return;

    let dashboardPanel = this.dashboard.dashboard.config.panel.find(panel =>
      panel.content.query.query.filters.some(f => f.filter_id === panelFilter.filter_id)
    );

    console.log(panelFilter, ' filtro del panel externo')
    console.log(dashboardFilter, ' filtro del dashboard interno')
    console.log(dashboardPanel, ' panel del dashboard interno')
    
    if (!dashboardPanel) return;
    
    
    
    const targetFilterInPanel = dashboardPanel.content.query.query.filters.find(
      f => f.filter_id === panelFilter.filter_id
    );
    console.log(this.panel, 'paneles')

    console.log(targetFilterInPanel)

    //dashboardPanel.content.query.query.filters.find(filter => filter.filter_id === element.targetId) = targetFilterInPanel;


     if (targetFilterInPanel?.filter_elements?.length) {
       targetFilterInPanel.filter_elements[0].value1 = [...dashboardFilter.selectedItems];
    }
  });
}


  handleItemClick(itemId: string, panel: "panel" | "dashboard"): void {
    if (this.isItemConnected(itemId)) {
      return
    }

    if (!this.selectedSource) {
      this.selectedSource = { id: itemId, panel }
    } else {
      if (this.selectedSource.panel !== panel) {
        if (!this.isItemConnected(this.selectedSource.id)) {

          if (!this.isItemSameType(itemId)) {
            return this.alertService.addWarning($localize`:@@differentFiltersCannotBeConnected:No se pueden vincular filtros de tipos distintos.`)
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
