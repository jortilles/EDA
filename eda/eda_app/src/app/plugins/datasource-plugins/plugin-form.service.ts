import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PluginFormService {
    private readonly saveSubject = new Subject<void>();
    readonly onSave$ = this.saveSubject.asObservable();

    triggerSave(): void {
        this.saveSubject.next();
    }
}
