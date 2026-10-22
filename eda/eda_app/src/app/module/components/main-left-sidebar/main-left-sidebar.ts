import { Component, inject, LOCALE_ID, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import Swal from 'sweetalert2';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { UserService } from '@eda/services/service.index';
import { LogoSidebar } from '@eda/configs/index';
import { AI_ASSISTANT_MANAGEMENT_AVAILABLE, CUSTOMIZE_SIDE_MENU_ICONS, ENABLED_LANGUAGES } from '@eda/configs/customizable/customizable_default';
import { IconService } from '@eda/services/utils/icons.service';
import { CreateDashboardService } from '@eda/services/utils/create-dashboard.service';
import { GroupService } from '@eda/services/api/group.service';
import { DashboardService } from '@eda/services/api/dashboard.service';

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
  styleUrls: ['./main-left-sidebar.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class MainLeftSidebarComponent {
  private router = inject(Router);
  private userService = inject(UserService);
  public logoSidebar = LogoSidebar;
  private createDashboardService = inject(CreateDashboardService);
  private groupService = inject(GroupService);
  private dashboardService = inject(DashboardService);
  private iconService = inject(IconService);
  private currentLocale = inject(LOCALE_ID);
  public queryParams: any = {};
  public hideWheel: boolean = false;
  public panelMode: boolean = false;
  private route = inject(ActivatedRoute);
  navItems: NavItem[] = [];

  // Anonymous and eda_RO control
  public isAnonim: boolean;
  public grups: Array<any> = [];
  public isObserver: boolean = false;

  // Tracks whether the dashboard currently open has unsaved changes
  public notSaved: boolean = false;

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('user'));
    this.isAnonim = user._id === '135792467811111111111112';

    this.groupService.getGroupsByUser().subscribe(groups => {
      this.grups = groups;
      this.isObserver = groups.some((g: any) => g.name === 'EDA_RO' && g.users.includes(user._id));
      localStorage.setItem('isObserver', String(this.isObserver));
      this.assignNavItems();
    });

    this.dashboardService.notSaved.subscribe(data => this.notSaved = data);

    this.getUrlParams();
  }

  assignNavItems() {
    // Languages come only from the ENABLED_LANGUAGES flag
    const languageItems = ENABLED_LANGUAGES.map(code => ({
      lang: code,
      label: this.getLanguageLabel(code),
      icon: this.getLanguageIcon(code),
    }));

    // Basic for all users
    const baseNav: NavItem[] = [
      { path: '/home', icon: this.resolveSideMenuIcon('home') },
      {
        icon: this.resolveSideMenuIcon('settings'),
        items: [
          { path: '/profile', label: $localize`:@@sidebarProfile:Perfil`, icon: 'profile' },
          ...languageItems,
        ]
      },
      {
        path: '/about',
        icon: this.resolveSideMenuIcon('information'),
        label: $localize`:@@aboutPageTitle:Tutorial`
      },
      { path: '/logout', icon: this.resolveSideMenuIcon('logout') },
    ];


  // Additional section creation (hidden for EDA_RO)
  const plusSection: NavItem = {
    icon: this.resolveSideMenuIcon('create'),
    items: [
      { path: '/home', label: $localize`:@@tituloNuevoInforme:Crear nuevo informe`, icon: 'plus', command: () => this.createDashboardService.open() },
    ]
  };

  if (this.userService.isAdmin || this.userService.isDataSourceCreator) {
    plusSection.items.push({ path: '/admin/data-source/new', label: $localize`:@@addDatasource: Crear fuente de datos`, icon: 'plus' });
  }
    

  const moleculaSection: NavItem = {
    icon: this.resolveSideMenuIcon('management'),
    items: []
  };

  if (this.userService.isAdmin) {
    moleculaSection.items.unshift(
      { path: '/admin/users', label: $localize`:@@adminUsers:Gestión de usuarios`, icon: 'users' },
      { path: '/admin/groups', label: $localize`:@@adminGroupsTitle:Gestión de grupos`, icon: 'groups' },
      { path: '/admin/media', label: $localize`:@@adminMedia:Gestor de archivos`, icon: 'circle-stack' },
      { path: '/admin/data-source', label: $localize`:@@adminDatasource:Gestión de fuentes de datos`, icon: 'rectangle-group' },
      { path: '/admin/models/import-export', label: $localize`:@@dataExportImport:Data Export/Import`, icon: 'arrow-down-on-square-stack' },
      { path: '/admin/email-settings', label: $localize`:@@adminEmail:Gestión de email`, icon: 'at-symbol' },
      { path: '/logs', label: $localize`:@@logsManagement:Visor de logs`, icon: 'clipboard-document-list' },
      ...(AI_ASSISTANT_MANAGEMENT_AVAILABLE ? [{ path: '/admin/ai-settings', label: $localize`:@@AIManagement:Gestión del asistente`, icon: 'sparkles-ai' }] : []),
      { path: '/portal', label: $localize`:@@adminPortal:Portal de datos`, icon: 'global-mini' },
    );
  } else if (this.userService.isDataSourceCreator) {
    moleculaSection.items.unshift(
      { path: '/admin/data-source', label: $localize`:@@adminDatasource:Gestión de fuentes de datos`, icon: 'rectangle-group' },
    );
  }

  // We assign the sections to navItems
  this.navItems = [
    ...baseNav.slice(0, 1), // home
    ...(!this.isObserver ? [plusSection] : []), // create menu (hidden for EDA_RO)
    ...((this.userService.isAdmin || this.userService.isDataSourceCreator) ? [moleculaSection] : []), // management
    ...baseNav.slice(1),    // settings, about, logout
  ].filter(item => item.icon); // entries configured as 'none' / '' are hidden
  }

  /**
   * Returns the icon configured in CUSTOMIZE_SIDE_MENU_ICONS for a side-menu entry.
   * 'none' or '' → null (entry hidden). Unknown icon name → warning in console.
   */
  private resolveSideMenuIcon(key: string): string | null {
    const name = (CUSTOMIZE_SIDE_MENU_ICONS[key] ?? '').trim();
    if (name === '' || name.toLowerCase() === 'none') return null;

    if (!this.iconService.getIcon(name)) {
      console.warn(`CUSTOMIZE_SIDE_MENU_ICONS.${key}: icon "${name}" not found in IconService`);
    }
    return name;
  }

  /** Native name of the language (es → Español, ca → Català...), provided by the browser */
  private getLanguageLabel(code: string): string {
    try {
      const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
      return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code.toUpperCase();
    } catch (e) {
      return code.toUpperCase();
    }
  }

  /** '<code>-flag' icon (Catalan one is registered as 'cat-flag'), generic fallback icon if there's no flag registered */
  private getLanguageIcon(code: string): string {
    const flag = code === 'ca' ? 'cat-flag' : `${code}-flag`;
    return this.iconService.getIcon(flag) ? flag : 'global';
  }

  showOverlay(item: NavItem) {
    if (item.hideTimeout) {
      clearTimeout(item.hideTimeout); // Cancel the hiding if the user logs in again
    }
    item.showOverlay = true;
  }

  hideOverlay(item: NavItem) {
    // Use a timeout to prevent the overlay from disappearing instantly
    item.hideTimeout = setTimeout(() => {
      item.showOverlay = false;
    }, 100); // Wait 200ms before hiding
  }

menuCommand(item: any, event: MouseEvent) {
  const path = item.path || '';
  const urlTree = this.router.createUrlTree([path]);
  const relativeUrl = this.router.serializeUrl(urlTree);

  // If it’s a middle click and there is a route, open in a new tab
  if (event.button === 1 && path) {
    event.preventDefault();
    window.open('#/' +  relativeUrl);
    return;
  }

  // Going to home can discard unsaved changes on the current dashboard, so confirm first
  if (path === '/home' && !item.command) {
    this.checkNotSavedHome();
    return;
  }

  // Any other destination silently drops the unsaved-changes flag (page is left behind)
  this.ignoreNotSaved();

  if (path.includes('logout')) {

    const user = JSON.parse(localStorage.getItem('user'));

    if(user.nameID && user.nameIDFormat && user.sessionIndex) {
      // SAML logout
      this.userService.SAMLlogout();
    }
    else {
      // Default logout
      this.userService.logout();
    }

  } else if (path) {
    item.command ? item.command() : this.router.navigate([path]);
  } else if (item.lang) {
    this.redirectLocale(item.lang);

  }
}

  /**
   * Navigates to home, warning the user first if the current dashboard has unsaved changes.
   */
  public checkNotSavedHome(): void {
    if (!this.notSaved) {
      this.router.navigate(['/home']);
      return;
    }

    Swal.fire({
      text: $localize`:@@NotSavedWarning:Hay cambios sin guardar. ¿Seguro que quieres salir?`,
      icon: 'warning',
      showDenyButton: true,
      denyButtonText: $localize`:@@cancelarButton:Cancelar`,
    }).then(result => {
      if (result.isConfirmed) {
        this.dashboardService.setNotSaved(false);
        this.router.navigate(['/home']);
      }
    });
  }

  /**
   * Drops the unsaved-changes flag without asking, used when navigating to a page
   * other than home (the destination isn't the dashboard, so nothing to lose there).
   */
  public ignoreNotSaved(): void {
    this.dashboardService.setNotSaved(false);
  }

  public redirectLocale(lan: string) {
    let baseUrl = window.location.href.split('#')[0];

    // Drop the current locale folder (/es/, /ca/...) to get the app root
    if (baseUrl.endsWith(`/${this.currentLocale}/`)) {
        baseUrl = baseUrl.slice(0, baseUrl.length - this.currentLocale.length - 1);
    }
    window.location.href = baseUrl + lan + '/#/home';
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