import { Component, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { UserService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
interface NavItem {
  path?: string;
  icon?: string;
  isActive?: boolean;
  label?: string;
  items?: { path?: string; lang?: string; label: string; icon?: string, command?: () => void }[];
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
  private createDashboardService = inject(CreateDashboardService);

  navItems: NavItem[] = [
    { path: '/home', icon: 'home' },
    {
      icon: 'plus',
      items: [
        { path: '/home', label: $localize`:@@tituloNuevoInforme:Crear nuevo informe`, icon: 'plus', command: () => this.createDashboardService.open() },
        { path: '/admin/data-source/new', label: $localize`:@@addDatasource: Crear DataSource`, icon: 'plus' },
      ]
    },
    {
      icon: 'molecula',
      items: [
        { path: '/admin/users', label: $localize`:@@adminUsers:Gestión de usuarios`, icon: 'users' },
        { path: '/admin/groups', label: $localize`:@@adminGroupsTitle:Gestión de grupos`, icon: 'rectangle-group' },
        { path: '/admin/data-source', label: $localize`:@@adminDatasource:Gestión de datasource`, icon: 'rectangle-group' },
        { path: '/admin/models/import-export', label: $localize`:@@dataExportImport:Data Export/Import`, icon: 'arrow-down-on-square-stack' },
        { path: '/admin/email-settings', label: $localize`:@@adminEmail:Gestión de email`, icon: 'at-symbol' },
      ]
    },
    {
      icon: 'settings',
      items: [
        { path: '/profile', label:  $localize`:@@profile:Perfil`, icon: 'profile' },
        { lang: 'EN', label: 'English', icon: 'en-flag' },
        { lang: 'ES', label: 'Español', icon: 'es-flag' },
        { lang: 'CA', label: 'Català', icon: 'cat-flag' },
        { lang: 'PO', label: 'Polski', icon: 'pl-flag' },
      ]
    },
    {
      path: '/about',
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
    if ((item.path||'').includes('logout')) {
        this.userService.logout();
    } else if (item.path) {
      // Para direcciones con opcion command
      if(item.command) {
        item.command();
      } else {
        this.router.navigate([item.path]);
      }
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
      case 'EN': window.location.href = baseUrl + 'en/#/home'; break;
      case 'CAT': window.location.href = baseUrl + 'ca/#/home'; break;
      case 'ES': window.location.href = baseUrl + 'es/#/home'; break;
      case 'PL'  : window.location.href = baseUrl + 'pl/#/home'; break;
    }
}
}