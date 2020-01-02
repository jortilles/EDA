import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { AlertService, UserService, SpinnerService } from './services/service.index';
import * as _ from 'lodash';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styles: [
            `
            :host ::ng-deep button {
                margin-right: .25em;
            }

            :host ::ng-deep .custom-toast .ui-toast-message {
                color: #ffffff;
                background: #FC466B;
                background: -webkit-linear-gradient(to right, #3F5EFB, #FC466B);
                background: linear-gradient(to right, #3F5EFB, #FC466B);
            }

            :host ::ng-deep .custom-toast .ui-toast-close-icon {
                color: #ffffff;
            }
        `
    ],
    providers: [MessageService]
})
export class AppComponent implements OnInit {
    displaySpinner: boolean = false;

    constructor( private _userService: UserService,
                 private spinnerService: SpinnerService,
                 public alertService: AlertService,
                 public messageService: MessageService ) { }

    ngOnInit(): void {

        this.alertService.getAlerts$.subscribe(
            alert => {
                this.messageService.add({severity: alert.severity, summary: alert.summary, detail: alert.detail});
                if (!_.isNil(alert.nextPage))
                    if (_.isEqual(alert.nextPage, 'logout')) this._userService.logout();
            }
        );

        this.spinnerService.getSpinner$.subscribe(displaySpinner => this.displaySpinner = displaySpinner);

    }


}
