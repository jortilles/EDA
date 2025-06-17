import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';
import { Column, Query } from '@eda/models/model.index';

export interface QueryParams {
    table: string;
    dataSource: string;
    dashboard?: string;
    panel?: string;
    filters?: any[];
    config?: any;
    queryLimit? : number;
    joinType?:string;
    forSelector?: boolean;
    rootTable?: string;
    sortedFilters?: any[];
}

@Injectable()
export class QueryBuilderService extends ApiService {

    constructor(
        protected http: HttpClient) {
        super(http);
    }

    public simpleQuery(column: Column, params: QueryParams): Query {
        const labels = [];
        const queryColumns = [];
        const col: any = {};
        col.table_id = params.table;
        col.column_name = column.column_name;
        col.display_name = column.display_name.default;
        col.column_type = column.column_type;
        col.old_column_type = column.old_column_type || column.column_type;
        col.computed_column = column.computed_column;
        col.SQLexpression = column.SQLexpression;
        col.aggregation_type = column.aggregation_type.filter(ag => ag.selected === true);
        col.aggregation_type = col.aggregation_type[0] ? col.aggregation_type[0].value : 'none';
        col.ordenation_type = column.ordenation_type;
        col.format = column.format;
        col.minimumFractionDigits = column.minimumFractionDigits;
        col.order = 0;
        col.column_granted_roles = column.column_granted_roles;
        col.row_granted_roles = column.row_granted_roles;
        queryColumns.push(col);

        return {
            id: '1',
            model_id: params.dataSource,
            user: {
                user_id: sessionStorage.getItem('id'),
                user_roles: ['USER_ROLE']
            },
            dashboard: {
                dashboard_id: params.dashboard,
                panel_id: params.panel,
            },
            query: {
                fields: queryColumns,
                filters: [],
                simple: true,
                // modeSQL : false,
                queryMode: 'EDA',
                SQLexpression : null,
                queryLimit : null,
                joinType: 'left', //puede que necesite el joinType
                rootTable: null,
                sortedFilters: [],
            },
            output: {
                labels,
                data: [],
                config: []
            }
        };
    }


    public normalQuery(select: any[], params: QueryParams, queryMode: string = 'EDA' , SQLexpression?: string): Query {
        const labels = [];
        const queryColumns = [];
        for (let i = 0, n = select.length; i < n; i += 1) {
            const col: any = {};
            col.table_id = select[i].table_id || params.table; //DropDowns has only table + params, no select
            col.column_name = select[i].column_name;
            col.display_name = select[i].display_name.default;
            col.column_type = select[i].column_type;
            col.old_column_type = select[i].old_column_type || select[i].column_type;
            col.computed_column = select[i].computed_column;
            col.SQLexpression = select[i].SQLexpression;
            col.aggregation_type = select[i].aggregation_type.filter(ag => ag.selected === true);
            col.aggregation_type = col.aggregation_type[0] ? col.aggregation_type[0].value : 'none';
            col.ordenation_type = select[i].ordenation_type;
            col.format = select[i].format;
            col.order = i;
            col.column_granted_roles = select[i].column_granted_roles;
            col.row_granted_roles = select[i].row_granted_roles;
            col.tableCount = select[i].tableCount;
            col.minimumFractionDigits = select[i].minimumFractionDigits;
            col.cumulativeSum = select[i].cumulativeSum;
            col.valueListSource = select[i].valueListSource;
            col.whatif_column = select[i].whatif_column || false;
            col.whatif = select[i].whatif;
            col.joins = select[i].joins || [];
            col.autorelation = select[i].autorelation;
            col.ranges = select[i].ranges || [];
            queryColumns.push(col);
            labels.push(select[i].column_name);
        }


        const filters = params.filters.filter((f) => 
            (f.filter_elements[0]?.value1 && f.filter_elements[0].value1.length !== 0) 
            || ['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(f.filter_type)
        );

        return {
            id: '1',
            model_id: params.dataSource,
            user: {
                user_id: sessionStorage.getItem('id'),
                user_roles: ['USER_ROLE']
            },
            dashboard: {
                dashboard_id: params.dashboard,
                panel_id: params.panel
            },
            query: {
                fields: queryColumns,
                filters,
                simple: false,
                queryMode,
                // modeSQL : modeSQL,
                SQLexpression : SQLexpression,
                queryLimit : params.queryLimit,
                joinType: params.joinType,
                forSelector: params.forSelector,
                rootTable: params.rootTable,
                sortedFilters: params.sortedFilters,
            },
            output: {
                labels,
                data: [],
                config: params.config
            }

        };
    }

}
