import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '@eda/services/api/api.service';

/** Client of the API "signup" plugin (eda_api/lib/plugins/signup). Both endpoints are public. */
@Injectable({ providedIn: 'root' })
export class SignupService extends ApiService {

    private route = '/signup';

    /** Whether self-service sign up is enabled on this server */
    isEnabled(): Observable<boolean> {
        return this.get(`${this.route}/status`, true).pipe(map((res: any) => !!res.enabled));
    }

    /** Creates a free account; the password is sent to the given email */
    signup(name: string, email: string, acceptTerms: boolean): Observable<any> {
        return this.post(this.route, { name, email, acceptTerms }, true);
    }
}
