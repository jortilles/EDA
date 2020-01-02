const { Pool, Client } = require('pg');
const mDB = require('../mongo_queries');
const DataSource = require('../../../models/global/data-source-model');

/** Generates datamodel **/
exports.generate_datamodel = async (req) => {
    const cn = {
        user: req.body.user,
        host: req.body.host,
        database: req.body.database,
        password: req.body.password,
        port: req.body.port
    }
    const pool = new Pool(cn);
    const client = await pool.connect();
    const query_tables = `SELECT table_name  FROM information_schema.tables WHERE table_type = 'BASE TABLE'  AND table_schema NOT IN ('pg_catalog', 'information_schema')
                            union all select table_name  from information_schema."views" where table_schema NOT IN ('pg_catalog', 'information_schema');`;
    const getResults = await client.query(query_tables);
    let table_names = [];
    let tables = [];

    getResults.rows.forEach(async r => {
        //const output = Object.keys(r).map(i => r[i]);
        let table_name = r['table_name'];
        table_names.push(table_name);
    });

    //get column names and types
    for (let i = 0; i < table_names.length; i++) {
        try {
            let new_table = await set_table(table_names[i], client);
            tables.push(new_table);

        } catch (e) {
            throw e;
        }
    }

    for (let i = 0; i < tables.length; i++) {
        for (let j = 0; j < tables[i].columns.length; j++) {
            tables[i].columns[j] = set_columns(tables[i].columns[j]);
        };
    }
    tables = await commonColumns(tables);
    const ds = {
        connection: {
            type: req.body.type,
            host: req.body.host,
            port: req.body.port,
            database: req.body.database,
            schema: req.body.schema,
            user: req.body.user,
            password: req.body.password
        },
        metadata: {
            model_name: req.body.name,
            model_id: "",
            model_granted_roles: []
        },
        model: {
            tables: tables
        }
    };
    client.release(true);
    return ds;
}

async function commonColumns(dm) {
    let data_model = dm;
    let visited = [];
    //Recorrem totes les columnes de totes les taules i comparem amb totes les columnes de cada taula (menys la que estem recorrent
    //taules
    for (let l = 0; l < data_model.length; l++) {
        visited.push(data_model[l].table_name);
        //columnes
        for (let k = 0; k < data_model[l].columns.length; k++) {
            let sourceColumn = { source_column: data_model[l].columns[k].column_name, column_type: data_model[l].columns[k].column_type };
            //taules
            for (let j = 0; j < data_model.length; j++) {

                if (!visited.includes(data_model[j].table_name)) {
                    //columnes
                    for (let i = 0; i < data_model[j].columns.length; i++) {
                        let targetColumn = { target_column: data_model[j].columns[i].column_name, column_type: data_model[j].columns[i].column_type };
                        if ((sourceColumn.source_column.includes("_id") ||
                            sourceColumn.source_column.includes("number") ||
                            sourceColumn.source_column.includes("code"))
                            && sourceColumn.source_column === targetColumn.target_column && sourceColumn.column_type === targetColumn.column_type) {

                            // FER EL CHECK AMB ELS INNER JOINS ---- DESHABILITAT (Masses connexions a la db)
                            let a = true //await checkJoins(pool, data_model[l].table_name, sourceColumn.source_column, data_model[j].table_name, targetColumn.target_column);

                            if (a) {
                                data_model[l].relations.push({
                                    source_table: data_model[l].table_name,
                                    source_column: sourceColumn.source_column,
                                    target_table: data_model[j].table_name,
                                    target_column: targetColumn.target_column,
                                    visible: true
                                });
                                data_model[j].relations.push({
                                    source_table: data_model[j].table_name,
                                    source_column: targetColumn.target_column,
                                    target_table: data_model[l].table_name,
                                    target_column: sourceColumn.source_column,
                                    visible: true
                                });
                            }
                        }
                    };
                }
            };
        };
    };
    return data_model;
}

async function set_table(table_name, pool) {
    const query_columns = `select column_name, udt_name as column_type from INFORMATION_SCHEMA.COLUMNS where table_name = '${table_name}';`
    try {
        const get_columns = await pool.query(query_columns);
        const new_table = {
            table_name: table_name,
            display_name: {
                "default": normalizeName(table_name),
                "localized": []
            },
            description: {
                "default": `${normalizeName(table_name)}`,
                "localized": []
            },
            table_granted_roles: [],
            table_type: [],
            columns: get_columns.rows,
            relations: [],
            visible: true
        };
        return new_table;
    } catch (err) {
        throw err;
    }
}
function set_columns(c) {
    let column = c;
    column.display_name = { default: normalizeName(column.column_name), localized: [] };
    column.description = { default: normalizeName(column.column_name), localized: [] };
    column.column_type = normalizeType(column.column_type) || column.column_type;

    column.column_type === 'numeric' ? column.aggregation_type = [
        { value: 'sum', display_name: 'sum' },
        { value: 'avg', display_name: 'avg' },
        { value: 'max', display_name: 'max' },
        { value: 'min', display_name: 'min' },
        { value: 'count', display_name: 'count' },
        { value: 'count_distinct', display_name: 'count distinct' },
        { value: 'none', display_name: 'no' }] :
        column.aggregation_type = [{ value: 'none', display_name: 'no' }];
    column.column_granted_roles = [];
    column.row_granted_roles = [];
    column.visible = true;
    return column;
}


function normalizeName(name) {
    let out = name.split('_').join(' ');
    return out.toLowerCase()
        .split(' ')
        .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
        .join(' ');
}

function normalizeType(type) {
    switch (type) {
        case 'int4': return 'numeric';
        case 'int8': return 'numeric';
        case 'smallint': return 'numeric';
        case 'serial': return 'numeric';
        case 'decimal': return 'numeric';
        case 'float8': return 'numeric';
        case 'float16': return 'numeric';
        case 'real': return 'numeric';
        case 'timestamp': return 'date';
        case 'time': return 'date';
        case 'TIMESTAMPTZ': return 'date';
        case 'bool': return 'boolean';
    }
}


/**
 * Merges two DBmodels resulting in one updated model
 * dbModel prevails over mongo Stored db in case of conflict
 * 
 */

exports.update_model = async (model_id, dbModel) => {
 
    try {

        const dm = await mDB.get_datasource(model_id);
        let stored_data_model = JSON.parse(JSON.stringify(dm));
       
        let out = find_and_update(dbModel.model.tables, stored_data_model.ds.model.tables);
        out = find_and_delete(dbModel.model.tables, out);

        return out;
    } catch (err) {
        console.log(err);
        throw err;
    }
}

/**
 * Helper function, adds new tables and columns from realDB  to stored DB
 * @param {*} reference_model 
 * @param {*} updated_model 
 */
function find_and_update(reference_model, updated_model) {
    reference_model.forEach(r_table => {
        let u_table = updated_model.filter(t => t.table_name === r_table.table_name);
        if (u_table.length) {
            let column = [];
            r_table.columns.forEach(r_column => {
                column = u_table[0].columns.filter(c => {
                    return c.column_name === r_column.column_name;
                })
                if (!column.length) {

                    u_table[0].columns.push(r_column);
                }
            });
            u_table[0].relations = r_table.relations;
        } else {
            updated_model.push(r_table);
        }
    });
    return updated_model;
}


/**
 * Helper function -> deletes tables or columns not present in db
 * @param {*} reference_model 
 * @param {*} updated_model 
 */
function find_and_delete(reference_model, updated_model) {
    out = updated_model;
    out.forEach(u_table => {
        let r_table = reference_model.filter(t => t.table_name === u_table.table_name);
        if (r_table.length) {
            let column = [];
            u_table.columns.forEach(u_column => {
                column = r_table[0].columns.filter(c => c.column_name === u_column.column_name);
                if (!column.length) {
                    u_table.columns = u_table.columns.filter(c => c.column_name != u_column.column_name);
                }
            });
        } else {

            out = out.filter(t => t.table_name != u_table.table_name);
        }
    });
    return out;
}


/**Updates a mongoDB model */
exports.updateMongoModel = (id, tables, res) => {
    DataSource.findById(id, (err, dataSource) => {
        if (err) {
            return res.status(500).send(
                new ERROR(false, 'DataSource not found', err)
            );
        }

        if (!dataSource) {
            return res.status(400).send(
                new ERROR(false, `DataSource not exist with id ${id}`, err)
            );
        }
        dataSource.ds.model.tables = tables;
        iDataSource = new DataSource( dataSource);
        iDataSource.save((err, dS) => {
            if (err) {
                return res.status(400).json(
                    new ERROR(false, `Error updating dataSource : ${dS}`, err)
                );
            }
            return res.status(200).json({
                ok: true,
                message: tables
            });
        })
    });
}



//Not implemented
async function checkJoins(pool, table_a, column_a, table_b, column_b) {
    try {
        const client = await pool.connect();
        let count = await client.query(`select  count(distinct  "${table_a}"."${column_a}") from "${table_a}" 
                                        inner join "${table_b}" on "${table_a}"."${column_a}" = "${table_b}"."${column_b}"`);
        client.release(true);

        return count > 0 ? true : false;

    } catch (e) {
        console.log(e);
        throw e;
    }
}