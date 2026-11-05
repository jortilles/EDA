import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class EdaRadar {
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
  useGradient: boolean;
  chartAnimation?: boolean;
  linkedDashboard: LinkedDashboardProps;
  /** Manual category-label character limit, in effect only while categoryLabelCharsEnabled is
   * true: 0 shows no text at all, N>0 keeps N real characters plus an ellipsis on top of them. */
  categoryLabelMaxChars?: number;
  /** Switch for categoryLabelMaxChars. Off (default): fixed legacy 10-char limit. */
  categoryLabelCharsEnabled?: boolean;
}
