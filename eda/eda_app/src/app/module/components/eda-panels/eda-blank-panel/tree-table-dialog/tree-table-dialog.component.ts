import { Component, OnInit, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { PanelChart } from '../panel-charts/panel-chart';
import { TreeTableConfig } from '../panel-charts/chart-configuration-models/treeTable-config';


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
  

  constructor() {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
    });
    this.dialog.style = { width: '80%', height: '70%', top:"-4em", left:'1em'};
  }

  ngOnInit(): void {
    this.onShow();
  }

  onShow(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    console.log('Aca hacemos el cambio ...');
    this.config = (<TreeTableConfig>this.panelChartConfig.config.getConfig())

    console.log('config :::: ', this.config);

    
    console.log('this.panelChartConfig: ', this.panelChartConfig);
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {

    this.config.editedTreeTable = true;
    this.config.hierarchyLabels.pop();
    this.config.leafLabels.push('valor');

    this.onClose(EdaDialogCloseEvent.UPDATE, this.config);
  }

  closeChartConfig() {
    console.log('closeChartConfig ')
    this.onClose(EdaDialogCloseEvent.NONE);
  }

}
