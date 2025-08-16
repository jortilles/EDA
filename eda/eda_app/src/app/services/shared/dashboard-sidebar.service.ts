import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardSidebarService {
  private commandSubject = new Subject<{ method: string, args?: any[] }>();
  public command$ = this.commandSubject.asObservable();

  invokeMethod(method: string, args: any[] = []) {
    this.commandSubject.next({ method, args });
  }
}