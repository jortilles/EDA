import { LinkedDashboardProps } from './link-dashboard-props';
import { SelectItem } from 'primeng/api';
import { Component, Input } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService, DashboardService } from '@eda/services/service.index';

import * as _ from 'lodash';

@Component({
  selector: 'link-dashboards-dialog',
  templateUrl: './link-dashboards.component.html',
  styleUrls: []
})

export class LinkDashboardsComponent extends EdaDialogAbstract {

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

  constructor(private dashboardService: DashboardService, private alertService: AlertService) {
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@DashboardLink:Vincular con un informe`,
      style: { width: '30%', height: '60%', top: '3vh', left: '10vh' }
    });
  }


  saveChartConfig() {

    const dashboard_name = this.dasboards.filter(d => d['value'] === this.selectedDashboard)[0].label;

    this.onClose(
      EdaDialogCloseEvent.UPDATE,
      new LinkedDashboardProps(this.sourceColumn, this.sourceTable, dashboard_name, <any>this.selectedDashboard, this.targetColumn, this.targetTable)
    );
  }

  closeChartConfig() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onShow(): void {

    // console.log(this.controller.params);

    if (this.controller.params.charttype !== 'table' && !this.controller.params.modeSQL) {

      let column = this.controller.params.query.filter(col => col.column_type === 'varchar')
        .map(col => { return { col: col.column_name, table: col.table_id, colname: col.display_name.default } })[0];
      this.column = column.colname;
      this.initDashboards(column);

    }

    else if (this.controller.params.charttype === 'table' && !this.controller.params.modeSQL) {

      this.columns = this.controller.params.query.filter(col => col.column_type === 'varchar')
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });

    }

    else if (this.controller.params.modeSQL) {
      this.columns = this.controller.params.query.filter(col => col.column_type === 'varchar')
        .map(col => {
          return { col: col.column_name, table: col.table_id, colname: col.display_name.default }
        });
    }

  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {

    return this.controller.close(event, response);

  }

  public filterFilters(){
    this.filters = this.filters.filter( column => column.dashboardID === <any>this.selectedDashboard);
  }

  public handleTargetColumn(){

    this.targetColumn = this.selectedFilter.colname;
    this.targetTable = this.selectedFilter.table ;

  }

  public async initDashboards(column: any): Promise<any> {

    // console.log(column);
    this.dasboards = [];
    this.filters = [];
    this.activateProgressBar = true;

    try {

      const res = await this.dashboardService.getDashboards().toPromise();
      const dashboards =
        [].concat.apply([], [res.dashboards, res.group, res.publics, res.shared])
          .filter(d => d._id !== this.controller.params.dashboard_id);

      const filters = [];


      for (let i = 0; i < dashboards.length; i++) {

        const res = await this.dashboardService.getDashboard(dashboards[i]._id).toPromise();

        /** If datasources are equal and dashboar has filters */
        if (res.dashboard.config.ds._id === this.controller.params.datasource && res.dashboard.config.filters.length > 0) {

          let disable = true;

          if (!this.controller.params.modeSQL) {

            res.dashboard.config.filters.forEach(filter => {

              if (filter.column.value.column_name === column.col && filter.table.value === column.table) {
                disable = false;
              }

              this.targetColumn = column.col;
              this.targetTable = column.table;

              this.sourceColumn = column.col;
              this.sourceTable = column.table;

            });

            if (!disable) {
              this.dasboards.push({ label: dashboards[i].config.title, value: dashboards[i]._id });
            }

          } else {

            this.sourceColumn = column.col;
            this.sourceTable = column.table;

            res.dashboard.config.filters.forEach(filter => {

              filters.push({colname:filter.column.value.column_name, dashboardID : dashboards[i]._id, table:filter.table.value });

            });

            this.dasboards.push({ label: dashboards[i].config.title, value: dashboards[i]._id });
            
          }

        }

      }

      console.log(this.filters);

      this.filters = filters;

    }

    catch (err) {
      this.alertService.addError(err);
    }
    finally {
      this.activateProgressBar = false;
    }
  }
}
