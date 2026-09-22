import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { PanelChart } from '../panel-charts/panel-chart';
import { ChartConfig } from '../panel-charts/chart-configuration-models/chart-config';
import { TreeTableConfig, TreeTableSortOrder } from '../panel-charts/chart-configuration-models/treeTable-config';
import * as _ from 'lodash';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { PickListModule } from 'primeng/picklist';
@Component({
  standalone: true,
  selector: 'app-tree-table-dialog',
  templateUrl: './tree-table-dialog.component.html',
  styleUrls: ['./tree-table-dialog.component.css'],
  imports: [FormsModule, CommonModule, PanelChartComponent, EdaDialog2Component, PickListModule],
})
export class TreeTableDialogComponent implements OnInit {
  @Input() controller: any;
  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;
  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public config: any;
  public previewProps: PanelChart;
  public title = $localize`:@@treeTableTitleDialog:Propiedades de la tabla árbol`;
  public toggleState: Record<string, boolean> = {};
  public sortOrder: TreeTableSortOrder;
  public sortColumn: string;
  public sortColumns: { field: string, header: string }[] = [];

  public toggles = [
    { key: 'showOriginField', label: $localize`:@@showField:Mostrar campo de origen` },
    { key: 'showColumnFilters', label: $localize`:@@treeTableShowFilters:Mostrar filtros de columna` },
    { key: 'showChildCount', label: $localize`:@@treeTableShowChildCount:Mostrar número de hijos` },
  ];
  public sortOptions: { value: TreeTableSortOrder, label: string }[] = [
    { value: 'none', label: $localize`:@@treeTableSortNone:Sin ordenar` },
    { value: 'asc', label: $localize`:@@treeTableSortAsc:Ascendente (A → Z)` },
    { value: 'desc', label: $localize`:@@treeTableSortDesc:Descendente (Z → A)` },
  ];
  public sortOrderLabel = $localize`:@@treeTableSortOrder:Ordenar nodos`;
  public sortColumnLabel = $localize`:@@treeTableSortColumn:Ordenar por columna`;

  sourceProducts: any[] = [];
  targetProducts: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.config = (<TreeTableConfig>this.panelChartConfig.config.getConfig())
    this.sourceProducts = this.config.hierarchyLabels;
    this.targetProducts = this.config.leafLabels;
    this.toggleState = {
      showOriginField: this.config.showOriginField ?? false,
      showColumnFilters: this.config.showColumnFilters ?? true,
      showChildCount: this.config.showChildCount ?? false,
    };
    this.sortOrder = this.config.sortOrder ?? 'none';

    // Same column naming as EdaTreeTable: the two ID columns come first and are not displayed
    this.sortColumns = (this.panelChartConfig.query || []).slice(2).map(c => ({
      field: c?.name ?? c?.display_name?.default ?? '',
      header: c?.display_name?.default ?? c?.name ?? ''
    }));
    this.sortColumn = this.sortColumns.some(c => c.field === this.config.sortColumn)
      ? this.config.sortColumn
      : this.sortColumns[0]?.field ?? '';

    // The preview works on a copy so cancelling the dialog leaves the panel config untouched
    this.previewProps = new PanelChart({
      ...this.panelChartConfig,
      config: new ChartConfig(_.cloneDeep(this.config)),
    });
  }

  applyPreview() {
    Object.assign(this.previewProps.config.getConfig(), this.toggleState, {
      sortOrder: this.sortOrder,
      sortColumn: this.sortColumn,
    });
    this.myPanelChartComponent?.changeChartType();
  }


  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {
    Object.assign(this.config, this.toggleState);
    this.config.sortOrder = this.sortOrder;
    this.config.sortColumn = this.sortColumn;
    // Widths dragged in the preview live in its config copy
    this.config.columnWidths = this.previewProps.config.getConfig().columnWidths;
    this.config.editedTreeTable = true;
    this.config.hierarchyLabels =  _.cloneDeep(this.sourceProducts);
    this.config.leafLabels =  _.cloneDeep(this.targetProducts);

    this.onClose(EdaDialogCloseEvent.UPDATE, this.config);
  }

  closeChartConfig() {
    this.sourceProducts = [];
    this.targetProducts = [];
    this.onClose(EdaDialogCloseEvent.NONE);
  }

}
