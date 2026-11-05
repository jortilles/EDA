const eda_api_config = require('../../config/eda_api_config');

/**
 * Detects values that only look numeric because a driver stringified them (dates,
 * text, etc are excluded). Mirrors DashboardController.isNotNumeric so both the live
 * SQL query path and the cache-refresh path (CachedQueryService.execQuery) agree on
 * what counts as numeric for Oracle/MySQL, which return COUNT/SUM/DECIMAL as strings.
 */
export function isNotNumeric(val: any): boolean {
  let notNumeric = false;
  try {
    if (
      isNaN(val) || val.toString().indexOf('-') >= 0 || val.toString().indexOf('/') >= 0 ||
      val.toString().indexOf('|') >= 0 || val.toString().indexOf(':') >= 0 || val.toString().indexOf('T') >= 0 ||
      val.toString().indexOf('Z') >= 0 || val.toString().replace(/['"]+/g, '').length == 0
    ) {
      notNumeric = true;
    }
  } catch (e) {
    // Null values are...NULL
  }
  return notNumeric;
}

/**
 * Coerces Oracle/MySQL row values back to numbers where every row agrees a column
 * is numeric, per column (via isNotNumeric); if a column's type is inconsistent
 * across rows, all its rows are left as the raw driver values instead of risking
 * a wrong parseFloat on genuinely mixed data.
 */
export function normalizeOracleMysqlRows(rows: any[][]): any[][] {
  const results: any[][] = [];
  const resultsRollback: any[][] = [];
  const rowTypes: string[][] = [];

  rows.forEach((row, i) => {
    const output = [...row];
    resultsRollback.push([...row]);
    const tmpArray: string[] = [];

    output.forEach((val, index) => {
      if (isNotNumeric(val)) {
        tmpArray.push('NaN');
        if (val === null) {
          output[index] = eda_api_config.null_value;
          resultsRollback[i][index] = eda_api_config.null_value;
        }
      } else {
        tmpArray.push('int');
        if (val !== null) {
          output[index] = parseFloat(val);
        } else {
          output[index] = eda_api_config.null_value;
          resultsRollback[i][index] = eda_api_config.null_value;
        }
      }
    });

    rowTypes.push(tmpArray);
    results.push(output);
  });

  let typesConsistent = true;
  if (rowTypes.length > 1) {
    for (let i = 0; i < rowTypes.length - 1; i++) {
      for (let j = 0; j < rowTypes[i].length; j++) {
        if (rowTypes[0][j] === 'int' && rowTypes[i][j] !== rowTypes[i + 1][j]) {
          typesConsistent = false;
        }
      }
    }
  }

  const finalResults = typesConsistent ? results : resultsRollback;

  if (typesConsistent) {
    for (let i = 0; i < finalResults.length; i++) {
      for (let j = 0; j < finalResults[i].length; j++) {
        const t = rowTypes?.[0]?.[j];
        if (t === 'int' && finalResults[i][j] === eda_api_config.null_value) {
          finalResults[i][j] = null;
        }
      }
    }
  }

  return finalResults;
}
