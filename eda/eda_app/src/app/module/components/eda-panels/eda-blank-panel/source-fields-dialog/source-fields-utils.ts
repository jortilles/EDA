import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { QueryUtils } from '../panel-utils/query-utils';

export const SourceFieldsUtils = {

  /**
   * Builds and executes a `SELECT * FROM ...` version of the panel's CURRENT query (i.e. with
   * whatever filters — panel and global — are active right now, same as what's on screen),
   * returning the raw headers/rows for display. EDA/EDA2 only — the menu option is hidden for
   * SQL-mode panels (panel-menu-options.ts), since there's no server-side query builder to
   * derive a safe "select all" from raw SQL text.
   *
   * Rebuilds from LIVE state (currentQuery, rootTable, mergeFilters(selectedFilters, globalFilters))
   * — the same helper runQuery() uses — so this reflects whatever filters currently apply on screen,
   * not just what was last saved on the panel. The connection's query builder assembles the actual
   * SQL text server-side to run it — the backend sends that same text back as a third element so it
   * can be displayed here without building or running anything a second time.
   */
  getSourceFieldsResult: async (ebp: EdaBlankPanelComponent): Promise<{ sql: string, headers: string[], rows: any[][] }> => {
    const query = QueryUtils.initEdaQuery(ebp);
    (query.query as any).sourceFields = true;

    const [headers, rows, sql] = await ebp.dashboardService.executeSourceFieldsQuery(query).toPromise();
    return { sql: sql || '', headers, rows };
  }
};
