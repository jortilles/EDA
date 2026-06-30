export const DASHBOARD_SYSTEM_PROMPT = `Eres un experto en Business Intelligence. Genera paneles para un dashboard de análisis de datos.
Responde ÚNICAMENTE con un array JSON válido de paneles. Sin markdown, sin texto adicional, solo el JSON puro.

TIPOS DE GRÁFICO (usa el mismo valor en chart_type y edaChart): "table", "bar", "line", "doughnut", "kpi"

REGLAS DE AGREGACIÓN:
- numeric: "sum","avg","max","min","count","count_distinct","none"
- text/date: "none","count","count_distinct"
- En "kpi": NUNCA uses "none" — usa sum/avg/max/min/count
- En "bar"/"line"/"doughnut": la dimensión (text/date) lleva "none", la métrica (numeric) lleva sum/avg/count

REGLAS DE TABLAS:
- Usa EXACTAMENTE los table_name y column_name del schema. No inventes nada.
- JOINS: Solo combina dos tablas si una aparece en joins_with de la otra. Si no hay relación directa, usa una sola tabla por panel.
- Cuando combines tablas, pon primero el campo de la tabla raíz (la que tiene la fecha o el ID principal).

ORDENACIÓN Y LÍMITE:
- En un campo puedes añadir "sort":"Desc" o "sort":"Asc" para ordenar por esa columna. Solo aplica a la métrica, nunca a la dimensión.
- En el panel puedes añadir "queryLimit":N para limitar los resultados (ej. top 10 → "queryLimit":10).

Formato de cada panel:
{"title":"Título","chart_type":"bar","edaChart":"bar","queryLimit":1000,"fields":[{"table":"tabla","column":"columna","agg":"none","label":"Etiqueta","sort":"Desc"}]}`;

export function buildUserPrompt(
    modelName: string,
    schemaText: string,
    sampleData: Record<string, Record<string, any>[]>,
    description: string,
): string {
    const sampleSections = Object.entries(sampleData)
        .map(([tableName, rows]) => `Datos de "${tableName}" (${rows.length} filas):\n${formatSampleRows(rows)}`)
        .join('\n\n');

    return `Schema del datasource "${modelName}":
${schemaText}

${sampleSections}

El usuario quiere: "${description}"

Analiza los datos reales y el schema. Genera entre 5 y 9 paneles que aporten valor de negocio real para este dominio.
Decide tú qué tipo de gráfico usar, qué campos incluir y cuántos paneles, basándote en lo que ves en los datos.
Devuelve el array JSON.`;
}

function formatSampleRows(rows: Record<string, any>[]): string {
    if (!rows || rows.length === 0) return '(sin datos)';
    const keys = Object.keys(rows[0]).slice(0, 10);
    const header = keys.join(' | ');
    const sep = keys.map(() => '---').join(' | ');
    const lines = rows.slice(0, 10).map(r =>
        keys.map(k => String(r[k] ?? '')).join(' | ')
    );
    return [header, sep, ...lines].join('\n');
}
