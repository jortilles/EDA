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
  public noLink: boolean = false;

  public oldLinked : any = null ;
  public unLinkString : string = $localize`:@@unlink:Desvincular del informe: `
  public noValidColumn : string = $localize`:@@NoValidCol:No hay columnas válidas`

  constructor(private dashboardService: DashboardService, private alertService: AlertService) {
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@DashboardLink:Vincular con un informe`,
      style: { width: '30%', height: '60%', top: '-1em', left: '1em' }
    });
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

  onShow(): void {
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
        .map((col, i) => { return { col: col.column_name, table: col.table_id, colname: col.display_name.default, index:i, column_type:col.column_type } })
        .filter(col => (col.column_type === 'text' || col.column_type === 'date'))[0];
    	this.column = column?column.colname : this.noValidColumn;

      if(column){
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
  onClose(event: EdaDialogCloseEvent, response?: any): void {

    return this.controller.close(event, response);

  }

  public filterFilters() {
    this.filters = this.filters.filter(column => column.dashboardID === <any>this.selectedDashboard);
  }

  public handleTargetColumn() {

    this.targetColumn = this.selectedFilter.colname;
    this.targetTable = this.selectedFilter.table;

  }

  public async initDashboards(column: any): Promise<any> {

    this.dasboards = [];
    this.filters = [];
    this.activateProgressBar = true;

    try {

      const dashboardInfo = await this.dashboardService.getDashboards().toPromise();
      const dashboards =
        [].concat.apply([], [dashboardInfo.dashboards, dashboardInfo.group, dashboardInfo.publics, dashboardInfo.shared])
          .filter(d => d._id !== this.controller.params.dashboard_id);
          
      const filters = [];


      for (let i = 0; i < dashboards.length; i++) {
        let res;
        try {
          res = await this.dashboardService.getDashboard(dashboards[i]._id).toPromise();
        } catch (err) {
        }
    
        if (res) {
          /** If datasources are equal and dashboar has filters */
          if (res.dashboard.config.ds._id === this.controller.params.datasource && res.dashboard.config?.filters?.length > 0) {

            let disable = true;

            if (!this.controller.params.modeSQL) {
              res.dashboard.config.filters.forEach(filter => {
                if(filter.column){
                  if (filter.column.value.column_name === column.col && filter.table.value === column.table) {
                    disable = false;
                  }
                }else{
                  console.log('NO SE HA IMPLEMENTADO TODAVÍA INFORMES VINCULADOS CON EL MODO ARBOL.');
                  console.log(res.dashboard.config.title);
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
                filters.push({ colname: filter.column.value.column_name, dashboardID: dashboards[i]._id, table: filter.table.value });
              });
              this.dasboards.push({ label: dashboards[i].config.title, value: dashboards[i]._id });
            }

          }
        }

      }

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
