import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { Message } from 'primeng/api';
import * as _ from 'lodash';

@Injectable()
export class AlertService {

    public alerts: Message[] = [];

    private getSource = new Subject<any>();
    getAlerts$ = this.getSource.asObservable();

    constructor() {}

    addInfo(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: 'Info',
                severity: 'info'
            }
        );
    }

    addError(err: any) {
        console.log('Error', err);
        let message = '';

        if ( _.isEqual(typeof err, 'string')) {
            message = err;
        } else {
            if (err.text) {
                message = err.text;
            } else {
                message = ' - Error del servidor, avisar a JortillesDEV';
            }
        }

        this.getSource.next(
            {
                detail: message,
                summary: 'Error',
                severity: 'error',
                nextPage: err.nextPage
            }
        );
    }

    addWarning(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: 'Alerta',
                severity: 'warn'
            }
        );
    }

    addSuccess(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: '',
                severity: 'success'
            }
        );
    }
}
