import { NextFunction, Request, Response } from 'express'
import { HttpException } from '../global/model/index'
import ManagerConnectionService from '../../services/connection/manager-connection.service'
import Dashboard, { IDashboard } from './model/dashboard.model'
import DataSource from '../datasource/model/datasource.model'
import User from '../admin/users/model/user.model'
import Group from '../admin/groups/model/group.model'
import formatDate from '../../services/date-format/date-format.service'
import { CachedQueryService } from '../../services/cache-service/cached-query.service'
import { QueryOptions } from 'mongoose'
import ServerLogService from '../../services/server-log/server-log.service'
import _ from 'lodash'
/*SDA CUSTOM*/ import { getSdaDbErrorMessage, resolveSdaDbLang } from './SdaDbErrorMessages'
const cache_config = require('../../../config/cache.config')
const eda_api_config = require('../../../config/eda_api_config');
export class DashboardController {


  static async getDashboards(req: Request, res: Response, next: NextFunction) {
    try {
      let admin, privates, group, publics, shared = [];
      const groups = await Group.find({ users: { $in: req.user._id } }).exec();
      const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
      const isDataSourceCreator = groups.filter(g => g.name === 'EDA_DATASOURCE_CREATOR').length > 0;
      const dataSources = await DataSource.find(
        {},
        'ds.metadata'
      )


      if (isAdmin) {
        [publics, privates, group, shared] =  await DashboardController.getAllDashboardToAdmin(req)
      } else {
        privates = await DashboardController.getPrivateDashboards(req)
        group = await DashboardController.getGroupsDashboards(req)
        publics = await DashboardController.getPublicsDashboards(req , dataSources)
        /*SDA CUSTOM*/ // Hide public (shared) reports to normal users
        /*SDA CUSTOM*/ // shared = await DashboardController.getSharedDashboards();
      }

      // Asegurarse de que la información del grupo esté incluida para dashboards de tipo "group"
      group = await DashboardController.addGroupInfo(group);

      return res.status(200).json({
        ok: true,
        dashboards: privates,
        group,
        publics,
        shared,
        isAdmin,
        isDataSourceCreator
      });
    } catch (err) {
      console.log(err);
      next(new HttpException(400, 'Some error occurred loading dashboards'));
    }
  }

  static async addGroupInfo(dashboards) {
    for (const dashboard of dashboards) {
      if (dashboard.group && Array.isArray(dashboard.group)) {
        dashboard.group = await Group.find({ _id: { $in: dashboard.group } }, 'name').exec();
      }
    }
    return dashboards;
  }

  static async getPrivateDashboards(req: Request) {
    try {
      const dashboards = await Dashboard.find(
        /* SDA CUSTOM - Only active dashboards for non-admins */
        /* SDA CUSTOM */{ user: req.user._id, "config.active": true },
        /* SDA CUSTOM */ 'config.title config.visible config.tag config.onlyIcanEdit config.description config.createdAt config.modifiedAt config.ds config.active user'
      ).populate('user','name').exec()
      const privates = []
      for (const dashboard of dashboards) {
        if (dashboard.config.visible === 'private') {
          // Obtain the name of the data source
          dashboard.config.ds.name = (await DataSource.findById(dashboard.config.ds._id, 'ds.metadata.model_name').exec())?.ds?.metadata?.model_name ?? 'N/A';

          privates.push(dashboard)
        }
      }

      let tags: Array<any> = req.qs.tags
      
      if (_.isEmpty(tags)) {
        return privates;

      } else {
        tags = req.qs.tags.split(',');
        const privatesTags = []
        tags.forEach(tag => {
          privates.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  privatesTags.push(dbs)
                }
              })
            }
          }
          )
        })
        return privatesTags;
      }


    } catch (err) {
      throw new HttpException(400, 'Error loading privates dashboards')
    }
  }

  static async getGroupsDashboards(req: Request) {
    try {
      const userGroups = await Group.find({
        users: { $in: req.user._id }
      }).exec();
      const dashboards = await Dashboard.find(
        /* SDA CUSTOM - Only active dashboards for non-admins */
        /* SDA CUSTOM */ { group: { $in: userGroups.map(g => g._id) }, "config.active": true },
        /* SDA CUSTOM */'config.title config.visible group config.tag config.onlyIcanEdit config.description config.createdAt config.ds config.active user'
      ).populate('user','name').exec()
      const groupDashboards = []
      for (let i = 0, n = dashboards.length; i < n; i += 1) {
        const dashboard = dashboards[i]
        for (const dashboardGroup of dashboard.group) {
          //dashboard.group = groups.filter(g => JSON.stringify(g._id) === JSON.stringify(group));
          for (const userGroup of userGroups) {
            if ( JSON.stringify(userGroup._id) === JSON.stringify(dashboardGroup) ) {
              if( !groupDashboards.some((db) => db._id===dashboard._id) ) groupDashboards.push(dashboard)
            }
          }
        }
      }

      let tags: Array<any> = req.qs.tags;

      if (_.isEmpty(tags)) {
        return groupDashboards;

      } else {
        tags = req.qs.tags.split(',');
        const groupDashboardsTags = []
        tags.forEach(tag => {
          groupDashboards.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  groupDashboardsTags.push(dbs)
                }
              })
            }
          }
          )
        })
        return  DashboardController.addGroupInfo(groupDashboardsTags);
      }


    } catch (err) {
      console.log(err);
      throw new HttpException(400, 'Error loading groups dashboards');
    }
  }

/**
 * 
 * @param req  request
 * @param ds  datasource 
 * This function returns true or false depending on if the user can see the datasource. It is used to determine if the dashboard should be added to the available dashobards list.
 */
    static iCanSeeTheDashboard(req: Request, ds: any ) :boolean{
      let result = false;
      if( ds.ds.metadata.model_granted_roles.length == 0){ // si no hay permisos puedo verlo.
        result  =  true;
      }
      if( result == false ){
                const user = req.user;

                ds.ds.metadata.model_granted_roles.forEach(e => {
                if(e.table == 'fullModel' ){
                    if(e.users?.indexOf( user._id ) >= 0  ){ // el usuario puede ver el modelo
                      result  = true;
                    }
                    if(e.type ==  'anyoneCanSee' ){ // Todos pueden ver el modelo.
                      result  = true;
                    }
                    if(  e.role?.length > 0 ) { // si el rol puede verlo lo ve
                      user.role.forEach( r=> {
                        if (  e.role.indexOf( r ) >= 0 ){
                            result  = true;
                        }
                      })
                    } 
                    
                } else{  // si  veo algo.
                    if(e.permission == true ){

                        if( e.users?.some( element => JSON.stringify(element) === JSON.stringify(user._id) )   ){ // el usuario puede ver el algo de alguna tabla
                            result  = true;
                        }
                        if(  e.role?.length > 0 ) { // si el rol puede ver algo de alguna tabla 
                            user.role.forEach( r=> {
                              if (  e.role.indexOf( r ) >= 0 ){
                                 result  = true;
                              }
                            })
                        } 
                      }     
                }
            });
      }
      return result;
    }


  static async getPublicsDashboards(req: Request, dss: any[]) {
    try {
      const dashboards = await Dashboard.find(
        /* SDA CUSTOM - Only active dashboards for non-admins */
        /* SDA CUSTOM */{ "config.active": true },
        /* SDA CUSTOM */'config.title config.visible config.tag config.onlyIcanEdit config.description config.createdAt config.modifiedAt config.ds config.active user'
      ).populate('user','name').exec()
      const publics = []

     

      for (const dashboard of dashboards) {
        if (dashboard.config.visible === 'public') {
          const ds = dss.find( e=> e._id == dashboard.config.ds._id );
          dashboard.config.ds.name =  ds.ds?.metadata?.model_name ?? 'N/A';
          if(  this.iCanSeeTheDashboard(req, ds) == true ){
             publics.push(dashboard);
          }

        }
      }

      let tags: Array<any> = req.qs.tags;

      if (_.isEmpty(tags)) {
        return publics;

      } else {
        tags = req.qs.tags.split(',');
        const publicsTags = []
        tags.forEach(tag => {
          publics.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  publicsTags.push(dbs)
                }
              })
            }
          }
          )
        })
        return publicsTags;
      }

    } catch (err) {
      throw new HttpException(400, 'Error loading public dashboards')
    }
  }

  static async getSharedDashboards(req: Request) {
    try {
      const dashboards = await Dashboard.find(
        /* SDA CUSTOM - Only active dashboards for non-admins */
        /* SDA CUSTOM */ { "config.active": true },
        /* SDA CUSTOM */ 'config.title config.visible config.tag config.onlyIcanEdit config.description config.createdAt config.modifiedAt config.ds config.active user'
      ).populate('user','name').exec()
      const shared = []
      for (const dashboard of dashboards) {
        if (dashboard.config.visible === 'shared') {
          // Obtain the name of the data source
          dashboard.config.ds.name = (await DataSource.findById(dashboard.config.ds._id, 'ds.metadata.model_name').exec())?.ds?.metadata?.model_name ?? 'N/A';
          
          shared.push(dashboard)
        }
      }

      let tags: Array<any> = req.qs.tags;

      if (_.isEmpty(tags)) {
        return shared;

      } else {
        tags = req.qs.tags.split(',');
        const sharedTags = []
        tags.forEach(tag => {
          shared.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  sharedTags.push(dbs)
                }
              })
            }
          }
          )
        })
        return sharedTags;
      }
    } catch (err) {
      throw new HttpException(400, 'Error loading shared dashboards')
    }
  }

  static async getAllDashboardToAdmin(req: Request) {
    let external;
    if (req.qs.external) {
      external = JSON.parse(req.qs.external);
    }
    // Creamos un objeto de filtro dinámico
    let filter = {};
    // Recorremos las claves del objeto externalObject y las añadimos al filtro
      for (let key in external) { 
        filter[`config.external.${key}`] = external[key];
      }
      filter = Object.entries(filter).reduce((acc, [clave, valor]) => {
        acc[clave] = valor;
        return acc;
      }, {});
    try { 
    
          // Define the default date to be used for both createdAt and modifiedAt fields
      const defaultDate = new Date('2024-01-01T00:00:00.000Z');

      // First, update all documents that don't have a createdAt field
      // This operation sets a default createdAt date for all dashboards missing this field
      const createdAtUpdateResult = await Dashboard.updateMany(
        { 'config.createdAt': { $exists: false } },
        { $set: { 'config.createdAt': defaultDate } }
      );

      // Then, update all documents that don't have a modifiedAt field
      // If createdAt exists, use its value; otherwise, use the default date
      const modifiedAtUpdateResult = await Dashboard.updateMany(
        { 'config.modifiedAt': { $exists: false } },
        [
          { 
            $set: { 
              'config.modifiedAt': { 
                $ifNull: ['$config.createdAt', defaultDate] 
              } 
            } 
          }
        ]
      );

      /* SDA CUSTOM */ // Initialize config.active to true if it doesn't exist
      /* SDA CUSTOM */const activeUpdateResult = await Dashboard.updateMany(
      /* SDA CUSTOM */  { 'config.active': { $exists: false } },
      /* SDA CUSTOM */  { $set: { 'config.active': true } }
      /* SDA CUSTOM */);


      //si no lleva filtro, pasamos directamente a recuperarlos todos
      const dashboards =  JSON.stringify(filter) !== '{}'  ? 
      /* SDA CUSTOM */ await Dashboard.find({ $or : Object.entries(filter).map(([clave, valor]) => ({ [clave]: valor }))},  'user config.title config.visible group config.tag config.onlyIcanEdit config.description config.createdAt config.modifiedAt config.ds config.external config.active').exec() : 
      /* SDA CUSTOM */ await Dashboard.find({}, 'user config.title config.visible group config.tag config.onlyIcanEdit config.description config.createdAt config.modifiedAt config.ds config.external config.active').exec();
      
      const publics = []
      const privates = []
      const groups = []
      const shared = []
  
      for (const dashboard of dashboards) {
        // Search user information for all dashboards
        dashboard.user = await User.findById(
          { _id: dashboard.user },
          'name'
        ).exec()
        if (dashboard.user == null) {
          dashboard.user = new User({
            name: 'N/A',
            email: '',
            password: '',
            img: '',
            role: '',
            active: ''
          })
        }
        
        // Obtain the name of the data source
        dashboard.config.ds.name = (await DataSource.findById(dashboard.config.ds._id, 'ds.metadata.model_name').exec())?.ds?.metadata?.model_name ?? 'N/A';
        switch (dashboard.config.visible) {
          case 'public':
            publics.push(dashboard)
            break
          case 'private':
            privates.push(dashboard)
            break
          case 'group':
            dashboard.group = await Group.find({ _id: dashboard.group }).exec()
            groups.push(dashboard)
            break
          case 'shared':
            shared.push(dashboard)
            break
        }
      }
      
      //apliquem filtrat per tags desde URL
      let tags : Array<any> = req.qs.tags;
      
      if (_.isEmpty(tags)) {
        return [publics, privates, groups, shared];
      } else {
        tags = req.qs.tags.split(',');
        const publicsTags = []
        const privatesTags = []
        const groupsTags = []
        const sharedTags = []

        tags.forEach(tag => {
          publics.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  publicsTags.push(dbs)
                }
              })
            }
          })
          privates.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  privatesTags.push(dbs)
                }
              })
            }
          })
          groups.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  groupsTags.push(dbs)
                }
              })
            }
          })
          shared.forEach(dbs => {
            if (dbs.config.tag != undefined && Array.isArray(dbs.config.tag) && dbs.config.tag.includes(tag)) {
              dbs.config.tag.forEach(t => {
                if (t === tag) {
                  sharedTags.push(dbs)
                }
              })
            }
          })
        })

        return [publicsTags, privatesTags, groupsTags, sharedTags];
      }



    } catch (err) {
      console.log(err);
      throw new HttpException(400, 'Error loading dashboards for admin')
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req['user']._id
      const userGroups = req['user'].role
      const userRoles = (
        await Group.find({ _id: { $in: userGroups } }).exec()
      ).map(group => group.name)
      const userGroupDashboards = (
        await Dashboard.find(
          { group: { $in: userGroups } },
          'config.title config.visible group'
        ).exec()
      )
        .map(dashboard => dashboard._id)
        .filter(id => id.toString() === req.params.id)

      Dashboard.findOne({ _id: req.params.id }, (err, dashboard) => {
        if (err) {
          console.log('Dashboard not found with this id:' + req.params.id)
          return next(
            new HttpException(500, 'Dashboard not found with this id')
          )
        }

        const visibilityCheck = !['shared', 'public'].includes(
          dashboard.config.visible
        )
        const roleCheck =
          !userRoles.includes('EDA_ADMIN') &&
          userGroupDashboards.length === 0 &&
          dashboard.user.toString() !== user

        /* SDA CUSTOM*/// Check if dashboard is active. 
        /* SDA CUSTOM*/// If inactive, only admins can access it.
        /* SDA CUSTOM*/const isActive = dashboard.config.active !== false;
        /* SDA CUSTOM*/const isAdmin = userRoles.includes('EDA_ADMIN') || req.user.role.includes("135792467811111111111110");
        /* SDA CUSTOM*/if (!isActive && !isAdmin) {
        /* SDA CUSTOM*/  console.log(`Dashboard ${req.params.id} is inactive and user is not admin`);
        /* SDA CUSTOM*/  return next(new HttpException(403, "DashboardInactive"));
        /* SDA CUSTOM*/}
        if (visibilityCheck && roleCheck) {
          console.log(
            "You don't have permission " +
            user +
            ' for dashboard ' +
            req.params.id
          )
          return next(new HttpException(500, "You don't have permission"))
        }

        DataSource.findById(
          { _id: dashboard.config.ds._id },
          (err, datasource) => {
            if (err) {
              return next(
                new HttpException(500, 'Error searching the DataSource')
              )
            }

            if (!datasource) {
              return next(new HttpException(400, 'Datasouce not found with id'))
            }
            let toJson = JSON.parse(JSON.stringify(datasource))

            // Security filter for the tables. If you do not have permission on a table it is set as hidden.
            // In case it is used in a relation.
            let uniquesForbiddenTables = DashboardController.getForbiddenTables(
              toJson,
              userGroups,
              req.user._id
            )

            // This is done in order to bypass security in case the user is anonymous and therefore
              // a public report
            /* SDA CUSTOM */ if(req.user._id == '135792467811111111111112'){
            /* SDA CUSTOM */   console.log('ANONYMOUS USER QUERY....NO PERMISSIONS APPLY HERE.....');
            /* SDA CUSTOM */   uniquesForbiddenTables = [];
            /* SDA CUSTOM */ }
			
            const includesAdmin = req.user.role.includes("135792467811111111111110")

            let is_filtered = false;

            if (!includesAdmin) {

              try {
                // Set prohibited tables to false
                if (uniquesForbiddenTables.length > 0) {
                  //  Set prohibited tables to false
                  for (let x = 0; x < toJson.ds.model.tables.length; x++) {
                    try {
                      if ( uniquesForbiddenTables.includes( toJson.ds.model.tables[x].table_name ) ) {
                        toJson.ds.model.tables[x].visible = false;
                      }
                    } catch (e) {
                      console.log('Error evaluating role permission')
                      console.log(e)
                    }
                  }
                  // Hidden columns in panels
                  for (let i = 0; i < dashboard.config.panel.length; i++) {
                    if (dashboard.config.panel[i].content != undefined) {
                      let MyFields = [];
                      let notAllowedColumns = [];

                      for ( let c = 0; c < dashboard.config.panel[i].content.query.query.fields.length; c++ ) {
                        if ( uniquesForbiddenTables.includes( dashboard.config.panel[i].content.query.query.fields[ c ].table_id.split('.')[0]  ) ) { // split('.')[0]  This is done for the filter in tree mode
                          notAllowedColumns.push(
                            dashboard.config.panel[i].content.query.query.fields[ c ]
                          )
                        } else {
                          MyFields.push(
                            dashboard.config.panel[i].content.query.query.fields[ c ]
                          )
                        }
                      }
                      if (notAllowedColumns.length > 0) {
                        dashboard.config.panel[ i ].content.query.query.fields = MyFields;
                        is_filtered= true;
                      }
                      // IF I DON'T HAVE PERMISSIONS ON THE MAIN TREE TABLE I DON'T SEE ANYTHING
                      if( dashboard.config.panel[i].content.query.query.queryMode == 'EDA2'  &&  uniquesForbiddenTables.includes( dashboard.config.panel[i].content.query.query.rootTable ) ) {
                        dashboard.config.panel[ i ].content.query.query.fields = [];
                        is_filtered= true;
                      }

                      // if I don't have permission on the filters.
                      for ( let c = 0; c < dashboard.config.panel[i].content.query.query.filters.length; c++ ) {
                        if ( uniquesForbiddenTables.includes( dashboard.config.panel[i].content.query.query.filters[c].filter_table.split('.')[0]   ) ) { // split('.')[0]  This is done for the filter in tree mode 
                          is_filtered= true;
                        } 
                      }
                      if(dashboard.config.panel[i].content.query.query.queryMode == 'SQL'){
                        for(let j=0; j<uniquesForbiddenTables.length; j++ ){
                          if ( dashboard.config.panel[i].content.query.query.SQLexpression.toUpperCase().indexOf( uniquesForbiddenTables[j].toUpperCase()   ) > 0  ) {  
                            is_filtered= true;
                          } 
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                console.log('no pannels in dashboard')
              }
            }

            // Se agrega false a autorelation y bridge
            toJson.ds.model.tables.forEach(table => {
              table.relations.forEach(r => {
                if(r.autorelation == undefined){
                  r.autorelation = false;
                }
                if(r.bridge == undefined){
                  r.bridge = false;
                }
              });
            });

            const ds = {
              _id: datasource._id,
              model: toJson.ds.model,
              name: toJson.ds.metadata.model_name,
              is_filtered: is_filtered
            }

            insertServerLog(
              req,
              'info',
              'DashboardAccessed',
              req.user.name,
              dashboard._id + '--' + dashboard.config.title
            )
            return res.status(200).json({ ok: true, dashboard, datasource: ds })
          }
        )
      })
    } catch (err) {
      next(err)
    }
  }

/*SDA CUSTOM   This function is used to check if a dashboard is public (shared) or not. 
               It is used in the login guard to allow anonymous users to access public dashboards without needing to log in.
               It returns a boolean value indicating if the dashboard is public (shared) or not.*/
/*SDA CUSTOM*/ static async getIsPublic(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/   try {
/*SDA CUSTOM*/     const dashboard = await Dashboard.findById(req.params.id, 'config.visible').exec();
/*SDA CUSTOM*/     if (!dashboard) return next(new HttpException(404, 'Dashboard not found'));
/*SDA CUSTOM*/     const isAccessible = dashboard.config.visible ===  'shared';
/*SDA CUSTOM*/     return res.status(200).json({ isAccessible });
/*SDA CUSTOM*/   } catch (err) {
/*SDA CUSTOM*/     return next(new HttpException(500, 'Error checking dashboard visibility'));
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/ }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body

      const dashboard: IDashboard = new Dashboard({
        config: body.config,
        user: req.user._id
      })

      if (body.config.visible === 'group') {
        dashboard.group = body.group
      }

      //avoid dashboards without name 
      if (dashboard.config.title === null) { dashboard.config.title = '-' };
      //Save dashboard in db
      dashboard.save((err, dashboard) => {
        if (err) {
          return next(
            new HttpException(
              400,
              'Some error ocurred while creating the dashboard'
            )
          )
        }

        return res.status(201).json({ ok: true, dashboard })
      })
    } catch (err) {
      next(err)
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;

      Dashboard.findById(req.params.id, (err, dashboard: IDashboard) => {
        if (err) {
          return next(new HttpException(500, 'Error searching the dashboard'))
        }

        if (!dashboard) {
          return next(
            new HttpException(400, 'Dashboard not exist with this id')
          )
        }
        const createdAt=dashboard.config.createdAt
        dashboard.config = body.config
        dashboard.config.createdAt = createdAt
        dashboard.user = req.user._id
        dashboard.group = body.group
        // avoid dashboards without name 
        if (dashboard.config.title === null) { dashboard.config.title = '-' };
        
        // Update modifiedAt with current date and time
        dashboard.config.modifiedAt = new Date();
        
        
        dashboard.save((err, dashboard) => {
          if (err) {
            return next(new HttpException(500, 'Error updating dashboard'))
          }

          return res.status(200).json({ ok: true, dashboard })
        })
      })
    } catch (err) {
      next(err)
    }
  }
  
    /**
     * Updates a specific field of a dashboard.
     * 
     * @param {Request} req - Express request object
     * @param {Response} res - Express response object
     * @param {NextFunction} next - Express next middleware function
     * 
     * @description
     * Expects 'id' in req.params and 'data' (containing 'key' and 'newValue') in req.body.
     * If 'config.visible' is updated to a value other than 'group', 'group' is set to an empty array.
     * 
     * @throws {HttpException} 400 for update errors, 404 if dashboard not found
     */
    static async updateSpecific(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const { data } = req.body;
        const { key, newValue } = data;

        let updateObj: any = { [key]: newValue };

        if (key === 'config.visible' && newValue !== 'group') {
          updateObj = {
            ...updateObj,
            group: []
          };
        }

        Dashboard.findByIdAndUpdate(
          id,
          { $set: updateObj },
          { new: true, runValidators: true },
          (err, dashboard) => {
            if (err) {
              return next(
                new HttpException(
                  400,
                  'Some error occurred while updating the dashboard'
                )
              );
            }

            if (!dashboard) {
              return next(
                new HttpException(404, 'Dashboard not found with this id')
              );
            }

            return res.status(200).json({ ok: true, dashboard });
          }
        );
      } catch (err) {
        next(err);
      }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    let options: QueryOptions = {}
    try {
      Dashboard.findByIdAndDelete(req.params.id, options, (err, dashboard) => {
        if (err) {
          return next(new HttpException(500, 'Error removing dashboard'))
        }

        if (!dashboard) {
          return next(
            new HttpException(400, 'Not exists dahsboard with this id')
          )
        }

        return res.status(200).json({ ok: true, dashboard })
      })
    } catch (err) {
      next(err)
    }
  }


  /**
   *  Filter prohibited tables in a data model. Returns a list of prohibited tables for an user.
   */
  static getForbiddenTables(
    dataModelObject: any,
    userGroups: Array<String>,
    user: string
  ) {
    let forbiddenTables = [];
    if(dataModelObject.ds.metadata.model_granted_roles.length > 0 ){ /** IN CASE I HAVE SECURITY DEFINED... */
      if( dataModelObject.ds.metadata.model_granted_roles.filter( r=>r.type == "anyoneCanSee" && r.permission == true ).length > 0 ){
        // In case where any user can visualize the model and we have a benevolent scheme
        forbiddenTables = this.getForbiddenTablesOpen( dataModelObject, userGroups, user ); 
      }else{
         // In case I can only see the tables for which I have explicit permissions
        forbiddenTables = this.getForbiddenTablesClose( dataModelObject, userGroups, user ); 
      }
  }
    return forbiddenTables;
  }



  
  /**
  * Filters prohibited tables in a data model. Returns the list of prohibited tables for a user.
  * ASSUMES THEY CAN SEE ALL UNSECURED TABLES AND THEIR OWN FILTERED TABLES.
  * THEY ONLY STOP SEEING THOSE TO WHICH THEY HAVE BEEN DENIED ACCESS.
   */
  static getForbiddenTablesOpen(
    dataModelObject: any,
    userGroups: Array<String>,
    user: string
  ) {
    let forbiddenTables = [];
    const allTables = [];
    let allowedTablesBySecurityForOthers = []; // If others see it, I can't see it (on exclusive models)
    let allowedTablesBySecurityForMe = [];
    dataModelObject.ds.model.tables.forEach(e => {
      allTables.push(e.table_name)
    })
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (
        var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length;  i++  ) {
        if (
          // If I can't see the table
          dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === false
        ) {
          if ( dataModelObject.ds.metadata.model_granted_roles[i].users !== undefined  ) {
            for ( var j = 0; j<dataModelObject.ds.metadata.model_granted_roles[i].users.length; j++ ) {
              if (
                dataModelObject.ds.metadata.model_granted_roles[i].users[j] == user
              ) {
                forbiddenTables.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              }
            }
          }
        }
      }
    }

    //HIDDEN TABLES FOR THE GROUP 
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (
        var i = 0;
        i < dataModelObject.ds.metadata.model_granted_roles.length;
        i++
      ) {
        if (
          dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === false
        ) {
          if (
            dataModelObject.ds.metadata.model_granted_roles[i].groups !==
            undefined
          ) {
            for ( var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].groups.length; j++ ) {
              if ( userGroups.includes( dataModelObject.ds.metadata.model_granted_roles[i].groups[j] ) ) {
                forbiddenTables.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              }
            }
          }
        }
      }
    }


    // allowed tables by security 
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length; i++ ) {
        if (
          dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === true
        ) {
          if (
            dataModelObject.ds.metadata.model_granted_roles[i].users !== undefined ) {
            for (var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].users.length; j++ ) {
              if ( dataModelObject.ds.metadata.model_granted_roles[i].users[j] != user  ) {
                allowedTablesBySecurityForOthers.push(  dataModelObject.ds.metadata.model_granted_roles[i].table );
              } else {
                allowedTablesBySecurityForMe.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              }
            }
          }
        }
      }
    }


    // I can see the table because I can see data from a column
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length; i++ ) {
        if ( // I can see values ​​from a column in the table
          dataModelObject.ds.metadata.model_granted_roles[i].global === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].none === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].value.length > 0
        ) {
          if (
            dataModelObject.ds.metadata.model_granted_roles[i].users !== undefined ) {
            for (var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].users.length; j++ ) {
              if ( dataModelObject.ds.metadata.model_granted_roles[i].users[j] != user  ) {
                allowedTablesBySecurityForOthers.push(  dataModelObject.ds.metadata.model_granted_roles[i].table );
              } else {
                allowedTablesBySecurityForMe.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              }
            }
          }
        }
      }
    }


    // TABLES PERMITTED BY THE GROUP
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for ( var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length;  i++ ) {
        if ( dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === true ) {
          if (  dataModelObject.ds.metadata.model_granted_roles[i].groups !==  undefined ) {
            for ( var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].groups.length;  j++ ) {
              if ( !userGroups.includes( dataModelObject.ds.metadata.model_granted_roles[i].groups[j] ) ) {
                allowedTablesBySecurityForOthers.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              } else {
                allowedTablesBySecurityForMe.push(  dataModelObject.ds.metadata.model_granted_roles[i].table )
              }
            }
          }
        }
      }
    }

    const unique = (value, index, self) => {
      return self.indexOf(value) === index
    }

    let uniquesForbiddenTables = forbiddenTables.filter(unique);


    allowedTablesBySecurityForOthers = allowedTablesBySecurityForOthers.filter(  unique   )
    allowedTablesBySecurityForMe = allowedTablesBySecurityForMe.filter( unique )


    allowedTablesBySecurityForMe.forEach(e => {
      allowedTablesBySecurityForOthers = allowedTablesBySecurityForOthers.filter(
        item => item != e
      )
    })
    uniquesForbiddenTables = uniquesForbiddenTables.concat(  allowedTablesBySecurityForOthers    );
    uniquesForbiddenTables = uniquesForbiddenTables.filter(unique);

    return uniquesForbiddenTables;
  }




  /**
  * Filter prohibited tables in a data model. Returns the list of prohibited tables for a user.
  *  ASSUMES YOU CAN SEE ONLY THOSE TABLES FOR WHICH YOU HAVE EXPLICIT PERMISSION.
   */
  static getForbiddenTablesClose(
    dataModelObject: any,
    userGroups: Array<String>,
    user: string
  ) {
    const allTables = [];
    let allowedTablesBySecurityForMe = [];
    let forbiddenTables = [];
    dataModelObject.ds.model.tables.forEach(e => {
      allTables.push(e.table_name)
    })

    // Here I've marked the tables I can see. The rest are prohibited.

    // allowed tables by security 
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      // Si el usuario puede ver todo el modelo.
      if (dataModelObject.ds.metadata.model_granted_roles.filter(r=> r.table == 'fullModel' 
                                                                    && r.permission == true 
                                                                    && r.users?.includes(user) 
                                                                ).length > 0 ){
        // El usuairo puede ver todo.
        forbiddenTables = [];
        return forbiddenTables;
      }
      // Si el grupo puede ver todo el modelo.
      let groupCan =  0;
      userGroups.forEach(
        group=>{
          if (dataModelObject.ds.metadata.model_granted_roles.filter(r=> r.table == 'fullModel' 
            && r.permission == true 
            && r.groups?.includes(group) 
          ).length > 0 ){
              // El grupo  puede ver todo.
              groupCan = 1;
            }
        }
      );
      if(groupCan==1) {
        forbiddenTables = [];
        return forbiddenTables;
      }
   
      for (var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length; i++ ) {
        if (
          dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === true
        ) {
          if (
            dataModelObject.ds.metadata.model_granted_roles[i].users !== undefined ) {
            for (var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].users.length; j++ ) {
              if ( dataModelObject.ds.metadata.model_granted_roles[i].users[j] == user  ) {
                allowedTablesBySecurityForMe.push(  dataModelObject.ds.metadata.model_granted_roles[i].table );
              } 
            }
          }
        }
      }
    }


    // I can see the table because I can see data from a column 
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length; i++ ) {
        if ( // I can see values ​​from a column in the table 
          dataModelObject.ds.metadata.model_granted_roles[i].global === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].none === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].value.length > 0
        ) {
          if (dataModelObject.ds.metadata.model_granted_roles[i].users !== undefined ) {
            for (var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].users.length; j++ ) {
              if ( dataModelObject.ds.metadata.model_granted_roles[i].users[j] == user  ) {
                allowedTablesBySecurityForMe.push(  dataModelObject.ds.metadata.model_granted_roles[i].table );
              }  
            }
          }
        }
      }
    }


    // TABLES PERMITTED BY THE GROUP
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for ( var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length;  i++ ) {
        if ( dataModelObject.ds.metadata.model_granted_roles[i].column === 'fullTable' &&
          dataModelObject.ds.metadata.model_granted_roles[i].permission === true ) {
          if (  dataModelObject.ds.metadata.model_granted_roles[i].groups !==  undefined ) {
            for ( var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].groups.length;  j++ ) {
              if ( userGroups.includes( dataModelObject.ds.metadata.model_granted_roles[i].groups[j] ) ) {
                allowedTablesBySecurityForMe.push( dataModelObject.ds.metadata.model_granted_roles[i].table );
              } 
            }
          }
        }
      }
    }
    
    // Check if the user has permission to view the table based on column visibility
    if (dataModelObject.ds.metadata.model_granted_roles !== undefined) {
      for (var i = 0; i < dataModelObject.ds.metadata.model_granted_roles.length; i++) {
        // Verify if the user has access to at least one column in the table
        if (
          dataModelObject.ds.metadata.model_granted_roles[i].global === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].none === false &&
          dataModelObject.ds.metadata.model_granted_roles[i].value.length > 0
        ) {
          if (dataModelObject.ds.metadata.model_granted_roles[i].groups !== undefined) {
            for (var j = 0; j < dataModelObject.ds.metadata.model_granted_roles[i].groups.length; j++) {
              if (userGroups.includes(dataModelObject.ds.metadata.model_granted_roles[i].groups[j])) {
                allowedTablesBySecurityForMe.push(dataModelObject.ds.metadata.model_granted_roles[i].table);
              }  
            }
          }
        }
      }
    }

    forbiddenTables = allTables.filter( t => !allowedTablesBySecurityForMe.includes( t )  );

  // Filters values ​​starting with: 'sda_l_' in tables & values ​​containing '__' in tables.
  /* SDA CUSTOM*/   let newForbiddenTables = forbiddenTables.filter( table => {
  /* SDA CUSTOM*/     return ((!table.startsWith('sda_l_') && !table.includes('__')))
  /* SDA CUSTOM*/   })

    return newForbiddenTables;
  }






  /**
   * Execute an EDA query for a dashboard
   */
  static async execQuery(req: Request, res: Response, next: NextFunction) {

    try {
      let connectionProps: any;
      if (req.body.dashboard?.connectionProperties !== undefined) connectionProps = req.body.dashboard.connectionProperties;

      const connection = await ManagerConnectionService.getConnection(req.body.model_id, connectionProps);
      
      const dataModel = await connection.getDataSource(req.body.model_id, req.qs.properties)
      /**--------------------------------------------------------------------------------------------------------- */
      /**Security check */
      const allowed = DashboardController.securityCheck(dataModel, req.user)
      if (!allowed) {
        return next(
          new HttpException(
            500,
            `Sorry, this DataModel has security activated: you are not allowed here, contact your administrator`
          )
        )
      }
      const dataModelObject = JSON.parse(JSON.stringify(dataModel))
      /** Forbidden tables  */
      let uniquesForbiddenTables = DashboardController.getForbiddenTables(
        dataModelObject,
        req['user'].role,
        req.user._id
      )

      const includesAdmin = req['user'].role.includes("135792467811111111111110")
      if(includesAdmin){
        //the admin sees everything
       uniquesForbiddenTables = [];
      }


/* SDA CUSTOM*/	  if( req.user._id == '135792467811111111111112'){
/* SDA CUSTOM*/        console.log('ANONYMOUS USER QUERY....NO PERMISSIONS APPLY HERE.....');
/* SDA CUSTOM*/        uniquesForbiddenTables = [];
/* SDA CUSTOM*/      }


      let mylabels = []
      let myQuery: any
      if (uniquesForbiddenTables.length > 0) {
        myQuery = { fields: [], filters: [] }
        mylabels = []
        let notAllowedColumns = []
        for (let c = 0; c < req.body.query.fields.length; c++) {
          if (
            uniquesForbiddenTables.includes(req.body.query.fields[c].table_id)
          ) {
            notAllowedColumns.push(req.body.query.fields[c])
          } else {
            mylabels.push(req.body.query.fields[c].column_name)
            myQuery.fields.push(req.body.query.fields[c])
          }
        }
        if (uniquesForbiddenTables.length > 0) {
          for (let i = 0; i < myQuery.fields.length; i++) {
            myQuery.fields[i].order = i
          }
          myQuery.filters = req.body.query.filters
        }

        myQuery.sortedFilters = req.body.query.sortedFilters;
      } else {
        // Labels are the technical name...
        myQuery = JSON.parse(JSON.stringify(req.body.query))
        for (let c = 0; c < req.body.query.fields.length; c++) {
          mylabels.push(req.body.query.fields[c].column_name)
        }
      }
      myQuery.queryMode = req.body.query.queryMode? req.body.query.queryMode: 'EDA'; // I always add it
      myQuery.rootTable = req.body.query.rootTable? req.body.query.rootTable: ''; // I always add it
      myQuery.simple = req.body.query.simple;
      myQuery.queryLimit = req.body.query.queryLimit;
      myQuery.joinType = req.body.query.joinType ? req.body.query.joinType : 'inner';

      if (myQuery.fields.length == 0) {
        console.log('you cannot see any data');
        return res.status(200).json([['noDataAllowed'], [[]]]);
      }
      if (req.body.query.hasOwnProperty('forSelector') && req.body.query.forSelector === true) {
        myQuery.forSelector = true;
      } else {
        myQuery.forSelector = false;
      }


      // For compatibility. If I don't have the column type in the filter, I'll add it.

      // For compatibility. If I don't have the aggregation type in the filter.....
      if(myQuery.filters){
        for (const filter of myQuery.filters) {
          if (!filter.filter_column_type) {
            const filterTable = dataModelObject.ds.model.tables.find((t) => t.table_name == filter.filter_table.split('.')[0]);

            if (filterTable) {
              const filterColumn = filterTable.columns.find((c) => c.column_name == filter.filter_column);
              filter.filter_column_type = filterColumn?.column_type || 'text';
            }
          }
          // for compatibility. If I don't have the aggregation type in the filter I put it in where
          if(! filter.hasOwnProperty('filterBeforeGrouping') ){
            filter.filterBeforeGrouping = true;
          }
        }
      }
      
      let nullFilter = {};
      const filters = myQuery.filters;



      // We follow this approach when applying a filter that includes multiple elements, one of which is null. For example: filtering by [3, 5, null, 7].
      filters.forEach(a => {
      // Filter nulls and empty values ​​from the dashboard . If the selector contains empty values, should they be treated as SDA CUSTOM? 
        a.filter_elements.forEach(b => {
          if( b.value1){
            if ( b.value1.includes('emptyString')  && b.value1.length  == 1 ){
              // if it is one I turn it into a null or empty
              a.filter_type = 'null_or_empty';
              // The sortedFilters are controlled in the getSortedFilters function of mySql-builder.service.ts
            }if ( b.value1.includes('emptyString')  && b.value1.length  > 1 ){
             // if there are more than one, I remove them to a separate filter.
             const nullFilter = JSON.parse(JSON.stringify(a));
             nullFilter.filter_id = 'is_null';
             nullFilter.filter_type = 'null_or_empty';
             nullFilter.source_filter_id = a.filter_id; // Added filter_id from the source
             nullFilter.filter_elements = [{value1:['null']}];
              b.value1 = b.value1.filter(c => c != 'emptyString')
              filters.push(nullFilter);
            
            } 
          }
        });





        a.filter_elements.forEach(b => {
          if( b.value1){
            if ( 
                ( b.value1.includes('null') ||  b.value1.includes( eda_api_config.null_value ) ||  b.value1.includes('1900-01-01') )  
                && b.value1.length > 1  //If I have multiple elements 
                && ( a.filter_type == '=' || a.filter_type == 'in' ||  a.filter_type == 'like' || a.filter_type == 'between')
            ) {
                // If there are more than one, I remove it from a separate filter.
              const nullFilter = JSON.parse(JSON.stringify(a));
              nullFilter.filter_id = 'is_null';
              nullFilter.filter_type = 'is_null';
              nullFilter.filter_elements = [{value1:['null']}]
              nullFilter.isGlobal= true,
              nullFilter.applyToAll= false;

              b.value1 = b.value1.filter(c => c != 'null')
              filters.push(nullFilter);
              }else  if ( ( b.value1.includes('null')||  b.value1.includes( eda_api_config.null_value )  || b.value1.includes('1900-01-01') ) 
              && b.value1.length > 1  // If I have multiple elements  
              && ( a.filter_type == '!=' || a.filter_type == 'not_in' ||  a.filter_type == 'not_like' )
              ) {
                  // If there are more than one, I remove it from a separate filter.
                  const nullFilter = JSON.parse(JSON.stringify(a));
                  nullFilter.filter_id = 'not_null';
                  nullFilter.filter_type = 'not_null';
                  nullFilter.filter_elements = [{value1:['null']}]; 
                  b.value1 = b.value1.filter(c => c != 'null')
                  filters.push(nullFilter);
            } else if ( 
              ( b.value1.includes('null') ||  b.value1.includes( eda_api_config.null_value ) || b.value1.includes('1900-01-01') )  
              && b.value1.length == 1  
              && ( a.filter_type == '=' || a.filter_type == 'in' ||  a.filter_type == 'like' || a.filter_type == 'between') 
              ){
                a.filter_type='is_null';
            } else if ( 
              ( b.value1.includes('null') ||  b.value1.includes( eda_api_config.null_value ) || b.value1.includes('1900-01-01') )  
              && b.value1.length == 1  
              &&  ( a.filter_type == '!=' || a.filter_type == 'not_in' ||  a.filter_type == 'not_like') 
            ){
              a.filter_type='not_null';
            } 
         }
        })
      }) 

      myQuery.filters = filters;

      if(uniquesForbiddenTables.length > 0){
        if(   myQuery.filters.filter( f=> uniquesForbiddenTables.includes( f.filter_table.split('.')[0]) ).length > 0 ){
          console.log('you are not allowed to user this filters');
          return res.status(200).json([['noFilterAllowed'], [[]]]);
        }

      }

      const query = await connection.getQueryBuilded(
        myQuery,
        dataModelObject,
        req.user,
        req.body.query.queryLimit // Added dlimit 
      )

      /**---------------------------------------------------------------------------------------------------------*/

      console.log(
        '\x1b[32m%s\x1b[0m',
        `QUERY for user ${req.user.name}, with ID: ${req.user._id
        },  at: ${formatDate(new Date())}  for Dashboard:${req.body.dashboard.dashboard_id
        } and Panel:${req.body.dashboard.panel_id}  `
      )
      console.log(query)
      console.log('\n-------------------------------------------------------------------------------\n');

      /**cached query */
      let cacheEnabled = false;
      dataModelObject.ds.metadata.cache_config &&
      dataModelObject.ds.metadata.cache_config.enabled === true;

      const cachedQuery = cacheEnabled
        ? await CachedQueryService.checkQuery(req.body.model_id, query)
        : null

      if (!cachedQuery) {
        connection.client = await connection.getclient();
        const getResults = await connection.execQuery(query);

        let numerics = []
        // If it is oracle or some mysql it will be difficult to make the numbers normal.
        if (
          dataModel.ds.connection.type == 'oracle' ||
          dataModel.ds.connection.type == 'mysql'
        ) {
          req.body.query.fields.forEach((e, i) => {
            if (e.column_type == 'numeric') {
              numerics.push('true')
            } else {
              numerics.push('false')
            }
          })
        }

        let results = []

        // Normalize data here i also transform oracle numbers who come as strings to real numbers
        for (let i = 0, n = getResults.length; i < n; i++) {
          const r = getResults[i]
          const output = Object.keys(r).map((i, ind) => {
            // If it is oracle or some mysql it will be a bit difficult to make the numbers normal. 
            if (
              dataModel.ds.connection.type == 'oracle' ||
              dataModel.ds.connection.type == 'mysql'
            ) {
              if (numerics[ind] == 'true') {
                const res = parseFloat(r[i])
                if (isNaN(res)) {
                   return eda_api_config.null_value;
                } else {
                  return res
                }
              } else {
                // this is to avoid nulls I remove the nulls and change them to '' from the values
                if (r[i] === null) {
                  return eda_api_config.null_value;
                } else {
                    return r[i];
                }
              }
            } else {
              // I remove the eyes and change them to eda_api_config.null value of the levels
              if (numerics[ind] != 'true' && r[i] == null) {
                return eda_api_config.null_value;
              } else {
                return r[i];
              }


            }

          })


          results.push(output)          
        }
        // Labels are the technical name...
        const output = [mylabels, results]
        if (output[1].length < cache_config.MAX_STORED_ROWS && cacheEnabled) {
          CachedQueryService.storeQuery(req.body.model_id, query, output)
        }

        /**CUMULATIVE SUM ->
        * If dates are aggregated by month or day
        * and the cumulative flag is set, the cumulative sum is performed on all numeric fields
        */
        DashboardController.cumulativeSum(output, req.body.query)

        console.log(
          '\x1b[32m%s\x1b[0m',
          `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id
          } Panel:${req.body.dashboard.panel_id} DONE\n`
        )

            

        return res.status(200).json(output)

        /**
         * The query is to the cache
         */
      } else {
        /**SUMA ACUMULATIVA ->
        * If dates are added by month or day
        * and the cumulative flag is active, the cumulative sum is performed on all numeric fields.
         */
        console.log('\x1b[36m%s\x1b[0m', '💾 Cached query 💾')
        DashboardController.cumulativeSum(
          cachedQuery.cachedQuery.response,
          req.body.query
        )
        console.log(
          '\x1b[32m%s\x1b[0m',
          `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id
          } Panel:${req.body.dashboard.panel_id} DONE\n`
        )    
        return res.status(200).json(cachedQuery.cachedQuery.response)
      }
    } catch (err) {
      console.log(err)
/* SDA CUSTOM */ next(new HttpException(500, await DashboardController.buildDbErrorMessageForRequest(err, req)))
    }
  }


  /**
   * Run a SQL query for a dashboard
   */
  static async execSqlQuery(req: Request, res: Response, next: NextFunction) {
    try {
      let connectionProps: any;
      if (req.body.dashboard?.connectionProperties !== undefined) connectionProps = req.body.dashboard.connectionProperties;

      const connection = await ManagerConnectionService.getConnection(req.body.model_id, connectionProps);
      const dataModel = await connection.getDataSource(req.body.model_id)

      /**Security check */
      const allowed = DashboardController.securityCheck(dataModel, req.user)
      if (!allowed) {
        console.log('SQL Query not allowed by security');
        return next(
          new HttpException(
            500,
            `Sorry, you are not allowed here, contact your administrator`
          )
        )
      }

      const dataModelObject = JSON.parse(JSON.stringify(dataModel))

      /** Forbidden tables  */
      let uniquesForbiddenTables = DashboardController.getForbiddenTables(
        dataModelObject,
        req['user'].role,
        req.user._id
      )

      const includesAdmin = req['user'].role.includes("135792467811111111111110")
      if(includesAdmin){
        // the admin sees everything
       uniquesForbiddenTables = [];
      }

/* SDA CUSTOM */      if( req.user._id == '135792467811111111111112'){
/* SDA CUSTOM */        console.log('ANONYMOUS USER QUERY....NO PERMISSIONS APPLY HERE.....');
/* SDA CUSTOM */       uniquesForbiddenTables = [];
/* SDA CUSTOM */      }

      let notAllowedQuery = false
      uniquesForbiddenTables.forEach(table => {
        if (req.body.query.SQLexpression.indexOf(table) >= 0) {
          notAllowedQuery = true
        }
      })
      if (notAllowedQuery) {
         return res.status(200).json("[['noDataAllowed'],[]]")
      } else {
        const query = connection.BuildSqlQuery(
          req.body.query,
          dataModelObject,
          req.user
        )

        /**If query is in format select foo from a, b queryBuilder returns null */
        if (!query) {
          return next(new HttpException(500,'Queries in format "select x from A, B" are not suported'));
        }

        console.log('\x1b[32m%s\x1b[0m', `SQL QUERY for user ${req.user.name}, with ID: ${req.user._id},  at: ${formatDate(new Date())} `);
        console.log(query)
        console.log('\n-------------------------------------------------------------------------------\n');

        /**cached query */
        let cacheEnabled =
          dataModelObject.ds.metadata.cache_config &&
          dataModelObject.ds.metadata.cache_config.enabled
        const cachedQuery = cacheEnabled
          ? await CachedQueryService.checkQuery(req.body.model_id, query)
          : null

        if (!cachedQuery) {
          connection.client = await connection.getclient()
          const getResults = await connection.execSqlQuery(query);
          let results = [];
          const resultsRollback = [];
          const oracleDataTypes = [];
          let oracleEval: Boolean = true;
          let labels: Array<string>
          if (getResults.length > 0) {
            labels = Object.keys(getResults[0]).map(i => i)
          } else {
            labels = ['NoData']
          }
          // Normalize data

          for (let i = 0, n = getResults.length; i < n; i++) {
            const r = getResults[i]
            // if it's oracle or some mysql I have to do some shit to get back the normal numbers. 
            // I put the results in the result and make an array of number types. I also make a backup 
            if (
              dataModel.ds.connection.type == 'oracle' ||
              dataModel.ds.connection.type == 'mysql'
            ) {
              const output = Object.keys(r).map(i => r[i])
              resultsRollback.push([...output])
              const tmpArray = []

              output.forEach((val, index) => {

                if (DashboardController.isNotNumeric(val)) {
                  tmpArray.push('NaN');
                  if(val===null  ){
                    output[index] =  eda_api_config.null_value;  // I change the null values ​​to a blank space but otherwise I have no problems.
                    resultsRollback[i][index] =  eda_api_config.null_value; // I change the null values ​​to a blank space but otherwise I have no problems.
                  }
                } else {
                  tmpArray.push('int')
                  if(val !== null){
                    output[index] = parseFloat(val);
                  }else{
                    output[index] =  eda_api_config.null_value;
                    resultsRollback[i][index] =  eda_api_config.null_value;
                    //output[index] = null;
                  }
                  
                }
              })
              oracleDataTypes.push(tmpArray)
              results.push(output)
            } else {
              const output = Object.keys(r).map(i => r[i]);
              output.forEach((val, index) => {
                if(val===null  ){
                  output[index] =  eda_api_config.null_value;//I change the null values ​​to a blank space  otherwise I have  problems.
                  resultsRollback[i][index] =   eda_api_config.null_value; //I change the null values ​​to a blank space  otherwise I have  problems.
                }
              })
              results.push(output)
              resultsRollback.push(output)
            }
          }

          // if I have oracle results I evaluate the number type array to see if I have mixed integers and text.
          //I check each value with the next one below the array. 
          if (oracleDataTypes.length > 1) {
            for (var i = 0; i < oracleDataTypes.length - 1; i++) {
              var e = oracleDataTypes[i]
              for (var j = 0; j < e.length; j++) {
                if(oracleDataTypes[0][j]=='int'  ){
                  if ( oracleDataTypes[i][j] != oracleDataTypes[i + 1][j]) {
                    oracleEval = false
                  }
                }
              }
            }
          }
         // if I have mixed numbers. I put the rollback 
          if (oracleEval !== true) {
            results = resultsRollback
          }else{
            // I put in null state the null numbers
            for (var i = 0; i < results.length; i++) {
              var e = results[i]
              for (var j = 0; j < e.length; j++) {
                const t = oracleDataTypes?.[0]?.[j];  // <-- changed
                if( t === 'int' && results[i][j] === eda_api_config.null_value){
                    results[i][j] = null;
                }
              }            
            }
          }
          const output = [labels, results]
          if (output[1].length < cache_config.MAX_STORED_ROWS && cacheEnabled) {
            CachedQueryService.storeQuery(req.body.model_id, query, output)
          }


          console.log(
            '\x1b[32m%s\x1b[0m',
            `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id
            } Panel:${req.body.dashboard.panel_id} DONE\n`
          )
          return res.status(200).json(output)
        } else {
          console.log('\x1b[36m%s\x1b[0m', '💾 Cached query 💾')
          console.log(
            '\x1b[32m%s\x1b[0m',
            `Date: ${formatDate(new Date())} Dashboard:${req.body.dashboard.dashboard_id
            } Panel:${req.body.dashboard.panel_id} DONE\n`
          )
          return res.status(200).json(cachedQuery.cachedQuery.response)
        }
      }
    } catch (err) {
      console.log(err)
/* SDA CUSTOM */ next(new HttpException(500, await DashboardController.buildDbErrorMessageForRequest(err, req)))
    }
  }
  //Check if a value is not numeric
  static isNotNumeric(val) {

    let isNotNumeric = false;
    try {
      if (
        isNaN(val) || val.toString().indexOf('-') >= 0 || val.toString().indexOf('/') >= 0 ||
        val.toString().indexOf('|') >= 0 || val.toString().indexOf(':') >= 0 || val.toString().indexOf('T') >= 0 ||
        val.toString().indexOf('Z') >= 0 || val.toString().indexOf('Z') >= 0 || val.toString().replace(/['"]+/g, '').length == 0 ) {
        isNotNumeric = true;
      }
    } catch (e) {
      // Null values are...NULL
    }

    return isNotNumeric;

  }

  /**Check if an user can or not see a data model. */
  static securityCheck(dataModel: any, user: any) {
    /** un admin  lo ve todo */
    if (user.role.includes('135792467811111111111110')) {
      return true;
    }
    /*SDA CUSTOM*/if(user._id== '135792467811111111111112'){
    /*SDA CUSTOM*/  console.log('Anonymous access');
    /*SDA CUSTOM*/  return true;
    /*SDA CUSTOM*/}
    if (dataModel.ds.metadata.model_granted_roles.length > 0) {
      const users = [];
      const roles = [];
      let anyOne = 'false'

      //Get users with permission
      dataModel.ds.metadata.model_granted_roles.forEach(permission => {
        switch (permission.type) {
          case 'anyoneCanSee':
            if (permission.permission === true) {
              anyOne = 'true'
            }
            break
          case 'users':
            permission.users.forEach(u => {
              if ( !users.includes(u.toString()) )  users.push(u.toString());
            })
            break
          case 'groups':
            user.role.forEach(role => {
              if (permission.groups.includes(role)) {
                if (!roles.includes(role.toString())) roles.push(role.toString())
              }
            })
        }
      })
      if (anyOne === 'true') {
        // anyone can see this model.
        return true
      }
      if (!users.includes(user._id) && roles.length < 1) {
        return false
      } else {
        return true
      }
    } else return true
  }

  /**
   * Get builded query
   * @param req
   * @param res
   * @param next
   */
  static async getQuery(req: Request, res: Response, next: NextFunction) {
    try {
      let connectionProps: any;
      if (req.body.dashboard?.connectionProperties !== undefined) connectionProps = req.body.dashboard.connectionProperties;

      const connection = await ManagerConnectionService.getConnection(req.body.model_id, connectionProps);
      const dataModel = await connection.getDataSource(req.body.model_id)
      const dataModelObject = JSON.parse(JSON.stringify(dataModel));

      //for compatibility If I don't have the type of column in the filter I add it
      //for compatibility If I don't have the type of aggregation in the filter...
      if(req.body.query.filters){
        for (const filter of req.body.query.filters) {
          if (!filter.filter_column_type) {
            const filterTable = dataModelObject.ds.model.tables.find((t) => t.table_name == filter.filter_table.split('.')[0]);
            if (filterTable) {
              const filterColumn = filterTable.columns.find((c) => c.column_name == filter.filter_column);
              filter.filter_column_type = filterColumn?.column_type || 'text';
            }
          }
          //for compatibility If I don't have the type of aggregation in the filter, I put it in the where
          if(! filter.hasOwnProperty('filterBeforeGrouping') ){
            filter.filterBeforeGrouping = true;
          }
        }
      }

      const query = await connection.getQueryBuilded(
        req.body.query,
        dataModelObject,
        req.user
      )
      return res.status(200).json(query)
    } catch (err) {
      console.log(err)
      next(new HttpException(500, 'Error getting query'))
    }
  }

  static async execView(req: Request, res: Response, next: NextFunction) {
    try {
      let connectionProps: any;
      if (req.body.dashboard?.connectionProperties !== undefined) connectionProps = req.body.dashboard.connectionProperties;

      const connection = await ManagerConnectionService.getConnection(req.body.model_id, connectionProps);
      const query = req.body.query
      connection.client = await connection.getclient()
      const getResults = await connection.execQuery(query)
      const results = []
      let labels: Array<string>
      if (getResults.length > 0) {
        labels = Object.keys(getResults[0]).map(i => i)
      } else {
        labels = ['NoData']
      }
      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i]
        const output = Object.keys(r).map(i => r[i])
        results.push(output)
      }
      const output = [labels, results]
      return res.status(200).json(output)
    } catch (err) {
      console.log(err)
/* SDA CUSTOM */ next(new HttpException(500, await DashboardController.buildDbErrorMessageForRequest(err, req)))
    }
  }

  static async cumulativeSum(data, query) {
    let shouldCompare = false
    query.fields.forEach(field => {
      if (
        field.column_type === 'date' &&
        ['month', 'week', 'day'].includes(field.format) &&
        !!field.cumulativeSum
      ) {
        shouldCompare = true
      }
    })

    if (shouldCompare) {
      let types = query.fields.map(field => field.column_type)
      let dateIndex = types.indexOf('date')

      let prevValues = query.fields.map(_ => 0)
      let prevDate = 0
      let prevHead = ''
      let newRows = []

      data[1].forEach(row => {
        let currentDate = parseInt(
          row[dateIndex].slice(-2)
        ) /**01, 02, 03 ...etc. */
        let currentHead = row[dateIndex].slice(
          0,
          -2
        ) /** 2020-01, 2020-02 ...etc. */
        let newRow = []

        types.forEach((type, index) => {
          let value = row[index]

          if (
            type === 'numeric' &&
            currentDate >= prevDate &&
            currentHead === prevHead
          ) {
            value = row[index] + prevValues[index]
          }

          prevValues[index] = value
          newRow.push(value)
        })

        prevDate = currentDate
        prevHead = currentHead
        newRows.push(newRow)
      })

      data[1] = newRows
    }
  }
  
  /**
   * Clones an existing dashboard.
   * 
   * @param req - Express request object containing the dashboard ID to clone
   * @param res - Express response object
   * @param next - Express next function
   * @returns A Promise that resolves with the cloned dashboard or rejects with an error
   */
  static async clone(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboardId = req.params.id;
      console.log('Attempting to clone dashboard with ID:', dashboardId);
      
      // Find the original dashboard by ID
      const originalDashboard = await Dashboard.findById(dashboardId).exec();

      if (!originalDashboard) {
        console.log('Original dashboard not found');
        return next(new HttpException(404, 'Dashboard not found'));
      }

      // Create a new dashboard object with cloned properties
      const clonedDashboard: IDashboard = new Dashboard({
        config: {
          ...originalDashboard.config,
          title: `${originalDashboard.config.title} copy`, // Append 'copy' to the title
          createdAt: new Date(),
          modifiedAt: new Date()
        },
        user: req.user._id, // Set the current user as the owner of the cloned dashboard
        group: originalDashboard.group // Maintain the same group permissions
      });

      
      // Save the cloned dashboard to the database
      const savedDashboard = await clonedDashboard.save();
      console.log('Cloned dashboard saved:', savedDashboard);

      // Return the saved cloned dashboard with a 201 (Created) status
      return res.status(201).json({ ok: true, dashboard: savedDashboard });
    } catch (err) {
      console.error('Error cloning dashboard:', err);
      next(new HttpException(500, 'Error cloning dashboard'));
    }
}

  static async cleanDashboardCache(req: Request, res: Response, next: NextFunction) {
    let connectionProps: any;
    if (req.body.dashboard?.connectionProperties !== undefined) connectionProps = req.body.dashboard.connectionProperties;

    const connection = await ManagerConnectionService.getConnection(req.body.model_id, connectionProps);
    const dataModel = await connection.getDataSource(req.body.model_id)

    if (dataModel.ds.metadata.cache_config.enabled) {
      /**Security check */
      const allowed = DashboardController.securityCheck(dataModel, req.user)
      if (!allowed) {
        return next(
          new HttpException(
            500,
            `Sorry, you are not allowed here, contact your administrator`
          )
        )
      }

      const dataModelObject = JSON.parse(JSON.stringify(dataModel))

      req.body.queries.forEach(async query => {
        let sqlQuery = await connection.getQueryBuilded(
          query,
          dataModelObject,
          req.user
        )
        let hashedQuery = CachedQueryService.build(req.body.model_id, sqlQuery)
        let res = await CachedQueryService.deleteQuery(hashedQuery)
      })
    }

    return res.status(200).json({ ok: true })
  }

/* SDA CUSTOM */ static async isPublicDashboardRequest(req: Request): Promise<boolean> {
/* SDA CUSTOM */   const anonymousUserId = '135792467811111111111112';
/* SDA CUSTOM */   const requestUserId = req?.user?._id;
/* SDA CUSTOM */   const isAnonymous = !req?.user || requestUserId == anonymousUserId;
/* SDA CUSTOM */   let visibility = req?.body?.dashboard?.config?.visible || req?.body?.dashboard?.visible;
/* SDA CUSTOM */
/* SDA CUSTOM */   if (!visibility && req?.body?.dashboard?.dashboard_id) {
/* SDA CUSTOM */     try {
/* SDA CUSTOM */       const dashboard = await Dashboard.findById(req.body.dashboard.dashboard_id, 'config.visible').exec();
/* SDA CUSTOM */       visibility = dashboard?.config?.visible;
/* SDA CUSTOM */     } catch (e) {
/* SDA CUSTOM */       visibility = undefined;
/* SDA CUSTOM */     }
/* SDA CUSTOM */   }
/* SDA CUSTOM */
/* SDA CUSTOM */   const isPublicDashboard = visibility === 'public' || visibility === 'shared';
/* SDA CUSTOM */
/* SDA CUSTOM */   return isAnonymous && isPublicDashboard;
/* SDA CUSTOM */ }

/* SDA CUSTOM */ static async buildDbErrorMessageForRequest(err: any, req: Request): Promise<string> {
/* SDA CUSTOM */   const lang = DashboardController.resolveDbErrorLangFromRequest(req);
/* SDA CUSTOM */
/* SDA CUSTOM */   if (await DashboardController.isPublicDashboardRequest(req)) {
/* SDA CUSTOM */     return 'Error';
/* SDA CUSTOM */   }
/* SDA CUSTOM */
/* SDA CUSTOM */   return DashboardController.parseDbErrorMySQL(err, lang);
/* SDA CUSTOM */ }

/* SDA CUSTOM */ static resolveDbErrorLangFromRequest(req: Request): string {
/* SDA CUSTOM */   const supportedLangs = ['es', 'ca', 'en', 'gl'];
/* SDA CUSTOM */   const queryLang = (req?.query as any)?.lang;
/* SDA CUSTOM */   const paramLang = (req?.params as any)?.lang;
/* SDA CUSTOM */   const bodyLang = (req?.body as any)?.lang;
/* SDA CUSTOM */   const headerLang = req?.headers?.['x-sda-lang'];
/* SDA CUSTOM */   const explicitLang = [queryLang, paramLang, bodyLang, headerLang].find(value => typeof value === 'string') as string | undefined;
/* SDA CUSTOM */
/* SDA CUSTOM */   if (explicitLang) {
/* SDA CUSTOM */     const normalized = explicitLang.toLowerCase();
/* SDA CUSTOM */     return supportedLangs.includes(normalized) ? normalized : 'en';
/* SDA CUSTOM */   }
/* SDA CUSTOM */
/* SDA CUSTOM */   const refererLike = String(req?.headers?.referer || req?.headers?.referrer || req?.headers?.origin || '').toLowerCase();
/* SDA CUSTOM */   const match = refererLike.match(/\/(es|ca|en|gl|pl)\//);
/* SDA CUSTOM */
/* SDA CUSTOM */   if (match && match[1]) {
/* SDA CUSTOM */     return supportedLangs.includes(match[1]) ? match[1] : 'en';
/* SDA CUSTOM */   }
/* SDA CUSTOM */
/* SDA CUSTOM */   return 'en';
/* SDA CUSTOM */ }

/*SDA CUSTOM*/ static parseDbErrorMySQL(err: any, lang?: string | false): string {
/*SDA CUSTOM*/   /** Parse a MySQL/MariaDB error and return a localized descriptive message for the user. */
/*SDA CUSTOM*/   const msg: string = err?.message || '';
/*SDA CUSTOM*/   const code: string = err?.code || '';
/*SDA CUSTOM*/   const l = resolveSdaDbLang(lang);
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1054; Symbol: ER_BAD_FIELD_ERROR
/*SDA CUSTOM*/   if (code === 'ER_BAD_FIELD_ERROR' || err?.errno === 1054) {
/*SDA CUSTOM*/     const match = msg.match(/Unknown column '([^']+)'/i);
/*SDA CUSTOM*/     return getSdaDbErrorMessage('unknownColumn', l, match ? match[1] : '?');
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1146; Symbol: ER_NO_SUCH_TABLE; SQLSTATE: 42S02
/*SDA CUSTOM*/   if (code === 'ER_NO_SUCH_TABLE' || err?.errno === 1146) {
/*SDA CUSTOM*/     const match = msg.match(/Table '([^']+)' doesn't exist/i);
/*SDA CUSTOM*/     const tableName = match ? match[1].split('.').pop() : '?';
/*SDA CUSTOM*/     return getSdaDbErrorMessage('unknownTable', l, tableName);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1045/1698; Symbol: ER_ACCESS_DENIED_ERROR / ER_ACCESS_DENIED_NO_PASSWORD_ERROR
/*SDA CUSTOM*/   if (code === 'ER_ACCESS_DENIED_ERROR' || code === 'ER_ACCESS_DENIED_NO_PASSWORD_ERROR' ||
/*SDA CUSTOM*/       err?.errno === 1045 || err?.errno === 1698 || /Access denied for user/i.test(msg)) {
/*SDA CUSTOM*/     return getSdaDbErrorMessage('accessDenied', l);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1064; Symbol: ER_PARSE_ERROR
/*SDA CUSTOM*/   if (code === 'ER_PARSE_ERROR' || err?.errno === 1064) {
/*SDA CUSTOM*/     return getSdaDbErrorMessage('syntaxError', l);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1040; Symbol: ER_CON_COUNT_ERROR
/*SDA CUSTOM*/   if (code === 'ER_CON_COUNT_ERROR' || err?.errno === 1040) {
/*SDA CUSTOM*/     return getSdaDbErrorMessage('tooManyConnections', l);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Error number: 1205; Symbol: ER_LOCK_WAIT_TIMEOUT
/*SDA CUSTOM*/   if (code === 'ER_LOCK_WAIT_TIMEOUT' || err?.errno === 1205) {
/*SDA CUSTOM*/     return getSdaDbErrorMessage('lockTimeout', l);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Node.js connection errors
/*SDA CUSTOM*/   if (code === 'ECONNREFUSED' || code === 'ER_GET_CONNECTION_TIMEOUT') {
/*SDA CUSTOM*/     return getSdaDbErrorMessage('connectionRefused', l);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   // Generic fallback with the original MySQL/MariaDB message
/*SDA CUSTOM*/   if (msg) {
/*SDA CUSTOM*/     const truncated = msg.length > 500 ? msg.substring(0, 500) + '...' : msg;
/*SDA CUSTOM*/     return getSdaDbErrorMessage('generic', l, truncated);
/*SDA CUSTOM*/   }
/*SDA CUSTOM*/
/*SDA CUSTOM*/   return getSdaDbErrorMessage('fallback', l);
/*SDA CUSTOM*/ }
}

function insertServerLog(
  req: Request,
  level: string,
  action: string,
  userMail: string,
  type: string
) {
  const ip = req.headers['x-forwarded-for'] || req.get('origin')
  var date = new Date()
  var month = date.getMonth() + 1
  var monthstr = month < 10 ? '0' + month.toString() : month.toString()
  var day = date.getDate()
  var daystr = day < 10 ? '0' + day.toString() : day.toString()
  var date_str =
    date.getFullYear() +
    '-' +
    monthstr +
    '-' +
    daystr +
    ' ' +
    date.getHours() +
    ':' +
    date.getMinutes() +
    ':' +
    date.getSeconds()
  ServerLogService.log({ level, action, userMail, ip, type, date_str })
}
