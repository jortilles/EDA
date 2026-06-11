import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable()
export class PluginFormService {
    private saveSubject = new Subject<void>();
    readonly onSave$ = this.saveSubject.asObservable();

    triggerSave(): void {
        this.saveSubject.next();
    }
}
