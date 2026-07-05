import { Type } from '@angular/core';
import * as _ from 'lodash';
import { ChartUtilsService } from '@eda/services/service.index';
import { PanelChart } from './panel-chart';
import { EdaD3 } from '@eda/components/eda-d3/eda-d3';
import { EdaD3Component } from '@eda/components/eda-d3/eda-d3.component';
import { TreeMap } from '@eda/components/eda-treemap/eda-treeMap';
import { EdaTreeMap } from '@eda/components/eda-treemap/eda-treemap.component';
import { ScatterPlot } from '@eda/components/eda-scatter/eda-scatter';
import { EdaScatter } from '@eda/components/eda-scatter/eda-scatter.component';
import { SunBurst } from '@eda/components/eda-sunburst/eda-sunbrust';
import { EdaSunburstComponent } from '@eda/components/eda-sunburst/eda-sunburst.component';
import { EdaBubblechartComponent } from '@eda/components/eda-d3-bubblechart/eda-bubblechart.component';
import { EdaFunnelComponent } from '@eda/components/eda-funnel/eda-funnel.component';
import { EdaTreeTable } from '@eda/components/eda-treetable/eda-treetable.component';
import { EdaKnob } from '@eda/components/eda-knob/edaKnob';
import { EdaKnobComponent } from '@eda/components/eda-knob/eda-knob.component';
import { EdaDoughnut } from '@eda/components/eda-doughnut-d3/eda-doughnut.component';
import { EdaDoughnutD3 } from '@eda/components/eda-doughnut-d3/eda-doughnut';
import { BubblechartConfig } from './chart-configuration-models/bubblechart.config';
import { SankeyConfig } from './chart-configuration-models/sankey-config';
import { TreeMapConfig } from './chart-configuration-models/treeMap-config';
import { ScatterConfig } from './chart-configuration-models/scatter-config';
import { SunburstConfig } from './chart-configuration-models/sunburst-config';
import { FunnelConfig } from './chart-configuration-models/funnel.config';

/**
 * Contract every D3-rendered chart type implements and registers in
 * D3_CHART_PLUGINS below - same idiom as IDatasourcePlugin/DATASOURCE_PLUGINS
 * (plugins/datasource-plugins) and the backend's IEDAPlugin/PluginRegistry
 * (eda_api/lib/plugins): a plain typed object, not a class, with optional hook
 * fields for the parts that don't apply to every chart type.
 */
export interface ID3ChartPlugin<TInject = any> {
    type: string;
    component: Type<any>;
    /** Return null/undefined to skip mounting entirely (e.g. funnel with no data yet). */
    buildInject: (props: PanelChart, paletaActual: string[], randomID: () => string, chartUtils: ChartUtilsService) => TInject | null | undefined;
    /**
     * Replace props.config with a type-specific Config object before a color-only
     * re-render. Omit it for chart types (like doughnut) that just re-render from
     * the config already in place.
     */
    onColorsUpdated?: (props: PanelChart, assignedColors: { value: string; color: string }[]) => void;
}

/* ------------------------------------------------------------------------ *
 * Shared helpers - private to this file, reused by several plugins below.
 * ------------------------------------------------------------------------ */

/** Resolves per-category assignedColors, reusing previously saved colors when the category set is unchanged. */
function resolveAndPersistColors(categories: string[], props: any, paletaActual: string[]): { value: string; color: string }[] {
    if (!categories || categories.length === 0) {
        categories = ['default'];
    }
    if (!paletaActual || paletaActual.length === 0) {
        paletaActual = ['#10B4BD', '#1CEDB1', '#023E8A'];
    }

    const savedAssignedColors = props.config.getConfig()['assignedColors'] || props.assignedColors || [];
    let assignedColors: { value: string; color: string }[];

    if (savedAssignedColors.length > 0) {
        assignedColors = categories.map((category, index) => {
            const found = savedAssignedColors.find(ac => ac.value === category);
            return found || { value: category, color: paletaActual[index % paletaActual.length] };
        });
    }
    if (!assignedColors || assignedColors.length === 0) {
        assignedColors = categories.map((cat, idx) => ({ value: cat, color: paletaActual[idx % paletaActual.length] }));
    }

    // ONLY persist if something actually changed (avoids a regeneration loop from double renders)
    const needsUpdate = JSON.stringify(savedAssignedColors) !== JSON.stringify(assignedColors);
    if (needsUpdate) {
        props.assignedColors = assignedColors;
        const currentConfig = props.config.getConfig();
        currentConfig['assignedColors'] = assignedColors;
        props.config.setConfig(currentConfig);
    }
    return assignedColors;
}

/** Same idea as resolveAndPersistColors, but for the two-stop (start/end) gradient charts like funnel. */
function resolveAndPersistGradientColors(props: any, paletaActual: string[]): { value: string; color: string }[] {
    const savedAssignedColors = props.config.getConfig()['assignedColors'] || props.assignedColors || [];
    let assignedColors: { value: string; color: string }[];

    if (savedAssignedColors.length >= 2) {
        const startColor = savedAssignedColors.find(ac => ac.value === 'start');
        const endColor = savedAssignedColors.find(ac => ac.value === 'end');
        assignedColors = [
            startColor || { value: 'start', color: savedAssignedColors[0]?.color || paletaActual[0] },
            endColor || { value: 'end', color: savedAssignedColors[1]?.color || paletaActual[paletaActual.length - 1] }
        ];
    } else {
        assignedColors = [
            { value: 'start', color: paletaActual[0] },
            { value: 'end', color: paletaActual[paletaActual.length - 1] }
        ];
    }

    props.assignedColors = assignedColors;
    const currentConfig = props.config.getConfig();
    currentConfig['assignedColors'] = assignedColors;
    props.config.setConfig(currentConfig);
    return assignedColors;
}

/**
 * Shared buildInject for the "classic" D3 charts that all share the EdaD3 model
 * shape (id/size/data/dataDescription/linkedDashboard/assignedColors): parallelSets,
 * bubblechart, treeMap, scatterPlot, sunburst (see the "tots els d3 son iguals"
 * comment in eda-sunbrust.ts). A plugin just calls this with its own model constructor.
 */
function buildGenericD3Inject<T extends EdaD3>(
    modelCtor: new () => T,
    props: PanelChart,
    paletaActual: string[],
    randomID: () => string,
    chartUtils: ChartUtilsService
): T {
    const dataDescription = chartUtils.describeData(props.query, props.data.labels);
    const inject = new modelCtor();
    inject.id = randomID();
    inject.size = props.size;
    inject.data = props.data;
    inject.dataDescription = dataDescription;
    inject.linkedDashboard = props.linkedDashboardProps;
    const categoryIndex = dataDescription.otherColumns[0].index;
    const categories = [...new Set(inject.data.values.map(row => row[categoryIndex]))];
    inject.assignedColors = resolveAndPersistColors(categories, props, paletaActual);
    return inject;
}

/* ------------------------------------------------------------------------ *
 * Plugins, one per chart type.
 * ------------------------------------------------------------------------ */

/** No onColorsUpdated: doughnut always re-renders straight from the config already in props. */
export const DoughnutChartPlugin: ID3ChartPlugin<EdaDoughnutD3> = {
    type: 'doughnut',
    component: EdaDoughnut,
    buildInject: (props, paletaActual, randomID, chartUtils) => {
        const values = _.cloneDeep(props.data.values);
        const dataTypes = props.query.map(col => col.column_type);
        const dataDescription = chartUtils.describeData(props.query, props.data.labels);
        const cfg: any = props.config.getConfig();

        const chartData = chartUtils.transformDataQuery('doughnut', 'doughnut', values, dataTypes, dataDescription, false, cfg.numberOfColumns);
        if (chartData.length == 0) {
            chartData.push([], []);
        }

        const inject: EdaDoughnutD3 = new EdaDoughnutD3();
        inject.id = randomID();
        inject.chartType = 'doughnut';
        inject.edaChart = 'doughnut';
        inject.chartLabels = chartData[0];
        inject.chartDataset = chartData[1];

        let assignedColors = props.config.getConfig()['assignedColors'] || [];
        const currentLabels: string[] = inject.chartLabels || [];

        if (assignedColors.length === 0) {
            assignedColors = chartUtils.resolveAssignedColors(currentLabels, [], paletaActual);
            props.config.getConfig()['assignedColors'] = assignedColors;
        } else {
            const colorMap = new Map<string, any>(assignedColors.map(ac => [ac.value, ac]));
            assignedColors = currentLabels.map((label, index) => {
                const assignedColor = colorMap.get(label);
                return assignedColor
                    ? { value: label, color: assignedColor.color }
                    : { value: label, color: paletaActual[index % paletaActual.length] };
            });
        }

        inject.assignedColors = assignedColors;
        inject.chartColors = chartUtils.generateChartColorsFromAssignedColors(assignedColors, 'doughnut');

        // Assigned colors per series (doughnut only ever has one dataset/series)
        chartData[1].forEach((dataset, i) => {
            try {
                const solidColor = inject.chartColors[i]?.borderColor;
                dataset.backgroundColor = solidColor;
                dataset.borderColor = solidColor;
            } catch (err) {
                dataset.backgroundColor = paletaActual;
                dataset.borderColor = paletaActual;
            }
        });

        inject.chartLegend = cfg.chartLegend ?? true;
        inject.showLabels = cfg.showLabels ?? false;
        inject.showLabelsPercent = cfg.showLabelsPercent ?? false;
        // UI range is 0-99 (0 = full pie, 99 = today's classic 50% cutout look) - see draw()
        // in eda-doughnut.component.ts for how this maps to the actual inner/outer radius ratio.
        inject.innerRadiusPercent = cfg.innerRadiusPercent ?? 99;
        inject.useGradient = cfg.useGradient ?? true;
        inject.linkedDashboard = props.linkedDashboardProps;

        return inject;
    }
};

export const BubblechartChartPlugin: ID3ChartPlugin<EdaD3> = {
    type: 'bubblechart',
    component: EdaBubblechartComponent,
    buildInject: (props, paletaActual, randomID, chartUtils) => buildGenericD3Inject(EdaD3, props, paletaActual, randomID, chartUtils),
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new BubblechartConfig(assignedColors.map(a => a.color)))
};

export const ParallelSetsChartPlugin: ID3ChartPlugin<EdaD3> = {
    type: 'parallelSets',
    component: EdaD3Component,
    buildInject: (props, paletaActual, randomID, chartUtils) => buildGenericD3Inject(EdaD3, props, paletaActual, randomID, chartUtils),
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new SankeyConfig(assignedColors.map(a => a.color)))
};

export const TreeMapChartPlugin: ID3ChartPlugin<TreeMap> = {
    type: 'treeMap',
    component: EdaTreeMap,
    buildInject: (props, paletaActual, randomID, chartUtils) => buildGenericD3Inject(TreeMap, props, paletaActual, randomID, chartUtils),
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new TreeMapConfig(assignedColors.map(a => a.color)))
};

export const ScatterChartPlugin: ID3ChartPlugin<ScatterPlot> = {
    type: 'scatterPlot',
    component: EdaScatter,
    buildInject: (props, paletaActual, randomID, chartUtils) => buildGenericD3Inject(ScatterPlot, props, paletaActual, randomID, chartUtils),
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new ScatterConfig(assignedColors.map(a => a.color)))
};

export const SunburstChartPlugin: ID3ChartPlugin<SunBurst> = {
    type: 'sunburst',
    component: EdaSunburstComponent,
    buildInject: (props, paletaActual, randomID, chartUtils) => buildGenericD3Inject(SunBurst, props, paletaActual, randomID, chartUtils),
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new SunburstConfig(assignedColors.map(a => a.color)))
};

/** Funnel is EdaD3-shaped but colors are a two-stop gradient, not per-category - can't reuse buildGenericD3Inject. */
export const FunnelChartPlugin: ID3ChartPlugin<EdaD3> = {
    type: 'funnel',
    component: EdaFunnelComponent,
    buildInject: (props, paletaActual, randomID, chartUtils) => {
        if (!props?.data?.values?.length) {
            return null;
        }
        const dataDescription = chartUtils.describeData(props.query, props.data.labels);
        const inject = new EdaD3();
        inject.id = randomID();
        inject.size = props.size;
        inject.data = props.data;
        inject.dataDescription = dataDescription;
        inject.linkedDashboard = props.linkedDashboardProps;
        inject.assignedColors = resolveAndPersistGradientColors(props, paletaActual);
        return inject;
    },
    onColorsUpdated: (props, assignedColors) => props.config.setConfig(new FunnelConfig(assignedColors))
};

/** Treetable has no dedicated inject model - the component reads straight off PanelChart (props). */
export const TreetableChartPlugin: ID3ChartPlugin<PanelChart> = {
    type: 'treetable',
    component: EdaTreeTable,
    buildInject: (props) => props
};

/**
 * Knob has no onClick output (mountD3Chart() already guards for that) and no
 * onColorsUpdated - color updates aren't supported for this chart type.
 */
export const KnobChartPlugin: ID3ChartPlugin<EdaKnob> = {
    type: 'knob',
    component: EdaKnobComponent,
    buildInject: (props, paletaActual, randomID, chartUtils) => {
        const dataTypes = props.query.map(column => column.column_type);
        const chartConfig = new EdaKnob();
        chartConfig.data = chartUtils.transformData4Knob(props.data, dataTypes);
        chartConfig.dataDescription = chartUtils.describeData4Knob(props.query, chartUtils.transformData4Knob(props.data, dataTypes));
        chartConfig.assignedColors = props.config['config']['assignedColors'] ? props.config['config']['assignedColors'] : null;
        chartConfig.limits = props.config['config']['limits'] ? props.config['config']['limits'] : null;
        chartConfig.semaphoreColor = !!props.config['config']['semaphoreColor'];
        return chartConfig;
    }
};

/**
 * Central registry - same idiom as DATASOURCE_PLUGINS (plugins/datasource-plugins)
 * and the frontend's own PLUGINS array (plugins/plugin-registry.ts). To migrate
 * another chart type to D3: add its ID3ChartPlugin object above and register it here.
 */
export const D3_CHART_PLUGINS: ID3ChartPlugin[] = [
    DoughnutChartPlugin,
    BubblechartChartPlugin,
    ParallelSetsChartPlugin,
    TreeMapChartPlugin,
    ScatterChartPlugin,
    SunburstChartPlugin,
    FunnelChartPlugin,
    TreetableChartPlugin,
    KnobChartPlugin,
];
