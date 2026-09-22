export interface ChartDialogSaveResponseBase {
  assignedColors?: { value: string | number; color: string }[];
  assignedIcons?: { value: string | number; icon: string }[];
  useIcons?: boolean;
  colors?: string[];
  useGradient?: boolean;
  chartLegend?: boolean;
  showLabels?: boolean;
  showLabelsPercent?: boolean;
  showGridLines?: boolean;
  innerRadiusPercent?: number;
  chartAnimation?: boolean;
  labelColorMode?: string;
  labelCustomColor?: string;
  topNCount?: number;
  showTimeline?: boolean;
  transitionMs?: number;
}
