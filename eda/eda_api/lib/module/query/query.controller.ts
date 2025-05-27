import { Request, Response, NextFunction } from "express";
import { HttpException } from "../global/model";
import ManagerConnectionService from "../../services/connection/manager-connection.service";
import { DashboardController } from "../dashboard/dashboard.controller";
import formatDate from '../../services/date-format/date-format.service'


/** Esta clase sirve para analizar los datos de una consulta si hay duplicados, etc. */
export class QueryController {

    static async execAnalizedQuery(req: Request, res: Response, next: NextFunction) {
        try {
            const connection = await ManagerConnectionService.getConnection(req.body.model_id, req.body.dashboard?.connectionProperties);
            const dataSource = await connection.getDataSource(req.body.model_id, req.qs.properties);

            /**Security check */
            const allowed = DashboardController.securityCheck(dataSource, req.user);
            if (!allowed) {
                return next(
                    new HttpException(500, `Sorry, you are not allowed here, contact your administrator`)
                )
            }

            const isAdmin = req['user'].role.includes("135792467811111111111110");

            const dataSourceObject = JSON.parse(JSON.stringify(dataSource));
            const uniquesForbiddenTables = [];

            if (!isAdmin) {
                /** Forbidden tables (not AdminUser) */
                const forbiddenTables = DashboardController.getForbiddenTables(dataSourceObject, req['user'].role, req.user._id);

                for (const table of forbiddenTables) {
                    uniquesForbiddenTables.push(table);
                }
            }


            let myQuery: any;
            let mylabels = [];
            if (uniquesForbiddenTables.length > 0) {
                const notAllowedColumns = [];
                myQuery = { fields: [], filters: [] };
                mylabels = [];

                for (const field of req.body.query.fields) {
                    if (uniquesForbiddenTables.includes(field.table_id)) {
                        notAllowedColumns.push(field);
                    } else {
                        mylabels.push(field.column_name);
                        myQuery.fields.push(field);
                    }
                }

                let i = 0;
                for (const field of myQuery.fields) {
                    field.order = i;
                    i++;
                }

                myQuery.filters = req.body.query.filters;
            } else {
                // las etiquetas son el nombre técnico...
                myQuery = JSON.parse(JSON.stringify(req.body.query));
                for (const field of req.body.query.fields) {
                    mylabels.push(field.column_name)
                }
            }

            myQuery.queryMode = req.body.query.queryMode ? req.body.query.queryMode : 'EDA'; /** lo añado siempre */
            myQuery.rootTable = req.body.query.rootTable ? req.body.query.rootTable : ''; /** lo añado siempre */
            myQuery.simple = req.body.query.simple;
            myQuery.queryLimit = req.body.query.queryLimit;
            myQuery.joinType = req.body.query.joinType ? req.body.query.joinType : 'inner';


            if (myQuery.fields.length == 0) {
                console.log('Data notAllowed');
                return res.status(200).json([['noDataAllowed'], [[]]]);
            } else {
                const forSelector = req.body.query?.forSelector === true;
                myQuery.forSelector = forSelector;

                /** por compatibilidad. Si no tengo el tipo de columna en el filtro lo añado */
                myQuery.filters = myQuery.filters || [];

                for (const filter of myQuery.filters) {
                    if (!filter.filter_column_type) {
                        const filterTable = dataSourceObject.ds.model.tables.find((t) => t.table_name == filter.filter_table.split('.')[0]);

                        if (filterTable) {
                            const filterColumn = filterTable.columns.find((c) => c.column_name == filter.filter_column);
                            filter.filter_column_type = filterColumn?.column_type || 'text';
                        }
                    }
                }
            }
            const filters = myQuery.filters;
            myQuery.filters = filters;
            myQuery.analized = true;
            const querys = await connection.getQueryBuilded(myQuery, dataSourceObject, req.user);
            
            console.log('ANALIZED QUERY');
            console.log(querys);
            console.log('\n-------------------------------------------------------------------------------\n');
            /**---------------------------------------------------------------------------------------------------------*/

            const logDate = formatDate(new Date());
            const dashboardId = req.body.dashboard.dashboard_id;
            const panelId = req.body.dashboard.panel_id;
            
            const results = {};
            for (const column in querys) {
                results[column] = {};
                for (const query of querys[column]) {
                    console.log('\x1b[32m%s\x1b[0m', `QUERY for user ${req.user.name}, with ID: ${req.user._id},  at: ${logDate}  for Dashboard:${dashboardId} and Panel:${panelId}`)
                    console.log(query)
                    console.log('\n-------------------------------------------------------------------------------\n');
                    
                    connection.client = await connection.getclient();
                    const getResults = (await connection.execQuery(query))[0];
                    console.log(getResults)
                    console.log('\n-------------------------------------------------------------------------------\n');

                    for (const key in getResults) {
                        const result = getResults[key];
                        results[column][key] = result;
                    }
                }
            }


            console.log('\x1b[32m%s\x1b[0m',`Date: ${logDate} Dashboard:${dashboardId} Panel:${panelId} DONE\n`);
            console.log(results);

            return res.status(200).json(results)
        } catch (err) {
            throw err;
        }
    }

}