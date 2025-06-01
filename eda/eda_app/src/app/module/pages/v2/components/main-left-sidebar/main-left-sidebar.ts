import { Component, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { UserService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';
interface NavItem {
  path?: string;
  icon?: string;
  isActive?: boolean;
  label?: string;
  items?: { path?: string; lang?: string; label: string; icon?: string }[];
  showOverlay?: boolean;
  hideTimeout?: any;
}

@Component({
  selector: 'app-main-left-sidebar',
  standalone: true,
  imports: [RouterLink, NgClass, IconComponent],
  templateUrl: './main-left-sidebar.html',
  encapsulation: ViewEncapsulation.None
})
export class MainLeftSidebarComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  public logoSidebar = LogoSidebar;

  navItems: NavItem[] = [
    { path: '/v2', icon: 'home' },
    {
      icon: 'plus',
      items: [
        { path: '/v2', label: $localize`:@@tituloNuevoInforme:Crear nuevo informe`, icon: 'plus' },
        { path: '/v2/admin/data-source/new', label: $localize`:@@addDatasource: Crear DataSource`, icon: 'plus' },
      ]
    },
    {
      icon: 'molecula',
      items: [
        { path: '/v2/admin/users', label: $localize`:@@adminUsers:Gestión de usuarios`, icon: 'users' },
        { path: '/v2/admin/groups', label: $localize`:@@adminGroupsTitle:Gestión de grupos`, icon: 'rectangle-group' },
        { path: '/v2/admin/data-source', label: $localize`:@@adminDatasource:Gestión de datasource`, icon: 'rectangle-group' },
        { path: '/v2/admin/models/import-export', label: $localize`:@@dataExportImport:Data Export/Import`, icon: 'arrow-down-on-square-stack' },
        { path: '/v2/admin/email-settings', label: $localize`:@@adminEmail:Gestión de email`, icon: 'at-symbol' },
      ]
    },
    {
      icon: 'settings',
      items: [
        { path: '/v2/profile', label:  $localize`:@@profile:Perfil`, icon: 'profile' },
        { lang: 'EN', label: 'English', icon: 'en-flag' },
        { lang: 'ES', label: 'Español', icon: 'es-flag' },
        { lang: 'CA', label: 'Català', icon: 'cat-flag' },
        { lang: 'PO', label: 'Polski', icon: 'pl-flag' },
      ]
    },
    {
      path: '/v2/about',
      icon: 'global',
      label: 'Tutorial'
    },
    { path: '/logout', icon: 'logout' },
  ];


  showOverlay(item: NavItem) {
    if (item.hideTimeout) {
      clearTimeout(item.hideTimeout); // Cancela la ocultación si el usuario vuelve a entrar
    }
    item.showOverlay = true;
  }

  hideOverlay(item: NavItem) {
    // Usa un timeout para evitar que el overlay desaparezca instantáneamente
    item.hideTimeout = setTimeout(() => {
      item.showOverlay = false;
    }, 100); // Espera 200ms antes de ocultar
  }

  menuCommand(item: any) {
    console.log('menuCommand', item.path)
    if ((item.path||'').includes('logout')) {
        this.userService.logout();
    } else if (item.path) {
      this.router.navigate([item.path]);
    } else if (item.lang) {
      this.redirectLocale(item.lang);
    }
  }

  public redirectLocale(lan: string) {
    let baseUrl = window.location.href.split('#')[0];

    if (baseUrl.slice(-4) == '/es/' ||
        baseUrl.slice(-4) == '/ca/' ||
        baseUrl.slice(-4) == '/pl/' ||
        baseUrl.slice(-4) == '/en/') {
        baseUrl = baseUrl.slice(0, baseUrl.length - 3)
    }
    switch (lan) {
      case 'EN': window.location.href = baseUrl + 'en/#/v2'; break;
      case 'CAT': window.location.href = baseUrl + 'ca/#/v2'; break;
      case 'ES': window.location.href = baseUrl + 'es/#/v2'; break;
      case 'PL'  : window.location.href = baseUrl + 'pl/#/v2'; break;
    }
}
}