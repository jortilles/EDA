import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaBarD3 {
  id: string;
  size: { x: number, y: number; };
  chartType: string;
  edaChart: string;
  chartLabels: string[];
  categoryFieldName?: string;
  /** Numeric/measure field name for the tooltip's value row - only set when the chart has a
   * single numeric column, since with several (each becoming its own series) the series' own
   * label already IS that series' measure name. */
  valueFieldName?: string;
  /** stackedbar100 with a single text column + several numeric ones: each numeric column's own
   * name stands in for `category` (see transformDataQuery), so the tooltip needs to swap
   * category/series around - see tooltipHtml() in eda-bar.component.ts. */
  stackedBar100MeasureAsCategory?: boolean;
  chartDataset: any[];
  chartColors: any[];
  assignedColors: any[];
  /** Per-category color override (colored-bars-by-threshold / unique-per-bar modes), keyed by category label - only set while one of those two modes is active. */
  categoryColorOverrides?: { value: string; color: string }[];
  chartLegend: boolean;
  showLabels: boolean;
  showLabelsPercent: boolean;
  /** Data label text color: 'black' | 'white' | 'custom' (uses labelCustomColor). Defaults to black. */
  labelColorMode?: string;
  labelCustomColor?: string;
  showGridLines: boolean;
  useGradient: boolean;
  useRoundedBars: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode (kpibar): no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
  /** Sequential left-to-right entrance animation on first render. On by default. */
  chartAnimation?: boolean;
}
