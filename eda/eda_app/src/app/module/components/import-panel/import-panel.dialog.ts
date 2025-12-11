import { Component, EventEmitter, Input, input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, DashboardService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";
import { DropdownFilterOptions, DropdownModule } from "primeng/dropdown";
import { lastValueFrom } from "rxjs/internal/lastValueFrom";
import { EdaPickListComponent } from "@eda/shared/eda-pick-list/eda-pick-list.component";
import { FilterMapperComponent } from "../filter-mapper/filter-mapper.component";

@Component({
  selector: 'app-import-panel',
  standalone: true,
  templateUrl: './import-panel.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, DropdownModule, EdaPickListComponent, FilterMapperComponent]
})

export class ImportPanelDialog implements OnInit {
  @Input() dashboard: DashboardPage;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public activeTab: any;

  public pickListConfig = {
    title: $localize`:@@selectPanels:Selecciona los paneles`,
    searchPlaceholder: $localize`:@@searchPanels:Buscar paneles...`,
    height: "h-96",
    maxSelectedDisplay: 8,
  }
  public filterValue: string | undefined = '';

  public _import: any = {};
  public _filterMapper: any = {};

  public display: boolean = false;
  public displayMapper: boolean = false;

  public _dashboard: any;
  public dashboardOptions: any[] = [];
  public dashboardPanels: any[] = [];

  public panelsFilters;
  public dashboardFilters;

  constructor(
    private alertService: AlertService,
    private dashboardService: DashboardService) { }

  ngOnInit(): void {
    this.display = true;
    this.initializeOptions();
  }


  private async initializeOptions() {
    const { publics, shared, dashboards, group } = await lastValueFrom(this.dashboardService.getDashboards());
    this.dashboardOptions = [].concat(publics, shared, dashboards, group);
  }

  public async onSelectDashboard() {
    const dashboardId = this._import.fromDashboard?._id;

    if (dashboardId) {
      const data = await lastValueFrom(this.dashboardService.getDashboard(dashboardId));
      const panels = data.dashboard?.config?.panel || [];
      this._dashboard = data;

      if (!!panels.length) {
        this.dashboardPanels = panels.filter((p) => !p.readonly).map((p: any) => ({ id: p.id, label: p.title }))
      }
    }

    this._import.panelsRef = [];
  }

  filterDashboards(event: KeyboardEvent, options: DropdownFilterOptions) {
    options.filter(event);
  }

  resetFunction(options: DropdownFilterOptions) {
    options.reset();
    this.filterValue = '';
  }


  public onApply() {
    if (this._import.panelsRef.length) {
      if (this.displayMapper) {
        for (const panel of this._import.panels) {
          panel.globalFilterMap = this._filterMapper[panel.id].connections || [];
        }

        this.display = false;
        this.close.emit(this._import.panels);
      } else {
        this.displayMapper = true;
        
        this._import.panels = this.setImportPanels();
        this.setActiveTab(this._import.panelsRef[0]?.id);
      }
    }
  }

  private setImportPanels(): any[] {
    const panelsRef = this._import.panelsRef || [];
    const dashboard = this._dashboard?.dashboard;
    const dataSource = this._dashboard?.datasource;

    const importPanels = [];
    if (dashboard && !!panelsRef.length) {

      const panels = dashboard.config?.panel || [];

      for (const ref of panelsRef) {
        const panel = panels.find((p: any) => p.id === ref.id);

        if (panel && panel.id) {
          panel.dataSource = {
            _id: dataSource._id,
            name: dataSource.name
          };
          panel.dashboard = {
            _id: dashboard._id,
            title: dashboard.config?.title,
            author: dashboard.config?.author,
          };
          panel.readonly = true;
          importPanels.push(panel);
        }
      }
    }

    return importPanels;
  }

  public disableApply(): boolean {
    return false;
  }

  public onPanelsChange(panels: any[]) {
    this._import.panelsRef = panels;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }

  public initFilterMapper(panelId: any) {
    const panel = this._import.panels.find((p) => p.id === panelId);

    if (panel?.id) {
      const panelFilters = panel.content.query.query.filters || [];
      const dashFilters = this.dashboard.globalFilter.globalFilters;

      this.panelsFilters = panelFilters;
      this.dashboardFilters = dashFilters;

      if (!this._filterMapper[panelId]) {
        this._filterMapper[panelId] = {
          connections: [],
          panelFilters: panelFilters.filter((f: any) => f.isGlobal).map((f: any) => ({ id: f.filter_id, label: f.filter_column, type: f.filter_column_type || 'text' })),
          dashboardFilters: dashFilters.map((f: any) => ({ id: f.id, label: `${f.selectedColumn?.display_name?.default} (${f.selectedTable?.display_name?.default})`, type: f.filter_column_type || 'text' }))
        };
      }
    }
  }

  public setActiveTab(id: string) {
    this.activeTab = id;
    this.initFilterMapper(id);
  }
}