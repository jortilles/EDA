import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface NlToSqlOptions {
    mode?: 'direct' | 'query-object' | 'hybrid';
    include_explanation?: boolean;
    validate_sql?: boolean;
}

export interface NlToSqlRequest {
    naturalLanguage: string;
    logicModel?: LogicModelMetadata;
    dataSource_id?: string;
    options?: NlToSqlOptions;
}

export interface LogicModelMetadata {
    tables: TableSchema[];
    connection_type: 'postgres' | 'mysql' | 'sqlserver' | 'oracle' | 'bigquery' | 'snowflake' | 'clickhouse';
    schema?: string;
    database?: string;
}

export interface TableSchema {
    table_name: string;
    display_name?: { default: string; localized?: any[] };
    description?: { default: string; localized?: any[] };
    columns: ColumnSchema[];
    relations?: RelationSchema[];
}

export interface ColumnSchema {
    column_name: string;
    display_name?: { default: string; localized?: any[] };
    description?: { default: string; localized?: any[] };
    column_type: 'text' | 'numeric' | 'date' | 'coordinate' | 'boolean' | 'html';
    visible?: boolean;
}

export interface RelationSchema {
    source_column: string;
    target_table: string;
    target_column: string;
}

export interface DirectSqlResult {
    mode: 'direct';
    sql: string;
    explanation: string;
    tables_used: string[];
    columns_used: string[];
    assumptions: string[];
    warnings: string[];
    db_type: string;
    raw_response?: string;
}

export interface QueryObjectResult {
    mode: 'query-object';
    currentQuery: any[];
    selectedFilters: any[];
    principalTable: string | null;
    queryLimit: number;
    explanation: string;
    raw_response?: any;
}

export interface HybridResult {
    mode: 'hybrid';
    query_object: QueryObjectResult;
    direct_sql: DirectSqlResult;
    recommended: 'query-object' | 'direct';
}

export type NlToSqlResult = DirectSqlResult | QueryObjectResult | HybridResult;

@Injectable({
    providedIn: 'root'
})
export class NlToSqlService extends ApiService {

    private readonly route = '/nl-to-sql';

    generateSql(request: NlToSqlRequest): Observable<{ ok: boolean; response: NlToSqlResult }> {
        return this.post(`${this.route}/generate`, request) as Observable<{ ok: boolean; response: NlToSqlResult }>;
    }

    available(): Observable<{ ok: boolean; response: { available: boolean } }> {
        return this.get(`${this.route}/available`) as Observable<{ ok: boolean; response: { available: boolean } }>;
    }

    generateSqlWithDataSource(
        naturalLanguage: string,
        dataSource_id: string,
        options?: NlToSqlOptions
    ): Observable<{ ok: boolean; response: NlToSqlResult }> {
        return this.generateSql({
            naturalLanguage,
            dataSource_id,
            options
        });
    }

    generateSqlWithLogicModel(
        naturalLanguage: string,
        logicModel: LogicModelMetadata,
        options?: NlToSqlOptions
    ): Observable<{ ok: boolean; response: NlToSqlResult }> {
        return this.generateSql({
            naturalLanguage,
            logicModel,
            options
        });
    }
}
