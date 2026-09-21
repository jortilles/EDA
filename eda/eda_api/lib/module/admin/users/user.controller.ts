import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import User, { IUser } from './model/user.model';
import Group, { IGroup } from '../groups/model/group.model';
import { insertServerLog } from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';
import { GroupController } from '../groups/group.controller';
import { PluginRegistry } from '../../../plugins';



const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');


export class UserController {


    static async login(req: Request, res: Response, next: NextFunction) {

        try {
            const body = req.body;
            let token: string;
            let user: IUser = new User({ name: '', email: '', password: '', img: '', role: [] });

            // Busca artxiu de configuracio activedirectory
            const ldapPath = path.resolve(__dirname, `../../../../config/activedirectory.json`);

            if (fs.existsSync(ldapPath)) {
                    // Si el troba, login amb activedirectory
                    // Obtenim informacio del activedirectory

                    if(body.email.toString()=='edaanonim@jortilles.com'){
                        //anonymous login does not search the user in ldap.
                                    const userEda = await UserController.getUserInfoByEmail(body.email, false);

                                    if (! await bcrypt.compareSync(body.password, userEda.password)) {
                                                return next(new HttpException(400, 'Incorrect credentials - password'));                                   
                                    }
                                    Object.assign(user, userEda);
                                    user.password = ':)';
                                    token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours
                                    insertServerLog(req, 'info', 'newLogin', user.name.toString(), 'login');
                                    return res.status(200).json({ user, token: token, id: user._id });

                    } 
                    
                    const myUser = await ActiveDirectoryService.getUserName(body.email);                
                    const userAD = await ActiveDirectoryService.login(myUser, body.password);

                    // em porto tots els grups del AD per sincronitzar.....
                    const groupsAD = await ActiveDirectoryService.getADGroups( );
                    GroupController.syncroGroupsFromAD(groupsAD) ;
                    const adGroupsInMongo = await GroupController.getLocalGroupsIds(userAD.groups);
                    //Si es admin.... el fico al meu admin
                    
                    if (userAD.adminRole) {
                        // EL GRUPO ADMIN DE EDA ES FIJO.
                        adGroupsInMongo.push("135792467811111111111110");
                    }
                    // Busquem si l'usuari ja el tenim registrat al mongo
                    const userEda = await UserController.getUserInfoByEmail(userAD.username, true);

                    if (!userEda) {
                        // Si no esta registrat, l'afegim
                        const userToSave: IUser = new User({
                            name: userAD.displayName,
                            email: userAD.username,
                            password: bcrypt.hashSync('no_serveix_de_re_pero_no_pot_ser_null', 10),
                            img: body.img,
                            role: adGroupsInMongo,
                            creation_date: new Date()
                        });
                        const userSaved = await userToSave.save();
                        if (!userSaved)
                            return next(new HttpException(400, 'Some error ocurred while creating the User'));

                        Object.assign(user, userSaved);
                        user.password = ':)';
                        token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours
                        // Borrem de tots els grups el usuari actualitzat
                        await Group.updateMany({}, { $pull: { users: userSaved._id } });
                        // Introduim de nou els grups seleccionat al usuari actualitzat
                        await Group.updateMany({ _id: { $in: adGroupsInMongo } }, { $push: { users: userSaved._id } });
                        return res.status(200).json({ user, token: token, id: user._id });
                    } else {
                        // Si esta registrat, actualitzem algunes dades
                        userEda.name = userAD.displayName;
                        userEda.email = userAD.username;
                        userEda.password = userEda.password;
                        userEda.role = adGroupsInMongo;
                        try {
                            const userSaved = await userEda.save();
                            Object.assign(user, userSaved.toObject ? userSaved.toObject() : userSaved);
                            user.password = ':)';
                            token = jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours

                            // Borrem de tots els grups el usuari actualitzat
                            await Group.updateMany({}, { $pull: { users: (userSaved)._id } });
                            // Introduim de nou els grups seleccionat al usuari actualitzat
                            await Group.updateMany({ _id: { $in: adGroupsInMongo } }, { $push: { users: (userSaved)._id } });
                            return res.status(200).json({ user, token: token, id: user._id });
                        } catch (error) {
                            return next(new HttpException(400, 'Some error ocurred while creating the User'));
                        }
                    }
            } else {
                // Si no ho troba, login amb mongo
                const userEda = await UserController.getUserInfoByEmail(body.email, false);

                if (! await bcrypt.compareSync(body.password, userEda.password)) {
                    let validLegacyPassword = false;
                    try {
                        const authPlugin = PluginRegistry.getAuthPlugins().find(plugin => plugin.isEnabled());
                        validLegacyPassword = !!authPlugin
                            && await authPlugin.verifyLegacyPassword(body.password, userEda.password.toString());
                    } catch (err) {
                        validLegacyPassword = false;
                    }

                    if (!validLegacyPassword) {
                        return next(new HttpException(400, 'Incorrect credentials - password'));
                    }
                }

                    Object.assign(user, userEda);
                    user.password = ':)';
                    token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours

                    insertServerLog(req, 'info', 'newLogin', user.name.toString(), 'login');

                    return res.status(200).json({ user, token: token, id: user._id });
                
            }
        } catch (err) {
            next(err);
        }
    }


    static async getUserInfoByEmail(usuari: string, ad: boolean): Promise<IUser | null> {
        try {
            const user = await User.findOne({ email: usuari });

            if (!user && !ad) {
                throw new HttpException(400, 'Incorrect user');
            }

            // Si no existe el usuario pero es AD, devolvemos null
            return user || null;

        } catch (err) {
            if (err instanceof HttpException) {
                throw err;
            }
            throw new HttpException(500, 'Login error');
        }
    }


    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;
            const user: IUser = new User({
                name: body.name,
                email: body.email,
                password: bcrypt.hashSync(body.password, 10),
                img: body.img,
                role: body.role
            });

            const userSaved = await user.save();

            if (!userSaved) {
                return next(new HttpException(400, 'Some error ocurred while creating the User'));
            }
            // Borrem de tots els grups el usuari actualitzat
            await Group.updateMany({}, { $pull: { users: userSaved._id } });
            // Introduim de nou els grups seleccionat al usuari actualitzat
            await Group.updateMany({ _id: { $in: body.role } }, { $push: { users: userSaved._id } });

            insertServerLog(req, 'info', 'UserCreated', req.user.name.toString(), buildUserLogType(userSaved?._id, userSaved?.email, userSaved?.name, `roles:${(body.role || []).length}`));

            return res.status(201).json({ ok: true, user: userSaved, userToken: req.user });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    static async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const token = jwt.sign({ user: req.user }, SEED, { expiresIn: 14400 }); // 4 hours
            return res.status(200).json({ ok: true, token });
        } catch (err) {
            next(err);
        }
    }

    static async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const userID = req.user._id;

            // Verificar si el usuario es admin
            const groupsOfUser = await Group.find({ users: { $in: userID } });
            const isAdmin = groupsOfUser.some(g => g.role === 'EDA_ADMIN_ROLE');

            // Traer todos los usuarios
            let users = await User.find({}, 'name email img role google');

            // Traer todos los grupos
            const allGroups = await Group.find({}, 'name role');

            // Mapear roles de cada usuario a los grupos
            let usersRoles = users.map(user => {
                const groupsUsers = user.role.map(role =>
                    allGroups.find(group => group._id.toString() === role.toString())
                );
                return { ...user.toObject(), role: groupsUsers };
            });

            // Filtrar usuarios si no es admin
            if (!isAdmin) {
                usersRoles = UserController.filterUsersByGroup(req.user, users);
            }

            return res.status(200).json(usersRoles);

        } catch (err) {
            return next(new HttpException(500, 'Error loading users'));
        }
    }


    /**Get all users who belong to the same grup as user */
    static filterUsersByGroup(user, users) {

        let filteredUsers = [user];

        user.role.forEach(Role => {

            users.forEach(user => {

                if (!filteredUsers.map(user => user._id).includes(user._id) && user.role.filter(role => !!role).map(role => role._id).includes(Role)) {
                    filteredUsers.push(user);
                }
            });
        });

        return filteredUsers;

    }

    static async getUser(req: Request, res: Response, next: NextFunction) {
        try {
            // Obtener el usuario
            const user = await User.findById(req.params.id);
            if (!user) {
                return next(new HttpException(500, 'User not found with this id'));
            }

            // Obtener los grupos del usuario
            const groups = await Group.find(
                { _id: { $in: user.role } },
                'name role'
            );

            user.role = groups;
            user.password = ':)';
            return res.status(200).json({ ok: true, user });
        } catch (err) {
            next(new HttpException(500, 'Error waiting for user groups'));
        }
    }



    static async getIsAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            // Buscar el usuario
            const user = await User.findById(req.params.id);
            if (!user) {
                return next(new HttpException(500, 'User not found with this id'));
            }

            // Buscar los grupos del usuario
            const groups = await Group.find(
                { _id: { $in: user.role } },
                'name role'
            );

            // Verificar si es admin
            const isAdmin = groups.some(g => g.role === 'EDA_ADMIN_ROLE');

            return res.status(200).json({ isAdmin });

        } catch (err) {
            next(new HttpException(500, 'Error waiting for user groups'));
        }
    }



    static async getIsDataSourceCreator(req: Request, res: Response, next: NextFunction) {
                try {
            // Buscar el usuario
            const user = await User.findById(req.params.id);
            if (!user) {
                return next(new HttpException(500, 'User not found with this id'));
            }

            // Buscar los grupos del usuario
            const groups = await Group.find(
                { _id: { $in: user.role } },
                'name role'
            );

            // Verificar si es dataSourceCreator
            const isDataSourceCreator = groups.filter(g => g.name === 'EDA_DATASOURCE_CREATOR').length > 0;
            return res.status(200).json({ isDataSourceCreator });
        } catch (err) {
            next(new HttpException(500, 'Error waiting for user groups'));
        }
    };

    static async findProfileImg(req: Request, res: Response, next: NextFunction) {
        try {
            const img = req.params.img;

            const ROOT_PATH = process.cwd();
            const uploadsPath = path.join(ROOT_PATH, 'lib/module/uploads/images', img);

            if (fs.existsSync(uploadsPath)) {
                res.sendFile(uploadsPath);
            } else {
                const pathNoImage = path.resolve(__dirname, `../../../assets/no-img.jpg`);
                res.sendFile(pathNoImage);
            }
        } catch (err) {
            next(err);
        }
    };

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const body = req.body;

            // Buscar el usuario
            const user = await User.findById(req.params.id);

            if (!user) {
                return next(new HttpException(400, `User with this id not found`));
            }

            // Capturamos valores previos para auditar cambios sensibles
            const previousEmail = user.email;
            const previousName = user.name;
            const previousRoles = ((user.role || []) as any[]).map(role => String(role)).filter(r => r).sort();
            const isPasswordUpdated = !!(body.password && body.password !== '');

            // Actualizar campos
            user.name = body.name;
            user.email = body.email;
            user.role = body.role;

            // Actualizar password si existe
            if (body.password && body.password !== '') {
                user.password = bcrypt.hashSync(body.password, 10);
            }

            // Guardar cambios
            const userSaved = await user.save();

            // Eliminar el usuario de todos los grupos
            await Group.updateMany(
                {},
                { $pull: { users: req.params.id } }
            );

            // Agregar el usuario a los grupos seleccionados
            await Group.updateMany(
                { _id: { $in: body.role } },
                { $push: { users: req.params.id } }
            );

            // No devolver el password real
            userSaved.password = ':)';

            const currentRoles = body.role !== undefined
                ? ((body.role || []) as any[]).map(role => role && role._id ? String(role._id) : String(role)).filter(r => r).sort()
                : previousRoles;
            insertServerLog(req, 'info', 'UserUpdated', req.user.name.toString(), buildUserLogType(userSaved?._id, userSaved?.email, userSaved?.name, `updated_from:${previousEmail}`));
            if (!areStringArraysEqual(previousRoles, currentRoles)) {
                insertServerLog(req, 'info', 'UserRolesChanged', req.user.name.toString(), buildUserLogType(userSaved?._id, userSaved?.email, userSaved?.name, `roles:${previousRoles.length}->${currentRoles.length}`));
            }
            if (isPasswordUpdated) {
                insertServerLog(req, 'info', 'UserPasswordChanged', req.user.name.toString(), buildUserLogType(userSaved?._id, userSaved?.email, userSaved?.name, `password_changed_for:${previousName}`));
            }

            return res.status(200).json({ ok: true, user: userSaved });

        } catch (err) {
            return next(new HttpException(500, 'Error updating user'));
        }
    }


    static async delete(req: Request, res: Response, next: NextFunction) {

        try {
            const {id} = req.params; // id del usuario que se desea eliminar
            const userRemoved = await User.findByIdAndDelete(id);

            if (!userRemoved) {
                return next(new HttpException(400, 'Not exists user with this id'));
            }

            insertServerLog(req, 'info', 'UserDeleted', req.user.name.toString(), buildUserLogType(userRemoved?._id, userRemoved?.email, userRemoved?.name, `deleted--id:${userRemoved?._id}`));

            return res.status(200).json({ ok: true, user: userRemoved });
        } catch (err) {
            return next(new HttpException(500, 'Error removing an user'));
        }
    }

    static async provideToken(req: Request, res: Response, next: NextFunction) {
        try {
            // Buscar el usuario
            const userDoc = await User.findOne(
                { email: req.params.usermail },
                'name email img role google'
            );

            if (!userDoc) {
                return next(new HttpException(404, `User with this email not found`));
            }

            // fake-login sólo lo usa el render del PDF de mailing: el destinatario debe ver el
            // informe con los mismos permisos de grupo que tendría al hacer login. User.role puede
            // estar desactualizado, así que añadimos todo grupo cuya lista `users` lo contenga.
            const memberGroups = await Group.find({ users: userDoc._id }, '_id');
            const roleIds = new Set<string>((userDoc.role || []).map((r: any) => String(r)));
            memberGroups.forEach(g => roleIds.add(String(g._id)));
            const user = { ...userDoc.toObject(), role: Array.from(roleIds) };

            // Crear token JWT
            const token = jwt.sign({ user }, SEED, { expiresIn: 3600 }); // 1 hora

            return res.status(200).json({ user, token, id: user._id });

        } catch (err) {
            return next(new HttpException(500, 'Error generating token'));
        }
    }


    static async provideFakeToken(){
        // 30 min: this token is generated once per mailing batch and reused for every
        // dashboard/recipient combination, each involving a Playwright render + PDF export.
        let token = await jwt.sign({ name:'fakeuser' }, SEED, { expiresIn: 60 });
        return token;
    }

}

// Build normalized payload for user audit events
function buildUserLogType(targetUserId: any, targetUserEmail: any, targetUserName: any, extra?: any) {
    const safeId = (targetUserId || '').toString().replace(/\|,\|/g, ' ');
    const safeEmail = (targetUserEmail || '-').toString().replace(/\|,\|/g, ' ');
    const safeName = (targetUserName || '-').toString().replace(/\|,\|/g, ' ');
    if (!extra) return `${safeId}--${safeEmail}--${safeName}`;
    const safeExtra = extra.toString().replace(/\|,\|/g, ' ');
    return `${safeId}--${safeEmail}--${safeName}--${safeExtra}`;
}

// Compare two string arrays regardless of order
function areStringArraysEqual(first: string[], second: string[]) {
    if ((first || []).length !== (second || []).length) return false;
    for (let i = 0; i < first.length; i++) {
        if (first[i] !== second[i]) return false;
    }
    return true;
}
