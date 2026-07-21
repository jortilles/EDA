export interface ChartDialogSaveResponseBase {
  assignedColors?: { value: string | number; color: string }[];
  colors?: string[];
  useGradient?: boolean;
  chartLegend?: boolean;
  showLabels?: boolean;
  showLabelsPercent?: boolean;
  showGridLines?: boolean;
  innerRadiusPercent?: number;
}
