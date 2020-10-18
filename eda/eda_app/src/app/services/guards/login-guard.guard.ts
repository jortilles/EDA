import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../api/user.service';

@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(public userService: UserService,
        public router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (this.userService.isLogged()) {
            return true;
        } else {
            this.router.navigate(['/login'], { queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] } });
            return false;
        }
    }
}
