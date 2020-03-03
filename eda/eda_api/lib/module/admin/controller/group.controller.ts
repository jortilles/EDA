import {NextFunction, Request, Response} from 'express';
import Group, { IGroup } from '../model/group.model';
import User from '../model/user.model';
import Dashboard from '../../dashboard/model/dashboard.model';
import {IUserRequest} from '../../global/model/user-request.model';
import HttpException from '../../global/model/http-exception.model';


export class GroupController {

    static async getGroups(req: Request, res: Response, next: NextFunction) {
        Group.find({}).exec((err, groups: IGroup[]) => {
                if (err) {
                    return next(new HttpException(500, 'Error loading groups'));
                }

                return res.status(200).json(groups);
            }
        )
    }

    static async getMineGroups(req: IUserRequest, res: Response, next: NextFunction) {
        const groups = await Group.find({users: {$in: req.user._id}}).exec();
        const isAdmin = groups.filter(g => g.role === 'ADMIN_ROLE').length > 0;

        try {
            let groups: IGroup[] = [];

            if (isAdmin) {
                groups = await Group.find({}, 'name role').exec();
            } else {
                groups = await  Group.find({'users': {$in: req.user._id}}, 'name role').exec();
            }

            return res.status(200).json(groups);
        } catch (err) {
            return next(new HttpException(500, 'Error loading groups'));
        }
    }

    static async getGroup(req: Request, res: Response, next: NextFunction) {
        Group.findById({_id: req.params.id}, async (err, group: IGroup) => {
            if (err) {
                return next(new HttpException(400, 'Error loading the group'));
            }

            group.users = await User.find({'role': {$in: group._id}}, 'name email img role').exec();

            return res.status(200).json(group);
        });
    }

    static async createGroup(req: Request, res: Response, next: NextFunction) {
        const body = req.body;

        const group: IGroup = new Group({
            name: body.name,
            role: body.role,
            users: body.users,
            img: body.img
        });

        // return res.status(201).json({ok: true});
        group.save(async (err, groupSaved: IGroup) => {
            if (err) {
                return next(new HttpException(400, 'Some error ocurred while creating the Group'));
            }

            if (body.users.length > 0) {
                await User.updateMany({_id: {$in: body.users}}, {$push: {role: groupSaved._id}}).exec();
            }

            res.status(201).json({ok: true, group: groupSaved});
        })
    }

    static async updateGroup(req: Request, res: Response, next: NextFunction) {
        const body = req.body;

        Group.findById(req.params.id, (err, group: IGroup) => {
            if (err) {
                return next(new HttpException(500, 'Group not found'));
            }

            if (!group) {
                return next(new HttpException(400, `Group with id ${req.params.id} not found`));
            }

            group.name = body.name;
            group.users = body.users;
            group.role = body.role;

            group.save(async (err, groupSaved: IGroup) => {
                if (err) {
                    return next(new HttpException(500, 'Error updating the group'));
                }
                try {
                    // Borrem de tots els usuaris el grup actualitzat
                    await User.updateMany({}, {$pull: {role: req.params.id}});
                    // Introduim de nou als usuaris seleccionat el grup actualitzat
                    await User.updateMany({_id: {$in: body.users}}, {$push: {role: req.params.id}}).exec();

                    return res.status(200).json({ok: true, group: groupSaved});
                } catch (err) {
                    return next(new HttpException(500, 'Error updating the user groups'));
                }

            });

        });
    }

    static async deleteGroup(req: Request, res: Response, next: NextFunction) {
        try {
            await Dashboard.deleteOne({group: req.params.id}).exec();
            await User.updateMany({role: req.params.id}, {$pull: {'role': req.params.id}}).exec();

            Group.findByIdAndDelete(req.params.id, async (err, groupDeleted: IGroup) => {
                if (err) {
                    return next(new HttpException(500, 'Error removing group'))
                }

                if (!groupDeleted) {
                    return next(new HttpException(400, 'Group not exists'));
                }

                return res.status(200).json({ok: true});
            });
        } catch (err) {
            return next(new HttpException(500, 'Error removing dashboards and user from the group'));
        }

    }

}
