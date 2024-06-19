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
        console.log(route);
        console.log(state);
        
        if(token){
            this.userService.tokenUrl(token).subscribe(() => {
                this.router.navigate( [state.url.split('?')[0] ],
                                     { queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] } });
                return true;
            })
        }else{
            if (this.userService.isLogged()) {
                return true;
            } else {
                this.router.navigate(['/login'], { queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] } });
                return false;
            }
        }

       
         
    }
}
