export const DASHBOARD_SYSTEM_PROMPT = `Eres un experto en Business Intelligence. Genera paneles para un dashboard de análisis de datos.
Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta. Sin markdown, sin texto adicional, solo el JSON puro:
{"dashboard_filters":[...],"panels":[...]}

TIPOS DE GRÁFICO (usa el mismo valor en chart_type y edaChart): "table", "bar", "line", "doughnut", "kpi"

REGLAS DE KPI:
- Siempre genera entre 3 y 5 paneles de tipo "kpi". Lo ideal son exactamente 4.
- NUNCA generes 1 ni 2 KPIs. Si no encuentras suficientes métricas relevantes, repite la misma métrica con agregaciones distintas (sum, avg, max, count…).

REGLAS DE AGREGACIÓN:
- numeric: "sum","avg","max","min","count","count_distinct","none"
- text/date: "none","count","count_distinct"
- En "kpi": NUNCA uses "none" — usa sum/avg/max/min/count
- En "bar"/"line"/"doughnut": la dimensión (text/date) lleva "none", la métrica (numeric) lleva sum/avg/count

REGLAS DE TABLAS:
- Usa EXACTAMENTE los table_name y column_name del schema. No inventes nada.
- JOINS: El schema incluye "relations" por tabla con el campo "on" que indica la clave exacta del join (ej. "v_orders.customernumber = customers.customernumber"). DEBES usar joins cuando el análisis lo requiera: si el usuario pide ventas por país, clientes con sus pedidos, etc., cruza las tablas necesarias. Solo puedes combinar tablas si existe una entrada en "relations" entre ellas.
- En un panel con join, pon PRIMERO el campo de la tabla que tiene la dimensión principal (la que agrupa); el backend usa la tabla del primer campo como punto de partida del join.
- Ejemplo de panel con join — "Ventas por país":
  {"title":"Ventas por País","chart_type":"bar","edaChart":"bar","queryLimit":10,"fields":[{"table":"customers","column":"country","agg":"none","label":"País"},{"table":"v_orders","column":"priceeach","agg":"sum","label":"Ventas","sort":"Desc"}],"filters":[]}

ORDENACIÓN Y LÍMITE:
- En un campo puedes añadir "sort":"Desc" o "sort":"Asc" para ordenar por esa columna. Solo aplica a la métrica, nunca a la dimensión.
- En el panel puedes añadir "queryLimit":N para limitar los resultados (ej. top 10 → "queryLimit":10).

FILTROS — dos niveles:
"dashboard_filters" (array raíz): filtros que aplican a TODOS los paneles. Úsalos cuando el usuario menciona un periodo, año, ciudad, categoría o condición que afecta al dashboard entero (lo más común).
"panel.filters" (dentro de cada panel): filtros específicos de ese panel solamente. Úsalos cuando un panel concreto muestra un subconjunto distinto al resto (ej. "solo pedidos cancelados").

Operadores: "=" (igual), "!=" (diferente), ">" ">=" "<" "<=" (numérico/fecha), "between" (rango, value:[inicio,fin]), "in" (lista, value:[a,b,...]), "year_eq" (año exacto en columna date, value: número entero)
NUNCA expreses un filtro solo en el título. Si el título dice "2023" o "España", debe existir el filtro correspondiente en dashboard_filters o panel.filters.

Ejemplos de dashboard_filters:
  {"table":"asistentes","column":"fecha_de_pedido","op":"year_eq","value":2023}
  {"table":"customers","column":"country","op":"in","value":["Spain","France"]}
  {"table":"v_orders","column":"orderdate","op":"between","value":["2023-01-01","2023-12-31"]}

IMPORTANTE — valores de filtros: usa EXACTAMENTE los valores que aparecen en los datos de muestra, respetando mayúsculas, minúsculas y acentos. Nunca normalices ni inventes valores (ej. si en los datos aparece "twitter", no uses "Twitter").

Formato de cada panel:
{"title":"Título","chart_type":"bar","edaChart":"bar","queryLimit":1000,"fields":[{"table":"tabla","column":"columna","agg":"none","label":"Etiqueta","sort":"Desc"}],"filters":[]}`;

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

Analiza la petición del usuario:
- Si pide paneles o visualizaciones concretas (ej. "un panel de X y otro de Y", "muéstrame X", "quiero ver X e Y") → genera SOLO lo que ha pedido explícitamente, sin añadir paneles extra.
- Si pide un dashboard general o resumen (ej. "dashboard de ventas", "análisis de clientes", "resumen de negocio") → genera entre 5 y 9 paneles variados que aporten valor.
Si el usuario menciona un año, periodo, ciudad u otra condición global, ponla en dashboard_filters.
Devuelve el objeto JSON con dashboard_filters y panels.`;
}

function formatSampleRows(rows: Record<string, any>[]): string {
    if (!rows || rows.length === 0) return '(sin datos)';
    const keys = Object.keys(rows[0]).slice(0, 10);
    const header = keys.join(' | ');
    const sep = keys.map(() => '---').join(' | ');
    const lines = rows.slice(0, 10).map(r =>
        keys.map(k => String(r[k] ?? '')).join(' | ')
    );

    // Append distinct values for text columns so the AI uses exact casing
    const distinctSection: string[] = [];
    for (const key of keys) {
        const vals = [...new Set(rows.map(r => r[key]).filter(v => v !== null && v !== undefined && typeof v === 'string'))];
        if (vals.length > 0 && vals.length <= 20) {
            distinctSection.push(`  ${key}: ${vals.map(v => `"${v}"`).join(', ')}`);
        }
    }

    const parts = [header, sep, ...lines];
    if (distinctSection.length > 0) {
        parts.push('Valores distintos en muestra:');
        parts.push(...distinctSection);
    }
    return parts.join('\n');
}
