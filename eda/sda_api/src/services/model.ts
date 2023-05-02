
import { Request, Response } from 'express';
import fs from "fs"
const mariadb = require('mariadb');
import { EnCrypterService } from './encrypter.service';
import {UserModel} from '../database/models/users'
import { Connections } from '../config/connections';
import { ExportMongoData } from '../database/export.mongoGroups';
import { pushModelToMongo } from '../database/push.Model.to.Mongo';
import { ColumnCheck } from '../database/services/sinergiaCRM.column.check';

//import { deploy } from './deploy';

import { userAndGroupsToMongo } from './usersAndGroupsToMongo';
import { Enumerations } from './enumerations';

export class model {

  //1. primero checkeamos que la columna y tablas sean correctas

  //2. creamos el modelo
  /**Update model genera un modelo de datos nuevo. */
  static async update(req: Request, res: Response) {

    //deploy.execute(req);

    let crm_to_eda: any = {}
    let modelToExport: any = {}
    let grantedRolesAt: any = []
    let enumerator: any
    let connection: any;
    

    const connector = new Connections().connector(req);
    connection = await mariadb.createPool(connector);
    const md =  new Connections();

    try {
     await md.mongoEdaConnect(req)
    } catch (err) {
      if (err) throw err
      console.log("no conectado")
    } 
    
    try{
      // Comprobamos que las tablas y columnas existan
      await  new ColumnCheck().column_check(connection);
  
      //nos conectamos a la bbdd del cliente para extraer los datos y crear nuestro modelo EDA
      //seleccionamos tablas
      await connection.query(" select `table`, label , description, visible from sda_def_tables sdt  union all "+
                              " select distinct  master_table  , master_table  ,master_table  ,  0 as visible "+
                              " from sda_def_enumerations sde union all  "+
                              " select distinct  bridge_table   , bridge_table  ,bridge_table  ,  0 as visible "+
                              " from sda_def_enumerations sde  "+
                              " where bridge_table  != '' " )
        .then(async (rows, err1) => {
          if (err1) { console.log("Error getting tables list"); throw err1 }
          let tables = rows;
          
          //seleccionamos columnas
          const my_query = " select sdc.`table`, sdc.`column`,`type`,sdc.label, sdc.description, sdc.decimals, sdc.aggregations, sdc.visible, sdc.stic_type " + 
                            " FROM sda_def_columns sdc " + 
                            " union " + 
                            " select  master_table  , master_id , 'text', master_id , master_id , 0, 'none', 0 , 'varchar' " + 
                            " from sda_def_enumerations sde  " + 
                            " union " + 
                            " select  master_table  , master_column  , 'text', master_column , master_column , 0, 'none', 0 , 'varchar' " + 
                            " from sda_def_enumerations sde  " + 
                            " union " + 
                            " select  bridge_table   , source_bridge  , 'text', source_bridge , source_bridge , 0, 'none', 0 , 'varchar' " + 
                            " from sda_def_enumerations sde  " + 
                            " where bridge_table != '' " + 
                            " union " + 
                            " select  bridge_table   , target_bridge  , 'text', target_bridge , target_bridge , 0, 'none', 0 , 'varchar' " + 
                            " from sda_def_enumerations sde  " + 
                            " where bridge_table != '' " ;
          await connection.query(my_query)
            .then(async rows => {
              let columns = rows;
              // seleccionamos Relaciones
              await connection.query(` 
              SELECT distinct source_table, source_column, target_table, target_column 
              FROM sda_def_relationships
              union 
              SELECT target_table as source_table, target_column as source_column , 
              source_table as target_table , source_column as target_column
              FROM sda_def_relationships 
              union 
               SELECT source_table , source_column  , 
                      master_table  , master_id as target_column
                      FROM sda_def_enumerations 
                      where bridge_table is null or bridge_table = ''
              union 
               SELECT master_table  , master_id  ,
                      source_table , source_column  
                      FROM sda_def_enumerations 
                      where bridge_table is null or bridge_table = ''
              union 
               SELECT source_table , source_bridge as source_column   , 
                      bridge_table  , source_bridge
                      FROM sda_def_enumerations 
                      where bridge_table   != ''
              union 
               SELECT bridge_table  , source_bridge,
                        source_table , source_column  
                      FROM sda_def_enumerations 
                      where bridge_table != ''
              union 
               SELECT bridge_table  , target_bridge,
                       master_table , master_id  
                      FROM sda_def_enumerations 
                      where bridge_table != ''
              union 
               SELECT  master_table , master_id,
                   bridge_table  , target_bridge 
                      FROM sda_def_enumerations 
                      where bridge_table   != ''  `)
                .then(async rows => {
                  let relations = rows;
                  //seleccionamos usuarios
                  await connection.query('SELECT name as name, user_name as email, password as password, active as active FROM  sda_def_users;')
                    .then(async users => {
                      let users_crm = users
                      //seleccionamos roles de EDA
                      await connection.query('select "EDA_USER_ROLE" as role, g.name as name , g.user_name from sda_def_user_groups g;')
                        .then(async role => {
                          let roles = role;
                          await connection.query('  SELECT DISTINCT  a.`table`, a.`group`  FROM sda_def_security_group_records a  inner join sda_def_user_groups  b on a.`group`  = b.name   inner join   sda_def_tables t on a.`table`  = t.`table`  ')
                            .then(async granted => {
                              let grantedRoles = granted;
                                //seleccionamos enumeraciones
                                await connection.query( ' select source_table , source_column , master_table, master_id, master_column, bridge_table, source_bridge, target_bridge, stic_type, info from sda_def_enumerations sde ;')
                                .then ( async enums => {
                                  let ennumeration = enums;
                                    await connection.query( ' select user_name as name, `table` from sda_def_permissions  ')
                                    .then ( async permi => {
                                      let permissions = permi
                                      //select distinct `table`, 'id' as 'column',  `group` from sda_def_security_group_records where 
                                      await connection.query( "select distinct `table`, 'id' as 'column',  `group` from sda_def_security_group_records ")
                                      .then (async permiCol => {
                                          let permissionsColumns = permiCol
                                

                              /**Ahora que ya tengo todos los datos, monto el modelo */
                              // montamos el modelo
                              
                              console.log('Recuperando usuarios');
                              crm_to_eda = await userAndGroupsToMongo.crm_to_eda_UsersAndGroups(users_crm, roles)
                                                           
                              console.log('Recuperando roles');
                              grantedRolesAt = await model.grantedRolesToModel(grantedRoles, tables, permissions, permissionsColumns)
                        
                              console.log('Generando el modelo');
                              modelToExport = model.createModel(tables, columns, relations, grantedRolesAt, ennumeration, connector);
                                  

                              connection.end()
                                  })
                                })
                              })
                            })
                        })
                    })
                })
            }

            )
        
          return res.status(200).json({ 'status': 'ok' });
        })
        .catch(err => {
          //ESTE ERROR SALTA!!!
          console.log("error getting rows");
          console.log(err);
          connection.end()
          return res.status(200).json({ 'status': 'ko' });
        })

      }finally{

       // if (connection)  connection.end(); ---------------------> POOL IS ALREADY CLOSED
      }

     
      // se comenta porque si no peta y no publica el modelo.
      //md.mongoEdaDisconnect().catch(e => { if (e) throw e })
      
  }

  static getColumnsForTable(table: string, columns: any, ennumeration: any) {
    
    
    const destColumns = [];
    

    const agg_num = [
      {
        "value": "sum",
        "display_name": "Suma"
      },
      {
        "value": "avg",
        "display_name": "Media"
      },
      {
        "value": "max",
        "display_name": "Máximo"
      },
      {
        "value": "min",
        "display_name": "Mínimo"
      },
      {
        "value": "count",
        "display_name": "Cuenta Valores"
      },
      {
        "value": "count_distinct",
        "display_name": "Valores Distintos"
      },
      {
        "value": "none",
        "display_name": "no"
      }
    ]
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
      if (columns[i].type === "numeric") {
        agg_used = agg_num
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
          "decimals": columns[i].decimals,
          "aggregation_type": agg_used,
          "visible": colVisible,
          "minimumFractionDigits": 0,
          "column_granted_roles": [],
          "row_granted_roles": [],
          "tableCount": 0,
          "valueListSource": {}
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
          "visible": true
        }
        destRelations.push(rr);
      }
    }

    return destRelations;

  }

  static createModel(tables: any, columns: any, relations: any, grantedRoles: any, ennumeration: any, connector: any): string[] {
    
    let visible = false 
    
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
 
      const destColumns: any[] = model.getColumnsForTable(tables[i].table, columns, ennumeration);
      tabla.columns = destColumns;
      

      const destRelations: any[] = model.getRelations(tables[i].table, relations);
      tabla.relations = destRelations;

      destTables.push(tabla);

    }

    //extraemos model json
    this.extractJsonModelAndPushToMongo(destTables, connector, grantedRoles, tables)
    return destTables;

  }

  static async grantedRolesToModel(grantedRoles: any, crmTables: any, permissions: any, permissionsColumns: any) {

    const destGrantedRoles = [];
    let gr = {}
    let gr2 = {}
    let gr3 = {}
    let gr4 = {}
    
    //con este permiso todos los usuarios pueden ver el modelo
    const all=      {
      users: [       "(~ => All)"       ],
      usersName: [       "(~ => All)"       ],
      none: false,
      table: "fullModel",
      column: "fullModel",
      global: true,
      permission: true,
      type: "anyoneCanSee"
      } 
      
    destGrantedRoles.push(all);

    const mongoGroups = await new ExportMongoData().exportGroup()

    
    grantedRoles.forEach( (line) => {
      
      let match =  mongoGroups.filter(i => { return  i.name === line.group})
 
      let  mongoId:String; 
      let  mongoGroup:String; 

      if (match.length == 1 && line.group !== undefined) {
        mongoId = match[0]._doc._id.toString()
        mongoGroup = match[0]._doc.name.toString()

        gr = {
          groups: [ mongoId ],
          groupsName: [ mongoGroup ],
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
        groupsName:  ["EDA_ADMIN"],
        none: false,
        table: line.table,
        column: "fullTable",
        global: true,
        permission: true,
        type: "groups"

      }
      //Evitar duplicados
      
      let found =  false;
      try{
        found = destGrantedRoles.find( e =>  e.table===line.table && e.groupsName[0] ===  "EDA_ADMIN"  )
      }catch(e){}

      if(!found){
        destGrantedRoles.push(gr2);
  
      }else{

      }
      
    })   
    
    const usersFinders = await new UserModel().userModel()
    const usersFound = await usersFinders.find()
    
    permissions.forEach(line => {

      const found = usersFound.find(i=> i.email == line.name )

        gr3 = {
        users: [ found._doc._id ],
        usersName: [ line.name ],
        none: false,
        table: line.table,
        column: "fullTable",
        global: true,
        permission: true,
        type: "users"
        }
       
      destGrantedRoles.push(gr3)

      })

    permissionsColumns.forEach(line => {
      
      const match = mongoGroups.filter(i => { return  i.name === line.group})
 
      let  mongoId:String; 
  
      if (match.length == 1 && line.group !== undefined) {
        mongoId = match[0]._doc._id.toString()
        

      let group_name : String = " '" +  line.group + "' "
      let table_name : String = " '" +  line.table + "' "
      let valueAt: String = "select record_id from sda_def_security_group_records" +
                            " where `group` = " + group_name  +  ' and `table` = ' + table_name

      gr4 = {

          groups: [ mongoId ],
          groupsName: [ line.group ], 
          none: false,
          table: line.table,
          column: line.column,
          global: false,
          type: "groups",
          value: [ valueAt ]

      }

      destGrantedRoles.push(gr4)

    }
  
  })  
    
    return destGrantedRoles;
  }

  static async extractJsonModelAndPushToMongo(tables: any, connector: any, grantedRoles: any, crmTables: any) {
    
    //le damos formato json a nuestras tablas
    let main_model = await JSON.parse(fs.readFileSync('head.json', 'utf-8'));
    main_model.ds.connection.host = connector.host
    main_model.ds.connection.database = connector.database
    main_model.ds.connection.user = connector.user
    main_model.ds.connection.password = EnCrypterService.encrypt(connector.password.toString())
    main_model.ds.model.tables = tables; //añadimos el parámetro en la columna adecuada
    main_model.ds.metadata.model_granted_roles = await grantedRoles
    
    await new pushModelToMongo().pushModel(main_model);

    fs.writeFile(`metadata.json`, JSON.stringify(main_model), { encoding: `utf-8` }, (err) => { if (err) throw err })

  }

}