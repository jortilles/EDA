import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';

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
    EdadynamicTextComponent,
    ColumnDialogComponent,
    FilterDialogComponent,
    ChartDialogComponent,
    TableDialogComponent,
    AlertDialogComponent,
    EdaMapComponent,
    EdaGeoJsonMapComponent,
    MapEditDialogComponent,
    KpiEditDialogComponent,
    dynamicTextDialogComponent,
    EdaD3Component,
    SankeyDialog,
    LinkDashboardsComponent,
    TitleDialogComponent,
    EdaTreeMap,
    TreeMapDialog,
    EdaScatter,
    ScatterPlotDialog,
    EdaKnobComponent,
    Knob,
    KnobDialogComponent,
    TableGradientDialogComponent,
    EdaFunnelComponent,
    FunnelDialog,
    EdaBubblechartComponent,
    BubblechartDialog,
    CumSumAlertDialogComponent,
    EdaSunburstComponent,
    SunburstDialogComponent,
    WhatIfDialogComponent
 } from './component.index';
 
import { SafeUrlPipe } from './eda-panels/eda-title-panel/urlSanitizer.pipe';
import { SafeHtmlPipe } from './eda-panels/eda-title-panel/htmlSanitizer.pipe';
import { DragDropComponent } from './drag-drop/drag-drop.component';


@NgModule({
    imports: [
        CoreModule,
        SharedModule,
    ],
    declarations: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTitlePanelComponent,
        SafeUrlPipe,
        SafeHtmlPipe,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        EdadynamicTextComponent,
        ColumnDialogComponent,
        FilterDialogComponent,
        ChartDialogComponent,
        TableDialogComponent,
        PanelChartComponent,
        AlertDialogComponent,
        CumSumAlertDialogComponent,
        EdaMapComponent,
        EdaGeoJsonMapComponent,
        MapEditDialogComponent,
        KpiEditDialogComponent,
        dynamicTextDialogComponent,
        EdaD3Component,
        SankeyDialog,
        TreeMapDialog,
        LinkDashboardsComponent,
        TitleDialogComponent,
        EdaTreeMap,
        EdaScatter,
        ScatterPlotDialog,
        EdaKnobComponent,
        Knob,
        KnobDialogComponent,
        TableGradientDialogComponent,
        EdaFunnelComponent,
        FunnelDialog,
        EdaBubblechartComponent,
        BubblechartDialog,
        EdaSunburstComponent,
        SunburstDialogComponent,
        WhatIfDialogComponent,
        SunburstDialogComponent,
        DragDropComponent
    ],
    exports: [
        EdaBlankPanelComponent,
        EdaDashboardPanelComponent,
        EdaTitlePanelComponent,
        SafeUrlPipe,
        SafeHtmlPipe,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        EdadynamicTextComponent,
        PanelChartComponent,
        EdaMapComponent,
        EdaGeoJsonMapComponent,
        EdaD3Component,
        EdaFunnelComponent,
        EdaBubblechartComponent,
        LinkDashboardsComponent,
        TitleDialogComponent,
        EdaTreeMap,
        EdaScatter,
        EdaKnobComponent,
        Knob,
        KnobDialogComponent,
        TableGradientDialogComponent,
        FunnelDialog,
        BubblechartDialog,
        EdaSunburstComponent,
        SunburstDialogComponent,
        WhatIfDialogComponent,
        SunburstDialogComponent,
        DragDropComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
