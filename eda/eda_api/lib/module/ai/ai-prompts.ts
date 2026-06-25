export const DASHBOARD_SYSTEM_PROMPT = `Eres un experto en Business Intelligence. Genera paneles para un dashboard de análisis de datos.
Responde ÚNICAMENTE con un array JSON válido de paneles. Sin markdown, sin texto adicional, solo el JSON puro.

TIPOS DE GRÁFICO (usa el mismo valor en chart_type y edaChart): "table", "bar", "line", "doughnut", "kpi"
DEFAULTS si el usuario no especifica: resumen numérico→"kpi", por fecha→"bar", por categoría→"bar", proporción→"doughnut", listado/ranking→"table"

REGLAS DE AGREGACIÓN:
- numeric: "sum","avg","max","min","count","count_distinct","none"
- text/date: "none","count","count_distinct"
- En "kpi": NUNCA uses "none" — usa sum/avg/max/min/count
- En "bar"/"line"/"doughnut": la dimensión (text/date) lleva "none", la métrica (numeric) lleva sum/avg/count

REGLAS DE TABLAS:
- Usa EXACTAMENTE los table_name y column_name del schema. No inventes nada.
- JOINS: Solo combina dos tablas si una aparece en joins_with de la otra. Si no hay relación directa, usa una sola tabla por panel.
- Cuando combines tablas, pon primero el campo de la tabla raíz (la que tiene la fecha o el ID principal).

Formato de cada panel:
{"title":"Título","chart_type":"bar","edaChart":"bar","fields":[{"table":"tabla","column":"columna","agg":"none","label":"Etiqueta"}]}`;

export function buildStandardUserPrompt(modelName: string, schemaText: string, description: string): string {
    return `Schema del datasource "${modelName}":
${schemaText}

El usuario quiere un dashboard estándar de: "${description}"

Genera EXACTAMENTE 7 paneles en este orden:

--- FILA 1: 4 KPIs ---
1. KPI (chart_type "kpi"): métrica principal con agg "sum". Ej: "Total de Ventas".
2. KPI (chart_type "kpi"): conteo de la entidad principal con agg "count". Ej: "Número de Pedidos".
3. KPI (chart_type "kpi"): promedio de la métrica principal con agg "avg". Ej: "Importe Medio".
4. KPI (chart_type "kpi"): otra métrica relevante con agg "count_distinct" o "max". Ej: "Clientes Únicos".
   → Los 4 KPIs deben ser de UNA SOLA tabla. Sin combinar tablas.

--- FILA 2: 2 gráficos de barras ---
5. BAR (chart_type "bar"): columna de fecha (agg "none") + métrica (agg "sum"/"count"). Si la fecha y métrica no están en la misma tabla y una aparece en joins_with de la otra, combínalas. Si no, usa la tabla que tenga la columna de fecha más relevante y el count(*) de esa tabla.
6. BAR (chart_type "bar"): columna text de categoría (agg "none") + métrica (agg "sum"/"count"). Una sola tabla.

--- FILA 3: tabla de detalle ---
7. TABLE (chart_type "table"): 3-5 columnas relevantes del dominio. Una sola tabla.

Devuelve el array JSON con exactamente 7 paneles.`;
}

export function buildExplicitUserPrompt(modelName: string, schemaText: string, description: string): string {
    return `Schema del datasource "${modelName}":
${schemaText}

El usuario quiere: "${description}"

Genera los paneles necesarios para responder exactamente a lo pedido (1-3 paneles). No añadas paneles extra.
Devuelve el array JSON.`;
}
