import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { UserService } from '../api/user.service';

@Injectable({
  providedIn: 'root'
})
export class VerifyTokenGuard  {

  constructor(
    public userService: UserService,
    public router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean {
    const token = this.userService.getToken();

    if (!token) {
      this.redirectToLogin(state);
      return false;
    }

    let payload: any;
    try {
      payload = JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      this.redirectToLogin(state);
      return false;
    }

    const expired = this.expired(payload.exp);

    if (expired) {
      this.redirectToLogin(state);
      return false;
    }

    return this.verifyRenove(payload.exp, state);
  }

  // Redirects to /login carrying the originally requested URL as returnUrl - mirrors
  // LoginGuardGuard's redirect so a stale/expired token found here (this guard runs after
  // LoginGuardGuard already let the navigation through because isLogged() only checks that a
  // token is present, not that it's still valid) doesn't drop the deep link the user was
  // trying to reach (e.g. a dashboard link from an emailed report).
  private redirectToLogin(state: RouterStateSnapshot): void {
    this.router.navigate(['/login'], {
      queryParams: { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] }
    });
  }

  verifyRenove(fechaExp: number, state: RouterStateSnapshot): Promise<boolean> {
    return new Promise((resolve, reject) => {

      const tokenExp = new Date(fechaExp * 1000);
      const now = new Date();

      now.setTime(now.getTime() + (4 * 60 * 60 * 1000));

      if (tokenExp.getTime() > now.getTime()) {
        resolve(true);
      } else {
        this.userService.refreshToken()
          .subscribe(() => {
            resolve(true);
          }, () => {
            this.redirectToLogin(state);
            reject(false);
          });
      }
    });
  }

  expired(fechaExp: number) {
    const now = new Date().getTime() / 1000;

    return fechaExp < now ? true : false;
  }

}
