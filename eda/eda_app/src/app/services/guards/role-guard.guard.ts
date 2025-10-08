import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { UserService } from '../service.index';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(private user: UserService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requireAdmin = route.data['admin'] || false;
    const requireDatasource = route.data['datasource'] || false;

    // si la ruta requiere admin y el usuario no es admin → redirige
    if (requireAdmin && !this.user.isAdmin) {
      this.router.navigate(['/home']);
      return false;
    }

    // si la ruta requiere datasource/admin y el usuario no es datasource/admin → redirige
    if (requireDatasource && !this.user.isDataSourceCreator && !this.user.isAdmin) {
      this.router.navigate(['/home']);
      return false;
    }

    return true;
  }
}
