import { Injectable, OnDestroy } from '@angular/core';

const ZOOM_STORAGE_KEY_PREFIX = 'dashboardZoomLevel';
const ZOOM_MIN = 25;
const ZOOM_MAX = 100;
const ZOOM_STEP = 5;
// Only the gridster (the "DASHBOARD CONTENT" grid of panels) is scaled;
// the header and filters above it must stay static.
const ZOOM_TARGET_SELECTOR = 'gridster.dashboard-grid';

/**
 * Owns the zoom level and the side effect of scaling the dashboard grid.
 * Provided at DashboardPage level so the zoom stays applied for as long as a
 * dashboard is open, independent of whether any zoom-control control UI is
 * currently mounted (e.g. the sidebar variant only mounts on hover).
 */
@Injectable()
export class ZoomStateService implements OnDestroy {

    public zoomLevel: number = 100;
    private zoomInterval: any;
    private storageKey: string = ZOOM_STORAGE_KEY_PREFIX;

    public init(dashboardId: string): void {
        this.storageKey = `${ZOOM_STORAGE_KEY_PREFIX}_${dashboardId}`;
        const saved = Number(sessionStorage.getItem(this.storageKey));
        if (saved >= ZOOM_MIN && saved <= ZOOM_MAX) {
            this.zoomLevel = saved;
        }
        this.applyZoom();
    }

    ngOnDestroy() {
        this.stopContinuousZoom();
    }

    public zoomIn(): void {
        this.setZoom(this.zoomLevel + ZOOM_STEP);
    }

    public zoomOut(): void {
        this.setZoom(this.zoomLevel - ZOOM_STEP);
    }

    public resetZoom(): void {
        this.setZoom(100);
    }

    public startContinuousZoom(direction: 'in' | 'out'): void {
        this.stopContinuousZoom();
        this.zoomInterval = setInterval(() => {
            direction === 'in' ? this.zoomIn() : this.zoomOut();
        }, 150);
    }

    public stopContinuousZoom(): void {
        if (this.zoomInterval) {
            clearInterval(this.zoomInterval);
            this.zoomInterval = null;
        }
    }

    private setZoom(value: number): void {
        const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
        if (clamped === this.zoomLevel) return;
        this.zoomLevel = clamped;
        this.applyZoom();
        sessionStorage.setItem(this.storageKey, String(this.zoomLevel));
    }

    private applyZoom(): void {
        const target = document.querySelector<HTMLElement>(ZOOM_TARGET_SELECTOR);
        if (!target) return;
        target.style.transition = 'transform 0.9s cubic-bezier(0.19, 1, 0.22, 1), box-shadow 0.2s, outline-color 0.2s';
        target.style.transform = `scale(${this.zoomLevel / 100})`;
        target.style.transformOrigin = 'top left';

        if (this.zoomLevel < 100) {
            target.style.setProperty('outline', '0.5px solid rgba(198, 219, 243, 1)', 'important');
            target.style.setProperty('outline-offset', '0.5px', 'important');
            target.style.setProperty('box-shadow', '0 0 20px 1px rgba(198, 219, 243, 1)', 'important');
        } else {
            target.style.removeProperty('outline');
            target.style.removeProperty('outline-offset');
            target.style.removeProperty('box-shadow');
        }
    }
}
