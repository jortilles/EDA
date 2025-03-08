import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {ApiService} from './api.service';
import {User} from '@eda/models/user-models/user.model';

export interface IGroup {
    name: string;
    role: {label: string, value: string};
    img: File;
    users: User[];
}

@Injectable({
    providedIn: 'root'
})
export class GroupService extends ApiService {
    private route = '/admin/groups';

    getGroups(): Observable<any> {
        return this.get( this.route );
    }

    getGroupsByUser(): Observable<any> {
        return this.get( `${this.route}/mine` );
    }

    getGroup(id: string): Observable<any> {
        return this.get( `${this.route}/${id}` );
    }

    insertGroup(body: IGroup): Observable<any> {
        return this.post( this.route, body );
    }

    updateGroup(id: string, body: IGroup): Observable<any> {
        return this.put( `${this.route}/${id}`, body );
    }

    deleteGroup(id: string): Observable<any> {
        return this.delete( `${this.route}/${id}` );
    }

}
