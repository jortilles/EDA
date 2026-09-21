import { Component, inject, Input } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ZoomStateService } from './zoom-state.service';

@Component({
    standalone: true,
    selector: 'zoom-control',
    imports: [CommonModule, FormsModule, ButtonModule, TooltipModule],
    templateUrl: './zoom.component.html',
    styleUrls: ["./zoom.component.css"],
    host: { '[class.zoom-sidebar]': "layout === 'sidebar'" }
})

export class ZoomSdaComponent {

    // Host dashboard page (passed as `[dashboard]="this"`), used to read
    // dashboard state such as edit permissions.
    @Input() dashboard: any;

    // Where the control is embedded: 'toolbar' (filters bar, current default
    // position) or 'sidebar' (dashboard sidebar popover) — controls layout only.
    @Input() layout: 'toolbar' | 'sidebar' = 'toolbar';

    // Shared with any other zoom-control instance on the same dashboard page — the
    // zoom effect is owned by DashboardPage (see its `providers`) and stays
    // active regardless of whether this control UI is mounted.
    public readonly zoomState = inject(ZoomStateService);

    public canIedit(): boolean {
        return !!this.dashboard?.canIedit?.();
    }
}
