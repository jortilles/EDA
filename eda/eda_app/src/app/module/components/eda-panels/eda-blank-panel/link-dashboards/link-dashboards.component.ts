import { LinkedDashboardProps } from './link-dashboard-props';
import { SelectItem } from 'primeng/api';
import { Component, Input } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService, DashboardService } from '@eda/services/service.index';
import { ChangeDetectorRef } from '@angular/core';

import * as _ from 'lodash';
import { DropdownModule } from 'primeng/dropdown';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
@Component({
  standalone: true,
  selector: 'link-dashboards-dialog',
  templateUrl: './link-dashboards.component.html',
  styleUrls: [],
  imports: [FormsModule, CommonModule, DropdownModule, ProgressBarModule,EdaDialog2Component]
})

export class LinkDashboardsComponent {
  @Input() controller: any
  @Input() fields: Array<string>;

  public dialog: EdaDialog;

  public columns: any[] = [];
  public selectedColumn: any;

  public targetColumn: string;
  public targetTable: string;

  public sourceColumn: string;
  public sourceTable: string;

  public dasboards: SelectItem[] = [];
  public selectedDashboard: SelectItem;

  public filters: any[] = [];
  public selectedFilter: any;

  public column: string;

  public activateProgressBar: boolean = false;
  public noLink: boolean = false;

  public oldLinked: any = null;
  public unLinkString: string = $localize`:@@unlink:Desvincular del informe: `
  public noValidColumn: string = $localize`:@@NoValidCol:No hay columnas válidas`
  public title : string;  
  public loading = false;
  public display: boolean = false;
  constructor(
    private dashboardService: DashboardService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef ) {

  }

  ngOnInit(): void {
    this.title = $localize`:@@DashboardLink:Vincular con un informe`;
    this.display = true;
    this.oldLinked = this.controller.params.linkedDashboard ? this.controller.params.linkedDashboard.dashboardName : null;

    if ((this.controller.params.charttype === 'parallelSets') && !this.controller.params.modeSQL) {

      this.columns = this.controller.params.query.filter(col => (col.column_type === 'text' || col.column_type === 'date'))
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });
    }

    else if ((this.controller.params.charttype === 'treeMap') && !this.controller.params.modeSQL) {
      this.columns = this.controller.params.query.filter(col => (col.column_type === 'text' || col.column_type === 'date'))
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });

      if (this.columns.length > 1) this.column = this.columns[1].colname;
      else this.column = this.columns[0].colname;

    }

    else if (this.controller.params.charttype !== 'table' && !this.controller.params.modeSQL) {
      let column = this.controller.params.query
        .map((col, i) => { return { col: col.column_name, table: col.table_id, colname: col.display_name.default, index: i, column_type: col.column_type } })
        .filter(col => (col.column_type === 'text' || col.column_type === 'date'))[0];
      this.column = column ? column.colname : this.noValidColumn;

      if (column) {
        this.initDashboards(column);
      }

    }

    else if (this.controller.params.charttype === 'table' && !this.controller.params.modeSQL) {
      this.columns = this.controller.params.query.filter(col => (col.column_type === 'text' || col.column_type === 'date'))
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });

    }

    else if (this.controller.params.modeSQL) {
      this.columns = this.controller.params.query.filter(col => (col.column_type === 'text' || col.column_type === 'date'))
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });
    }

  }

  saveChartConfig() {
    if (!this.noLink) {
      const dashboard_name = this.dasboards.filter(d => d['value'] === this.selectedDashboard)[0].label;
      //Get index -> only non numeric
      const colIndex = this.controller.params.query
        .map((col: any, i: number) => { return { i: i, name: col.column_name } })
        .filter(col => col.name === this.sourceColumn)[0].i;


      this.onClose(
        EdaDialogCloseEvent.UPDATE,
        new LinkedDashboardProps(this.sourceColumn, this.sourceTable, dashboard_name, <any>this.selectedDashboard, this.targetColumn, this.targetTable, colIndex)
      );
    } else {
      this.onClose(
        EdaDialogCloseEvent.UPDATE, null);
    }
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    this.display = false;
    return this.controller.close(event, response);
  }

  public filterFilters() {
    this.filters = this.filters.filter(column => column.dashboardID === <any>this.selectedDashboard);
    console.log(this, 'this.filterFilters')
  }

  public handleTargetColumn() {
    console.log(this)
    this.targetColumn = this.selectedFilter.colname;
    this.targetTable = this.selectedFilter.table;

  }

  public async initDashboards(column: any): Promise<any> {
    this.dasboards = [];
    this.filters = [];
    this.activateProgressBar = true;

    const tempDashboards: SelectItem[] = [];
    const tempFilters: any[] = [];

    try {
      // Obtener lista general de dashboards
      this.loading = true;
      const dashboardInfo = await this.dashboardService.getDashboards().toPromise();
      const dashboards = []
        .concat(dashboardInfo.dashboards, dashboardInfo.group, dashboardInfo.publics, dashboardInfo.shared)
        .filter(d => d._id !== this.controller.params.dashboard_id);

      // Llamadas en paralelo para cargar los dashboards mas rapido
      const results = await Promise.allSettled(
        dashboards.map(d => this.dashboardService.getDashboard(d._id).toPromise())
      );

      // Procesar resultados
      for (let i = 0; i < results.length; i++) {
        const res = results[i];
        const d = dashboards[i];

        if (res.status !== 'fulfilled' || !res.value) continue;
        const dash = res.value.dashboard;

        if (
          dash.config.ds._id !== this.controller.params.datasource ||
          !dash.config?.filters?.length
        ) {
          continue;
        }

        let disable = true;

        if (!this.controller.params.modeSQL) {
          // No SQL mode
          console.log(this)
          console.log(dash.config)
          for (const filter of dash.config.filters) {
            const column = filter?.column ?? filter?.selectedColumn;
            if(column === filter?.column){
              if (filter.column.value.column_name === column.col && filter.table.value === column.table) {
                disable = false;
                this.noLink = false;
              }
            }
            else if(column === filter?.selectedColumn){
              if (column.column_name === column.col && filter.selectedTable.table_name === column.table) {
                disable = false;
                this.noLink = false;
              }
            }
            else {
              console.log('NO SE HA IMPLEMENTADO TODAVÍA INFORMES VINCULADOS CON EL MODO ARBOL.');
            }
          }

          this.targetColumn = column.col;
          this.targetTable = column.table;
          this.sourceColumn = column.col;
          this.sourceTable = column.table;

          if (!disable) {
            tempDashboards.push({ label: d.config.title, value: d._id });
          }

        } else {
          // SQL mode
          this.sourceColumn = column.col;
          this.sourceTable = column.table;

          for (const filter of dash.config.filters) {
            tempFilters.push({
              colname: filter.column.value.column_name,
              dashboardID: d._id,
              table: filter.table.value
            });
          }

          tempDashboards.push({ label: d.config.title, value: d._id });
        }
      }

      this.dasboards = tempDashboards;
      this.filters = tempFilters;
      this.cd.detectChanges();

    } catch (err) {
      this.alertService.addError(err);
      throw err;
    } finally {
      this.activateProgressBar = false;
      this.loading = false;
      this.cd.detectChanges();
    }
  }

}
