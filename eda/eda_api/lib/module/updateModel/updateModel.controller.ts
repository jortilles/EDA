import { kMaxLength } from "buffer";
import { NextFunction, Request, Response } from "express";
import Group, { IGroup } from "../admin/groups/model/group.model";
import User, { IUser } from "../admin/users/model/user.model";
import { EnCrypterService } from "../../services/encrypter/encrypter.service";
import { userAndGroupsToMongo } from "./service/usersAndGroupsToMongo";
import { Enumerations } from "./service/enumerations";
import { pushModelToMongo } from "./service/push.Model.to.Mongo";
import path from 'path';
import fs from "fs";
import { CleanModel } from "./service/cleanModel";

const mariadb = require("mariadb");
const sinergiaDatabase = require("../../../config/sinergiacrm.config");

export class updateModel {
  /** Updates the SinergiaDA data model of an instance */
  static async update(req: Request, res: Response) {
    let crm_to_eda: any = {};
    let modelToExport: any = {};
    let grantedRolesAt: any = [];
    let enumerator: any;
    let connection: any;
    console.time("UpdateModel");
    connection = await mariadb.createConnection(sinergiaDatabase.sinergiaConn);
    console.timeLog("UpdateModel", "(Create connection)");

    try {
      /** Checks if columns and tables defined in the model exist */
      await updateModel.checkSinergiaModel(connection);
      console.timeLog("UpdateModel", "(Checking model)");

      // Connect to client database to extract data and create our EDA model
      // Select tables
      await connection
        .query(
          " select `table`, label , description, visible from sda_def_tables sdt  union all " +
            " select distinct  master_table  , master_table  ,master_table  ,  0 as visible " +
            " from sda_def_enumerations sde union all  " +
            " select distinct  bridge_table   , bridge_table  ,bridge_table  ,  0 as visible " +
            " from sda_def_enumerations sde  " +
            " where bridge_table  != '' "
        )
        .then(async (rows, err1) => {
          if (err1) {
            console.log("Error getting tables list");
            throw err1;
          }
          let tables = rows;
          // Select columns
          const my_query =
            " select sdc.`table`, sdc.`column`,`type`,sdc.label, sdc.description, sdc.decimals, sdc.aggregations, sdc.visible, sdc.stic_type, sdc.sda_hidden " +
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
            // Select relationships
            await connection
              .query(
                ` 
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
                            where bridge_table   != ''  `
              )
              .then(async rows => {
                let relations = rows;
                /*
                * Retrieves users and their active status based on group membership:
                * - The sda_def_user_groups view enforces user limitations from SinergiaCRM
                * - Users are considered active if they either:
                *   a) Have an entry in sda_def_user_groups
                *   b) Are marked as active in sda_def_users but don't belong to any group (e.g., administrators)
                */
                await connection
                  .query(`
                        SELECT 
                          u.name,
                          u.user_name as email,
                          u.password,
                          CASE 
                              WHEN g.user_name IS NOT NULL THEN 1
                              WHEN (g.user_name IS NULL AND u.active = 1) THEN 1
                              ELSE 0
                          END as active
                        FROM sda_def_users u
                        LEFT JOIN sda_def_user_groups g ON u.user_name = g.user_name
                        WHERE u.password IS NOT NULL`
                      )
                  .then(async users => {
                    let users_crm = users;
                    /*
                    * Retrieves EDA roles and groups based on active membership:
                    * - Only includes groups/roles that have active users in sda_def_user_groups
                    * - Excludes empty groups from sda_def_groups (which mirrors all SinergiaCRM groups)
                    * - This ensures roles are only created in SDA when they have assigned users
                    */
                    await connection
                      .query(`
                         SELECT
                           "EDA_USER_ROLE" as role,
                           b.name,
                           "" as user_name
                         FROM
                           sda_def_groups b
                         INNER JOIN sda_def_user_groups sdug ON sdug.name = b.name
                         union
                         SELECT
                           "EDA_USER_ROLE" as role,
                           g.name as name ,
                           g.user_name
                         FROM
                           sda_def_user_groups g; `
                      )
                      .then(async role => {
                        let roles = role;
                        await connection
                          .query(
                            '  select distinct  a.user_name as name, a.`table`,  "id" as  `column`,  a.`group` from  sda_def_permissions a where a.`group` != ""  ; '
                          )
                          .then(async granted => {
                            let fullTablePermissionsForRoles = granted;
                            // Select enumerations
                            await connection
                              .query(
                                " select source_table , source_column , master_table, master_id, master_column, bridge_table, source_bridge, target_bridge, stic_type, info from sda_def_enumerations sde ;"
                              )
                              .then(async enums => {
                                let ennumeration = enums;
                                await connection
                                  .query(" select user_name as name, `table` from sda_def_permissions ")
                                  .then(async permi => {
                                    let fullTablePermissionsForUsers = permi;

                                    await connection
                                      .query(
                                        " select distinct  user_name as name, `table`, 'id' as `column`,   group_concat( distinct `group`) as `group` from sda_def_permissions  where `group` != ''  group by 1,2,3  "
                                      )
                                      .then(async permiCol => {
                                        let dynamicPermisssionsForGroup = permiCol;
                                        /** Now that we have all data, proceed to build the model */
                                        const query =
                                          'select user_name as name, `table` as tabla , `column` as columna  from sda_def_permissions where stic_permission_source in (  "ACL_ALLOW_OWNER")';
                                        await connection.query(query).then(async customUserPermissionsValue => {
                                          console.timeLog("UpdateModel", "(Run MariaDB queries)");
                                          let dynamicPermisssionsForUser = customUserPermissionsValue;

                                          try {
                                            crm_to_eda = await userAndGroupsToMongo.crm_to_eda_UsersAndGroups(
                                              users_crm,
                                              roles
                                            );
                                            console.timeLog("UpdateModel", "(Syncs users and groups)");
                                          } catch (e) {
                                            console.log("Error 1", e);
                                            res.status(500).json({ status: "ko" });
                                          }
                                          try {
                                            grantedRolesAt = await updateModel.grantedRolesToModel(
                                              fullTablePermissionsForRoles,
                                              tables,
                                              fullTablePermissionsForUsers,
                                              dynamicPermisssionsForGroup,
                                              dynamicPermisssionsForUser
                                            );
                                            console.timeLog("UpdateModel", "(Converts CRM roles to EDA)");
                                          } catch (e) {
                                            console.log("Error 2", e);
                                            res.status(500).json({ status: "ko" });
                                          }

                                          try {
                                            modelToExport = updateModel.createModel(
                                              tables,
                                              columns,
                                              relations,
                                              grantedRolesAt,
                                              ennumeration,
                                              res
                                            );
                                            console.timeLog("UpdateModel", "(Creating Model)");
                                          } catch (e) {
                                            console.log("Error 3", e);
                                            res.status(500).json({ status: "ko" });
                                          }
                                        });

                                        connection.end();
                                      });
                                  });
                              });
                          });
                      });
                  });
              });
          });
        });
    } catch (e) {
      console.log("Error : ", e);
    }
  }
  /** Checks if columns and tables defined in the model exist */
  static async checkSinergiaModel(con: any) {
    let tablas = [];
    let columns = [];
    let successfulQueries = 0;

    try {
      const dataset = await con
        .query("select sdc.`table` as tabla, sdc.`column` as `column` FROM sda_def_columns sdc")
        .catch(err => {
          console.log("Error retrieving tables to check:", err);
          throw err;
        });

      tablas = [...new Set(dataset.map(item => item.tabla))];

      for (const tabla of tablas) {
        columns = [...new Set(dataset.map(item => (tabla === item.tabla ? item.column : null)))].filter(
          item => item != null
        );

        const sql = " select " + columns.toString() + " from " + tabla + " limit 1   \n";
        let nexSql = sql.replace("select ,", "select ").replace(", from", " from ");

        try {
          await con.query(nexSql);
          successfulQueries++;
        } catch (err) {
          console.log(`Error executing query for table ${tabla}:`, err);
        }
      }
    } catch (err) {
      console.log("Error in model check process:", err);
    }
  }

  /** Generates and processes model roles */
  /**
   * Retrieves the granted roles for a model based on various permissions.
   * @param fullTablePermissionsForRoles - The permissions for roles with full table access.
   * @param crmTables - The CRM tables.
   * @param fullTablePermissionsForUsers - The permissions for users with full table access.
   * @param dynamicPermisssionsForGroup - The dynamic permissions for groups.
   * @param dynamicPermisssionsForUser - The dynamic permissions for users.
   * @returns An array of granted roles for the model.
   */
  static async grantedRolesToModel(
    fullTablePermissionsForRoles: any,
    crmTables: any,
    fullTablePermissionsForUsers: any,
    dynamicPermisssionsForGroup: any,
    dynamicPermisssionsForUser: any
  ) {
    const destGrantedRoles = [];
    let gr,
      gr2,
      gr3,
      gr4,
      gr5 = {};

    const usersFound = await User.find();
    const mongoGroups = await Group.find();
 
    /**
     * Checks if there is an existing permission for a full table access.
     * @param newRole - The new role to check against existing permissions.
     * @returns True if there is an existing permission, false otherwise.
     */
    const hasExistingFullTablePermission = (newRole: any) => {
        return destGrantedRoles.some(existing => 
            existing.column === "fullTable" && 
            existing.table === newRole.table && 
            existing.type === newRole.type &&
            existing.users?.toString() === newRole.users?.toString()
        );
    };
 
    
    fullTablePermissionsForRoles.forEach(line => {
      let match = mongoGroups.filter(i => {
        return i.name === line.group;
      });
      let mongoId: String;
      let mongoGroup: String;
      if (match.length == 1 && line.group !== undefined) {
        mongoId = match[0]._id.toString();
        mongoGroup = match[0].name.toString();
        if (line.name != null) {
          // Process group converted to user
          const found = usersFound.find(i => i.email == line.name);
          gr = {
            users: [found._id],
            usersName: [line.name],
            none: false,
            table: line.table,
            column: "fullTable",
            global: true,
            permission: true,
            type: "users"
          };
                
                // Verify duplicates before adding
                if (!hasExistingFullTablePermission(gr)) {
                    destGrantedRoles.push(gr);
                }
        } else {
          gr = {
            groups: [mongoId],
            groupsName: [mongoGroup],
            none: false,
            table: line.table,
            column: "fullTable",
            global: true,
            permission: true,
            type: "groups"
          };
        }

        destGrantedRoles.push(gr);
      }
    });

    fullTablePermissionsForUsers.forEach(line => {
      const found = usersFound.find(i => i.email == line.name);
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
        };
        // Verify duplicates before adding
        if (!hasExistingFullTablePermission(gr3)) {
        destGrantedRoles.push(gr3);
        }
      }
    });

    dynamicPermisssionsForGroup.forEach(line => {
      const match = mongoGroups.filter(i => {
        return i.name === line.group.split(",")[0];
      });
      let mongoId: String;
      if (match.length == 1 && line.group !== undefined) {
        mongoId = match[0]._id.toString();
        let group_name: String = " '" + line.group + "' ";
        let table_name: String = " '" + line.table + "' ";
        let valueAt: String =
          " select record_id from sda_def_security_group_records" +
          " where `group` in  ( " +
          group_name.split(",").join("','") +
          ") and `table` = " +
          table_name;
        if (line.name != null) {
          // Process group converted to user
          const found = usersFound.find(i => i.email == line.name);
          gr4 = {
            users: [found._id],
            usersName: [line.name],
            none: false,
            table: line.table,
            column: line.column,
            dynamic: true,
            global: false,
            type: "users",
            value: [valueAt]
          };
          let valueAt2: String = " select `id` from " + line.table + " where `assigned_user_name`  = 'EDA_USER' ";
          gr5 = {
            users: [found._id],
            usersName: [line.name],
            none: false,
            table: line.table,
            column: "id",
            global: false,
            permission: true,
            dynamic: true,
            type: "users",
            value: [valueAt2]
          };
          destGrantedRoles.push(gr4);
          destGrantedRoles.push(gr5);
        } else {
          console.log("Error: Direct group permissions found - not allowed in this context");
        }
      }
    });

    dynamicPermisssionsForUser.forEach(line => {
      const found = usersFound.find(i => i.email == line.name);
      if (found) {
        let valueAt: String =
          "select `" + line.columna + "` from " + line.tabla + " where `" + line.columna + "` = 'EDA_USER' ";
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
        };
        destGrantedRoles.push(gr5);
      }
    });

    return destGrantedRoles;
  }

  static createModel(
    tables: any,
    columns: any,
    relations: any,
    grantedRoles: any,
    ennumeration: any,
    res: any
  ): string[] {
    let visible = false;

    /** Process and generate tables structure */
    const destTables = [];
    for (let i = 0; i < tables.length; i++) {
      if (tables[i].visible == 1) {
        visible = true;
      } else {
        visible = false;
      }

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
      };

      const destColumns: any[] = updateModel.getColumnsForTable(tables[i].table, columns, ennumeration);
      tabla.columns = destColumns;

      const destRelations: any[] = updateModel.getRelations(tables[i].table, relations);
      tabla.relations = destRelations;

      destTables.push(tabla);
    }

    this.extractJsonModelAndPushToMongo(destTables, grantedRoles, res);

    return destTables;
  }
  static getAggretations(aggregations: string) {
    const aggArray = aggregations.split(",");
    const agg = [];
    if (aggArray.indexOf("sum") >= 0) {
      agg.push({ value: "sum", display_name: "Sum" });
    }
    if (aggArray.indexOf("avg") >= 0) {
      agg.push({ value: "avg", display_name: "Average" });
    }
    if (aggArray.indexOf("max") >= 0) {
      agg.push({ value: "max", display_name: "Maximum" });
    }
    if (aggArray.indexOf("min") >= 0) {
      agg.push({ value: "min", display_name: "Minimum" });
    }
    if (aggArray.indexOf("count") >= 0) {
      agg.push({ value: "count", display_name: "Count Values" });
    }
    if (aggArray.indexOf("count_distinct") > 0) {
      agg.push({ value: "count_distinct", display_name: "Distinct Values" });
    }
    agg.push({ value: "none", display_name: "None" });
    return agg;
  }

  /** Retrieves and processes columns for a specific table */
  static getColumnsForTable(table: string, columns: any, ennumeration: any) {
    const destColumns = [];

    const agg_none = [
      {
        value: "none",
        display_name: "none"
      }
    ];

    let agg_used = {};
    let colVisible = false;

    for (let i = 0; i < columns.length; i++) {
      let c = columns[i];

      // Determine aggregators based on column types
      if (columns[i].type) {
        agg_used = this.getAggretations(columns[i].aggregations);
      } else {
        agg_used = agg_none;
      }

      if (columns[i].visible == 1) {
        colVisible = true;
      } else {
        colVisible = false;
      }

      if (c.table == table) {
        c = {
          column_name: columns[i].column,
          column_type: columns[i].type == "enumeration" ? "text" : columns[i].type,
          display_name: {
            default: columns[i].label,
            localized: []
          },
          description: {
            default: columns[i].description,
            localized: []
          },
          aggregation_type: agg_used,
          visible: colVisible,
          minimumFractionDigits: columns[i].decimals,
          column_granted_roles: [],
          row_granted_roles: [],
          tableCount: 0,
          valueListSource: {},
          hidden: columns[i].sda_hidden
        };

        // Process valueListSource for each column based on source_table
        const foundTable = ennumeration.filter(j => j.source_table == table);
        foundTable.forEach(u => {
          if (u.source_column == c.column_name) {
            c.valueListSource = Enumerations.enumeration_to_column(u);
          }
        });
        destColumns.push(c);
      }
    }
    return destColumns;
  }

  /** Generates and processes relations for a specific table */
  static getRelations(table: string, relations: any) {
    const destRelations = [];

    for (let i = 0; i < relations.length; i++) {
      let r = relations[i];
      if (r.source_table == table) {
        let rr = {
          source_table: relations[i].source_table,
          source_column: [relations[i].source_column],
          target_table: relations[i].target_table,
          target_column: [relations[i].target_column],
          visible: true,
          bridge: relations[i].label == "xx-bridge|xx-bridge" ? true : false,
          display_name: {
            default: relations[i].direccion === 0 ? relations[i].label.split("|")[0] : relations[i].label.split("|")[1],
            localized: []
          },
          autorelation: relations[i].source_table === relations[i].target_table ? true : false
        };
        destRelations.push(rr);
      }
    }

    return destRelations;
  }

  /** Formats and pushes the final model to MongoDB */
  static async extractJsonModelAndPushToMongo(tables: any, grantedRoles: any, res: any) {
    // Format tables as JSON
    console.timeLog("UpdateModel", "(Start JSON formatting)");
    
    // Load and configure base model using path library to avoid errors reading the file
    let main_model = await JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config/base_datamodel.json'), "utf-8"));
    
    main_model.ds.connection.host = sinergiaDatabase.sinergiaConn.host;
    main_model.ds.connection.database = sinergiaDatabase.sinergiaConn.database;
    main_model.ds.connection.port = sinergiaDatabase.sinergiaConn.port;
    main_model.ds.connection.user = sinergiaDatabase.sinergiaConn.user;
    main_model.ds.connection.poolLimit = sinergiaDatabase.sinergiaConn.connectionLimit;
    main_model.ds.connection.password = EnCrypterService.encrypt(sinergiaDatabase.sinergiaConn.password);
    main_model.ds.model.tables = tables;
    main_model.ds.metadata.model_granted_roles = await grantedRoles;

    console.timeLog("UpdateModel", "(Model configuration completed)");
 
    try {
      const cleanM = new CleanModel();
      main_model = await cleanM.cleanModel(main_model);
      console.timeLog("UpdateModel", "(Model cleaning completed)");
      fs.writeFile(`metadata.json`, JSON.stringify(main_model), { encoding: `utf-8` }, err => {
        if (err) {
          throw err;
        }
      });
      console.timeLog("UpdateModel", "(Metadata file written)");
      await new pushModelToMongo().pushModel(main_model, res);
      res.status(200).json({ status: "ok" });
    } catch (e) {
      console.log("Error :", e);
      res.status(500).json({ status: "ko" });
    }
  }
}
