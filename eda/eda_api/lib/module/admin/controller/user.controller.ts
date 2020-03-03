import {NextFunction, Request, Response} from 'express';
import {IUserRequest} from '../../global/model/user-request.model';
import User, {IUser} from '../model/user.model';
import Group, { IGroup } from '../model/group.model';
import HttpException from '../../global/model/http-exception.model';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../../../services/logging/logging'

const jwt = require ('jsonwebtoken');
const bcrypt = require ('bcryptjs');
const SEED = require('../../../../config/seed').SEED;

export class UserController {

    static async login(req: Request, res: Response, next: NextFunction) {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
        
        const body = req.body;
        
        logger.log({level:'info', action:'newLogin', userMail :  body.email, ip:ip});

        User.findOne({email: body.email}, (err, userDB) => {

            if (err) {
                return next(new HttpException(500, 'User not found with this email'));
            }

            if (!userDB) {
                return next(new HttpException(400, 'Incorrect credentials - email'));
            }

            if (!bcrypt.compareSync(body.password, userDB.password)) {
                return next(new HttpException(400, 'Incorrect credentials - password'));
            }

            userDB.password = ':)';

            const token = jwt.sign({ user: userDB }, SEED, { expiresIn: 14400 }); // 4 hours

            res.status(200).json({
                ok: true,
                user: userDB,
                token: token,
                id: userDB._id
            });
        })
    }

    static async create(req: IUserRequest, res: Response, next: NextFunction) {
        const body = req.body;

        const user: IUser = new User({
            name: body.name,
            email: body.email,
            password: bcrypt.hashSync(body.password, 10),
            img: body.img,
            role: body.role
        });
        user.save(async (err, userSaved) => {
            if (err) {
                return next(new HttpException(400, 'Some error ocurred while creating the User'));
            }
            
            // Borrem de tots els grups el usuari actualitzat
            await Group.updateMany({}, {$pull: {users: userSaved._id}});
            // Introduim de nou els grups seleccionat al usuari actualitzat
            await Group.updateMany({_id: {$in: body.role}}, {$push: {users: userSaved._id}}).exec();

            res.status(201).json({ok: true, user: userSaved, userToken: req.user});
        })
    }

    static async refreshToken(req: IUserRequest, res: Response, next: NextFunction) {
        const token = jwt.sign({ user: req.user }, SEED, { expiresIn: 14400 }); // 4 hours
        res.status(200).json({ok: true, token});
    }

    static async getUsers(req: Request, res: Response, next: NextFunction) {
        User.find({}, 'name email img role google').exec((err, users: IUser[]) => {
            if (err) {
                return next(new HttpException(500, 'Error loading users'));
            }

            Group.find({}, 'name role', (err, groups: IGroup[]) => {
                if (err) {
                    return next(new HttpException(500, 'Error loading users'));
                }

                for (const user of users) {
                    const groupsUsers = [];
                    for (const role of user.role) {
                        groupsUsers.push(groups.find((group: IGroup) => JSON.stringify(role) === JSON.stringify(group._id)));
                    }
                    user.role = groupsUsers;
                }

                return res.status(200).json(users);
            });
        })
    }

    static async getUser(req: Request, res: Response, next: NextFunction) {
        User.findById({_id: req.params.id}, (err, user) => {

            if (err) {
                return next(new HttpException(500, 'User not found with this id'));
            }

            Group.find({_id: { $in:  user.role}}, 'name role', (err, groups) => {
                if (err) {
                    return next(new HttpException(500, 'Error waiting for user groups'));
                }

                const isAdmin = groups.filter(g => g.role === 'ADMIN_ROLE').length > 0;

                user.role = groups;

                user.password = 'password_protected';
                res.status(200).json({ok: true, user});
            });
        });
    }

    static async getIsAdmin(req: Request, res: Response, next: NextFunction) {
        User.findById({_id: req.params.id}, (err, user) => {

            if (err) {
                return next(new HttpException(500, 'User not found with this id'));
            }

            Group.find({_id: { $in:  user.role}}, 'name role', (err, groups) => {
                if (err) {
                    return next(new HttpException(500, 'Error waiting for user groups'));
                }

                const isAdmin = groups.filter(g => g.role === 'ADMIN_ROLE').length > 0;

                res.status(200).json({isAdmin});
            });
        });
    };

    static async findProfileImg(req: Request, res: Response, next: NextFunction) {
        const img = req.params.img;

        const pathImage = path.resolve(__dirname, `../../uploads/users/${img}`);

        if (fs.existsSync(pathImage)) {
            res.sendFile(pathImage);
        } else {
            const pathNoImage = path.resolve(__dirname, `../../../assets/no-img.jpg`);
            res.sendFile(pathNoImage);
        }
    };

    static async update(req: Request, res: Response, next: NextFunction) {
        const body = req.body;

        User.findById(req.params.id, ( err, user: IUser ) => {

            if (err) {
                return next(new HttpException(500, 'Error user not found'));
            }

            if (!user) {
                return next(new HttpException(400, `User with this id not found`));
            }

            user.name = body.name;
            user.email = body.email;
            user.role = body.role;
            if(body.password !== ''){
                user.password =  bcrypt.hashSync(body.password, 10);
            }
            user.save(async (err, userSaved) => {

                if (err) {
                    return next(new HttpException(500, 'Error updating user'));
                }

                // Borrem de tots els grups el usuari actualitzat
                await Group.updateMany({}, {$pull: {users: req.params.id}}).exec();
                // Introduim de nou els grups seleccionat al usuari actualitzat
                await Group.updateMany({_id: {$in: body.role}}, {$push: {users: req.params.id}}).exec();

                userSaved.password = ':)';

                return res.status(200).json({ok: true, user: userSaved});
            });
        });
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        User.findByIdAndDelete(req.params.id, (err, userRemoved) => {

            if (err) {
                return next(new HttpException(500, 'Error removing an user'));
            }

            if (!userRemoved) {
                return next(new HttpException(400, 'Not exists user with this id'));
            }

            return res.status(200).json({ok: true, user: userRemoved});
        });
    }

}
