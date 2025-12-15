import { Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { SelectButtonModule } from "primeng/selectbutton";
import { DropdownModule } from "primeng/dropdown";
import { lastValueFrom } from "rxjs/internal/lastValueFrom";
import { FilterMapperComponent } from "../filter-mapper/filter-mapper.component";
import { EdaPanel } from "@eda/models/model.index";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  standalone: true,
  selector: 'app-filter-mapper-dialog',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './filter-mapper.dialog.html',
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, DropdownModule, FilterMapperComponent, EdaDialog2Component]
})

export class FilterMapperDialog implements OnInit {
  @Input() dashboard: any;
  @Input() panel: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public _filterMapper: any = {};

  public display: boolean = false;

  constructor() { }

  ngOnInit(): void {
    this.display = true;
    this.initFilterMapper();
  }

  public onApply() {
    this.display = false;
    this.close.emit(this._filterMapper);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }

  public initFilterMapper() {
    if (this.panel?.id) {
      const panelFilters = this.panel.content.query.query.filters || [];
      const globalFilters = this.dashboard.globalFilter.globalFilters;

      const panelGlobalFilters = panelFilters
        .filter((f: any) => f.isGlobal)
        .map((f) => ({
          id: f.filter_id,
          label: f.filter_column,
          type: f.filter_column_type ?? 'text'
        }));

      const dashboardGlobalFilters = globalFilters.map((f) => ({
        id: f.id,
        label: `${f.selectedColumn?.display_name?.default ?? ''} (${f.selectedTable?.display_name?.default ?? ''})`,
        type: f.filter_column_type ?? 'text'
      }));

      this._filterMapper = {
        connections: this.panel.globalFilterMap ?? [],
        panelFilters: panelGlobalFilters,
        dashboardFilters: dashboardGlobalFilters
      }
    }
  }
}