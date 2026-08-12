export type CategoryChartType = 'doughnut' | 'polarArea' | 'sunburst' | 'treeMap'
  | 'scatterPlot' | 'bubblechart' | 'parallelSets' | 'funnel';

/**
 * Ordered, de-duplicated category identifiers for a live chart instance - used both to seed a
 * dialog's assignedColors on open and to re-match saved colors[] onto categories after close.
 * Sunburst normalizes multi-level "parent|child" rows down to the top-level segment here, so
 * downstream matching can always use plain equality instead of a per-type special case.
 */
export function getChartCategoryValues(chartType: CategoryChartType, componentRefInstance: any): (string | number)[] {
  switch (chartType) {
    case 'doughnut':
    case 'polarArea':
      // These two are D3 components rewritten this session - they store categories as
      // inject.chartLabels (see buildSlices() in both), not the legacy firstColLabels the
      // still-Chart.js-era chart types below carry.
      return componentRefInstance.inject?.chartLabels ?? [];
    case 'sunburst': {
      const otherColumns = componentRefInstance?.inject?.dataDescription?.otherColumns;
      const isMultiLevel = Array.isArray(otherColumns) && otherColumns.length > 1;
      const raw = componentRefInstance.data.map((item: any[]) => item.find((v: any) => typeof v === 'string'));
      return isMultiLevel ? [...new Set<string>(raw.map((v: string) => v?.split('|')[0] ?? ''))] : raw;
    }
    case 'treeMap':
    case 'bubblechart':
      return componentRefInstance.data.children.map((item: any) => item.name);
    case 'scatterPlot':
      return componentRefInstance.data.map((item: any) => item.label);
    case 'parallelSets': {
      const labelIndex = componentRefInstance.inject.dataDescription.otherColumns[0].index;
      return [...new Set<string>(componentRefInstance.data.values.map((v: any[]) => v[labelIndex] as string))];
    }
    case 'funnel':
      // Matches the keys resolveAndPersistGradientColors() in panel-chart.component.ts actually
      // saves under - the dialog's "Inicio"/"Final" are hardcoded display labels, not bound to
      // these values, so this only needs to match for lookup/persistence, not display.
      return ['start', 'end'];
  }
}

/** Sankey needs colors per data row (not per unique label) to expand the gradient per link. */
export function getSankeyRowLabels(componentRefInstance: any): string[] {
  const labelIndex = componentRefInstance.inject.dataDescription.otherColumns[0].index;
  return componentRefInstance.data.values.map((v: any[]) => v[labelIndex] as string);
}
