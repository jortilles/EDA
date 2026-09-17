import { DashboardStyles } from '@eda/services/service.index';
import { LinkedDashboardProps } from '../link-dashboards/link-dashboard-props';
import { ChartConfig } from './chart-configuration-models/chart-config';
import { GroupedSubtotalLevel } from '../panel-utils/grouped-subtotals-utils';
import { TableConfig } from './chart-configuration-models/table-config';


export class PanelChart {
  public data : {labels:any[], values:any[]};
  public query : any;
  public chartType : string;
  public config : ChartConfig;
  public edaChart : string;
  public maps : Array<string>;
  public size : {x:number, y:number};
  public linkedDashboardProps : LinkedDashboardProps;
  public addTrend: boolean;
  public noRepetitions: boolean;
  public draggable: boolean;
  public coordinates: Array<Array<number>>;
  public zoom: number;
  public predictionConfig?: any;
  public childNavConfig?: {
    parentFields: string[];
    childFieldMap: {[columnName: string]: string};
    navColumnSubstitution: {[originalName: string]: string};
  };
  /** Closure built by EdaBlankPanelComponent (the only place with currentQuery/dashboardService
   *  access) — panel-chart just calls it after rendering the base table and merges the result
   *  in, with zero knowledge of how grouped subtotals are actually fetched. Takes the CURRENT
   *  TableConfig as a parameter (not read from a closure-captured reference) so it always
   *  fetches the exact same groupByColumns/numericColumn the caller is about to merge with —
   *  the earlier design closed over the PERSISTED config instead, so a live picker change (add
   *  a 2nd grouping column) fetched stale 1-level data while the merge expected 2 levels.
   *  Undefined for every chart type except table. */
  public fetchGroupedSubtotals?: (config: TableConfig) => Promise<GroupedSubtotalLevel[]>;
  /** Already-merged rows from table-dialog's live preview, handed off on Confirm so the real
   *  panel paints the correct grouped table immediately instead of showing the raw table while
   *  applyGroupedSubtotals() re-fetches from scratch. Only set by EdaBlankPanelComponent right
   *  before the confirm-triggered renderChart() call — undefined on every other render path,
   *  where the normal fetchGroupedSubtotals flow still applies. */
  public groupedSubtotalsPreview?: { cleanRows: any[], mergedRows: any[] };
  constructor(init?: Partial<PanelChart>) {
    Object.assign(this, init);
  }
}
