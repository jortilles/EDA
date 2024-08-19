import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { GlobalService } from './global.service';
import { AlertService } from '../alerts/alert.service';

import { User } from '@eda/models/model.index';
import Swal from 'sweetalert2';

@Injectable()
export class UserService extends ApiService {
    private route = '/admin/user';
    private routeThirdParty = '/tp/url';

    public user: User;
    public isAdmin: boolean;
    public isDataSourceCreator: boolean;
    public token: string;

    constructor( protected http: HttpClient,
                 private router: Router,
                 private globalService: GlobalService,
                 private alertService: AlertService) {
        super(http);
        this.loadStorage();

    }

    getUsers(): Observable<any> {
        return this.get(this.route);
    }

    getUser(id: string): Observable<any> {
        return this.get(`${this.route}/${id}`);
    }

    getIsAdminUser(id: string): Observable<any> {
        return this.get(`${this.route}/is-admin/${id}`);
    }

    getIsDataSourceCreator(id: string): Observable<any> {
        return this.get(`${this.route}/is-datasource-creator/${id}`);
    }

    searchUser(param: string) {
        return this.globalService.search(param)
            .pipe(map((res: any) => (res.users)));
    }

    /** Create new user */
    createUser(user: User): Observable<any> {
        return this.post(this.route, user);
    }

    /** Update User credentials and save in localstorage */
    updateUser(user: User): Observable<any> {
        return this.put(`${this.route}/me/${user._id}`, user).pipe(
            map((res: any) => {
                this.savingStorage(res.user._id, this.token, res.user);
                Swal.fire('Usuario actualizado', user.name, 'success');
                return true;
            })
        );
    }

    manageUpdateUsers(user: User): Observable<any> {
        return this.put(`${this.route}/management/${user._id}`, user);
    }

    /** Delete User */
    deleteUser(id: string): Observable<any> {
        return this.delete(`${this.route}/${id}`)
            .pipe(map(() => {
                    Swal.fire($localize`:@@DeletedUser:Usuario borrado`, $localize`:@@UserDeletedOk:El usuario a sido eliminado correctamente`, 'success');
                    return true;
                })
            );
    }

    /** Save User and Token in localstorage */
    savingStorage(id: string, token: string, user: User) {
        localStorage.setItem('id', id);
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        this.user = user;
        this.token = token;

        this.getIsAdminUser(this.user._id).subscribe(
            (value: any) => this.isAdmin = value.isAdmin,
            (err) => this.alertService.addError(err)
        );
        this.getIsDataSourceCreator(this.user._id).subscribe(
            (value: any) => { this.isDataSourceCreator = value.isDataSourceCreator  }, 
            (err) => this.alertService.addError(err)
        );

        
    }

    /** Login user into app */
    login(user: User, remember: boolean): Observable<any> {
        if (remember) {
            localStorage.setItem('email', user.email);
        } else {
            localStorage.removeItem('email');
        }

        return this.post(`${this.route}/login`, user, true)
            .pipe(map((res: any) => {
                this.savingStorage(res.id, res.token, res.user);
                return true;
            }, (err) =>this.alertService.addError(err))
        );
    }

    /** Token sending by the third party through an URL*/
    tokenUrl(token: string): Observable<any> {

        return this.post(`${this.routeThirdParty}/check`, {token: token}, true)
            .pipe(map((res: any) => {
                    this.savingStorage(res.id, res.token, res.user);
                    return true;
                }, (err) =>this.alertService.addError(err))
            );
    }

    /** Renovar Token */
    refreshToken() {
        return this.get( `${this.route}/refresh-token` )
            .pipe(map((res: any) => {
                    this.token = res.token;
                    localStorage.setItem('token', this.token);

                    return true;
                })
            );
    }

    /** Login Google Accounts into app */
    loginGoogle(token: string) {
        return this.post(`${this.route}/login/google/`, { token }, true).pipe(
            map((res: any) => {
                this.savingStorage(res.id, res.token, res.user);
                return true;
            })
        );
    }

    /** Load items localstorage */
    loadStorage() {
        if (localStorage.getItem('token') && localStorage.getItem('user') ) {
            this.token = localStorage.getItem('token');
            this.user = JSON.parse(localStorage.getItem('user'));

            this.getIsAdminUser(this.user._id).subscribe(
                (value: any) => this.isAdmin = value.isAdmin,
                (err) => this.alertService.addError(err)
            );
            this.getIsDataSourceCreator(this.user._id).subscribe(
                (value: any) => {this.isDataSourceCreator = value.isDataSourceCreator }, 
                (err) => this.alertService.addError(err)
            );
            
            

        } else {
            this.token = '';
            this.user = null;
        }
    }

    /** Verify if user is logged */
    isLogged() {
        return this.token.length > 5 || !!localStorage.getItem('token');
    }

    /** Logout user and clean localstorage */
    logout() {
        this.user = null;
        this.token = '';

        localStorage.removeItem('user');
        localStorage.removeItem('token');

        this.router.navigate(['/login']);
    }

    /** Change the user profile image */
    changeImage(file: File, id: string, from?: string) {
        const params = {file, id, from};
        this.globalService.uploadFile(params)
            .then((res: any) => {
                if (from === 'user') {
                    this.user.img = res.user.img;
                    Swal.fire($localize`:@@picUpdated:Imagen Actualizada`, this.user.name, 'success');
                    this.savingStorage(id, this.token, this.user);
                } else if (from === 'group') {

                }
            }).catch((err) => {
                this.alertService.addError(err)
            });
    }

    getUserObject(){
        return JSON.parse(localStorage.getItem('user'));
    }

    getToken(){
        return localStorage.getItem('token');
    }
}

