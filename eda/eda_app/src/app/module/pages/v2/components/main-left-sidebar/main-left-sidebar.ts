import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { IconComponent } from '@eda/shared/components/icon/icon.component';

interface NavItem {
    path: string;
    icon: string;
    isActive?: boolean;
}

@Component({
    selector: 'app-main-left-sidebar',
    standalone: true,
    imports: [RouterLink, NgClass, IconComponent],
    templateUrl: './main-left-sidebar.html'
})
export class MainLeftSidebarComponent {
    navItems: NavItem[] = [
        { path: '/', icon: 'home', isActive: true },
        { path: '/new', icon: 'plus' },
        { path: '/network', icon: 'molecula' },
        { path: '/settings', icon: 'settings' },
        { path: '/messages', icon: 'global' },
        { path: '/logout', icon: 'logout' },
      ];
}