import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AlertService, UserService, SpinnerService } from './services/service.index';
import { Router, RouterModule } from '@angular/router';
import { CORPORATE_COLORS } from './config/personalitzacio/customizables';

import { PrimeNGConfig } from 'primeng/api';

import * as _ from 'lodash';
import { PrimengModule } from './core/primeng.module';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    standalone: true,
    imports: [RouterModule, PrimengModule],
    providers: [MessageService]
})
export class AppComponent implements OnInit {
    displaySpinner: boolean = false;

    constructor(
        private userService: UserService,
        private spinnerService: SpinnerService,
        private router: Router,
        public alertService: AlertService,
        public messageService: MessageService,
        private config: PrimeNGConfig
    ) { }



    ngOnInit(): void {
        this.initializeCorporateColors();
        this.initializeAlertService();
        this.initializeSpinnerService();
        this.setTranslations();
    }


    private initializeSpinnerService(): void {
        // Spinner Service
        this.spinnerService.getSpinner$.subscribe(displaySpinner => this.displaySpinner = displaySpinner);
    }

    private initializeAlertService(): void {
        // Alert Service
        this.alertService.getAlerts$.subscribe(alert => {

            if(alert.detail !== "401"){
                this.messageService.add({
                    severity: alert.severity,
                    summary: alert.summary,
                    detail: alert.detail
                });
            }

            if (!_.isNil(alert.nextPage)) {
                if (_.isEqual(alert.nextPage, 'logout')) {
                    this.userService.logout();
                }

                if (_.isEqual(alert.nextPage, 'home')) {
                    this.router.navigate(['/home']);
                }
            }
        });
    }

    private setTranslations() {

        const url = window.location.href;
        let lan_ca = new RegExp('\/ca\/', 'i');
        let lan_es = new RegExp('\/es\/', 'i');
        let lan_pl = new RegExp('\/pl\/', 'i');

        if (lan_ca.test(url)) {
            this.config.setTranslation(
                {
                    dayNames: [ "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte","Diumenge"],
                    dayNamesShort: [ "Dg","Dl", "Dt", "Dc", "Dj", "Dv", "Ds"],
                    dayNamesMin: ["Dg","Dl", "Dt", "Dc", "Dj", "Dv", "Ds" ],
                    monthNames: ["Gener", "Febrer", "Març", "Abril", "Maig", "Juny", "Juliol", "Agost", "Setembre", "Octubre", "Novembre", "Desembre"],
                    monthNamesShort: ["Gen", "Febr", "Març", "Abr", "Maig", "Juny", "Jul", "Ag", "Set", "Oct", "Nov", "Des"],
                    today: 'Avui',
                    clear: 'Netejar',
                    weekHeader: 'Setmana'
                }
            )


        }
        else if (lan_es.test(url)) {
            this.config.setTranslation(
                {
                    dayNames: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado","Domingo"],
                    dayNamesShort: [ "Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"],
                    dayNamesMin: ["Do","Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
                    monthNames: ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
                    monthNamesShort: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dec"],
                    today: 'Hoy',
                    clear: 'Limpiar',
                    weekHeader: 'Semana'
                }
            )
        }
        else if (lan_pl.test(url)) {
            this.config.setTranslation(
                {
                     dayNames: ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"],
                     dayNamesShort: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sob"],
                     dayNamesMin: ["Su","Mo", "Ma", "Mi", "Czw", "Vi", "Sa"],
                     monthNames: ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień" ],
                     monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ],
                     today: "Dzisiaj",
                     clear: "wyczyść",
                     weekHeader: "Tydzień"


                }
            )
        }
        else {

            this.config.setTranslation(
                {
                    dayNames: [ "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday","Sunday"],
                    dayNamesShort: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    dayNamesMin: [ "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
                    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
                    monthNamesShort: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    today: 'Today',
                    clear: 'Clear',
                    weekHeader: 'Wk'
                }
            )

        }

    }
    
    private initializeCorporateColors(): void {
        const root = document.documentElement;
        // Base
        root.style.setProperty('--corporate-primary',          CORPORATE_COLORS.primary);
        root.style.setProperty('--corporate-primary-gradient', CORPORATE_COLORS.primaryGradient);
        root.style.setProperty('--corporate-primary-rgb',      CORPORATE_COLORS.primaryRgb);
        root.style.setProperty('--ring',                       CORPORATE_COLORS.primaryHsl);
        // Chat
        root.style.setProperty('--corporate-primary-light',     CORPORATE_COLORS.chat.avatarBg);
        root.style.setProperty('--corporate-primary-light-alt', CORPORATE_COLORS.chat.avatarBgAlt);
        root.style.setProperty('--corporate-primary-border',    CORPORATE_COLORS.chat.avatarBorder);
        root.style.setProperty('--corporate-primary-surface',   CORPORATE_COLORS.chat.surfaceHover);
        root.style.setProperty('--corporate-primary-dark',      CORPORATE_COLORS.chat.tableHeader);
        root.style.setProperty('--corporate-primary-darker',    CORPORATE_COLORS.chat.linkColor);
        root.style.setProperty('--corporate-primary-darkest',   CORPORATE_COLORS.chat.linkHoverColor);
        // Sidebar
        root.style.setProperty('--sidebar-ring', CORPORATE_COLORS.sidebar.ring);
        // Folder
        root.style.setProperty('--folder-border-hover',     CORPORATE_COLORS.folder.borderHover);
        root.style.setProperty('--folder-icon-bg',          CORPORATE_COLORS.folder.iconBg);
        root.style.setProperty('--folder-icon-bg-hover',    CORPORATE_COLORS.folder.iconBgHover);
        root.style.setProperty('--folder-icon-color',       CORPORATE_COLORS.folder.iconColor);
        root.style.setProperty('--folder-icon-color-hover', CORPORATE_COLORS.folder.iconColorHover);
        root.style.setProperty('--folder-card-bg-open',     CORPORATE_COLORS.folder.cardBgOpen);
        root.style.setProperty('--folder-label-open',       CORPORATE_COLORS.folder.labelColorOpen);
    }
}
