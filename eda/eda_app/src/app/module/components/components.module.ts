
import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import {AngularFittextModule} from 'angular-fittext';

// Module
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EdaBlankPanelComponent } from './eda-panels/eda-blank-panel/eda-blank-panel.component';
import { PanelChartComponent} from './eda-panels/eda-blank-panel/panel-charts/panel-chart.component'


// Component
import {
    EdaChartComponent,
    EdaTableComponent,
    EdaDashboardPanelComponent,
    EdaTitlePanelComponent,
    EdaKpiComponent,
    ColumnDialogComponent,
    FilterDialogComponent,
    ChartDialogComponent,
    TableDialogComponent,
    AlertDialogComponent

 } from './component.index';


@NgModule({
    imports: [
        CoreModule,
        SharedModule,
        DragDropModule,
        AngularFittextModule
    ],
    declarations: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTitlePanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        ColumnDialogComponent,
        FilterDialogComponent,
        ChartDialogComponent,
        TableDialogComponent,
        PanelChartComponent,
        AlertDialogComponent
    ],
    exports: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTitlePanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        PanelChartComponent
    ],
    entryComponents: [EdaChartComponent, EdaKpiComponent, EdaTableComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA ]
})
export class ComponentsModule { }
