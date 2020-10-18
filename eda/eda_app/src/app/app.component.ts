import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AlertService, UserService, SpinnerService } from './services/service.index';
import { Router } from '@angular/router';
import * as _ from 'lodash';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styles: [],
    providers: [MessageService]
})
export class AppComponent implements OnInit {
    displaySpinner: boolean = false;

    constructor(
        private userService: UserService,
        private spinnerService: SpinnerService,
        private router: Router,
        public alertService: AlertService,
        public messageService: MessageService
    ) { }



    ngOnInit(): void {
        this.initializeAlertService();
        this.initializeSpinnerService();
    }

    private initializeSpinnerService(): void {
        // Spinner Service
        this.spinnerService.getSpinner$.subscribe(displaySpinner => this.displaySpinner = displaySpinner);
    }

    private initializeAlertService(): void {
        // Alert Service
        this.alertService.getAlerts$.subscribe(alert => {

            this.messageService.add({
                severity: alert.severity,
                summary: alert.summary,
                detail: alert.detail
            });

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


}
