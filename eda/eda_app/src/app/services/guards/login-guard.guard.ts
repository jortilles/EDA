import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, ActivatedRoute } from '@angular/router';
import { UserService } from '../api/user.service';

@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(
        public userService: UserService, 
        private route: ActivatedRoute,
        public router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {

        const token = route.queryParams.token; 
        
        if (this.userService.isLogged()) {
            return true;
        } else {
            if(token){
                this.userService.tokenUrl(token).subscribe(() => {
                    const urlInforme = state.url.split('?')[0];
                    this.router.navigate([urlInforme], { queryParams: route.queryParams });
                })
                return false;
            } else {
                this.router.navigate(['/login'], { queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] } });
                return false;
            }

        }

    }
}
