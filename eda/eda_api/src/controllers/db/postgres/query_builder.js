const U = require('../utils');
const mBD = require('../mongo_queries');


exports.query = async (data_model, req_query) => {
    const query = req_query.fields;
    const my_model = data_model.ds.model.tables;
    const graph = U.buildGraph(my_model);
    /**agafem els noms de les taules, origen i destí (és arbitrari), les columnes i el tipus d'agregació per construïr la consulta */
    let columns = [];
    let origin = query.find(x => x.order === 0).table_id;
    let filterTables = req_query.filters.map(filter => filter.filter_table);
    let dest = [];
    let grouping = [];
    //afegim a dest les taules dels filtres
    filterTables.forEach(table => {
        if (!dest.includes(table) && table !== origin) {
            dest.push(table);
        }
    });
    query.forEach(e => {
        e.order != 0 && e.table_id != origin && !dest.includes(e.table_id) ? dest.push(e.table_id) : false;

        if (e.aggregation_type != 'none') {
            if (e.aggregation_type === 'count_distinct') {
                columns.push(`trunc( count( distinct "${e.table_id}"."${e.column_name}")::numeric, 2)::float as "${e.display_name}"`);
            } else {

                columns.push(`trunc(${e.aggregation_type}("${e.table_id}"."${e.column_name}")::numeric, 2)::float as "${e.display_name}"`);
            }
        } else {
            if (e.column_type === 'numeric') {
                columns.push(`trunc("${e.table_id}"."${e.column_name}"::numeric, 2)::float as "${e.display_name}"`);
            } else if (e.column_type === 'date') {
                columns.push(`to_char("${e.table_id}"."${e.column_name}", 'YYYY-MM-DD') as "${e.display_name}"`);
            } else {
                columns.push(`"${e.table_id}"."${e.column_name}" as "${e.display_name}"`);
            }
            grouping.push(`"${e.table_id}"."${e.column_name}"`);
        }
    });

    const join_tree = U.Dijkstra(graph, origin, dest.slice(0));
    //console.log('join_tree: ', join_tree);


    /**Construïm la consulta */

    /* Tot el què hi ha abans dels joins ó consulta simple per agafar els camps al dropdown*/
    if (req_query.simple === true) {
        return `Select distinct ${columns.join(', ')} \nfrom ${origin} `;
    }
    let my_query = `Select ${columns.join(', ')} \nfrom ${origin} `;
    //console.log(my_query);

    /** joins */
    let joins = [];

    for (let i = 0; i < dest.length; i++) {
        let elem = join_tree.find(n => n.name === dest[i]);
        let tmp = [];
        elem.path.forEach(parent => {
            tmp.push(parent);
        })
        tmp.push(elem.name);
        joins.push(tmp);
    }

    let joined = [];
    let join_string = [];
    joins.forEach(e => {

        for (let i = 0; i < e.length - 1; i++) {
            j = i + 1;
            if (!joined.includes(e[j])) {

                let join_columns = U.findJoinColumns(e[j], e[i], my_model);
                joined.push(e[j]);
                join_string.push(`inner join "${e[j]}" on "${e[j]}"."${join_columns[1]}" = "${e[i]}"."${join_columns[0]}"`);
            }
        }
    });

    //console.log(join_string);
    join_string.forEach(x => {
        my_query = my_query + '\n' + x;
    })

    //FILTERS ------------------------------------------------------
    const filters = req_query.filters;
    if (filters.length) {
        let filters_string = '\nwhere 1 = 1 ';
        filters.forEach(f => {
            if(f.filter_type === 'not_null'){
                filters_string += '\nand ' + U.setFilterString(f, my_model);
            }else{
                let nullValueIndex = f.filter_elements[0].value1.indexOf(null);
                if(nullValueIndex != - 1){
                    if(f.filter_elements[0].value1.length === 1){
                        filters_string += `\nand "${f.filter_table}"."${f.filter_column}"  is null `;
                    }else{
                        filters_string += `\nand (${U.setFilterString(f, my_model)} or "${f.filter_table}"."${f.filter_column}"  is null) `
                    }
                }else{
    
                    filters_string += '\nand ' + U.setFilterString(f, my_model);
                }
            }

        });
        my_query += filters_string;
    }


    //Grouping ------------------------------------------------------
    if (grouping.length > 0) {
        my_query = my_query + '\ngroup by ' + grouping.join(', ');
    }
    my_query = my_query;

    //ORDER BY---------------------------------------------------------

    let order_columns = req_query.fields.map(col => {

        console.log(` Generating query at query builder sorting by  ${col.display_name} ${col.ordenation_type} `);
        let out = "";
        if (col.ordenation_type != 'No' && col.ordenation_type != undefined) {
            out = `"${col.display_name}" ${col.ordenation_type}`
        } else {
            out = false;
        }
        return out;
    }).filter(e => e != false);
    order_columns_string = order_columns.join(',');
    if (order_columns_string.length > 0) {
        my_query = `${my_query}\norder by ${order_columns_string}`;
    }
    return my_query;

}
