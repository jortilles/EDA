import { NgModule } from '@angular/core';

// Module
import { GlobalModule } from '../global/global.module';
import { SharedModule } from '../../shared/shared.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EdaBlankPanelComponent } from './eda-panels/eda-blank-panel/eda-blank-panel.component';

// Component
import {
    EdaChartComponent,
    EdaTableComponent,
    EdaDashboardPanelComponent,
    EdaKpiComponent,
    ColumnDialogComponent,
    FilterDialogComponent
 } from './component.index';


@NgModule({
    imports: [
        GlobalModule,
        SharedModule,
        DragDropModule,
    ],
    declarations: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        ColumnDialogComponent,
        FilterDialogComponent
    ],
    exports: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        FilterDialogComponent
    ]
})
export class ComponentsModule { }
