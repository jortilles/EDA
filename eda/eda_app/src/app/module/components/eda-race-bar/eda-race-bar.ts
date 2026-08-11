/** JJ: propietats que se li passen al component  tots els d3 son iguals*/
import { LinkedDashboardProps } from "../eda-panels/eda-blank-panel/link-dashboards/link-dashboard-props";

export class RaceBar {
  id: string;
  size: { x: number, y: number; };
  data: { labels: any[], values: any[]; };
  dataDescription: any;
  linkedDashboard: LinkedDashboardProps;
  assignedColors: any[];
  useGradient?: boolean;
  chartLegend?: boolean;
  /** Autoplay the race on load - also doubles as the play/pause toggle's initial state. */
  chartAnimation?: boolean;
  /** How many bars to show at once - recomputed every frame from whoever's currently biggest.
   * Unset/0 falls back to the panel-height-derived count (computeTopN). */
  topNCount?: number;
  /** Shows a scrubber below the chart - one tick per real period, drag/click to jump straight to
   * it (pausing playback there). Off by default. */
  showTimeline?: boolean;
  /** How long each tick's transition takes, in ms - also how long the race waits before its very
   * first tick, since play() schedules that one the same way as every other. Unset/0 falls back
   * to the component's own default. */
  transitionMs?: number;
}
