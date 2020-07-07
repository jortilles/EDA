export class DataSourceModel {
    constructor(
        public connection: {
            host: string,
            port: number,
            type: string,
            user: string,
            password: string
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
    relations: Array<Relation>;
    table_type: string;
    table_granted_roles: string;
    columns: [];
    visible: boolean;
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
    column_type: string;
    parent: string;
    SQLexpression: any;
    computed_column:string;
}

export class EditModelPanel {
  type: string;
  connection: {
    type: string, host: string, database: string, user: string, password: string
  };
  metadata: {
    model_name: string, model_granted_roles: any;
  };
}

export class Relation {
    source_table: string;
    source_column: string;
    target_table: string;
    target_column: string;
    visible: boolean;
}
