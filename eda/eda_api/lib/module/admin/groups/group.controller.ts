import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { HttpException } from '../../global/model/index';
import Group, { IGroup } from './model/group.model';
import User from '../users/model/user.model';
import Dashboard from '../../dashboard/model/dashboard.model';
import { QueryOptions } from 'mongoose';


export class GroupController {

    static async getGroups(req: Request, res: Response, next: NextFunction) {
        try {
            Group.find({}).exec((err, groups: IGroup[]) => {
                if (err) {
                    return next(new HttpException(500, 'Error loading groups'));
                }

                return res.status(200).json(groups);
            }
            );
        } catch (err) {
            next(err);
        }
    }

    static async getMineGroups(req: Request, res: Response, next: NextFunction) {
        try {
            const groupss = await Group.find({ users: { $in: req.user._id } }).exec();
            const isAdmin = groupss.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;

            let groups: IGroup[] = [];

            if (isAdmin) {
                groups = await Group.find({}, 'name role users').exec();
            } else {
                groups = await Group.find({ 'users': { $in: req.user._id } }, 'name role users').exec();
            }

            return res.status(200).json(groups);
        } catch (err) {
            next(err);
        }
    }

    static async getGroup(req: Request, res: Response, next: NextFunction) {

        try {
            Group.findById({ _id: req.params.id }, async (err, group: IGroup) => {
                if (err) {
                    return next(new HttpException(400, 'Error loading the group'));
                }

                group.users = await User.find({ 'role': { $in: group._id } }, 'name email img role').exec();

                return res.status(200).json(group);
            });
        } catch (err) {
            next(err);
        }
    }

    static async createGroup(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;

            const group: IGroup = new Group({
                name: body.name,
                role: "EDA_USER_ROLE",
                users: body.users,
                img: body.img
            });

            // return res.status(201).json({ok: true});
            group.save(async (err, groupSaved: IGroup) => {
                if (err) {
                    return next(new HttpException(400, 'Some error ocurred while creating the Group'));
                }

                if (body.users.length > 0) {
                    await User.updateMany({ _id: { $in: body.users } }, { $push: { role: groupSaved._id } }).exec();
                }

                res.status(201).json({ ok: true, group: groupSaved });
            });
        } catch (err) {
            next(err);
        }
    }

    static async updateGroup(req: Request, res: Response, next: NextFunction) {
        try {
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
                group.role = "EDA_USER_ROLE";

                group.save(async (err, groupSaved: IGroup) => {
                    if (err) {
                        return next(new HttpException(500, 'Error updating the group'));
                    }

                    // Borrem de tots els usuaris el grup actualitzat
                    await User.updateMany({}, { $pull: { role: { $in: [req.params.id] } } });
                    // Introduim de nou als usuaris seleccionat el grup actualitzat
                    await User.updateMany({ _id: { $in: body.users } }, { $push: { role: req.params.id } }).exec();

                    return res.status(200).json({ ok: true, group: groupSaved });
                });

            });
        } catch (err) {
            next(err);
        }
    }

    static async deleteGroup(req: Request, res: Response, next: NextFunction) {
        try {
            await Dashboard.updateOne({}, { $pull: { group: req.params.id } }).exec();
            await User.updateOne({ role: req.params.id }, { $pull: { role: { $in: [req.params.id] } } }).exec();
            let options:QueryOptions = {};

            Group.findByIdAndDelete(req.params.id, options, async (err,  groupDeleted: IGroup) => {
                if (err) {
                    return next(new HttpException(500, 'Error removing group'));
                }

                if (!groupDeleted) {
                    return next(new HttpException(400, 'Group not exists'));
                }

                return res.status(200).json({ ok: true });
            });
        } catch (err) {
            next(err);
        }
    }

}
