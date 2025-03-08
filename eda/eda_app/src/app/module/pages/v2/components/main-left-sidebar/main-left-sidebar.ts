import { Component, inject, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

interface NavItem {
  path: string;
  icon?: string;
  isActive?: boolean;
  label?: string;
  items?: { path: string; label: string; icon?: string }[];
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

  navItems: NavItem[] = [
    { path: '/v2', icon: 'home', isActive: true },
    {
      path: '/data-source',
      icon: 'plus',
      items: [
        { path: '/v2', label: 'Nuevo Dashboard', icon: 'plus' },
        { path: '/v2', label: 'Nuevo DataSource', icon: 'plus' },
      ]
    },
    {
      path: '/network',
      icon: 'molecula',
      items: [
        { path: '/v2/admin/users', label: `Gestión de usuarios`, icon: 'users' },
        { path: '/v2/admin/groups', label: 'Gestión de grupos', icon: 'rectangle-group' },
        { path: '/', label: 'Gestión de datasource', icon: 'rectangle-group' },
        { path: '/v2/admin/models/import-export', label: 'Data Export/Import', icon: 'arrow-down-on-square-stack' },
        { path: '/v2/admin/email-settings', label: `Gestión de email`, icon: 'at-symbol' },
      ]
    },
    {
      path: '/settings',
      icon: 'settings',
      items: [
        { path: '/', label: 'Perfil', icon: 'profile' },
        { path: '/', label: 'English', icon: 'en-flag' },
        { path: '/', label: 'Español', icon: 'es-flag' },
        { path: '/', label: 'Català', icon: 'cat-flag' },
        { path: '/', label: 'Polski', icon: 'pl-flag' },
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
    console.log('menuCommand', item.path)
    if (item.path) {
      this.router.navigate([item.path]);
    } else {
      console.log('do something else')
    }
  }
}