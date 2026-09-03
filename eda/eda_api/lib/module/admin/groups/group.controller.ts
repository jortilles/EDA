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
import ServerLogService from '../../../services/server-log/server-log.service'

const PROTECTED_GROUP_IDS = new Set([
  '135792467811111111111110', // EDA_ADMIN_ROLE
  '135792467811111111111113', // EDA_RO
  '135792467811111111111115', // EDA_DATASOURCE_CREATOR
]);

export class GroupController {


  static async getGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await Group.find({});
      return res.status(200).json(groups);
    } catch (err) {
      return next(new HttpException(500, 'Error loading groups'));
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
  static async getGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return next(new HttpException(400, 'Group not found'));
    }

    group.users = await User.find(
      { role: { $in: group._id } },
      'name email img role'
    );

    return res.status(200).json(group);

  } catch (err) {
    return next(err);
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
    return group._id.toString();

  }


  static async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body
      const group: IGroup = new Group({
        name: body.name,
        role: body.role.value,
        users: body.users,
        img: body.img,
        source: body.source
      })
      // return res.status(201).json({ok: true});
      try {
        const groupSaved = await group.save();

        if (body.users.length > 0) {
          await User.updateMany(
            { _id: { $in: body.users } },
            { $push: { role: groupSaved._id } }
          );
        }

        insertServerLog(req, 'info', 'GroupCreated', req.user.name.toString(), buildGroupLogType(groupSaved?._id, groupSaved?.name, `members:${(body.users || []).length}`));
        if ((body.users || []).length > 0) {
          insertServerLog(req, 'info', 'GroupMembershipChanged', req.user.name.toString(), buildGroupLogType(groupSaved?._id, groupSaved?.name, `membership:0->${(body.users || []).length}`));
        }

        return res.status(201).json({ ok: true, group: groupSaved });

      } catch (err) {
        return next(
          new HttpException(
            400,
            'Some error ocurred while creating the Group'
          )
        );
      }

    } catch (err) {
      next(err)
    }
  }



  static async updateGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;

      // Buscar grupo sin callback
      const group = await Group.findById(req.params.id);

      if (!group) {
        return next(
          new HttpException(400, `Group with id ${req.params.id} not found`)
        );
      }

      // Capturamos valores previos para auditar cambios
      const previousName = group.name;
      const previousUsers = ((group.users || []) as any[]).map(user => user.toString()).sort();

      // Actualizar campos
      group.name = body.name;
      group.users = body.users;
      req.params.id === '135792467811111111111110' ? group.role = 'EDA_ADMIN_ROLE' : group.role = 'EDA_USER_ROLE';
      // Guardar grupo
      const groupSaved = await group.save();

      // Eliminar el grupo actual de todos los usuarios
      await User.updateMany(
        {},
        { $pull: { role: { $in: [req.params.id] } } }
      );

      // Agregar el grupo a los usuarios seleccionados
      await User.updateMany(
        { _id: { $in: body.users } },
        { $push: { role: req.params.id } }
      );

      const currentUsers = ((body.users || []) as any[]).map(user => user.toString()).sort();
      insertServerLog(req, 'info', 'GroupUpdated', req.user.name.toString(), buildGroupLogType(groupSaved?._id, groupSaved?.name, `updated_from:${previousName}`));
      if (!areStringArraysEqual(previousUsers, currentUsers)) {
        insertServerLog(req, 'info', 'GroupMembershipChanged', req.user.name.toString(), buildGroupLogType(groupSaved?._id, groupSaved?.name, `membership:${previousUsers.length}->${currentUsers.length}`));
      }

      return res.status(200).json({ ok: true, group: groupSaved });

    } catch (err) {
      return next(new HttpException(500, 'Error updating the group'));
    }
  }


  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
    if (PROTECTED_GROUP_IDS.has(req.params.id)) {
      return next(new HttpException(403, 'This group is protected and cannot be deleted'));
    }

    // Quitar el grupo de los dashboards
    await Dashboard.updateOne({}, { $pull: { group: req.params.id } });

    // Quitar el grupo de los usuarios que lo tienen
    await User.updateOne(
      { role: req.params.id },
      { $pull: { role: req.params.id } }
    );

    // Borrar el grupo
    const groupDeleted = await Group.findByIdAndDelete(req.params.id);

    if (!groupDeleted) {
      return next(new HttpException(400, 'Group does not exist'));
    }

    insertServerLog(req, 'info', 'GroupDeleted', req.user.name.toString(), buildGroupLogType(groupDeleted?._id, groupDeleted?.name, 'deleted'));

    return res.status(200).json({ ok: true });

  } catch (err) {
    return next(new HttpException(500, 'Error removing group'));
  }
}


  /**
   * Esta función borra un grupo que ya no está en el Active Directory
   */
  static async deleteGroupFromAD(grupo: string): Promise<string> {
    try {
      const groupIds = await GroupController.getLocalGroupsIds([grupo]);
      const groupId = groupIds[0];

      if (!groupId) {
        console.log('Group not found locally');
        return grupo;
      }

      // Quitar el grupo de los dashboards
      await Dashboard.updateOne({}, { $pull: { group: groupId } });

      // Quitar el grupo de los usuarios
      await User.updateOne(
        { role: groupId },
        { $pull: { role: groupId } }
      );

      // Borrar el grupo
      const groupDeleted = await Group.findByIdAndDelete(groupId);

      if (!groupDeleted) {
        console.log('Group does not exist');
      } else {
        console.log(`Group ${grupo} deleted successfully`);
      }

      return grupo;

    } catch (err) {
      console.error('Error deleting group:', err);
      return grupo;
    }
  }
}

function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
  const ip = req.headers['x-forwarded-for'] || req.get('origin');
  var date = new Date();
  var month = date.getMonth() + 1;
  var monthstr = month < 10 ? '0' + month.toString() : month.toString();
  var day = date.getDate();
  var daystr = day < 10 ? '0' + day.toString() : day.toString();
  var date_str = date.getFullYear() + '-' + monthstr + '-' + daystr + ' ' + date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds();
  ServerLogService.log({ level, action, userMail, ip, type, date_str });
}

// Build normalized payload for group audit events
function buildGroupLogType(targetGroupId: any, targetGroupName: string, extra?: string) {
  const safeId = (targetGroupId || '').toString().replace(/\|,\|/g, ' ');
  const safeName = (targetGroupName || '-').toString().replace(/\|,\|/g, ' ');
  if (!extra) return `${safeId}--${safeName}`;
  const safeExtra = extra.toString().replace(/\|,\|/g, ' ');
  return `${safeId}--${safeName}--${safeExtra}`;
}

// Compare two string arrays regardless of order
function areStringArraysEqual(first: string[], second: string[]) {
  if ((first || []).length !== (second || []).length) return false;
  for (let i = 0; i < first.length; i++) {
    if (first[i] !== second[i]) return false;
  }
  return true;
}
