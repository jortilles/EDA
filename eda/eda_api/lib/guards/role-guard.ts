import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../module/global/model/index';
import Group from '../module/admin/groups/model/group.model';
import _ = require('lodash');



export const roleGuard = async function (req: Request, res: Response, next: NextFunction) {
    
    let userID = req.user._id;

    if ( !_.isNil(userID) ) {
        
        const groups = await Group.find({users: {$in: userID}}).exec();
        
        const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE'  || g.role == 'EDA_DATASOURCE_CREATOR' ).length > 0;

        if (!isAdmin) {
            return next(new HttpException(403, 'You must need to be admin to acces here'));
        } else {
            next();
        }

    } else {
        return next(new HttpException(403, 'Role required'));
    }
};
