export interface Column {
    table_id: string;
    column_name: string;
    display_name: {default: string, ord: number, localizad: any[]};
    description: {default: string, localizad: any[]};
    old_column_type: string;
    column_type: string;
    computed_column: string; // las posibilidades son no, computed, 
    SQLexpression : string;
    column_granted_roles: string[];
    row_granted_roles: string[];
    aggregation_type: any[];
    ordenation_type: string;
    format: string;
    visible: boolean;
    minimumFractionDigits:number;
    cumulativeSum: boolean;
    valueListSource: {};
    hidden: number;
}
