import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';

// Module
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { PanelChartComponent} from './eda-panels/eda-blank-panel/panel-charts/panel-chart.component'
import { EbpChatgptComponent } from './ebp-chatgpt/ebp-chatgpt.component';

// Component
import {
    // EdaChartComponent,
    // EdaTableComponent,
    // EdaDashboardPanelComponent,
    // EdaTitlePanelComponent,
    // EdaKpiComponent,
    // EdadynamicTextComponent,
    // FilterDialogComponent,
    // ChartDialogComponent,
    // TableDialogComponent,
    // AlertDialogComponent,
    // EdaMapComponent,
    // EdaGeoJsonMapComponent,
    // MapEditDialogComponent,
    // MapCoordDialogComponent,
    // KpiEditDialogComponent,
    // dynamicTextDialogComponent,
    // // // EdaD3Component,
    // SankeyDialog,
    // LinkDashboardsComponent,
    // TitleDialogComponent,
    // EdaTreeMap,
    // TreeMapDialog,
    // EdaScatter,
    // ScatterPlotDialog,
    // EdaKnobComponent,
    // KnobDialogComponent,
    // TableGradientDialogComponent,
    // EdaFunnelComponent,
    // FunnelDialog,
    // TreeTableDialogComponent,
    // EdaBubblechartComponent,
    // BubblechartDialog,
    // CumSumAlertDialogComponent,
    // EdaSunburstComponent,
    // SunburstDialogComponent,
 } from './component.index';
 
import { SafeUrlPipe } from './eda-panels/eda-title-panel/urlSanitizer.pipe';
import { SafeHtmlPipe } from './eda-panels/eda-title-panel/htmlSanitizer.pipe';
import { DragDropComponent } from './drag-drop/drag-drop.component';
import { CommonModule } from '@angular/common';
import { PrimengModule } from 'app/core/primeng.module';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { FilterMapperComponent } from './filter-mapper/filter-mapper.component';


@NgModule({
    imports: [
        CommonModule,
        PrimengModule,
        CoreModule,
        SharedModule,
        IconComponent,
        EbpChatgptComponent,
        FilterMapperComponent,
    ],
    declarations: [
        // EdaDashboardPanelComponent,
        // EdaTitlePanelComponent,
        // SafeUrlPipe,
        // SafeHtmlPipe,
        // EdaTableComponent,
        // EdaChartComponent,
        // EdaKpiComponent,
        // EdadynamicTextComponent,
        // FilterDialogComponent,
        // ChartDialogComponent,
        // TableDialogComponent,
        // PanelChartComponent,
        // AlertDialogComponent,
        // CumSumAlertDialogComponent,
        // EdaMapComponent,
        // EdaGeoJsonMapComponent,
        // MapEditDialogComponent,
        // MapCoordDialogComponent,
        // KpiEditDialogComponent,
        // dynamicTextDialogComponent,
        // // EdaD3Component,
        // SankeyDialog,
        // TreeMapDialog,
        // LinkDashboardsComponent,
        // TitleDialogComponent,
        // EdaTreeMap,
        // EdaScatter,
        // ScatterPlotDialog,
        // EdaKnobComponent,
        // KnobDialogComponent,
        // TableGradientDialogComponent,
        // EdaFunnelComponent,
        // FunnelDialog,
        // TreeTableDialogComponent,
        // EdaBubblechartComponent,
        // BubblechartDialog,
        // EdaSunburstComponent,
        // SunburstDialogComponent,
        //DragDropComponent
    ],
    exports: [
        // EdaDashboardPanelComponent,
        // EdaTitlePanelComponent,
        // SafeUrlPipe,
        // SafeHtmlPipe,
        // EdaTableComponent,
        // EdaChartComponent,
        // EdaKpiComponent,
        // EdadynamicTextComponent,
        // PanelChartComponent,
        // EdaMapComponent,
        // EdaGeoJsonMapComponent,
        // EdaD3Component,
        // EdaFunnelComponent,
        // EdaBubblechartComponent,
        // LinkDashboardsComponent,
        // TitleDialogComponent,
        // EdaTreeMap,
        // EdaScatter,
        // EdaKnobComponent,
        // KnobDialogComponent,
        // TableGradientDialogComponent,
        // FunnelDialog,
        // TreeTableDialogComponent,
        // BubblechartDialog,
        // EdaSunburstComponent,
        // SunburstDialogComponent,
        // MapCoordDialogComponent,
        //DragDropComponent,
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
