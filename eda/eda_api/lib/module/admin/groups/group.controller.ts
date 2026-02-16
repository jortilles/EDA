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

      // Actualizar campos
      group.name = body.name;
      group.users = body.users;
      group.role = body.role;

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

      return res.status(200).json({ ok: true, group: groupSaved });

    } catch (err) {
      return next(new HttpException(500, 'Error updating the group'));
    }
  }


  static async deleteGroup(req: Request, res: Response, next: NextFunction) {
  try {
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
