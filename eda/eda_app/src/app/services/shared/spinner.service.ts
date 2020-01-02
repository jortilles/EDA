import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class SpinnerService {
  public display: boolean;
  private getSource = new Subject<any>();
  getSpinner$ = this.getSource.asObservable();

  constructor() {
    this.display = false;
  }

  public on() {
    this.display = true;
    this.getSource.next(this.display);
  }

  public off() {
    this.display = false;
    this.getSource.next(this.display);
  }
}
