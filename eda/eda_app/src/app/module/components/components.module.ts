import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';

// Module
import { CoreModule } from '../../core/core.module';
import { SharedModule } from '../../shared/shared.module';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { EdaBlankPanelComponent } from './eda-panels/eda-blank-panel/eda-blank-panel.component';
import { PanelChartComponent} from './eda-panels/eda-blank-panel/panel-charts/panel-chart.component'
import { GridsterModule } from 'angular-gridster2';


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
    MapCoordDialogComponent,
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
    TreeTableDialogComponent,
    EdaBubblechartComponent,
    BubblechartDialog,
    CumSumAlertDialogComponent,
    EdaSunburstComponent,
    SunburstDialogComponent,
    FilterAndOrDialogComponent,
    EdaFilterAndOrComponent,
 } from './component.index';
 
import { SafeUrlPipe } from './eda-panels/eda-title-panel/urlSanitizer.pipe';
import { SafeHtmlPipe } from './eda-panels/eda-title-panel/htmlSanitizer.pipe';
import { DragDropComponent } from './drag-drop/drag-drop.component';


@NgModule({
    imports: [
        CoreModule,
        SharedModule,
        GridsterModule
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
        TreeTableDialogComponent,
        EdaBubblechartComponent,
        BubblechartDialog,
        EdaSunburstComponent,
        SunburstDialogComponent,
        DragDropComponent,
        FilterAndOrDialogComponent,
        EdaFilterAndOrComponent,
        MapCoordDialogComponent,
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
        TreeTableDialogComponent,
        BubblechartDialog,
        EdaSunburstComponent,
        SunburstDialogComponent,
        DragDropComponent,
        FilterAndOrDialogComponent,
        EdaFilterAndOrComponent,
        MapCoordDialogComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ComponentsModule { }
