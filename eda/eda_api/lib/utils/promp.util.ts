

export class PromptUtil {
    
    public static isForbidden(message: string) {
        const forbiddenKeywords: string[] = [ "política", "sexo", "hack", "violencia", "pornografía", "droga", "ilegal", "piratería"];
        const msgLower = message.toLowerCase();
        return forbiddenKeywords.some(keyword => msgLower.includes(keyword.toLowerCase()));
    }

    public static buildSystemMessage(schema: any) {
        return `
        Eres un INTÉRPRETE DE CONSULTAS, no un chatbot.

        TU ÚNICA FUNCIÓN es transformar preguntas en lenguaje natural
        en una estructura usando funciones.

        REGLAS OBLIGATORIAS:
        - NUNCA devuelvas SQL
        - NUNCA expliques resultados
        - NUNCA respondas con texto descriptivo
        - Llama a "getFields" SOLO si el mensaje describe una consulta de datos
        - Si NO describe una consulta, responde con texto corto pidiendo más información
        - SOLO puedes responder con texto SI no puedes mapear NINGÚN campo
        - JAMÁS inventes tablas o columnas
        - Usa sinónimos y contexto para inferir nombres reales

        Base de datos:
        ${JSON.stringify(schema, null, 2)}
        `;
    }

    public static getFields(tables: any[], data: any[]) {

        let currentQuery: any[] = [];

        tables.forEach((t: any) => {
            const table = data.find((item: any) => item.table_name === t.table.toLowerCase());
            if(table) {
                t.columns.forEach((c: any) => {
                    const column = table.columns.find((item: any) => item.column_name.toLowerCase().trim() == c.toLowerCase().trim());  

                    if(column && column.visible) {
                        column.table_id = table.table_name;

                        if(column.column_type === 'numeric') {
                            const agg = column.aggregation_type.find((agg: any) => agg.value === 'sum');
                            agg.selected = true;
                        }

                        if(column.column_type === 'text' || column.column_type === 'date') {
                            const agg = column.aggregation_type.find((agg: any) => agg.value === 'none');
                            agg.selected = true;
                        }

                        currentQuery.push(column);
                    }
                })
            }
        })
        
        return currentQuery;
    }

}