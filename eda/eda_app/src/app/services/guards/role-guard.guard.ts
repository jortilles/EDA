import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { UserService } from '../service.index';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private user: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requireAdmin = route.data['admin'] || false;
    const requireDatasource = route.data['datasource'] || false;

    // if the route requires admin and the user is not admin → redirect
    if (requireAdmin && !this.user.isAdmin) {
      this.router.navigate(['/home']);
      return false;
    }

    // if the route requires datasource/admin and the user is not datasource/admin → redirect
    if (requireDatasource && !this.user.isDataSourceCreator && !this.user.isAdmin) {
      this.router.navigate(['/home']);
      return false;
    }

    return true;
  }
}
