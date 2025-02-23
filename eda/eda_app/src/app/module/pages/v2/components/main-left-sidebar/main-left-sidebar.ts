import { Component, ViewEncapsulation } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

interface NavItem {
  path: string;
  icon: string;
  isActive?: boolean;
  label?: string;
  items?: { path: string; label: string; icon: string }[];
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
  navItems: NavItem[] = [
    { path: '/', icon: 'home', isActive: true },
    {
      path: '/data-source',
      icon: 'plus',
      items: [
        { path: '/', label: 'DataSource 1', icon: 'plus' },
        { path: '/', label: 'DataSource 2', icon: 'plus' },
      ]
    },
    {
        path: '/network',
        icon: 'molecula',
        items: [
            { path: '/', label: `Gestió d'usuaris`, icon: 'plus' },
            { path: '/', label: 'Gestió de grups', icon: 'plus' },
            { path: '/', label: 'Gestió de models', icon: 'plus' },
            { path: '/', label: `Gestió d'email`, icon: 'plus' },
        ]
    },
    { path: '/settings', icon: 'settings' },
    {
      path: '/messages',
      icon: 'global',
      items: [
        { path: '/', label: 'English', icon: 'plus' },
        { path: '/', label: 'Español', icon: 'plus' },
        { path: '/', label: 'Català', icon: 'plus' },
        { path: '/', label: 'Polski', icon: 'plus' },
      ]
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

  navigateTo(item: any) {

  }
}