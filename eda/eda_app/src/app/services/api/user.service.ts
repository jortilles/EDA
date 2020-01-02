import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { GlobalService } from './global.service';

import { User } from '@eda_models/model.index';
import Swal from 'sweetalert2';

@Injectable()
export class UserService extends ApiService {
    private route = '/user';

    public user: User;
    public token: string;

    constructor( protected http: HttpClient,
                 private router: Router,
                 private globalService: GlobalService) {
        super(http);
        this.loadStorage();
    }

    getUsers(between: number = 0): Observable<any> {
        return this.getParams(this.route, between);
    }

    getUser(id): Observable<any> {
        return this.get(`${this.route}/${id}`);
    }

    searchUser(param: string) {
        return this.globalService.search(param).pipe(
            map((res: any) => {
                return res.users;
            })
        );

    }

    /** Create new user */
    createUser(user: User): Observable<any> {
        return this.post(this.route, user);
    }

    /** Update User credentials and save in localstorage */
    updateUser(user: User): Observable<any> {
        return this.put(`${this.route}/${user._id}`, user).pipe(
            map((res: any) => {
                this.savingStorage(res.user._id, this.token, res.user);
                Swal.fire('Usuario actualizado', user.name, 'success');
                return true;
            })
        );
    }

    /** Delete User */
    deleteUser(id: string): Observable<any> {
        return this.delete(`${this.route}/${id}`)
            .pipe(map(() => {
                    Swal.fire('Usuario borrado', 'El usuario a sido eliminado correctamente', 'success');
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
    }

    /** Login user into app */
    login(user: User, remember: boolean): Observable<any> {
        if (remember) {
            localStorage.setItem('email', user.email);
        } else {
            localStorage.removeItem('email');
        }

        return this.post(`${this.route}/login`, user, true).pipe(
            map((res: any) => {
                this.savingStorage(res.id, res.token, res.user);
                return true;
            }, err => console.log(err))
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
        if (localStorage.getItem('token')) {
            this.token = localStorage.getItem('token');
            this.user = JSON.parse(localStorage.getItem('user'));
        } else {
            this.token = '';
            this.user = null;
        }
    }

    /** Verify if user is logged */
    isLogged() {
        // return localStorage.getItem('token') ? true : false;
        return this.token.length > 5 ? true : false;
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
            .then(
                (res: any) => {
                    if (from === 'user') {
                        this.user.img = res.user.img;
                        Swal.fire('Imagen Actualizada', this.user.name, 'success');
                        this.savingStorage(id, this.token, this.user);
                    } else if (from === 'group') {

                    }
                }
            ).catch(res => console.log(res));
    }
}

