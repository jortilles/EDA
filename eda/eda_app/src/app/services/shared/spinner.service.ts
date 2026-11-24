import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable()
export class SpinnerService {
  public display: boolean;
  /** Optional progress text shown under the spinner (e.g. "Importing 5 of 39") */
  public message: string = '';
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
    this.message = '';
    this.getSource.next(this.display);
  }

  /** Sets (or clears, with an empty string) the progress text of the visible spinner */
  public setMessage(message: string) {
    this.message = message || '';
  }
}
