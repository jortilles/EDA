import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getDashboardAction } from './dashboard-actions';

export const DEFAULT_QUICK_ACTIONS = ['save', 'newPanel', 'editFilters', 'refreshDashboard'];
export const MAX_QUICK_ACTIONS = 5;

// Which actions each user pinned to the quick actions bar, stored per user in the browser
@Injectable({ providedIn: 'root' })
export class QuickActionsPrefsService {
  private readonly pinnedSubject = new BehaviorSubject<string[]>(this.load());
  public readonly pinned$ = this.pinnedSubject.asObservable();

  public get pinned(): string[] {
    return this.pinnedSubject.value;
  }

  /** Re-reads the preferences, in case another user logged in since the service was created */
  public reloadForCurrentUser(): void {
    this.pinnedSubject.next(this.load());
  }

  public isPinned(id: string): boolean {
    return this.pinned.includes(id);
  }

  /** Pins or unpins an action. Returns false when pinning is refused because the bar is full */
  public toggle(id: string): boolean {
    if (this.isPinned(id)) {
      this.save(this.pinned.filter(pinnedId => pinnedId !== id));
      return true;
    }
    if (this.pinned.length >= MAX_QUICK_ACTIONS) return false;
    this.save([...this.pinned, id]);
    return true;
  }

  private storageKey(): string {
    try {
      const userId = JSON.parse(localStorage.getItem('user'))?._id ?? 'anonymous';
      return `eda.quickActions.${userId}`;
    } catch {
      return 'eda.quickActions.anonymous';
    }
  }

  private load(): string[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey()));
      if (Array.isArray(stored)) {
        // Ignore ids that no longer exist or can't be pinned
        return stored.filter(id => getDashboardAction(id)?.pinnable).slice(0, MAX_QUICK_ACTIONS);
      }
    } catch { /* unreadable storage: fall back to the defaults */ }
    return [...DEFAULT_QUICK_ACTIONS];
  }

  private save(ids: string[]): void {
    this.pinnedSubject.next(ids);
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify(ids));
    } catch { /* storage unavailable (e.g. private mode): keep it for this session only */ }
  }
}
