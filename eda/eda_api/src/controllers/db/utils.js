exports.Dijkstra = function Dijkstra(graph, origin, dest) {
    let not_visited = [];
    let v = [];

    graph.forEach(n => {
        if (n.name !== origin) {
            not_visited.push({ name: n.name, dist: Infinity, path: [] });
        } else {
            not_visited.push({ name: n.name, dist: 0, path: [] });
        }
    });

    while (not_visited.length > 0 && dest.length > 0) {
        //let min = { name: 'foo', dist: Infinity, path: [] };
        let min = not_visited[0];
        for (let i = 1; i < not_visited.length; i++) {
            if (min.dist > not_visited[i].dist) {
                min = not_visited[i];
            }
        }

        let e = graph.filter(g => g.name === min.name)[0];
        for (let i = 0; i < e.rel.length; i++) {
            let elem = not_visited.filter(n => n.name === e.rel[i])[0];
            if (elem) {
                if (elem.dist > min.dist + 1) {
                    elem.dist = min.dist + 1;
                    min.path.forEach(p => {
                        elem.path.push(p);
                    });
                    elem.path.push(min.name);

                }
            }
        }
        v.push(min);

        let index = not_visited.indexOf(not_visited.find(x => x.name === min.name));
        if (index > -1) {
            not_visited.splice(index, 1);
        }

        dest.forEach(n => {
            if (v.indexOf(v.find(x => x.name === n)) > -1) {
                dest.splice(dest.indexOf(n), 1);
            }
        })

    }
    return (v);
};

/**
 * tables model template for buildGraph Function: 
 * [
    {
        table_name: 'x_invoices',
        relations: [{
            source_table: 'x_invoices',
            source_column: 'contact_id',
            target_table: 'x_contacts',
            target_column: 'contactid'
        },
        {
            source_table: 'x_invoices',
            source_column: 'invoiceid',
            target_table: 'x_invoice_items',
            target_column: 'invoiceid'
        }]
    },
    {
        table_name: 'x_contacts',
        relations: [{
            source_table: 'x_contacts',
            source_column: 'contactid',
            target_table: 'x_invoices',
            target_column: 'contact_id'
        }]
    }
    ]
 */
exports.buildGraph = function (db_model) {
    const graph = [];
    db_model.forEach(t => {
        let relations = [];
        t.relations.forEach(r => { relations.push(r.target_table) });
        graph.push({ name: t.table_name, rel: relations });
    });
    return graph;
};

exports.findJoinColumns = function (table_a, table_b, db_model) {
    const table = db_model.find(x => x.table_name === table_a);
    const source_column = table.relations.find(x => x.target_table === table_b).source_column;
    const target_column = table.relations.find(x => x.target_table === table_b).target_column;
    return [target_column, source_column];
};

exports.setFilterType = function (filter) {
    if (['=', '!=', '>', '<', '<=', '>=', 'like'].includes(filter)) return 0;
    else if (['not_in', 'in'].includes(filter)) return 1;
    else if (filter === 'between') return 2;
    else if (filter === 'not_null') return 3;
};

exports.setFilterString = function (filterObject, db_model) {
    let colType = this.findColumnType(filterObject.filter_table, filterObject.filter_column, db_model);
    switch (this.setFilterType(filterObject.filter_type)) {
        case 0:
            if (filterObject.filter_type === '!=') { filterObject.filter_type = '<>' }
            if (filterObject.filter_type === 'like') {
                return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} '%${filterObject.filter_elements[0].value1}%' `;
            }

            return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} ${this.processFilter(filterObject.filter_elements[0].value1, colType)} `;
        case 1:
            if (filterObject.filter_type === 'not_in') { filterObject.filter_type = 'not in' }
            return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} (${this.processFilter(filterObject.filter_elements[0].value1, colType)}) `;
        case 2:
            return `"${filterObject.filter_table}"."${filterObject.filter_column}"  ${filterObject.filter_type} 
                        ${this.processFilter(filterObject.filter_elements[0].value1, colType)} and ${this.processFilter(filterObject.filter_elements[1].value2, colType)}`;
        case 3:
            return `"${filterObject.filter_table}"."${filterObject.filter_column}" is not null`;
    }
};

exports.findColumnType = function (table, column, db_model) {
    let tmp_table = db_model.find(t => t.table_name === table);
    return tmp_table.columns.find(c => c.column_name === column).column_type;
};

exports.processFilter = function (filter, columnType) {
    filter = filter.map(elem => {
        if(elem === null || elem === undefined)  return 'ihatenulos'
        else return elem
    });
    if (!Array.isArray(filter)) {
        switch (columnType) {
            case 'varchar': return `'${filter}'`;
            case 'text': return `'${filter}'`;
            case 'numeric': return filter;
            case 'date': return `to_date('${filter}','YYYY-MM-DD')`
        }
    }else{
        let str = '';
        filter.forEach(value => {
            let tail = columnType === 'date' ? `to_date('${value}','YYYY-MM-DD')` : 
                       columnType === 'numeric' ? value : `'${value.replace(/'/g, "''")}'` 
            str = str + tail + ','
        });
        return str.substring(0, str.length - 1);
    }
};
