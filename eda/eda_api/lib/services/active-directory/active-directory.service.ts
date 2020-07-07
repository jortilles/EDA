import ActiveDirectory from 'activedirectory2';
import { UserActiveDirectoryModel } from './model/user-active-directory.model';
import path from 'path';
import fs from 'fs';
import _ from 'lodash';

let adconfig;

export class ActiveDirectoryService {

    static async login(username: string, password: string): Promise<UserActiveDirectoryModel> {
        await ActiveDirectoryService.verifyAdConfig();

        const ad = new ActiveDirectory(adconfig);

        return new Promise((resolve, reject) => {

            ad.authenticate(adconfig.userNamePrefix + username, password, async (err, auth) => {
                if (auth) {
                    const userGroupAd = await ActiveDirectoryService.userAdGroups(username);

                    if (!_.isNil(userGroupAd.roleUsuari)) {
                        const response = await ActiveDirectoryService.userAdInfo(username);
                        response.userRole = userGroupAd.roleUsuari;
                        
                        if (userGroupAd.roleAdmin) {
                            response.adminRole = userGroupAd.roleAdmin;
                        }

                        resolve(response);
                    } else {
                        const response: any = {};
                        response.err = `This user does not have EDA_USER_ROLE`;
                        reject(response);
                    }
                } else {
                    const response: any = {};

                    if (err) {
                        response.err = err;
                    } else {
                        response.err = 'Authentication failed';
                    }

                    let error: any = {};

                    if (JSON.stringify(response.err).toString().includes('data 52e')) {
                        error = {
                            code: 401,
                            message: 'Usuari o contrasenya incorrectes'
                        };
                    } else if (JSON.stringify(response.err).toString().includes('data 775')) {
                        error = {
                            code: 401,
                            message: 'Usuari bloquejat'
                        };
                    } else {
                        error = {
                            code: 401,
                            message: 'Authentication failed'
                        };
                    }

                    reject(error);
                }

            })

        });
    }

    static async userAdInfo(username: string): Promise<UserActiveDirectoryModel> {
        await ActiveDirectoryService.verifyAdConfig();
        const ad = new ActiveDirectory(adconfig);

        return new Promise((resolve, reject) => {

            ad.findUser(undefined, username, (err: any, user: any) => {

                if (user) {
                    const response = new UserActiveDirectoryModel({
                        username,
                        displayName: user.displayName,
                        email: user.mail,
                    })

                    resolve(response);

                } else {

                    const response: any = {};

                    if (err) {
                        response.err = err;
                    } else {
                        response.err = 'User ' + username + ' not found';
                    }

                    reject(response);

                }
            });

        });
    }

    static async userAdGroups(username: string): Promise<any> {
        const ad = new ActiveDirectory(adconfig);

        return new Promise((resolve, reject) => {
            ad.getGroupMembershipForUser(username, async (err, groups: any[]) => {
                const user: any = {};

                if (groups) {
                    for (let i = 0, n = groups.length; i < n; i += 1) {
                        const group = groups[i];

                        if (group.cn === 'EDA_USER_ROLE') {
                            user.username = username;
                            user.roleUsuari = group.cn;
                        }

                        if (group.cn === 'EDA_ADMIN_ROLE') {
                            user.roleAdmin = group.cn;
                        }
                    }

                    resolve(user);
                }


                const response: any = {};

                if (err) {
                    response.err = err;
                } else {
                    response.err = 'Authentication failed';
                }

                reject(response);
            });
        });
    }

    static verifyAdConfig(): Promise<void> {

        return new Promise((resolve, reject) => {
            const ldapPath = path.resolve(__dirname, `../../../config/activedirectory.json`);

            if (fs.existsSync(ldapPath)) {
                adconfig = require('../../../config/activedirectory.json');
                resolve();
            } else if (!fs.existsSync(ldapPath)) {
                reject(`Error config not found`);
            }
        });

    }

}