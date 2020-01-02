export interface Column {
    table_id: string,
    column_name: string,
    display_name: {default: string, localizad: any[]},
    description: {default: string, localizad: any[]},
    column_type: string,
    column_granted_roles: string[],
    row_granted_roles: string[],
    aggregation_type: any[],
    ordenation_type :string,
    visible: boolean
}