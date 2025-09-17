import DataSource from '../../module/datasource/model/datasource.model';
export abstract class AbstractConnection {

    config: any;
    client: any

    constructor(config: any) {
        this.config = config;
    }

    itsConnected() {
        console.log('\x1b[36m%s\x1b[0m', 'Successfully connected to ' + this.config.type + ' database! \n');
    }

    async connect() {
        try {
            await this.tryConnection();
        } catch (e) {
            throw e;
        }
    }

    abstract createTable(queryData: any, user:any): string;

    abstract generateInserts(queryData: any, user:any): string;

    abstract tryConnection(): Promise<void>;

    abstract generateDataModel(optimize: number, filters:string, name?:string): Promise<any>;

    abstract execQuery(query: string): Promise<any>;

    abstract execSqlQuery(query: string): Promise<any>;

    abstract getQueryBuilded(queryData: any, dataModel: any, user: any, limit?: any): Promise<any>;

    abstract getclient(): Promise<any>;

    abstract BuildSqlQuery(queryData: any, dataModel: any, user: any): string;

    abstract GetDefaultSchema(): string;

    normalizeType(type: string) {
        let cleanType = type.replace(/ *\([^)]*\) */g, '').toUpperCase();

        switch (cleanType) {
            case 'NUMERIC': return 'numeric';
            case 'FIXED': return 'numeric';
            case 'NUMBER': return 'numeric';
            case 'BIT': return 'numeric';
            case 'INT4': return 'numeric';
            case 'INT8': return 'numeric';
            case 'INT': return 'numeric';
            case 'INT64': return 'numeric';
            case 'INTEGER': return 'numeric';
            case 'TINYINT': return 'numeric';
            case 'SMALLINT': return 'numeric';
            case 'MEDIUMINT': return 'numeric';
            case 'BIGINT': return 'numeric';
            case 'SERIAL': return 'numeric';
            case 'DECIMAL': return 'numeric';
            case 'DEC': return 'numeric';
            case 'VARBINARY': return 'numeric';
            case 'DOUBLE': return 'numeric';
            case 'DOUBLE PRECISSION': return 'numeric';
            case 'FLOAT': return 'numeric';
            case 'FLOAT8': return 'numeric';
            case 'FLOAT16': return 'numeric';
            case 'FLOAT64': return 'numeric';
            case 'REAL': return 'numeric';
            case 'LONG': return 'numeric';
            case 'FIXED': return 'number';
            case 'DATE': return 'date';
            case 'TIMESTAMP': return 'date';
            case 'TIME': return 'date';
            case 'DATETIME': return 'date';
            case 'TIMESTAMPTZ': return 'date';
            case 'BOOL': return 'numeric';
            case 'BOOLEAN': return 'numeric';
            case 'TEXT': return 'text';
            case 'TINYTEXT': return 'text';
            case 'MEDIUMTEXT': return 'text';
            case 'LONGTEXT': return 'text';
            case 'VARCHAR': return 'text';
            case 'VARCHAR2': return 'text';
            case 'NVARCHAR': return 'text';
            case 'CHAR': return 'text';
            case 'NCHAR': return 'text';
            default: return 'text';
        }
    }

    public floatOrInt(type) {
        let cleanType = type.replace(/ *\([^)]*\) */g, '').toUpperCase();
        switch (cleanType) {

            case 'BIT': return 'int';
            case 'INT4': return 'int';
            case 'INT8': return 'int';
            case 'INT': return 'int';
            case 'INT64': return 'int';
            case 'INTEGER': return 'int';
            case 'TINYINT': return 'int';
            case 'SMALLINT': return 'int';
            case 'MEDIUMINT': return 'int';
            case 'BIGINT': return 'int';
            case 'SERIAL': return 'int';
            case 'LONG': return 'int';
            case 'VARBINARY': return 'int';
            case 'DECIMAL': return 'float';
            case 'DEC': return 'float';
            case 'DOUBLE': return 'float';
            case 'DOUBLE PRECISSION': return 'float';
            case 'FLOAT': return 'float';
            case 'FLOAT8': return 'float';
            case 'FLOAT16': return 'float';
            case 'FLOAT64': return 'float';
            case 'REAL': return 'float';
            case 'NUMERIC': return 'float';
            case 'FIXED': return 'float';
            case 'NUMBER': return 'float';
            case 'FIXED': return 'float';
            default: return 'float';

        }
    }

    public setForeignKeys(datamodel, foreignKeys) {

        const maps = this.getFkMaps(foreignKeys);
        const source = maps.source;
        const target = maps.target;

        datamodel.forEach(table => {

            const sourceNode = source.get(table.table_name);
            if (sourceNode) {
                sourceNode.forEach((fk, targetTable) => {
                    table.relations.push(
                        {
                            source_table: fk.primary_table,
                            source_column: fk.pk_columns,
                            target_table: fk.foreign_table,
                            target_column: fk.fk_columns,
                            visible: true
                        }
                    )
                })
            }

            const targetNode = target.get(table.table_name);
            if (targetNode) {
                targetNode.forEach((fk, targetTable) => {
                    table.relations.push(
                        {
                            source_table: fk.foreign_table,
                            source_column: fk.fk_columns,
                            target_table: fk.primary_table,
                            target_column: fk.pk_columns,
                            visible: true
                        }
                    )
                })
            }

        });

        return datamodel
    }

    private getFkMaps(foreignKeys: Array<any>) {

        const fkMapSource: Map<string, any> = new Map();
        const fkMapTarget: Map<string, any> = new Map();

        foreignKeys.forEach(fk => {

            /**Target */
            let node = fkMapTarget.get(fk.foreign_table);

            if (node) {
                let innerNode = node.get(fk.primary_table);
                if (innerNode) {
                    innerNode.pk_columns.push(fk.pk_column);
                    innerNode.fk_columns.push(fk.fk_column);
                } else {
                    node.set(fk.primary_table, {
                        primary_table: fk.primary_table,
                        foreign_table: fk.foreign_table,
                        pk_columns: [fk.pk_column],
                        fk_columns: [fk.fk_column],
                    })
                }

            } else {
                let innerNode = new Map();
                innerNode.set(fk.primary_table, {
                    primary_table: fk.primary_table,
                    foreign_table: fk.foreign_table,
                    pk_columns: [fk.pk_column],
                    fk_columns: [fk.fk_column],

                })
                fkMapTarget.set(fk.foreign_table, innerNode);
            }

            // /**Source */
            node = fkMapSource.get(fk.primary_table);

            if (node) {
                let innerNode = node.get(fk.foreign_table);
                if (innerNode) {
                    innerNode.pk_columns.push(fk.pk_column);
                    innerNode.fk_columns.push(fk.fk_column);
                } else {
                    node.set(fk.foreign_table, {
                        primary_table: fk.primary_table,
                        foreign_table: fk.foreign_table,
                        pk_columns: [fk.pk_column],
                        fk_columns: [fk.fk_column],
                    });
                }

            } else {
                let innerNode = new Map();
                innerNode.set(fk.foreign_table, {
                    primary_table: fk.primary_table,
                    foreign_table: fk.foreign_table,
                    pk_columns: [fk.pk_column],
                    fk_columns: [fk.fk_column],

                })
                fkMapSource.set(fk.primary_table, innerNode);
            }

        });

        return { source: fkMapSource, target: fkMapTarget }

    }

    /**
     * get relations in given model manually
     * @param dm 
     * @returns model with relations
     */
    public setRelations(dm) {
        let data_model = dm;
        let columns_map = new Map();

        /**
         * Store columns in a map, every key (column) has all tables in wich appear
         */
        data_model.forEach((table, index) => {

            table.columns.forEach(column => {

                if ((column.column_name.toLowerCase().includes('_id') ||
                    column.column_name.toLowerCase().includes('id_') ||
                    column.column_name.toLowerCase().includes('number') ||
                    column.column_name.toLowerCase().startsWith("sk") ||
                    column.column_name.toLowerCase().startsWith("tk") ||
                    column.column_name.toLowerCase().endsWith("sk") ||
                    column.column_name.toLowerCase().endsWith("tk") ||
                    column.column_name.toLowerCase().includes('code'))) {

                    let node = columns_map.get(column.column_name)
                    if (node) {

                        node.tables.push(index);
                        columns_map.set(column.column_name, node)

                    } else {
                        columns_map.set(column.column_name, { col_name: column.column_name, tables: [index] })
                    }
                }
            })
        });

        /**
         * Set relations in every table
         */
        columns_map.forEach((value, key) => {

            if (value.tables.length > 1) {

                for (let i = 0; i < value.tables.length; i++) {
                    for (let j = i + 1; j < value.tables.length; j++) {

                        let origin = data_model[value.tables[i]];
                        let dest = data_model[value.tables[j]];

                        origin.relations.push({
                            source_table: origin.table_name,
                            source_column: [value.col_name],
                            target_table: dest.table_name,
                            target_column: [value.col_name],
                            visible: true
                        });
                        dest.relations.push({
                            source_table: dest.table_name,
                            source_column: [value.col_name],
                            target_table: origin.table_name,
                            target_column: [value.col_name],
                            visible: true
                        });
                    }
                }
            }
        })

        return data_model;
    }

    /**
     * To RE-DO!!!!
     * @param dm datamodel (array with tables)
     * @returns 
     */
    public setRelations_old(dm) {
        let data_model = dm;
        let visited = [];
        // Recorrem totes les columnes de totes les taules i comparem amb totes les columnes de cada taula (menys la que estem recorrent
        // Taules
        for (let l = 0; l < data_model.length; l++) {
            visited.push(data_model[l].table_name);
            // Columnes
            for (let k = 0; k < data_model[l].columns.length; k++) {
                let sourceColumn = { source_column: data_model[l].columns[k].column_name, column_type: data_model[l].columns[k].column_type };
                // Taules
                for (let j = 0; j < data_model.length; j++) {

                    if (!visited.includes(data_model[j].table_name)) {
                        // Columnes
                        for (let i = 0; i < data_model[j].columns.length; i++) {
                            let targetColumn = { target_column: data_model[j].columns[i].column_name, column_type: data_model[j].columns[i].column_type };
                            if ((sourceColumn.source_column.toLowerCase().includes('_id') ||
                                sourceColumn.source_column.toLowerCase().includes('id_') ||
                                sourceColumn.source_column.toLowerCase().includes('number') ||
                                sourceColumn.source_column.toLowerCase().startsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().startsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().includes('code'))
                                && sourceColumn.source_column === targetColumn.target_column && sourceColumn.column_type === targetColumn.column_type) {

                                data_model[l].relations.push({
                                    source_table: data_model[l].table_name,
                                    source_column: [sourceColumn.source_column],
                                    target_table: data_model[j].table_name,
                                    target_column: [targetColumn.target_column],
                                    visible: true
                                });
                                data_model[j].relations.push({
                                    source_table: data_model[j].table_name,
                                    source_column: [targetColumn.target_column],
                                    target_table: data_model[l].table_name,
                                    target_column: [sourceColumn.source_column],
                                    visible: true
                                });
                            }
                        }
                    }
                }
            }
        }
        return data_model;
    }

    async getDataSource(id: string, properties? : string) {
        if (properties) {
            let filterProperties = JSON.parse(properties);
            let filter = {};
            for (let key in filterProperties) { 
                filter[`ds.metadata.external.${key}`] = filterProperties[key];
            }
            filter = Object.entries(filter).reduce((acc, [clave, valor]) => {
                acc[clave] = valor;
                return acc;
              }, {});
            try {
                return await DataSource.findOne({ $or : Object.entries(filter).map(([clave, valor]) => ({ [clave]: valor }))  }, (err, datasource) => {
                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
            } catch (err) {
                console.log(err)
            }
        } else {
            try {
            return await DataSource.findOne({ _id: id }, (err, datasource) => {
                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
        } catch (err) {
            console.log(err);
            throw err;
        }
        }
        
    }

}

