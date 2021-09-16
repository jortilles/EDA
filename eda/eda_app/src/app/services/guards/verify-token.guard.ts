import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../api/user.service';

@Injectable({
  providedIn: 'root'
})
export class VerifyTokenGuard implements CanActivate {

  constructor(
    public userService: UserService,
    public router: Router
  ) { }

  canActivate(): Promise<boolean> | boolean {
    const token = this.userService.getToken();
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expired = this.expired(payload.exp);

    if (expired) {
      this.router.navigate(['/login']);
      return false;
    }


    return this.verifyRenove(payload.exp);
  }

  verifyRenove(fechaExp: number): Promise<boolean> {
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
            this.router.navigate(['/login']);
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
