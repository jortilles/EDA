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

ORDENACIÓN Y LÍMITE:
- En un campo puedes añadir "sort":"Desc" o "sort":"Asc" para ordenar por esa columna. Solo aplica a la métrica, nunca a la dimensión.
- En el panel puedes añadir "queryLimit":N para limitar los resultados (ej. top 10 → "queryLimit":10).

Formato de cada panel:
{"title":"Título","chart_type":"bar","edaChart":"bar","queryLimit":1000,"fields":[{"table":"tabla","column":"columna","agg":"none","label":"Etiqueta","sort":"Desc"}]}`;

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

--- FILA 2: 1 doughnut + 1 bar ---
5. DOUGHNUT (chart_type "doughnut", edaChart "doughnut"): Top 10 de la entidad principal (clientes, proveedores, empleados…) por la métrica principal.
   → Dimensión text (agg "none") + métrica (agg "sum"/"count", sort "Desc"). Añade "queryLimit":10 en el panel.
   → Una sola tabla. El título debe empezar por "Top 10".
6. BAR (chart_type "bar"): Métrica principal agrupada por línea de producto, categoría o familia del dominio.
   → Dimensión text (agg "none") + métrica (agg "sum"/"count"). Una sola tabla.

--- FILA 3: tabla de detalle ---
7. TABLE (chart_type "table"): 4-5 columnas relevantes del dominio. Incluye la fecha principal del dominio (ordenada Desc con sort "Desc") y los campos más identificativos (ID, nombre, importe…). Una sola tabla.

Devuelve el array JSON con exactamente 7 paneles.`;
}

export function buildExplicitUserPrompt(modelName: string, schemaText: string, description: string): string {
    return `Schema del datasource "${modelName}":
${schemaText}

El usuario quiere: "${description}"

Genera los paneles necesarios para responder exactamente a lo pedido (1-3 paneles). No añadas paneles extra.
Devuelve el array JSON.`;
}
