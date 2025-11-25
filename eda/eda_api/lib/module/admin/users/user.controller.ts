import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import User, { IUser } from './model/user.model';
import Group, { IGroup } from '../groups/model/group.model';
import ServerLogService from '../../../services/server-log/server-log.service';
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';
import { GroupController } from '../groups/group.controller';



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

            insertServerLog(req, 'info', 'newLogin', body.email, 'attempt');

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
                                    insertServerLog(req, 'info', 'newLogin', body.email, 'login');
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
                            const userSaved = userEda.save();
                            Object.assign(user, userSaved);
                            user.password = ':)';
                            token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours

                            // Borrem de tots els grups el usuari actualitzat
                            await Group.updateMany({}, { $pull: { users: (await userSaved)._id } });
                            // Introduim de nou els grups seleccionat al usuari actualitzat
                            await Group.updateMany({ _id: { $in: adGroupsInMongo } }, { $push: { users: (await userSaved)._id } });
                            return res.status(200).json({ user, token: token, id: user._id });
                        } catch (error) {
                            return next(new HttpException(400, 'Some error ocurred while creating the User'));
                        }
                    }
            } else {
                // Si no ho troba, login amb mongo
                const userEda = await UserController.getUserInfoByEmail(body.email, false);

                if (! await bcrypt.compareSync(body.password, userEda.password)) {

                    
                            return next(new HttpException(400, 'Incorrect credentials - password'));
      
                            
                    
                }

                    Object.assign(user, userEda);
                    user.password = ':)';
                    token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours

                    insertServerLog(req, 'info', 'newLogin', body.email, 'login');

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

            return res.status(200).json({ ok: true, user: userSaved });

        } catch (err) {
            return next(new HttpException(500, 'Error updating user'));
        }
    }


    static async delete(req: Request, res: Response, next: NextFunction) {
        let options: QueryOptions = {};
        try {
            const userRemoved = await User.findByIdAndDelete();

            if (!userRemoved) {
                return next(new HttpException(400, 'Not exists user with this id'));
            }
            return res.status(200).json({ ok: true, user: userRemoved });
        } catch (err) {
            return next(new HttpException(500, 'Error removing an user'));
        }
    }

    static async provideToken(req: Request, res: Response, next: NextFunction) {
        try {
            // Buscar el usuario
            const user = await User.findOne(
                { email: req.params.usermail },
                'name email img role google'
            );

            if (!user) {
                return next(new HttpException(404, `User with this email not found`));
            }

            // Crear token JWT
            const token = jwt.sign({ user }, SEED, { expiresIn: 3600 }); // 1 hora

            return res.status(200).json({ user, token, id: user._id });

        } catch (err) {
            return next(new HttpException(500, 'Error generating token'));
        }
    }


    static async provideFakeToken(){
        let token = await jwt.sign({ name:'fakeuser' }, SEED, { expiresIn: 60 });
        return token;
    }

}

function insertServerLog(req: Request, level: string, action: string, userMail: string, type: string) {
    const ip = req.headers['x-forwarded-for'] || req.get('origin')
    var date = new Date();
    var month =date.getMonth()+1 ;
    var monthstr=month<10?"0"+month.toString(): month.toString();
    var day = date.getDate();
    var daystr=day<10?"0"+day.toString(): day.toString();
    var date_str = date.getFullYear() + "-" + monthstr + "-" + daystr + " " +  date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    ServerLogService.log({ level, action, userMail, ip, type, date_str});
}
