import { kMaxLength } from 'buffer';
import { NextFunction, Request, Response } from 'express';
import Group, { IGroup } from '../admin/groups/model/group.model'
import User, { IUser } from '../admin/users/model/user.model'
import {EnCrypterService} from '../../services/encrypter/encrypter.service'
import { userAndGroupsToMongo } from './service/usersAndGroupsToMongo';
import { Enumerations } from './service/enumerations';
import { pushModelToMongo } from './service/push.Model.to.Mongo';

import fs from "fs";
import { CleanModel } from './service/cleanModel';

const mariadb = require('mariadb');
const sinergiaDatabase = require('../../../config/sinergiacrm.config');


export class updateModel {


    /**Método que actualiza el modelo de datos de sinergiaDA de una instancia */
    static async update(req: Request, res: Response) {
        let crm_to_eda: any = {}
        let modelToExport: any = {}
        let grantedRolesAt: any = []
        let enumerator: any
        let connection: any;
        connection = await mariadb.createConnection(sinergiaDatabase.sinergiaConn);

        try {
            // Comprobamos que las tablas y columnas existan
            await updateModel.checkSinergiaModel(connection);

            //nos conectamos a la bbdd del cliente para extraer los datos y crear nuestro modelo EDA
            //seleccionamos tablas
            await connection.query(" select `table`, label , description, visible from sda_def_tables sdt  union all " +
                " select distinct  master_table  , master_table  ,master_table  ,  0 as visible " +
                " from sda_def_enumerations sde union all  " +
                " select distinct  bridge_table   , bridge_table  ,bridge_table  ,  0 as visible " +
                " from sda_def_enumerations sde  " +
                " where bridge_table  != '' ")
                .then(async (rows, err1) => {
                    if (err1) { console.log("Error getting tables list"); throw err1 }
                    let tables = rows;
                    //seleccionamos columnas
                    const my_query = " select sdc.`table`, sdc.`column`,`type`,sdc.label, sdc.description, sdc.decimals, sdc.aggregations, sdc.visible, sdc.stic_type, sdc.sda_hidden " +
                        " FROM sda_def_columns sdc " +
                        " union " +
                        " select  master_table  , master_id , 'text', master_id , master_id , 0, 'none', 0 , 'varchar', 0 " +
                        " from sda_def_enumerations sde  " +
                        " union " +
                        " select  master_table  , master_column  , 'text', master_column , master_column , 0, 'none', 0 , 'varchar', 0 " +
                        " from sda_def_enumerations sde  " +
                        " union " +
                        " select  bridge_table   , source_bridge  , 'text', source_bridge , source_bridge , 0, 'none', 0 , 'varchar', 0 " +
                        " from sda_def_enumerations sde  " +
                        " where bridge_table != '' " +
                        " union " +
                        " select  bridge_table   , target_bridge  , 'text', target_bridge , target_bridge , 0, 'none', 0 , 'varchar', 0 " +
                        " from sda_def_enumerations sde  " +
                        " where bridge_table != '' ";
                    await connection.query(my_query).then(async rows => {
                        let columns = rows;
                        // seleccionamos Relaciones
                        await connection.query(` 
                    SELECT distinct source_table, source_column, target_table, target_column, label , 0 as direccion
                    FROM sda_def_relationships
                    union 
                    SELECT target_table as source_table, target_column as source_column , 
                    source_table as target_table , source_column as target_column, label as label , 1 as direccion
                    FROM sda_def_relationships 
                    where source_table != target_table
                    union 
                    SELECT source_table , source_column  , 
                            master_table  , master_id as target_column, 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table is null or bridge_table = ''
                    union 
                    SELECT master_table  , master_id  ,
                            source_table , source_column , 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table is null or bridge_table = ''
                    union 
                    SELECT source_table , source_bridge as source_column   , 
                            bridge_table  , source_bridge, 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table   != ''
                    union 
                    SELECT bridge_table  , source_bridge,
                                source_table , source_bridge as source_column , 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table != ''
                    union 
                    SELECT bridge_table  , target_bridge,
                            master_table , master_id  , 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table != ''
                    union 
                    SELECT  master_table , master_id,
                        bridge_table  , target_bridge , 'xx-bridge|xx-bridge' , 2 as direccion
                            FROM sda_def_enumerations 
                            where bridge_table   != ''  `).then(async rows => {
                            let relations = rows;
                            //seleccionamos usuarios
                            await connection.query('SELECT name as name, user_name as email, password as password, active as active FROM  sda_def_users;')
                                .then(async users => {
                                    let users_crm = users
                                    //seleccionamos roles de EDA
                                    await connection.query('select "EDA_USER_ROLE" as role, b.name, "" as user_name  from sda_def_groups b union select "EDA_USER_ROLE" as role, g.name as name , g.user_name from sda_def_user_groups g; ')
                                        .then(async role => {
                                            let roles = role;
                                            await connection.query('  select distinct a.`table`,  "id" as  `column`,  a.`group` from  sda_def_permissions a left join sda_def_security_group_records b on a.`table`  = b.`table` and a.`group`  = b.`group` where a.`group` != ""; ' )
                                                .then(async granted => {
                                                    let grantedRoles = granted;
                                                    //seleccionamos enumeraciones
                                                    await connection.query(' select source_table , source_column , master_table, master_id, master_column, bridge_table, source_bridge, target_bridge, stic_type, info from sda_def_enumerations sde ;')
                                                        .then(async enums => {
                                                            let ennumeration = enums;
                                                            await connection.query(' select user_name as name, `table` from sda_def_permissions ')
                                                                .then(async permi => {
                                                                    let permissions = permi
                                                                    //select distinct `table`, 'id' as 'column',  `group` from sda_def_security_group_records
                                                                    await connection.query(" select distinct `table`, 'id' as `column`,  `group` from sda_def_permissions  where `group` != ''  ")
                                                                        .then(async permiCol => {
                                                                            let permissionsColumns = permiCol;
                                                                            /**Ahora que ya tengo todos los datos, monto el modelo */
                                                                            // montamos el modelo
                                                                            const query='select user_name as name, `table` as tabla , `column` as columna  from sda_def_permissions where stic_permission_source in ("ACL_ALLOW_GROUP_priv", "ACL_ALLOW_OWNER")';

                                                                            await connection.query(query)
                                                                              .then(async customUserPermissionsValue => {

                                                                                let customUserPermissions = customUserPermissionsValue

                                                                                try {
                                                                                  crm_to_eda = await userAndGroupsToMongo.crm_to_eda_UsersAndGroups(users_crm, roles)  
                                                                                } catch (e) {
                                                                                  console.log('Error 1',e);
                                                                                  res.status(500).json({'status' : 'ko'})
                                                                                }
                                                                                try {
                                                                                  grantedRolesAt = await updateModel.grantedRolesToModel(grantedRoles, tables, permissions, permissionsColumns, customUserPermissions )
                                                                                } catch (e) {
                                                                                  console.log('Error 2',e);
                                                                                  res.status(500).json({'status' : 'ko'})
                                                                                }
    
                                                                                console.log('Generando el modelo');
                                                                                
                                                                                try {
                                                                                modelToExport = updateModel.createModel(tables, columns, relations, grantedRolesAt, ennumeration, res);
                                                                                } catch (e) {
                                                                                  console.log('Error 3',e);
                                                                                  res.status(500).json({'status' : 'ko'})
                                                                                }                                                                      
                                                                              })

                                                                            connection.end()
                                                                        })
                                                                })
                                                        })
                                                })
                                        })
                                })
                        })
                    })
                    
                    // return res.status(200).json({ 'status': 'imported data ok' });
                })

        } catch (e) {
            //res.send(500)
            console.log('Error : ', e);
        }
        
    }



    /**Comprueba que las columnas y columas definidas en el model existan */
    static async checkSinergiaModel(con: any) {

        let tablas = [];
        let columns = [];
        con.query(" select sdc.`table` as tabla, sdc.`column` as `column` FROM sda_def_columns sdc")
            .then((dataset, err) => {
                if (err) { console.log('Error recuperando las tabalas a comprobar'); throw err; }
                tablas = [...new Set(dataset.map(item => item.tabla))];
                tablas.forEach(async (tabla) => {
                    columns = [...new Set(dataset.map(item => tabla === item.tabla ? item.column : null))].filter(item => item != null);
                    const sql = ' select ' + columns.toString() + ' from ' + tabla + ' limit 1   \n'
                    let nexSql = sql.replace("select ,", "select ").replace(", from", " from ");
                   // console.log(nexSql);
                    await con.query(nexSql).then((ress, errrr) => {
                        if (errrr) throw errrr;
                        //console.log(ress);
                        console.count("Query resuelta satisfactoriamente" );
                    })
                });

                ;
            }

            )

    }

    /** Genera los roles  */
    static async grantedRolesToModel(grantedRoles: any, crmTables: any, permissions: any, permissionsColumns: any, customUserPermissions: any) {
        

        const destGrantedRoles = [];
        let gr, gr2, gr3, gr4, gr5 = {};
    

        //con este permiso todos los usuarios pueden ver el modelo
        const all = {
            users: ["(~ => All)"],
            usersName: ["(~ => All)"],
            none: false,
            table: "fullModel",
            column: "fullModel",
            global: true,
            permission: true,
            type: "anyoneCanSee"
        }
      // Los permisos determinan que tablas puedo ver.
      // destGrantedRoles.push(all);

        const mongoGroups = await  Group.find();

        grantedRoles.forEach((line) => {

            let match = mongoGroups.filter(i => { return i.name === line.group })

            let mongoId: String;
            let mongoGroup: String;

            if (match.length == 1 && line.group !== undefined) {
                mongoId = match[0]._id.toString()
                mongoGroup = match[0].name.toString()

                gr = {
                    groups: [mongoId],
                    groupsName: [mongoGroup],
                    none: false,
                    table: line.table,
                    column: "fullTable",
                    global: true,
                    permission: true,
                    type: "groups"
                }

                destGrantedRoles.push(gr);

            }
        })

        grantedRoles.forEach(async (line) => {

            gr2 = {
                groups: ["135792467811111111111110"],
                groupsName: ["EDA_ADMIN"],
                none: false,
                table: line.table,
                column: "fullTable",
                global: true,
                permission: true,
                type: "groups"

                
            }
            //Evitar duplicados
            let found = false;
            try {
                found = destGrantedRoles.find(e => e.table === line.table && e.groupsName[0] === "EDA_ADMIN")
            } catch (e) { console.log( 'error finding', e) }

            if (!found) {
                destGrantedRoles.push(gr2);

            } 
        })


        const usersFound = await User.find()

        permissions.forEach(line => {

            const found = usersFound.find(i => i.email == line.name)
            if (found) {
                gr3 = {
                    users: [found._id],
                    usersName: [line.name],
                    none: false,
                    table: line.table,
                    column: "fullTable",
                    global: true,
                    permission: true,
                    type: "users"
                }
            }
            destGrantedRoles.push(gr3)

        })




        permissionsColumns.forEach(line => {

            const match = mongoGroups.filter(i => { return i.name === line.group })

            let mongoId: String;

            if (match.length == 1 && line.group !== undefined) {
                mongoId = match[0]._id.toString()


                let group_name: String = " '" + line.group + "' "
                let table_name: String = " '" + line.table + "' "
                let valueAt: String = "select record_id from sda_def_security_group_records" +
                    " where `group` = " + group_name + ' and `table` = ' + table_name

                gr4 = {

                    groups: [mongoId],
                    groupsName: [line.group],
                    none: false,
                    table: line.table,
                    column: line.column,
                    dynamic: true,
                    global: false,
                    type: "groups",
                    value: [valueAt]

                }

                destGrantedRoles.push(gr4)

            }

        })

        customUserPermissions.forEach(line => {

          const found = usersFound.find(i => i.email == line.name)

            if (found) {
              let valueAt: String = "select `"+ line.columna + "` from " + line.tabla + 
                  " where `"+ line.columna + "` = 'EDA_USER' " ;

              gr5 = {
                  users: [found._id],
                  usersName: [line.name],
                  none: false,
                  table: line.tabla,
                  column: line.columna,
                  global: false,
                  permission: true,
                  dynamic: true,
                  type: "users",
                  value: [valueAt]
              }

              destGrantedRoles.push(gr5);
            }
        })

        return destGrantedRoles;
    }


    static createModel(tables: any, columns: any, relations: any, grantedRoles: any, ennumeration: any, res: any): string[] {
    
        let visible = false ;
        
        console.log('Generating model');
    
        /** Bucle sobre las tablas */
        const destTables = [];
        for (let i = 0; i < tables.length; i++) {
    
          if (tables[i].visible == 1) {
            visible = true
          } else {
            visible = false
          }
    
          //console.log(  res[i].table ); 
          var tabla = {
            table_name: tables[i].table,
            columns: [],
            relations: [],
            display_name: {
              default: tables[i].label,
              localized: []
            },
            description: {
              default: tables[i].description,
              localized: []
            },
            visible: visible,
            table_granted_roles: [],
            table_type: [],
            tableCount: 0,
            no_relations: []
          }
     
          const destColumns: any[] = updateModel.getColumnsForTable(tables[i].table, columns, ennumeration);
          tabla.columns = destColumns;
          
    
          const destRelations: any[] = updateModel.getRelations(tables[i].table, relations);
          tabla.relations = destRelations;
    
          destTables.push(tabla);
    
        }
        
        this.extractJsonModelAndPushToMongo(destTables,  grantedRoles, res);

      
      return destTables;    
    
      }
    
      static getAggretations(aggregations: string){
        const aggArray = aggregations.split(',');
        const agg = [     ];
        if( aggArray.indexOf("sum")>=0){
          agg.push(  {  "value": "sum",    "display_name": "Suma"   } );
        }
        if( aggArray.indexOf("avg")>=0){
          agg.push(  {  "value": "avg",    "display_name": "Media"   } );
        }
        if( aggArray.indexOf("max")>=0){
          agg.push(  {  "value": "max",    "display_name": "Máximo"   } );
        }
        if( aggArray.indexOf("min")>=0){
          agg.push(  {  "value": "min",    "display_name": "Mínimo"   } );
        }
        if( aggArray.indexOf("count")>=0){
          agg.push(  {  "value": "count",    "display_name": "Cuenta Valores"   } );
        }
        if( aggArray.indexOf("count_distinct")>0){
          agg.push(  {  "value": "count_distinct",    "display_name": "Valores Distintos"   } );
        }
          agg.push(  {  "value": "none",    "display_name": "No"   } );
        return agg;
      }

      /** recupera las columnas de una tabla */
      static getColumnsForTable(table: string, columns: any, ennumeration: any) {
 
       const destColumns = [];

       const agg_none = [{
          "value": "none",
          "display_name": "no"
        }]
    
        let agg_used = {}
        //iteramos sobre columns e insertamos cada valor en su key
    
        let colVisible = false
    
        for (let i = 0; i < columns.length; i++) {
    
          let c = columns[i];
    
          //diferenciamos los agregadores por los tipos de las columnas
          if (columns[i].type) {
            agg_used = this.getAggretations( columns[i].aggregations);
          } else {
            agg_used = agg_none
          }
    
          if (columns[i].visible == 1) {
            colVisible = true
          } else {
            colVisible = false
          }
    
          if (c.table == table) {
            
            //damos los valores a cada columna
            c = {
              "column_name": columns[i].column,
              "column_type": columns[i].type=='enumeration'?'text':columns[i].type,
              "display_name": {
                "default": columns[i].label,
                "localized": []
              },
              "description": {
                "default": columns[i].description,
                "localized": []
              },
              "aggregation_type": agg_used,
              "visible": colVisible,
              "minimumFractionDigits": columns[i].decimals,
              "column_granted_roles": [],
              "row_granted_roles": [],
              "tableCount": 0,
              "valueListSource": {},
              "hidden": columns[i].sda_hidden
            }
            
            //aqui hay que añadir a cada columna su valor valueListSource según la source_table
            //1. discriminamos por tabla
            const foundTable = ennumeration.filter(j => j.source_table == table) 
            //2. discriminamos por columna y usamos el método que hemos creado para poner a cada valor en su lugar del objeto                
            foundTable.forEach(u => {
              if (u.source_column == c.column_name) {  
                c.valueListSource = Enumerations.enumeration_to_column(u)
              }
            })
            //subimos cada objeto columna a nuestro array de columnas
            destColumns.push(c)
            
          }
        }
        return destColumns;

      }
    
      /** genera las relaciones de una tabla */
      static getRelations(table: string, relations: any) {

        //  console.log('Generating relations for table:  ' + table);
        const destRelations = [];
    
        for (let i = 0; i < relations.length; i++) {
          let r = relations[i];
          if (r.source_table == table) {
            let rr = {
              "source_table": relations[i].source_table,
              "source_column": [relations[i].source_column],
              "target_table": relations[i].target_table,
              "target_column": [relations[i].target_column],
              "visible": true,
              "bridge": relations[i].label=="xx-bridge|xx-bridge"?true:false,
              "display_name": {
                "default": relations[i].direccion === 0 ? relations[i].label.split('|')[0] : relations[i].label.split('|')[1] ,
                 "localized": []
              },
              "autorelation" : relations[i].source_table === relations[i].target_table ? true : false
            }
            destRelations.push(rr);
            
          }
        }
    
        return destRelations;
    
      }
    

      
  static async extractJsonModelAndPushToMongo(tables: any,   grantedRoles: any, res: any) {
    

    //le damos formato json a nuestras tablas
    let main_model = await JSON.parse(fs.readFileSync('config/base_datamodel.json', 'utf-8'));
    main_model.ds.connection.host = sinergiaDatabase.sinergiaConn.host;
    main_model.ds.connection.database = sinergiaDatabase.sinergiaConn.database;
    main_model.ds.connection.port = sinergiaDatabase.sinergiaConn.port;
    main_model.ds.connection.user = sinergiaDatabase.sinergiaConn.user;
    main_model.ds.connection.poolLimit = sinergiaDatabase.sinergiaConn.connectionLimit;
    main_model.ds.connection.password = EnCrypterService.encrypt(sinergiaDatabase.sinergiaConn.password);
    main_model.ds.model.tables = tables; //añadimos el parámetro en la columna adecuada
    main_model.ds.metadata.model_granted_roles = await grantedRoles;
        
    try {
        const cleanM = new CleanModel; 
        main_model = await cleanM.cleanModel(main_model);
        fs.writeFile(`metadata.json`, JSON.stringify(main_model), { encoding: `utf-8` }, (err) => { if (err) {throw err} else { }})
        await new pushModelToMongo().pushModel(main_model,res);
        res.status(200).json({'status' : 'ok'})
         } catch (e) {        
            console.log('Error :',e);
            res.status(500).json({'status' : 'ko'})
        }
      
    }

  }