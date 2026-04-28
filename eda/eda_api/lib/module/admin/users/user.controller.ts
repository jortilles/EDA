import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import { ActiveDirectoryService } from '../../../services/active-directory/active-directory.service';
import User, { IUser } from './model/user.model';
import Group, { IGroup } from '../groups/model/group.model';
// SDA CUSTOM - Use SDA daily log service instead of winston-based service
import ServerLogService from '../../../services/server-log/server-log-sda.service';
// END SDA CUSTOM
import * as path from 'path';
import * as fs from 'fs';
import { QueryOptions } from 'mongoose';
import { GroupController } from '../groups/group.controller';



const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SEED = require('../../../../config/seed').SEED;
const crypto = require('crypto');
const eda_api_config = require('../../../../config/eda_api_config.js');




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
                            role: adGroupsInMongo
                        });
                        userToSave.save(async (err, userSaved) => {
                            if (err) {
                                return next(new HttpException(400, 'Some error ocurred while creating the User'));
                            }
                            Object.assign(user, userSaved);
                            user.password = ':)';
                            token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours
                            // Borrem de tots els grups el usuari actualitzat
                            await Group.updateMany({}, { $pull: { users: userSaved._id } });
                            // Introduim de nou els grups seleccionat al usuari actualitzat
                            await Group.updateMany({ _id: { $in: adGroupsInMongo } }, { $push: { users: userSaved._id } }).exec();
                            return res.status(200).json({ user, token: token, id: user._id });
                        });
                    } else {
                        // Si esta registrat, actualitzem algunes dades
                        userEda.name = userAD.displayName;
                        userEda.email = userAD.username;
                        userEda.password = userEda.password;
                        userEda.role = adGroupsInMongo;
                        userEda.save(async (err, userSaved) => {
                            if (err) {
                                return next(new HttpException(400, 'Some error ocurred while creating the User'));
                            }

                            Object.assign(user, userSaved);
                            user.password = ':)';
                            token = await jwt.sign({ user }, SEED, { expiresIn: 14400 }); // 4 hours

                            // Borrem de tots els grups el usuari actualitzat
                            await Group.updateMany({}, { $pull: { users: userSaved._id } });
                            // Introduim de nou els grups seleccionat al usuari actualitzat
                            await Group.updateMany({ _id: { $in: adGroupsInMongo } }, { $push: { users: userSaved._id } }).exec();
                            return res.status(200).json({ user, token: token, id: user._id });
                        });
                        
                    }
            } else {
                // Si no ho troba, login amb mongo
                const userEda = await UserController.getUserInfoByEmail(body.email, false);
                if (! await bcrypt.compareSync(body.password, userEda.password)) {
// SDA CUSTOM Introduit arrel de SinergiaCRM
// SDA CUSTOM Comprobem també MD5 i GlassFis
// SDA CUSTOM Busca artxiu de configuracio de Sinergia
/**SDA CUSTOM  */  const scrm = path.resolve(__dirname, `../../../../config/sinergiacrm.config.js`);
/**SDA CUSTOM  */  if (fs.existsSync(scrm)) {
/**SDA CUSTOM  */      const hash = crypto.createHash('md5').update(body.password).digest("hex");
/**SDA CUSTOM  */      if(hash.toString() !== userEda.password.toString()){
/**SDA CUSTOM  */              //Si no es un md5 directe 
/**SDA CUSTOM  */              const hash2 =  userEda.password.toString().replace(/^\$2y(.+)$/i, '$2a$1');
/**SDA CUSTOM  */              await bcrypt.compare( hash , hash2).then(function(res){
/**SDA CUSTOM  */                  if( res == false){
/**SDA CUSTOM  */                      return next(new HttpException(400, 'Incorrect credentials - password'));
/**SDA CUSTOM  */                   }
/**SDA CUSTOM  */              });
/**SDA CUSTOM  */      }
/**SDA CUSTOM  */  }else{
/**SDA CUSTOM  */          return next(new HttpException(400, 'Incorrect credentials - password'));
/**SDA CUSTOM  */  }          
                    
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


    static async singleSingnOn(req:Request, res:Response, next:NextFunction){

        console.log('Single Sign On', req.body);
        return res.status(200).json({user:req.body.userMail})
    }

    static async getUserInfoByEmail(usuari: string, ad: boolean): Promise<any> {

        return new Promise((resolve, reject) => {
            User.findOne({ email: usuari }, async (err, user) => {
                if (err) {
                    reject(new HttpException(500, 'Login error'));
                }

                if (!user && !ad) {
                    reject(new HttpException(400, 'Incorrect user'));
                } else if (!user && ad) {
                    resolve(null);
                }

                resolve(user)
            });
        });

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

            user.save(async (err, userSaved) => {
                if (err) {
                    console.log(err);
                    return next(new HttpException(400, 'Some error ocurred while creating the User'));
                }

                // Borrem de tots els grups el usuari actualitzat
                await Group.updateMany({}, { $pull: { users: userSaved._id } });
                // Introduim de nou els grups seleccionat al usuari actualitzat
                await Group.updateMany({ _id: { $in: body.role } }, { $push: { users: userSaved._id } }).exec();

                /* SDA CUSTOM */ // SDA CUSTOM - Audit log for user creation
                /* SDA CUSTOM */ insertServerLog(req, 'info', 'UserCreated', req.user.name, buildUserLogType(userSaved && userSaved._id, userSaved && userSaved.email, userSaved && userSaved.name, `roles:${(body.role || []).length}`));
                /* SDA CUSTOM */ // END SDA CUSTOM

                return res.status(201).json({ ok: true, user: userSaved, userToken: req.user });
            });
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

            let userID = req.user._id;
            const groups = await Group.find({ users: { $in: userID } }).exec();
            const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;

            User.find({}, 'name email img role google').exec((err, users: IUser[]) => {
                if (err) {
                    return next(new HttpException(500, 'Error loading users'));
                }
                let options:QueryOptions = {};
                Group.find({}, 'name role', options, (err, groups: IGroup[]) => {
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

                    users = isAdmin ? users : UserController.filterUsersByGroup(req.user, users);
                    

                    return res.status(200).json(users);
                });
            })
        } catch (err) {
            next(err);
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
            User.findById({ _id: req.params.id }, (err, user) => {

                if (err) {
                    return next(new HttpException(500, 'User not found with this id'));
                }
                /* SDA CUSTOM */ // SDA CUSTOM - Prevent null dereference when user id does not exist
                /* SDA CUSTOM */ if (!user) {
                /* SDA CUSTOM */     return next(new HttpException(400, 'User not found with this id'));
                /* SDA CUSTOM */ }
                /* SDA CUSTOM */ // END SDA CUSTOM
                let options:QueryOptions = {};
                Group.find({ _id: { $in: user.role } }, 'name role', options, (err, groups) => {
                    if (err) {
                        return next(new HttpException(500, 'Error waiting for user groups'));
                    }

                    // const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;

                    user.role = groups;

                    user.password = ':)';
                    return res.status(200).json({ ok: true, user });
                });
            });
        } catch (err) {
            next(err);
        }
    }

    static async getIsAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            User.findById({ _id: req.params.id }, (err, user) => {

                if (err) {
                    return next(new HttpException(500, 'User not found with this id'));
                }
                /* SDA CUSTOM */ // SDA CUSTOM - Prevent null dereference when user id does not exist
                /* SDA CUSTOM */ if (!user) {
                /* SDA CUSTOM */     return next(new HttpException(400, 'User not found with this id'));
                /* SDA CUSTOM */ }
                /* SDA CUSTOM */ // END SDA CUSTOM
                let options:QueryOptions = {};
                Group.find({ _id: { $in: user.role } }, 'name role',options, (err, groups) => {
                    if (err) {
                        return next(new HttpException(500, 'Error waiting for user groups'));
                    }

                    const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;

                    return res.status(200).json({ isAdmin });
                });
            });
        } catch (err) {
            next(err);
        }
    };

    static async getIsDataSourceCreator(req: Request, res: Response, next: NextFunction) {
        try {
            User.findById({ _id: req.params.id }, (err, user) => {

                if (err) {
                    return next(new HttpException(500, 'User not found with this id'));
                }
                /* SDA CUSTOM */ // SDA CUSTOM - Prevent null dereference when user id does not exist
                /* SDA CUSTOM */ if (!user) {
                /* SDA CUSTOM */     return next(new HttpException(400, 'User not found with this id'));
                /* SDA CUSTOM */ }
                /* SDA CUSTOM */ // END SDA CUSTOM
                let options:QueryOptions = {};
                Group.find({ _id: { $in: user.role } }, 'name role',options, (err, groups) => {
                    if (err) {
                        return next(new HttpException(500, 'Error waiting for user groups'));
                    }
                    const isDataSourceCreator = groups.filter(g => g.name === 'EDA_DATASOURCE_CREATOR').length > 0;
                    return res.status(200).json({ isDataSourceCreator });
                });
            });
        } catch (err) {
            next(err);
        }
    };

    static async findProfileImg(req: Request, res: Response, next: NextFunction) {
        try {
            const img = req.params.img;

            const pathImage = path.resolve(__dirname, `../../uploads/users/${img}`);

            if (fs.existsSync(pathImage)) {
                res.sendFile(pathImage);
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
            User.findById(req.params.id, (err, user: IUser) => {

                if (err) {
                    return next(new HttpException(500, 'Error user not found'));
                }

                if (!user) {
                    return next(new HttpException(400, `User with this id not found`));
                }

                /* SDA CUSTOM */ // SDA CUSTOM - Capture previous user values to audit sensitive changes
                /* SDA CUSTOM */ const previousEmail = user.email;
                /* SDA CUSTOM */ const previousName = user.name;
                /* SDA CUSTOM */ const previousRoles = ((user.role || []) as any[]).map(role => String(role)).filter(r => r).sort();
                /* SDA CUSTOM */ const isPasswordUpdated = !!(body.password && body.password !== '');
                /* SDA CUSTOM */ // END SDA CUSTOM

                user.name = body.name;
                user.email = body.email;
                user.role = body.role;

                if (body.password) {
                    if (body.password !== '') {
                        user.password = bcrypt.hashSync(body.password, 10);
                    }
                }

                user.save(async (err, userSaved) => {

                    if (err) {
                        return next(new HttpException(500, 'Error updating user'));
                    }

                    // Borrem de tots els grups el usuari actualitzat
                    await Group.updateMany({}, { $pull: { users: { $in: [req.params.id] } } }).exec();
                    // Introduim de nou els grups seleccionat al usuari actualitzat
                    await Group.updateMany({ _id: { $in: body.role } }, { $push: { users: req.params.id } }).exec();

                    /* SDA CUSTOM */ // SDA CUSTOM - Audit log for user update and role/password changes
                    /* SDA CUSTOM */ const currentRoles = body.role !== undefined
                    /* SDA CUSTOM */     ? ((body.role || []) as any[]).map(role => role && role._id ? String(role._id) : String(role)).filter(r => r).sort()
                    /* SDA CUSTOM */     : previousRoles;
                    /* SDA CUSTOM */ insertServerLog(req, 'info', 'UserUpdated', req.user.name, buildUserLogType(userSaved && userSaved._id, userSaved && userSaved.email, userSaved && userSaved.name, `updated_from:${previousEmail}`));
                    /* SDA CUSTOM */ if (!areStringArraysEqual(previousRoles, currentRoles)) {
                    /* SDA CUSTOM */     insertServerLog(req, 'info', 'UserRolesChanged', req.user.name, buildUserLogType(userSaved && userSaved._id, userSaved && userSaved.email, userSaved && userSaved.name, `roles:${previousRoles.length}->${currentRoles.length}`));
                    /* SDA CUSTOM */ }
                    /* SDA CUSTOM */ if (isPasswordUpdated) {
                    /* SDA CUSTOM */     insertServerLog(req, 'info', 'UserPasswordChanged', req.user.name, buildUserLogType(userSaved && userSaved._id, userSaved && userSaved.email, userSaved && userSaved.name, `password_changed_for:${previousName}`));
                    /* SDA CUSTOM */ }
                    /* SDA CUSTOM */ // END SDA CUSTOM

                    userSaved.password = ':)';

                    return res.status(200).json({ ok: true, user: userSaved });
                });
            });
        } catch (err) {
            next(err);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        let options:QueryOptions = {};
        try {
            User.findByIdAndDelete(req.params.id, options, (err, userRemoved) => {

                if (err) {
                    return next(new HttpException(500, 'Error removing an user'));
                }

                if (!userRemoved) {
                    return next(new HttpException(400, 'Not exists user with this id'));
                }

                /* SDA CUSTOM */ // SDA CUSTOM - Audit log for user deletion with recoverable ID
                /* SDA CUSTOM */ insertServerLog(req, 'info', 'UserDeleted', req.user.name, buildUserLogType(userRemoved && userRemoved._id, userRemoved && userRemoved.email, userRemoved && userRemoved.name, `deleted--id:${userRemoved && userRemoved._id}`));
                /* SDA CUSTOM */ // END SDA CUSTOM

                return res.status(200).json({ ok: true, user: userRemoved });
            });
        } catch (err) {
            next(err);
        }
    }

    static async provideToken(req: Request, res: Response, next: NextFunction) {

        User.findOne({email:req.params.usermail}, 'name email img role google').exec(async (err, user: IUser) => {
            if (err) {
                return next(new HttpException(500, `User with this id not found`));
            }
            if (!user) {
                return next(new HttpException(500, `User with this id not found`));
            }
            if(user){
          
                let token = await jwt.sign({ user }, SEED, { expiresIn: 3600 }); // 4 hours
                return res.status(200).json({ user, token: token, id: user._id });
            }
        });

        
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

/* SDA CUSTOM */ // SDA CUSTOM - Build normalized payload for user audit events
/* SDA CUSTOM */ function buildUserLogType(targetUserId: any, targetUserEmail: any, targetUserName: any, extra?: any) {
/* SDA CUSTOM */     const safeId = (targetUserId || '').toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */     const safeEmail = (targetUserEmail || '-').toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */     const safeName = (targetUserName || '-').toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */     if (!extra) return `${safeId}--${safeEmail}--${safeName}`;
/* SDA CUSTOM */     const safeExtra = extra.toString().replace(/\|,\|/g, ' ');
/* SDA CUSTOM */     return `${safeId}--${safeEmail}--${safeName}--${safeExtra}`;
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM

/* SDA CUSTOM */ // SDA CUSTOM - Compare two string arrays regardless of order
/* SDA CUSTOM */ function areStringArraysEqual(first: string[], second: string[]) {
/* SDA CUSTOM */     if ((first || []).length !== (second || []).length) return false;
/* SDA CUSTOM */     for (let i = 0; i < first.length; i++) {
/* SDA CUSTOM */         if (first[i] !== second[i]) return false;
/* SDA CUSTOM */     }
/* SDA CUSTOM */     return true;
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM
