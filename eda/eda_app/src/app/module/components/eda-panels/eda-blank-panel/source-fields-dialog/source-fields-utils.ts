import * as _ from 'lodash';
import { Query } from '@eda/models/model.index';
import { EdaBlankPanelComponent } from '../eda-blank-panel.component';
import { QueryUtils } from '../panel-utils/query-utils';

const isWordBoundary = (ch: string | undefined): boolean => ch === undefined || /[^A-Za-z0-9_]/.test(ch);

/**
 * Finds the index of the first occurrence of any of the given (space-separated) keywords
 * that sits at paren-depth 0 and outside of any quoted string/identifier, starting at fromIndex.
 */
const findTopLevelKeyword = (sql: string, fromIndex: number, keywords: string[]): number => {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let depth = 0;

  for (let i = fromIndex; i < sql.length; i++) {
    const ch = sql[i];

    if (inSingleQuote) {
      if (ch === "'") {
        if (sql[i + 1] === "'") { i++; continue; }
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '"') {
        if (sql[i + 1] === '"') { i++; continue; }
        inDoubleQuote = false;
      }
      continue;
    }
    if (ch === "'") { inSingleQuote = true; continue; }
    if (ch === '"') { inDoubleQuote = true; continue; }
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }

    if (depth === 0 && isWordBoundary(sql[i - 1])) {
      for (const keyword of keywords) {
        const candidate = sql.substr(i, keyword.length);
        if (candidate.toUpperCase() === keyword && isWordBoundary(sql[i + keyword.length])) {
          return i;
        }
      }
    }
  }
  return -1;
};

/**
 * Turns a SELECT query into `SELECT * FROM ... [JOIN ...] [WHERE ...]`, dropping the
 * selected column list, GROUP BY, ORDER BY and LIMIT clauses.
 */
export const buildSelectAllQuery = (sql: string): string => {
  const normalized = sql.replace(/\r\n/g, '\n');
  const fromIndex = findTopLevelKeyword(normalized, 0, ['FROM']);
  if (fromIndex < 0) return normalized.trim();

  const cutIndex = findTopLevelKeyword(normalized, fromIndex, ['GROUP BY', 'ORDER BY', 'LIMIT']);
  const fromClause = (cutIndex >= 0 ? normalized.substring(fromIndex, cutIndex) : normalized.substring(fromIndex)).trim();

  return `SELECT *\n${fromClause}`;
};

export const SourceFieldsUtils = {

  /**
   * Builds and executes a `SELECT * FROM ...` version of the panel's CURRENT query (i.e. with
   * whatever filters — panel and global — are active right now, same as what's on screen),
   * returning the raw headers/rows for display.
   *
   * SQL-mode panels already have raw SQL text, so it's trimmed client-side (that part is
   * generic across engines). EDA2/structured panels have no SQL text on the client — building
   * it correctly (joins, filters, quoting) depends on the connection's own query builder, so
   * that case is delegated entirely to the backend, one connection type at a time (currently
   * PostgreSQL only — see QueryBuilderService.sourceFieldsQuery in eda_api).
   */
  getSourceFieldsResult: async (ebp: EdaBlankPanelComponent): Promise<{ sql: string, headers: string[], rows: any[][] }> => {
    const queryMode = ebp.selectedQueryMode;

    if (queryMode === 'SQL') {
      const baseQuery: Query = _.cloneDeep(ebp.panel.content.query);
      baseQuery.dashboard.connectionProperties = ebp.connectionProperties;

      const sql = buildSelectAllQuery(baseQuery.query.SQLexpression);

      const execQuery: Query = _.cloneDeep(baseQuery);
      execQuery.query.SQLexpression = sql;
      execQuery.query.queryMode = 'SQL';

      const [headers, rows] = await ebp.dashboardService.executeSqlQuery(execQuery).toPromise();
      return { sql, headers, rows };
    }

    // EDA/EDA2: rebuild from LIVE state (currentQuery, rootTable, mergeFilters(selectedFilters, globalFilters))
    // — the same helper runQuery() uses — so this reflects whatever filters currently apply on screen,
    // not just what was last saved on the panel.
    const query = QueryUtils.initEdaQuery(ebp);
    (query.query as any).sourceFields = true;

    const [headers, rows] = await ebp.dashboardService.executeSourceFieldsQuery(query).toPromise();
    return { sql: '', headers, rows };
  }
};
