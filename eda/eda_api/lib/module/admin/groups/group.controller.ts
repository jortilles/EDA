import { NextFunction, Request, Response } from 'express'
import { HttpException } from '../../global/model/index'
import Group, { IGroup } from './model/group.model'
import User from '../users/model/user.model'
import Dashboard from '../../dashboard/model/dashboard.model'
import { QueryOptions } from 'mongoose'
import mongoose from 'mongoose'
import _ = require('lodash');
import path from 'path';
import * as fs from 'fs';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import { GroupActiveDirectoryModel } from 'services/active-directory/model/group-active-directory.model'
import { groupCollapsed } from 'console'
/* SDA CUSTOM */ import ServerLogService from '../../../services/server-log/server-log-sda.service';




export class GroupController {


  static async getGroups (req: Request, res: Response, next: NextFunction) {
        try {
            Group.find({}).exec((err, groups: IGroup[]) => {
              if (err) {
                return next(new HttpException(500, 'Error loading groups'))
              }
              return res.status(200).json(groups)
            })
          } catch (err) {
            next(err)
          }
   
  }

  /** retorna els grups d'un usuari */
  static async getMineGroups (req: Request, res: Response, next: NextFunction) {
    try {
      const groupss = await Group.find({ users: { $in: req.user._id } }).exec()
      const isAdmin =
        groupss.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0

      let groups: IGroup[] = []

      if (isAdmin) {
        groups = await Group.find({}, 'name role users').exec()
      } else {
        groups = await Group.find(
          { users: { $in: req.user._id } },
          'name role users'
        ).exec()
      }

      return res.status(200).json(groups)
    } catch (err) {
      next(err)
    }
  }

  /** retorna un objecte grup des de un id */
  static async getGroup (req: Request, res: Response, next: NextFunction) {
    try {
      Group.findById({ _id: req.params.id }, async (err, group: IGroup) => {
        if (err) {
          return next(new HttpException(400, 'Error loading the group'))
        }

        group.users = await User.find(
          { role: { $in: group._id } },
          'name email img role'
        ).exec()

        return res.status(200).json(group)
      })
    } catch (err) {
      next(err)
    }
  }




  static async  syncroGroupsFromAD(groupsAD: GroupActiveDirectoryModel[]){
    const localGroups =  (await Group.find( ).exec()).map( g=>{return g.name;});
    let groupsToCreate = groupsAD.map( g=> {return g.name;});
    groupsToCreate =  groupsToCreate.filter(function (item) {
          return localGroups.indexOf(item) === -1;
      });
    // SECUENCIAL!!!!!!!!!!!!!!!!
    for (const g  of groupsToCreate) {
        const grp =  await  GroupController.createGroupFromAD( g );
        console.log(grp + ' Created')
    }

    // BORRO LOS GRUPOS QUE NO ESTAN EN EL AD Y QUE SI QUE ESTAN EN EL MONGO MENOS ADMIN Y RO.....
    let adGroups = groupsAD.map( g=> {return g.name;});

    let groupsToDelete =  localGroups.filter(function (item) {
        return adGroups.indexOf(item) === -1;
    });


    if (  groupsToDelete.indexOf('EDA_ADMIN') > -1) {
      groupsToDelete.splice(groupsToDelete.indexOf('EDA_ADMIN'), 1);
    }
    // ADMIN Y READ ONLY S'HA DE DEIXAR...
    groupsToDelete = groupsToDelete.filter(item => item !== 'EDA_ADMIN');
    groupsToDelete = groupsToDelete.filter(item => item !== 'EDA_RO');

    for (const g  of groupsToDelete) {
      const grp =  await  this.deleteGroupFromAD( g );
      console.log(grp + ' Deleted')
   }            

  }


  /** Retorna els ids locals del llistat de nomps de grupos proporcionats */
  static async getLocalGroupsIds ( groups: string[] ){
    const localGroups =   await Group.find( ).exec();
    const res = <any>[] ;
    groups.forEach( g=> {  
      localGroups.forEach( lg=> {   if(lg.name == g){   res.push(lg._id) }  })
    } );
    return res;
  }
  
 static  async createGroupFromAD (GroupName: string ):Promise<string> {
    const group: IGroup = new Group({
      name: GroupName,
      role:  GroupName=='EDA_ADMIN'?'EDA_ADMIN_ROLE':'EDA_USER_ROLE' ,
      users: []  
    })
    await  group.save();
    return group._id;

  }


  static async createGroup (req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body
      const group: IGroup = new Group({
        name: body.name,
        role: 'EDA_USER_ROLE',
        users: body.users,
        img: body.img
      })
      // return res.status(201).json({ok: true});
      group.save(async (err, groupSaved: IGroup) => {
        if (err) {
          return next(
            new HttpException(
              400,
              'Some error ocurred while creating the Group'
            )
          )
        }

        if (body.users.length > 0) {
          await User.updateMany(
            { _id: { $in: body.users } },
            { $push: { role: groupSaved._id } }
          ).exec()
        }

        /* SDA CUSTOM */ // SDA CUSTOM - Audit log for group creation and initial membership
        /* SDA CUSTOM */ insertServerLog(req, 'info', 'GroupCreated', req.user.name, buildGroupLogType(groupSaved && groupSaved._id, groupSaved && groupSaved.name, `members:${(body.users || []).length}`));
        /* SDA CUSTOM */ if ((body.users || []).length > 0) {
        /* SDA CUSTOM */   insertServerLog(req, 'info', 'GroupMembershipChanged', req.user.name, buildGroupLogType(groupSaved && groupSaved._id, groupSaved && groupSaved.name, `membership:0->${(body.users || []).length}`));
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */ // END SDA CUSTOM

        res.status(201).json({ ok: true, group: groupSaved })
      })
    } catch (err) {
      next(err)
    }
  }

  static async updateGroup (req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body

      Group.findById(req.params.id, (err, group: IGroup) => {
        if (err) {
          return next(new HttpException(500, 'Group not found'))
        }

        if (!group) {
          return next(
            new HttpException(400, `Group with id ${req.params.id} not found`)
          )
        }

        /* SDA CUSTOM */ // SDA CUSTOM - Capture previous group values to audit updates
        /* SDA CUSTOM */ const previousName = group.name;
        /* SDA CUSTOM */ const previousUsers = ((group.users || []) as any[]).map(user => user.toString()).sort();
        /* SDA CUSTOM */ // END SDA CUSTOM

        group.name = body.name
        group.users = body.users
        req.params.id === '135792467811111111111110' ? group.role = 'EDA_ADMIN_ROLE' : group.role = 'EDA_USER_ROLE';

        group.save(async (err, groupSaved: IGroup) => {
          if (err) {
            return next(new HttpException(500, 'Error updating the group'))
          }

          // Borrem de tots els usuaris el grup actualitzat
          await User.updateMany(
            {},
            { $pull: { role: { $in: [req.params.id] } } }
          )
          // Introduim de nou als usuaris seleccionat el grup actualitzat
          await User.updateMany(
            { _id: { $in: body.users } },
            { $push: { role: req.params.id } }
          ).exec()

          /* SDA CUSTOM */ // SDA CUSTOM - Audit log for group update and membership changes
          /* SDA CUSTOM */ const currentUsers = ((body.users || []) as any[]).map(user => user.toString()).sort();
          /* SDA CUSTOM */ insertServerLog(req, 'info', 'GroupUpdated', req.user.name, buildGroupLogType(groupSaved && groupSaved._id, groupSaved && groupSaved.name, `updated_from:${previousName}`));
          /* SDA CUSTOM */ if (!areStringArraysEqual(previousUsers, currentUsers)) {
          /* SDA CUSTOM */   insertServerLog(req, 'info', 'GroupMembershipChanged', req.user.name, buildGroupLogType(groupSaved && groupSaved._id, groupSaved && groupSaved.name, `membership:${previousUsers.length}->${currentUsers.length}`));
          /* SDA CUSTOM */ }
          /* SDA CUSTOM */ // END SDA CUSTOM

          return res.status(200).json({ ok: true, group: groupSaved })
        })
      })
    } catch (err) {
      next(err)
    }
  }

  static async deleteGroup (req: Request, res: Response, next: NextFunction) {
    try {
      await Dashboard.updateOne({}, { $pull: { group: req.params.id } }).exec()
      await User.updateOne(
        { role: req.params.id },
        { $pull: { role: { $in: [req.params.id] } } }
      ).exec()
      let options: QueryOptions = {}

      Group.findByIdAndDelete(
        req.params.id,
        options,
        async (err, groupDeleted: IGroup) => {
          if (err) {
            return next(new HttpException(500, 'Error removing group'))
          }

          if (!groupDeleted) {
            return next(new HttpException(400, 'Group not exists'))
          }

          /* SDA CUSTOM */ // SDA CUSTOM - Audit log for group deletion
          /* SDA CUSTOM */ insertServerLog(req, 'info', 'GroupDeleted', req.user.name, buildGroupLogType(groupDeleted && groupDeleted._id, groupDeleted && groupDeleted.name, 'deleted'));
          /* SDA CUSTOM */ // END SDA CUSTOM

          return res.status(200).json({ ok: true })
        }
      )
    } catch (err) {
      next(err)
    }
  }

  /**
   * Esta función borra un grupo que ya no está en el Active Directory
   */
  static async deleteGroupFromAD ( grupo:string ) {
    
    try {
      let groupId =  await  GroupController.getLocalGroupsIds( [grupo] );
      await Dashboard.updateOne({}, { $pull: { group: groupId[0] } }).exec()
      await User.updateOne(
        { role: groupId[0] },
        { $pull: { role: { $in: [groupId[0]] } } }
      ).exec()
      let options: QueryOptions = {}

      Group.findByIdAndDelete(
        groupId[0] ,
        options,
        async (err, groupDeleted: IGroup) => {
          if (err) {
            console.log( 'Error removing group');
          }

          if (!groupDeleted) {
            console.log( 'Group not exists');
          }

          return grupo;
        }
      )
    } catch (err) {
      console.log( err);
    }
  }

}

/* SDA CUSTOM */ // SDA CUSTOM - Centralized server log writer for group audit events
/* SDA CUSTOM */ function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
/* SDA CUSTOM */   const ip = req.headers['x-forwarded-for'] || req.get('origin');
/* SDA CUSTOM */   var date = new Date();
/* SDA CUSTOM */   var month = date.getMonth() + 1;
/* SDA CUSTOM */   var monthstr = month < 10 ? '0' + month.toString() : month.toString();
/* SDA CUSTOM */   var day = date.getDate();
/* SDA CUSTOM */   var daystr = day < 10 ? '0' + day.toString() : day.toString();
/* SDA CUSTOM */   var date_str = date.getFullYear() + '-' + monthstr + '-' + daystr + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
/* SDA CUSTOM */   ServerLogService.log({ level, action, userMail, ip, type, date_str });
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM

/* SDA CUSTOM */ // SDA CUSTOM - Build normalized payload for group audit events
/* SDA CUSTOM */ function buildGroupLogType(targetGroupId: any, targetGroupName: string, extra?: string) {
/* SDA CUSTOM */   const safeId = (targetGroupId || '').toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */   const safeName = (targetGroupName || '-').toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */   if (!extra) return `${safeId}--${safeName}`;
/* SDA CUSTOM */   const safeExtra = extra.toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */   return `${safeId}--${safeName}--${safeExtra}`;
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM

/* SDA CUSTOM */ // SDA CUSTOM - Compare two string arrays regardless of order
/* SDA CUSTOM */ function areStringArraysEqual(first: string[], second: string[]) {
/* SDA CUSTOM */   if ((first || []).length !== (second || []).length) return false;
/* SDA CUSTOM */   for (let i = 0; i < first.length; i++) {
/* SDA CUSTOM */     if (first[i] !== second[i]) return false;
/* SDA CUSTOM */   }
/* SDA CUSTOM */   return true;
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM
