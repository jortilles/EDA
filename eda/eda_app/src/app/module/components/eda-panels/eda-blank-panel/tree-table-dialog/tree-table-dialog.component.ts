import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { EdaDialogAbstract } from '@eda/shared/components/eda-dialogs/eda-dialog/eda-dialog-abstract';
import { PanelChart } from '../panel-charts/panel-chart';
import { TreeTableConfig } from '../panel-charts/chart-configuration-models/treeTable-config';
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
  public title = $localize`:@@treeTableTitleDialog:Propiedades de la tabla árbol`;
  public showOriginField: boolean;

  sourceProducts: any[] = [];
  targetProducts: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.panelChartConfig = this.controller.params.panelChart;
    this.config = (<TreeTableConfig>this.panelChartConfig.config.getConfig())
    this.sourceProducts = this.config.hierarchyLabels;
    this.targetProducts = this.config.leafLabels;
    this.showOriginField = this.config.showOriginField;  
  }


  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  saveChartConfig() {
    this.config.showOriginField = this.showOriginField;
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
