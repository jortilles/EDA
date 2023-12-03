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
        panel_id: string
    };
    query: {
        fields: Column[]
        filters: any[],
        simple: boolean,
        modeSQL: boolean,
        SQLexpression : string,
        queryLimit : number,
        joinType: string,
        forSelector?: boolean ;

    };
    output: {
        labels: any[],
        data: any[],
        config: any[]
    };
}

