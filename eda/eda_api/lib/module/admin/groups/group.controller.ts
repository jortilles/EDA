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


  static async createGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body
      const group: IGroup = new Group({
        name: body.name,
        role: body.role.value,
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



        group.name = body.name;
        group.users = body.users;
        group.role = body.role;

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
