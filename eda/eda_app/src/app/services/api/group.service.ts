import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from './api.service';

@Injectable()
export class GroupService extends ApiService {
    private route = '/user/groups';

    getGroups(): Observable<any> {
        return this.get( this.route );
    }
}
