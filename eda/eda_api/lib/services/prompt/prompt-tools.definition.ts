import { NormalizedTool } from "./providers/ai-provider.interface";

const getAssistantResponseTool: NormalizedTool = {
    name: "getAssistantResponse",
    description: `
    Use this tool ONLY when the user message has NO relation to any table or entity, column or field or attribute in the schema.
    Trigger cases:
    - Greetings: "hola", "hello", "buenos días", "hey"
    - Farewells: "adiós", "bye", "hasta luego"
    - Thanks: "gracias", "thank you"
    - Off-topic questions: jokes, weather, general knowledge, anything unrelated to data
    - Unclear or ambiguous messages that cannot be mapped to any schema element
    DO NOT use this tool if the user is asking about data, tables, or fields — use getFields instead.
    `,
    parameters: {
        type: "object",
        properties: {
            message: {
                type: "string",
                description: "A short, friendly response in Spanish to the user's message. Be concise and helpful. If the message is off-topic, kindly remind the user that you are a data query assistant."
            }
        },
        required: ["message"],
        additionalProperties: false
    },
    strict: true,
};

const getFieldsTool: NormalizedTool = {
    name: "getFields",
    description: `
    Returns an array of table objects with their corresponding columns, and the query row limit.
    Rules:
    - Always return columns for the requested tables.
    - Use synonyms or context in the user query to match table and column names in the schema.
    - Use table and column descriptions from the schema to resolve ambiguous or semantic user terms.
    - Never return an empty columns array.
    - Do not return duplicated columns for the same table.
    - For the limit: extract it from patterns like "los 10 clientes" → 10, "top 5" → 5, "los 3 primeros" → 3, "el mejor/peor" → 1. Default is 5000 if no number is mentioned.
    - Example output:
    [
    {
        "table": "customers",
        "columns": [
            { "column": "name", "column_type": "text" },
            { "column": "population", "column_type": "numeric" },
            { "column": "country", "column_type": "text" },
            { "column": "orderDate", "column_type": "date" },
            { "column": "map", "column_type": "coordinate" }
        ]
    }
    ]
    `,
    parameters: {
        type: "object",
        properties: {
            limit: {
                type: "number",
                minimum: 1,
                maximum: 10000,
                description: "Maximum number of rows to return. Extract from 'top N', 'los N', 'los N primeros/mejores/peores', 'dame N', etc. Default is 5000 if no number is mentioned."
            },
            tables: {
                type: "array",
                description: "Array of tables. Each element must be an object with 'table' (string) and 'columns' (array of objects). You must check the schema",
                items: {
                    type: "object",
                    properties: {
                        table: { type: "string", description: "Name of the table. Use the table description from the schema to identify the correct table when the user uses semantic or natural language terms." },
                        columns: {
                            type: "array",
                            minItems: 1,
                            description: "Array of column objects. never return an empty array of columns. You must check the schema. You must identify tables or fields in the prompt query to match them with the columns you will return. Take also into account synonyms and possible typography mistakes.",
                            items: {
                                type: "object",
                                properties: {
                                    column: {
                                        type: "string",
                                        description: "Column or field of the table defined in the schema. Use the column description to match semantic meaning when the user uses natural language terms."
                                    },
                                    column_type: {
                                        type: "string",
                                        description: "Type of the column or field",
                                        enum: ["text", "numeric", "date", "coordinate"]
                                    },
                                    ordenation_type: {
                                        type: "string",
                                        description: "Column sorting: if ascending, type Asc; if descending, type Desc; and if neither, the default value is No.",
                                        enum: ["Asc", "Desc", "No"]
                                    },
                                    ia_metadata_permissions: {
                                        type: "object",
                                        description: "Permission levels for this column. Always provided by the schema — never create or modify this field.",
                                        properties: {
                                            column: {
                                                type: "string",
                                                enum: ["FULL", "DECLARATION", "NONE"],
                                                description: "FULL: AI can use field name and its values. DECLARATION: AI can reference the field name but must not read, expose, or process its values. NONE: column is fully hidden from AI."
                                            },
                                            table: {
                                                type: "string",
                                                enum: ["FULL", "DECLARATION", "NONE"]
                                            },
                                            dataSource: {
                                                type: "string",
                                                enum: ["FULL", "DECLARATION", "NONE"]
                                            }
                                        },
                                        required: ["column", "table", "dataSource"],
                                        additionalProperties: false
                                    }
                                },
                                required: ['column', "column_type", "ordenation_type", "ia_metadata_permissions"],
                                additionalProperties: false
                            }
                        }
                    },
                    required: ["table", "columns"],
                    additionalProperties: false
                }
            }
        },
        required: ["limit", "tables"],
        additionalProperties: false
    },
    strict: true,
};

const getFiltersTool: NormalizedTool = {
    name: "getFilters",
    description: `
    IMPORTANT: This tool MUST be called whenever the user query contains any filtering condition, comparison, restriction, or specific value constraint.
    Trigger patterns (call getFilters if ANY of these appear):
    - Comparisons: "menor que" / "less than", "mayor que" / "greater than", "igual a" / "equal to", "distinto de" / "not equal to"
    - Ranges: "entre X e Y" / "between X and Y"
    - Specific values: "solo X" / "only X", "excepto X" / "except X", "que sean X o Y" / "that are X or Y"
    - Text matching: "que contiene" / "that contains", "que empieza por" / "that starts with"
    - Nullability: "que tienen valor" / "that have a value", "que no están vacíos" / "not empty", "sin datos" / "with no data"
    - Dates: "del año" / "from the year", "desde" / "from", "hasta" / "until", "en enero" / "in January"
    Creates filter objects for each condition found. All columns and tables are defined in the schema.
    `,
    parameters: {
        type: "object",
        properties: {
            filters: {
                type: "array",
                description: "Array of elements, where each element has a column or field and its corresponding values",
                items: {
                    type: "object",
                    properties: {
                        table: {
                            type: "string",
                            description: "Name of the table to which the column belongs; all tables are defined in the schema"
                        },
                        column: {
                            type: "string",
                            description: "Name of the column or field, all the columns or fiels are defined in the schema"
                        },
                        column_type: {
                            type: "string",
                            description: "Type of the column or field, the type could be: text, number, date or coordinate",
                            enum: ["text", "numeric", "date", "coordinate"]
                        },
                        values: {
                            type: "array",
                            description: "Array of the filter elements",
                            items: {
                                anyOf: [
                                    { type: "string" },
                                    { type: "number" }
                                ],
                                description: "Element of the column or field"
                            }
                        },
                        filter_type: {
                            type: "string",
                            description: `
                                Type of filter to apply => Options:
                                - "=": exact match (e.g. country = 'Spain')
                                - "!=": not equal (e.g. status != 'inactive')
                                - ">": greater than (e.g. age > 30)
                                - "<": less than (e.g. price < 100)
                                - ">=": greater than or equal
                                - "<=": less than or equal
                                - "between": value is within a range, requires two values (e.g. date between '2024-01-01' and '2024-12-31')
                                - "in": value matches any in a list (e.g. country in ['Spain', 'France'])
                                - "not_in": value does not matches with the elements of the list (e.g. country not in ['Italy', 'Germany'])
                                - "not_like": partial text does not match
                                - "like": partial text match, use when the user writes a partial name or uses 'contains' / 'starts with' (e.g. name like 'Mar')
                                - "not_null": field has a value (is not null)
                                - "not_null_nor_empty": field is not null and not an empty
                                - "null_or_empty": field is null or empty`,
                            enum: [ "=", "!=", ">", "<", ">=", "<=", "between", "in", "not_in", "like", "not_like", "not_null", "not_null_nor_empty", "null_or_empty" ]
                        }
                    },
                    required: ["table", "column", "column_type", "values", "filter_type"],
                    additionalProperties: false
                }
            }
        },
        required: ["filters"],
        additionalProperties: false
    },
    strict: true,
};

export const AI_TOOLS: NormalizedTool[] = [
    getAssistantResponseTool,
    getFieldsTool,
    getFiltersTool,
];
