import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaAreaD3 {
  id: string;
  size: { x: number, y: number; };
  chartType: string;
  edaChart: string;
  chartLabels: string[];
  categoryFieldName?: string;
  chartDataset: any[];
  chartColors: any[];
  assignedColors: any[];
  chartLegend: boolean;
  sortLegendAlphabetically?: boolean;
  showLabels: boolean;
  showLabelsPercent: boolean;
  /** Data label text color: 'black' | 'white' | 'custom' (uses labelCustomColor). Defaults to black. */
  labelColorMode?: string;
  labelCustomColor?: string;
  showGridLines: boolean;
  /** KPI mini-chart only: X axis line, independent of showGridLines. Undefined → falls back to showGridLines (legacy behaviour). */
  showXAxis?: boolean;
  /** KPI mini-chart only: X axis tick labels, independent of showGridLines. Undefined → falls back to showGridLines (legacy behaviour). */
  showXAxisLabels?: boolean;
  /** KPI mini-chart only: how many X axis labels to show, evenly spaced (always includes the first and last). 0/undefined → legacy fixed 3-sample behaviour. */
  xAxisLabelCount?: number;
  /** Data label background color (chip behind the text). Empty/undefined → no background. */
  labelBackgroundColor?: string;
  /** Main line's border width in px. Undefined → default (2). */
  lineWidth?: number;
  /** Main line's dash style. Undefined → 'solid'. */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** Line stroke color override, independent of the series/palette color. Empty/undefined → no override. */
  chartLineColor?: string;
  /** Area fill color override, independent of the series/palette color. Empty/undefined → no override. */
  chartFillColor?: string;
  showPointLines: boolean;
  useGradient: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** KPI mini-chart mode: no axes, no grid, no legend, shorter entrance. */
  compact?: boolean;
  /** Sequential left-to-right entrance animation on first render. On by default. */
  chartAnimation?: boolean;
  /** Manual category-label character limit, in effect only while categoryLabelCharsEnabled is
   * true: 0 shows no text at all, N>0 keeps N real characters plus an ellipsis on top of them. */
  categoryLabelMaxChars?: number;
  /** Switch for categoryLabelMaxChars. Off (default): fixed legacy 8-char limit. */
  categoryLabelCharsEnabled?: boolean;
}
