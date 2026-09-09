import * as _ from 'lodash';
import { Query } from '@eda/models/model.index';
import { EdaBlankPanelComponent } from '../eda-blank-panel.component';

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
   * Builds and executes a `SELECT * FROM ...` version of the panel's current query,
   * returning the raw headers/rows for display.
   */
  getSourceFieldsResult: async (ebp: EdaBlankPanelComponent): Promise<{ sql: string, headers: string[], rows: any[][] }> => {
    const baseQuery: Query = _.cloneDeep(ebp.panel.content.query);
    baseQuery.dashboard.connectionProperties = ebp.connectionProperties;

    const queryMode = baseQuery.query.queryMode || ((baseQuery.query as any).modeSQL ? 'SQL' : 'EDA');

    const originalSql = queryMode === 'SQL'
      ? baseQuery.query.SQLexpression
      : await ebp.dashboardService.getBuildedQuery(baseQuery).toPromise();

    const sql = buildSelectAllQuery(originalSql);

    const execQuery: Query = _.cloneDeep(baseQuery);
    execQuery.query.SQLexpression = sql;
    execQuery.query.queryMode = 'SQL';

    const [headers, rows] = await ebp.dashboardService.executeSqlQuery(execQuery).toPromise();

    return { sql, headers, rows };
  }
};
