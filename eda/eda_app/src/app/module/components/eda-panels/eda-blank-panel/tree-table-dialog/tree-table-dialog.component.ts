import { Component, OnInit, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { PanelChart } from '../panel-charts/panel-chart';
import { TreeTableConfig } from '../panel-charts/chart-configuration-models/treeTable-config';
import * as _ from 'lodash';


@Component({
  selector: 'app-tree-table-dialog',
  templateUrl: './tree-table-dialog.component.html',
  styleUrls: ['./tree-table-dialog.component.css']
})
export class TreeTableDialogComponent extends EdaDialogAbstract implements OnInit {

  @ViewChild('PanelChartComponent', { static: false }) myPanelChartComponent: PanelChartComponent;
  public dialog: EdaDialog;
  public panelChartConfig: PanelChart = new PanelChart();
  public config: any;
  public treeTableTitleDialog = $localize`:@@treeTableTitleDialog:Propiedades de la tabla árbol`;

  sourceProducts: any[] = [];
  targetProducts: any[] = [];

  constructor() {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: this.treeTableTitleDialog,
    });
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};
  }

  ngOnInit(): void {
    this.onShow();
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.config = (<TreeTableConfig>this.panelChartConfig.config.getConfig())
    this.sourceProducts = this.config.hierarchyLabels;
    this.targetProducts = this.config.leafLabels;
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {

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
