import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../api/user.service';

@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(public userService: UserService,
        public router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        
        
        console.log( route);
        if(route.queryParams.token){
            console.log('aqui tengo el token!!!!!');
            console.log('llamo a la api y recupero los valores del usuario');
            // savingStorage( id: string, token: string, user: User) ;
            // savingStorage( id de usuario 135792467811111111111111, token: el token que me llega, user: el objeto user del mongo) ;
        }




        if (this.userService.isLogged()) {
            return true;
        } else {
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] } });
            return false;
        }
    }
}
