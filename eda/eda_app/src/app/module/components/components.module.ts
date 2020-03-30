
import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import {AngularFittextModule} from 'angular-fittext';

// Module
import { GlobalModule } from '../global/global.module';
import { SharedModule } from '../../shared/shared.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EdaBlankPanelComponent } from './eda-panels/eda-blank-panel/eda-blank-panel.component';
import { PanelChartComponent} from './eda-panels/eda-blank-panel/panel-charts/panel-chart.component'

// Component
import {
    EdaChartComponent,
    EdaTableComponent,
    EdaDashboardPanelComponent,
    EdaKpiComponent,
    ColumnDialogComponent,
    FilterDialogComponent,
    ChartDialogComponent
 } from './component.index';


@NgModule({
    imports: [
        GlobalModule,
        SharedModule,
        DragDropModule,
        AngularFittextModule
    ],
    declarations: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        ColumnDialogComponent,
        FilterDialogComponent,
        ChartDialogComponent,
        PanelChartComponent
    ],
    exports: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        PanelChartComponent
    ],
    entryComponents: [EdaChartComponent, EdaKpiComponent, EdaTableComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA ]
})
export class ComponentsModule { }
