import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { FileUtiles } from '../utils/file-utils.service';

@Injectable()
export class GlobalService extends ApiService {
    private routeDataManager = '/database-manager';
    private routeSearch = '/global/search/';

    constructor(protected http: HttpClient,
                private fileUtils: FileUtiles) {
        super(http);
    }

    uploadFile( params: {file, id, from} ) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            const xhr = new XMLHttpRequest();

            formData.append('img', params.file, params.file.name);

            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        resolve(JSON.parse(xhr.response));
                    } else {
                        reject(xhr.response);
                    }
                }
            };
            const routeUpload =  this.fileUtils.connection(`/global/upload/`, params);
            xhr.open('PUT', routeUpload, true);
            xhr.send(formData);
        });
    }

    search( param: string ): Observable<any> {
        return this.get( this.routeSearch + param );
    }

}
