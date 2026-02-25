import { Column } from './column.model';

export interface Query {
    id: string;
    model_id: string;
    user: {
        user_id: string,
        user_roles: ['USER_ROLE']
    };
    dashboard: {
        dashboard_id: string,
        panel_id: string,
        connectionProperties: any
    };
    query: {
        fields: Column[]
        filters: any[],
        simple: boolean,
        queryMode: string,
        // modeSQL: boolean, Deprecated use queryMode instead
        SQLexpression : string,
        queryLimit : number,
        groupByEnabled: boolean,
        joinType: string,
        forSelector?: boolean,
        rootTable: string,
        prediction?: string,
        predictionConfig?: {
            steps?: number,
            targetColumn?: { column_name: string, table_id: string },
            arimaParams?: { p: number, d: number, q: number },
            tensorflowParams?: { epochs: number, lookback: number, learningRate: number },
        },

    };
    output: {
        labels: any[],
        data: any[],
        config: any[]
    };
}

