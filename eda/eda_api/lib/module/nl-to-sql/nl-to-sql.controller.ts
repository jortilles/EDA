import { NextFunction, Request, Response } from "express";
import { HttpException } from "../global/model/index";
import OpenAI from "openai";
import * as path from 'path';
import ManagerConnectionService from '../../services/connection/manager-connection.service';

const getChatgptConfig = () => {
    const configPath = path.resolve(__dirname, '../../config/chatgpt.config.js');
    delete require.cache[require.resolve(configPath)];
    return require(configPath);
};

interface TableSchema {
    table_name: string;
    display_name?: { default: string; localized?: any[] };
    description?: { default: string; localized?: any[] };
    columns: ColumnSchema[];
    relations?: RelationSchema[];
}

interface ColumnSchema {
    column_name: string;
    display_name?: { default: string; localized?: any[] };
    description?: { default: string; localized?: any[] };
    column_type: 'text' | 'numeric' | 'date' | 'coordinate' | 'boolean' | 'html';
    visible?: boolean;
}

interface RelationSchema {
    source_column: string;
    target_table: string;
    target_column: string;
}

interface LogicModelMetadata {
    tables: TableSchema[];
    connection_type: 'postgres' | 'mysql' | 'sqlserver' | 'oracle' | 'bigquery' | 'snowflake' | 'clickhouse';
    schema?: string;
    database?: string;
}

export class NlToSqlController {

    static async generateSql(req: Request, res: Response, next: NextFunction) {
        try {
            const { naturalLanguage, logicModel, dataSource_id, options } = req.body;

            if (!naturalLanguage || !naturalLanguage.trim()) {
                return res.status(400).json({
                    ok: false,
                    error: 'Natural language query is required'
                });
            }

            if (!logicModel && !dataSource_id) {
                return res.status(400).json({
                    ok: false,
                    error: 'Either logicModel or dataSource_id is required'
                });
            }

            const { API_KEY, MODEL } = getChatgptConfig();
            const openai = new OpenAI({ apiKey: API_KEY });

            let modelMetadata: LogicModelMetadata;
            
            if (dataSource_id) {
                const connection = await ManagerConnectionService.getConnection(dataSource_id, undefined);
                const dataSource = await connection.getDataSource(dataSource_id, req.qs?.properties);
                modelMetadata = {
                    tables: dataSource.ds.model.tables,
                    connection_type: dataSource.ds.connection.type,
                    schema: dataSource.ds.connection.schema,
                    database: dataSource.ds.connection.database
                };
            } else {
                modelMetadata = logicModel;
            }

            const mode = options?.mode || 'hybrid';
            let result;

            if (mode === 'direct') {
                result = await NlToSqlController.generateSqlDirect(openai, MODEL, naturalLanguage, modelMetadata, options);
            } else if (mode === 'query-object') {
                result = await NlToSqlController.generateSqlViaQueryObject(openai, MODEL, naturalLanguage, modelMetadata, options);
            } else {
                result = await NlToSqlController.generateSqlHybrid(openai, MODEL, naturalLanguage, modelMetadata, options);
            }

            res.status(200).json({
                ok: true,
                response: result
            });

        } catch (err) {
            console.error('Error in generateSql:', err);
            next(new HttpException(500, 'Error generating SQL from natural language'));
        }
    }

    private static async generateSqlDirect(
        openai: OpenAI, 
        model: string, 
        naturalLanguage: string, 
        modelMetadata: LogicModelMetadata,
        options?: any
    ): Promise<any> {
        const schemaDescription = NlToSqlController.buildSchemaDescription(modelMetadata);
        const dbType = modelMetadata.connection_type;
        const schema = modelMetadata.schema || 'public';

        const systemPrompt = `You are an expert SQL assistant. Your task is to convert natural language queries into SQL statements.

DATABASE INFORMATION:
- Database Type: ${dbType}
${dbType === 'postgres' ? '- Syntax: PostgreSQL' : ''}
${dbType === 'mysql' ? '- Syntax: MySQL' : ''}
- Default Schema: ${schema}

TABLE SCHEMA:
${schemaDescription}

IMPORTANT RULES:
1. Generate valid ${dbType.toUpperCase()} SQL syntax
2. Use appropriate identifiers:
   - PostgreSQL: Use double quotes for identifiers (e.g., "table_name"."column_name")
   - MySQL: Use backticks for identifiers (e.g., \`table_name\`.\`column_name\`)
3. Always qualify columns with table names to avoid ambiguity
4. Use appropriate JOIN types based on table relationships
5. Include only tables and columns that exist in the schema
6. Use proper aggregation functions (COUNT, SUM, AVG, MIN, MAX) when needed
7. ORDER BY should be used when sorting is mentioned
8. LIMIT should be used when "top N" or "first N" is mentioned
9. Use parameterized values or proper escaping for string literals
10. If the query is ambiguous, make reasonable assumptions and note them

RESPONSE FORMAT:
Return a JSON object with the following structure:
{
  "sql": "The generated SQL statement",
  "explanation": "A brief explanation of what the query does",
  "tables_used": ["list", "of", "tables"],
  "columns_used": ["list", "of", "columns"],
  "assumptions": ["list", "of", "assumptions", "made"],
  "warnings": ["list", "of", "potential", "warnings"]
}`;

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Convert this natural language query to SQL: ${naturalLanguage}` }
            ],
            response_format: { type: "json_object" }
        });

        let result;
        try {
            result = JSON.parse(response.choices[0].message.content || '{}');
        } catch {
            result = {
                sql: response.choices[0].message.content,
                explanation: 'Generated SQL',
                tables_used: [],
                columns_used: [],
                assumptions: [],
                warnings: ['Could not parse JSON response']
            };
        }

        return {
            mode: 'direct',
            ...result,
            db_type: dbType,
            raw_response: response.choices[0].message.content
        };
    }

    private static async generateSqlViaQueryObject(
        openai: OpenAI, 
        model: string, 
        naturalLanguage: string, 
        modelMetadata: LogicModelMetadata,
        options?: any
    ): Promise<any> {
        const schemaForPrompt = NlToSqlController.buildSchemaForFunctionCalling(modelMetadata);
        
        const systemPrompt = `You are a QUERY INTERPRETER, not a chatbot.
Your only job is to transform natural language questions into structured function calls.

DATABASE SCHEMA:
${JSON.stringify(schemaForPrompt, null, 2)}

RULES:
1. Use getFields to specify which columns to select
2. Use getFilters for any conditions or restrictions
3. Use getAssistantResponse only for off-topic questions
4. Never make up tables or columns not in the schema`;

        const tools = NlToSqlController.getFunctionCallingTools();

        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: naturalLanguage }
            ],
            tools: tools,
            tool_choice: "auto"
        });

        const toolCalls = response.choices[0].message.tool_calls || [];
        
        let currentQuery = [];
        let selectedFilters = [];
        let principalTable = null;
        let queryLimit = 5000;

        for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'getFields') {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    queryLimit = args.limit || 5000;
                    
                    if (args.tables && args.tables.length > 0) {
                        principalTable = args.tables[0].table;
                        currentQuery = NlToSqlController.resolveFields(args.tables, modelMetadata);
                    }
                } catch (e) {
                    console.error('Error parsing getFields:', e);
                }
            }
            
            if (toolCall.function.name === 'getFilters') {
                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    selectedFilters = NlToSqlController.resolveFilters(args.filters || [], modelMetadata);
                } catch (e) {
                    console.error('Error parsing getFilters:', e);
                }
            }
        }

        return {
            mode: 'query-object',
            currentQuery,
            selectedFilters,
            principalTable,
            queryLimit,
            explanation: `Query interpreted for: ${naturalLanguage}`,
            raw_response: response.choices[0].message
        };
    }

    private static async generateSqlHybrid(
        openai: OpenAI, 
        model: string, 
        naturalLanguage: string, 
        modelMetadata: LogicModelMetadata,
        options?: any
    ): Promise<any> {
        const queryObjectResult = await NlToSqlController.generateSqlViaQueryObject(
            openai, model, naturalLanguage, modelMetadata, options
        );

        const directResult = await NlToSqlController.generateSqlDirect(
            openai, model, naturalLanguage, modelMetadata, options
        );

        return {
            mode: 'hybrid',
            query_object: queryObjectResult,
            direct_sql: directResult,
            recommended: queryObjectResult.currentQuery.length > 0 ? 'query-object' : 'direct'
        };
    }

    private static buildSchemaDescription(modelMetadata: LogicModelMetadata): string {
        let description = '';
        
        for (const table of modelMetadata.tables) {
            const tableName = table.table_name;
            const tableDesc = table.description?.default || table.display_name?.default || tableName;
            
            description += `\nTABLE: ${tableName}`;
            description += `\n  Description: ${tableDesc}`;
            description += `\n  COLUMNS:`;
            
            for (const column of table.columns) {
                if (column.visible !== false) {
                    const colDesc = column.description?.default || column.display_name?.default || column.column_name;
                    description += `\n    - ${column.column_name} (${column.column_type}): ${colDesc}`;
                }
            }
            
            if (table.relations && table.relations.length > 0) {
                description += `\n  RELATIONSHIPS:`;
                for (const rel of table.relations) {
                    description += `\n    - ${tableName}.${rel.source_column} → ${rel.target_table}.${rel.target_column}`;
                }
            }
            
            description += '\n';
        }
        
        return description;
    }

    private static buildSchemaForFunctionCalling(modelMetadata: LogicModelMetadata): any[] {
        return modelMetadata.tables
            .filter(table => table.columns.some(col => col.visible !== false))
            .map(table => ({
                table: table.table_name,
                description: table.description?.default || table.display_name?.default || table.table_name,
                columns: table.columns
                    .filter(col => col.visible !== false)
                    .map(col => ({
                        column: col.column_name,
                        column_type: col.column_type,
                        description: col.description?.default || col.display_name?.default || col.column_name
                    }))
            }));
    }

    private static getFunctionCallingTools(): any[] {
        return [
            {
                type: "function",
                function: {
                    name: "getFields",
                    description: "Returns the tables and columns to select from. Use this when the user asks about specific data fields.",
                    parameters: {
                        type: "object",
                        properties: {
                            limit: {
                                type: "number",
                                description: "Maximum number of rows. Default is 5000."
                            },
                            tables: {
                                type: "array",
                                description: "Array of tables with their columns",
                                items: {
                                    type: "object",
                                    properties: {
                                        table: { type: "string", description: "Table name" },
                                        columns: {
                                            type: "array",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    column: { type: "string", description: "Column name" },
                                                    column_type: { type: "string", enum: ["text", "numeric", "date", "coordinate"] },
                                                    ordenation_type: { type: "string", enum: ["Asc", "Desc", "No"] }
                                                },
                                                required: ["column", "column_type"]
                                            }
                                        }
                                    },
                                    required: ["table", "columns"]
                                }
                            }
                        },
                        required: ["tables"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getFilters",
                    description: "Returns filter conditions. Use this whenever there are conditions, comparisons, or restrictions.",
                    parameters: {
                        type: "object",
                        properties: {
                            filters: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        table: { type: "string", description: "Table name" },
                                        column: { type: "string", description: "Column name" },
                                        column_type: { type: "string", enum: ["text", "numeric", "date", "coordinate"] },
                                        values: { type: "array", items: { type: "string" }, description: "Filter values" },
                                        filter_type: {
                                            type: "string",
                                            enum: ["=", "!=", ">", "<", ">=", "<=", "between", "in", "not_in", "like", "not_like", "not_null", "not_null_nor_empty", "null_or_empty"]
                                        }
                                    },
                                    required: ["table", "column", "column_type", "values", "filter_type"]
                                }
                            }
                        },
                        required: ["filters"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getAssistantResponse",
                    description: "Use this only for off-topic questions, greetings, or when no tables/columns match.",
                    parameters: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Friendly response" }
                        },
                        required: ["message"]
                    }
                }
            }
        ];
    }

    private static resolveFields(tables: any[], modelMetadata: LogicModelMetadata): any[] {
        const currentQuery: any[] = [];
        
        for (const t of tables) {
            const table = modelMetadata.tables.find(
                (item: any) => item.table_name.toLowerCase().trim() === t.table.toLowerCase().trim()
            );
            
            if (!table) continue;
            
            for (const c of t.columns) {
                const column = table.columns.find(
                    (item: any) => item.column_name.toLowerCase().trim() === c.column.toLowerCase().trim()
                );
                
                if (!column || column.visible === false) continue;
                
                const col = { ...column };
                col.table_id = table.table_name;
                col.ordenation_type = c.ordenation_type || 'No';
                
                if (col.column_type === 'numeric') {
                    col.aggregation_type = [
                        { value: 'sum', display_name: 'Sum', selected: true },
                        { value: 'avg', display_name: 'Average' },
                        { value: 'count', display_name: 'Count' },
                        { value: 'count_distinct', display_name: 'Count Distinct' },
                        { value: 'max', display_name: 'Max' },
                        { value: 'min', display_name: 'Min' },
                        { value: 'none', display_name: 'None' }
                    ];
                } else {
                    col.aggregation_type = [
                        { value: 'none', display_name: 'None', selected: true },
                        { value: 'count', display_name: 'Count' },
                        { value: 'count_distinct', display_name: 'Count Distinct' }
                    ];
                }
                
                currentQuery.push(col);
            }
        }
        
        return currentQuery;
    }

    private static resolveFilters(filters: any[], modelMetadata: LogicModelMetadata): any[] {
        const selectedFilters: any[] = [];
        
        for (const filter of filters) {
            let filterElements: any[] = [];
            
            if (['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(filter.filter_type)) {
                filterElements = [];
            } else if (['in', 'not_in'].includes(filter.filter_type)) {
                filterElements = [{ value1: filter.values }];
            } else if (filter.filter_type === 'between') {
                filterElements = [
                    { value1: [filter.values[0]] },
                    { value2: [filter.values[1]] }
                ];
            } else {
                filterElements = [{ value1: filter.values }];
            }
            
            const filterObject = {
                isGlobal: false,
                filter_id: NlToSqlController.generateUUID(),
                filter_table: filter.table,
                filter_column: filter.column,
                filter_column_type: filter.column_type,
                filter_type: filter.filter_type,
                filter_elements: filterElements,
                selectedRange: null,
                autorelation: null,
                joins: []
            };
            
            selectedFilters.push(filterObject);
        }
        
        return selectedFilters;
    }

    private static generateUUID(): string {
        let d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    static async availableNlToSql(req: Request, res: Response, next: NextFunction) {
        try {
            const { AVAILABLE, API_KEY } = getChatgptConfig();
            const isAvailable = AVAILABLE && API_KEY && API_KEY.trim() !== '';
            
            res.status(200).json({
                ok: true,
                response: {
                    available: isAvailable
                }
            });
        } catch (err) {
            console.error(err);
            next(new HttpException(400, 'Error checking NL-to-SQL availability'));
        }
    }
}
