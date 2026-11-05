export interface CsvColumnConfig {
    field: string;
    type: string;
    separator?: string;
}

/**
 * Splits one CSV line into fields, honouring RFC4180 double-quoted fields
 * (which may themselves contain the delimiter, newlines or escaped "" quotes).
 */
function splitCsvLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"') {
                if (line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = false;
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            fields.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current);
    return fields;
}

function joinCsvField(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * DuckDB's read_csv_auto always expects '.' as the decimal point, so a CSV
 * exported with ',' (e.g. es/ca locales) fails to cast to DECIMAL on load.
 * Rewrites only the columns the user flagged as numeric/integer with a ','
 * decimal separator in the "Añadir tabla CSV a DuckDB" UI, turning "31730,05"
 * into "31730.05" while leaving every other column (including text fields
 * that may legitimately contain commas) untouched.
 */
export function normalizeCsvDecimalSeparators(
    csvContent: string,
    delimiter: string,
    columnsConfig: CsvColumnConfig[]
): string {
    const columnsToFix = new Set(
        (columnsConfig || [])
            .filter(c => ['integer', 'numeric'].includes(c.type) && c.separator === ',')
            .map(c => c.field)
    );

    if (columnsToFix.size === 0) return csvContent;

    const lines = csvContent.split(/\r\n|\n/);
    if (lines.length === 0) return csvContent;

    const headerFields = splitCsvLine(lines[0], delimiter);
    const fixIndices = headerFields
        .map((h, i) => (columnsToFix.has(h.trim()) ? i : -1))
        .filter(i => i >= 0);

    if (fixIndices.length === 0) return csvContent;

    const outLines = [lines[0]];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '') { outLines.push(lines[i]); continue; }
        const fields = splitCsvLine(lines[i], delimiter);
        for (const idx of fixIndices) {
            if (fields[idx] !== undefined) fields[idx] = fields[idx].replace(/,/g, '.');
        }
        outLines.push(fields.map(f => joinCsvField(f, delimiter)).join(delimiter));
    }

    return outLines.join('\n');
}
