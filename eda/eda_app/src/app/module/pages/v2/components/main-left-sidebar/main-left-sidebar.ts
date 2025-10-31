import { Component, inject, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  public queryParams: any = {};
  public hideWheel: boolean = false;
  public panelMode: boolean = false;
  private route = inject(ActivatedRoute);
  navItems: NavItem[] = [];
  
  ngOnInit(): void {
    const interval = setInterval(() => {
      // Si lo datos del usuario han cargado
      if (this.userService.isAdmin !== undefined) {
        this.assignNavItems();
        clearInterval(interval);
      }
    }, 100); // revisa cada 100ms

    this.getUrlParams();
  }

  assignNavItems() {
    // básicos para todos los users
    const baseNav: NavItem[] = [
      { path: '/home', icon: 'home' },
      {
        icon: 'settings',
        items: [
          { path: '/profile', label: $localize`:@@sidebarProfile:Perfil`, icon: 'profile' },
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


  // Seccion adicional crear
  const plusSection: NavItem = {
    icon: 'plus',
    items: [
      { path: '/home', label: $localize`:@@tituloNuevoInforme:Crear nuevo informe`, icon: 'plus', command: () => this.createDashboardService.open() },
    ]
  };

  if (this.userService.isAdmin || this.userService.isDataSourceCreator) {
    plusSection.items.push({ path: '/admin/data-source/new', label: $localize`:@@addDatasource: Crear fuente de datos`, icon: 'plus' });
  }

  const moleculaSection: NavItem = {
    icon: 'molecula',
    items: [
      { path: '/logs', label: $localize`:@@logsManagement:Gestión de logs`, icon: 'clipboard-document-list' },
    ]
  };

  if (this.userService.isAdmin) {
    moleculaSection.items.unshift(
      { path: '/admin/users', label: $localize`:@@adminUsers:Gestión de usuarios`, icon: 'users' },
      { path: '/admin/groups', label: $localize`:@@adminGroupsTitle:Gestión de grupos`, icon: 'rectangle-group' },
      { path: '/admin/data-source', label: $localize`:@@adminDatasource:Gestión de fuentes de datos`, icon: 'rectangle-group' },
      { path: '/admin/models/import-export', label: $localize`:@@dataExportImport:Data Export/Import`, icon: 'arrow-down-on-square-stack' },
      { path: '/admin/email-settings', label: $localize`:@@adminEmail:Gestión de email`, icon: 'at-symbol' },
    );
  } else if (this.userService.isDataSourceCreator) {
    moleculaSection.items.unshift(
      { path: '/admin/data-source', label: $localize`:@@adminDatasource:Gestión de fuentes de datos`, icon: 'rectangle-group' },
    );
  }

  // Asignamos las secciones al navItems
  this.navItems = [
    ...baseNav.slice(0, 1), // home
    plusSection,
    moleculaSection,
    ...baseNav.slice(1),    // settings, about, logout
  ];
}

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

menuCommand(item: any, event: MouseEvent) {
  const path = item.path || '';
  const urlTree = this.router.createUrlTree([path]);
  const relativeUrl = this.router.serializeUrl(urlTree);


  // Si es clic medio y hay ruta, abrir en nueva pestaña
  if (event.button === 1 && path) {
    event.preventDefault();
    window.open('#/' +  relativeUrl);
    return;
  }

  if (path.includes('logout')) {
    this.userService.logout();
  } else if (path) {
    item.command ? item.command() : this.router.navigate([path]);
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
  private getUrlParams(): void {
        this.route.queryParams.subscribe(params => {
          this.queryParams = params;
          try{
            if(params['hideWheel'] == 'true'){
              this.hideWheel =true;
            }
            if(params['panelMode'] == 'true'){
              this.panelMode =true;
              this.hideWheel =true;
            }
            
          } catch(e){
            console.error('getUrlParams: '+ e);
          }
        });
    }
}