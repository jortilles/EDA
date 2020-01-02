const mDB = require('../src/controllers/db/mongo_queries');


const test_graph = [
    {
        name: 'A',
        rel: ['B', 'C', 'F']
    },
    {
        name: 'B',
        rel: ['A', 'E']
    },
    {
        name: 'C',
        rel: ['A', 'D', 'E']
    },
    {
        name: 'D',
        rel: ['C', 'G']
    },
    {
        name: 'E',
        rel: ['C', 'B', 'F']
    },
    {
        name: 'F',
        rel: ['A', 'G', 'E']
    },
    {
        name: 'G',
        rel: ['D', 'F', 'H']
    },
    {
        name: 'H',
        rel: ['G', 'I']
    },
    ,
    {
        name: 'I',
        rel: ['H']
    }
]


function Dijkstra(graph, origin, dest) {

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
        let min = { name: 'foo', dist: Infinity, path: [] };
        for (let i = 0; i < not_visited.length; i++) {
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
            if (v.indexOf(v.find(x => x.name === n)) != -1) {
                dest.splice(dest.indexOf(n), 1);
            }
        })

    }
    return (v);
}


//-----------------------------------------------------------------------------------------------


/**
 * HARD CODE ALERT!!!!!
 * Aqui hem d'agafar les dades del model del mongo
 * Ara posem a foc l'objecte, però es farà així des d'on decidim:  
 *  
 *  const data_model_id = await mDB.get_datasource(req.body.model_id);
 *  const json_data = JSON.parse(JSON.stringify(data_model_id));
 *  const a = [];
 *  json_data.ds.model.tables.forEach(n => {
 *     a.push({name : n.table_name, relations: n.relations});
 *    console.log('table name: ', n.table_name, '\nrelations : \n',  n.relations);
 *   })
 *  I el model que obtenim hauria de ser el següent: 
 */

db_model = [
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
    },
    {
        table_name: 'x_invoice_items',
        relations: [{
            source_table: 'x_invoice_items',
            source_column: 'invoiceid',
            target_table: 'x_invoices',
            target_column: 'invoiceid'
        }]
    }
]

//Construïm el graf: 

const graph = [];
db_model.forEach(t => {
    let relations = [];
    t.relations.forEach(r => { relations.push(r.target_table) });
    graph.push({ name: t.table_name, rel: relations });
});

/**Ara tenim el graf i també tenim la consulta que arriba per el body i és així:  */
const query = {
    fields:
        [{
            column_name: 'total',
            display_name: 'En Total',
            column_type: 'float',
            aggregation_type: 'sum',
            column_granted_roles: [],
            row_granted_roles: 'true',
            table_id: 'x_invoices',
            order: 1
        },
        {
            column_name: 'Name',
            display_name: '',
            column_type: 'varchar',
            aggregation_type: '',
            column_granted_roles: [],
            row_granted_roles: 'true',
            table_id: 'x_contacts',
            order: 2
        },
        {
            column_name: 'lineamount',
            display_name: 'average',
            column_type: 'float',
            aggregation_type: 'avg',
            column_granted_roles: [],
            row_granted_roles: 'true',
            table_id: 'x_invoice_items',
            order: 3
        }]
}

/**agafem els noms de les taules, origen i destí (és arbitrari), les columnes i el tipus d'agregació per construïr la consulta */
let columns = [];
let origin = query.fields.find(x => x.order === 1).table_id;
let dest = [];
let aggregation = false;
let grouping = [];
query.fields.forEach(e => {
    e.order != 1 && e.table_id != origin ? dest.push(e.table_id) : false;
    if (e.aggregation_type.length != 0) {
        columns.push(`${e.aggregation_type}("${e.table_id}"."${e.column_name}") as "${e.display_name}"`);
        aggregation = true;
    } else {
        columns.push(`"${e.table_id}"."${e.column_name}"`);
        grouping.push(`"${e.table_id}"."${e.column_name}"`);
    }
});

//console.log('Columns: ', columns.join(','));
//console.log('Origin: ', origin, '\nDest: ', dest);

// origin = 'A';
// dest = ['D', 'E', 'I'];

const join_tree = Dijkstra(graph, origin, dest.slice(0));
//console.log('join_tree: ', join_tree);


/**Construïm la consulta */
/* Tot el què hi ha abans dels joins: */

let my_query = `Select ${columns.join(', ')} from ${origin}`;
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

            let join_columns = findJoinColumns(e[j], e[i], db_model);
            joined.push(e[j]);
            join_string.push(`inner join "${e[j]}" on "${e[j]}"."${join_columns[1]}" = "${e[i]}"."${join_columns[0]}"`);
        }
    }
});
//console.log(join_string);

join_string.forEach(x => {
    my_query = my_query + '\n' + x;
})
if (aggregation) {
    my_query = my_query + ' group by ' + grouping.join(', ');
}

console.log(my_query);

function findJoinColumns(table_a, table_b, db_model) {
    const table = db_model.find(x => x.table_name === table_a);
    const source_column = table.relations.find(x => x.target_table === table_b).source_column;
    const target_column = table.relations.find(x => x.target_table === table_b).target_column;
    return [target_column, source_column];
}
