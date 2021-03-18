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
    AlertDialogComponent,
    EdaMapComponent,
    EdaGeoJsonMapComponent,
    MapEditDialogComponent,
    KpiEditDialogComponent,
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
    TableGradientDialogComponent

 } from './component.index';
import { SafeUrlPipe } from './eda-panels/eda-title-panel/urlSanitizer.pipe';
import { SafeHtmlPipe } from './eda-panels/eda-title-panel/htmlSanitizer.pipe';


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
        SafeUrlPipe,
        SafeHtmlPipe,
        EdaTableComponent,
        EdaChartComponent,
        EdaKpiComponent,
        ColumnDialogComponent,
        FilterDialogComponent,
        ChartDialogComponent,
        TableDialogComponent,
        PanelChartComponent,
        AlertDialogComponent,
        EdaMapComponent,
        EdaGeoJsonMapComponent,
        MapEditDialogComponent,
        KpiEditDialogComponent,
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
        TableGradientDialogComponent
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
        PanelChartComponent,
        EdaMapComponent,
        EdaGeoJsonMapComponent,
        EdaD3Component,
        LinkDashboardsComponent,
        TitleDialogComponent,
        EdaTreeMap,
        EdaScatter,
        EdaKnobComponent,
        Knob,
        KnobDialogComponent,
        TableGradientDialogComponent
    ],
    entryComponents: [EdaChartComponent, EdaKpiComponent, EdaTableComponent, EdaMapComponent, EdaD3Component, EdaTreeMap, EdaScatter, EdaKnobComponent, Knob],
    schemas: [CUSTOM_ELEMENTS_SCHEMA ]
})
export class ComponentsModule { }
