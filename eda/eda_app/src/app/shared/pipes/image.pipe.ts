import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService, FileUtiles } from '@eda/services/service.index';

@Pipe({
    name: 'image'
})
export class ImagePipe extends ApiService implements PipeTransform {
    constructor(protected http: HttpClient, private fileUtiles: FileUtiles) {
        super(http);
    }

    transform(img: string, type: string = 'user'): any {
        let url = '/admin/user/profile-img';

        if (!img) {
            return url = this.fileUtiles.connection(url + '/xxx');
        }

        switch (type) {
            case 'user':
                url = this.fileUtiles.connection(`${url}/${img}`);
                break;

            default:
                console.log('Error cargando imagen');
                url = this.fileUtiles.connection(url + '/xxx');
        }
        return url;
    }
}
