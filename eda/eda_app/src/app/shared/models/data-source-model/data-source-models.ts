export class DataSourceModel {
    constructor(
        public connection: {
            host: string,
            port: number,
            type: string,
            user: string,
            password: string,
            poolLimit: number
        },
        public metadata: {
            model_name: string,
            model_id: string
        },
        public model: {
            tables: any[]
        }
    ) { }
}

export class EditTablePanel {
    type: string;
    name: string;
    technical_name: string;
    description: string;
    query:string;
    relations: Array<Relation>;
    table_type: string;
    table_granted_roles: string;
    columns: [];
    visible: boolean;
    ia_visibility?: string;
}

export class EditColumnPanel {
    type: string;
    name: string;
    technical_name: string;
    description: string;
    aggregation_type: any[];
    column_granted_roles: string;
    row_granted_roles: string;
    visible: boolean;
    ia_visibility: string;
    column_type: string;
    parent: string;
    SQLexpression: any;
    computed_column:string;
    minimumFractionDigits:number;
    valueListSource:ValueListSource;
}

export class EditModelPanel {
    type: string;
    connection: {
        type: string,
        host: string,
        database: string,
        user: string,
        password: string,
        schema: string,
        port: number,
        warehouse: string,
        sid: number,
        poolLimit?: number,
        ssl?: Boolean
    };
    metadata: {
        model_name: string,
        model_description: string,
        model_granted_roles: any,
        cache_config,
        filter: string,
        tags: any,
        ia_visibility: string
    };
}

export class Relation {
    source_table: string;
    source_column: Array<any>;
    target_table: string;
    target_column: Array<any>;
    display_name?: {};
    visible: boolean;
}

export class ValueListSource {
    source_table: string;
    source_column: string;
    target_table: string;
    target_id_column: string;
    target_description_column: string;
}
