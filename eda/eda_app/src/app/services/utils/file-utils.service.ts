import { Injectable } from '@angular/core';
import { URL_SERVICES } from '../../config/config';
import * as _ from 'lodash';
@Injectable()
export class FileUtiles {

    connection(route: string, getParams?: {}) {
        let url = `${URL_SERVICES}${route}?token=${localStorage.getItem('token')}`;
        if (!_.isNil(getParams)) {
            _.forEach(getParams, (value: any, key: any) => {
                url += '&' + key + '=' + value;
            });
        }
        return url;
    }

    // Generador d'IDs
    generateUUID() {
        let d = new Date().getTime();
        if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
            d += performance.now();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

}
