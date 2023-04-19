import { Request, Response } from "express";
import { Connections } from "../../config/connections";
const mariadb = require('mariadb');


export class ColumnCheck {

    public async column_check(con: any ) {

        let tablas = []
        let columns = []
 

        await  con.query(" select sdc.`table` as tabla, sdc.`column` as `column` FROM sda_def_columns sdc")
            .then((dataset, err) => {
                if (err) { console.log('Error recuperando las tabalas a comprobar'); throw err; }
                tablas = [...new Set(dataset.map(item => item.tabla))];
                tablas.forEach(tabla => {
                    columns = [...new Set(dataset.map(item => tabla === item.tabla ? item.column : null))].filter(item => item != null);
                    const sql = ' select ' + columns.toString() + ' from ' + tabla + ' limit 1   \n'
                    let nexSql = sql.replace("select ,", "select ").replace(", from", " from ");
                    con.query(nexSql).then((ress, errrr) => {
                        if (errrr) throw errrr;
                        console.count("Query resuelta satisfactoriamente");
                    })
                })
              
            }
            
            )
     
    }
}
