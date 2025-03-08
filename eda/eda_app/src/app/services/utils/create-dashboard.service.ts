import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CreateDashboardService {
  isOpen = signal(false);

  open() {
    console.log('lets open');
    this.isOpen.set(true);
  }

  close() {
    this.isOpen.set(false);
  }
}