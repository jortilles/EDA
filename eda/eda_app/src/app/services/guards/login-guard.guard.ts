import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, ActivatedRoute } from '@angular/router';
import { UserService } from '../api/user.service';
import { DashboardService } from '../api/dashboard.service';
import { User } from '@eda/models/model.index';
@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(
        public userService: UserService, 
        private route: ActivatedRoute,
        private dashboardService: DashboardService,
        public router: Router) { }

canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean  {

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
  const dashboardMatch = state.url.match(/\/dashboard\/([^?/]+)/);
  const loginUrl = { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] };
  const goLogin = () => this.router.navigate(['/login'], { queryParams: loginUrl });
  if (dashboardMatch) {
      return new Promise((resolve) => {
          this.dashboardService.getDashboardVisibility(dashboardMatch[1]).subscribe({
              next: (res: any) => {
                  if (!res.isAccessible) { goLogin(); return resolve(false);}
                  const anonymousUser = new User(null, 'edaanonim@jortilles.com', '_-(··)-_edanonymous_-(··)-_');
                  this.userService.login(anonymousUser, false).subscribe({
                      next: () => { resolve(true); },
                      error: (e) => { console.error(e); goLogin(); resolve(false); }
                  });
              },
              error: (e) => { console.error(e); goLogin(); resolve(false); }
          });
      });
  }
  goLogin();
  return false;
            }

        }

    }
}