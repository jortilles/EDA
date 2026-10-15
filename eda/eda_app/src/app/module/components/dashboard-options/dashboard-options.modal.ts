import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputSwitchModule } from 'primeng/inputswitch';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';

export interface DashboardOptions {
  clickFilters: boolean;
  panelsLocked: boolean;
  animations: boolean;
  privateEdit: boolean;
  /** Live dashboard: seconds between automatic refreshes; null = off. Applied when the report is saved */
  refreshTime: number | null;
}

// Report-level on/off settings, shown as switches so their current state is visible at a glance
@Component({
  selector: 'app-dashboard-options',
  standalone: true,
  imports: [FormsModule, InputSwitchModule, EdaDialog2Component],
  templateUrl: './dashboard-options.modal.html',
})
export class DashboardOptionsModal implements OnInit {
  @Input() options: DashboardOptions;
  @Output() apply = new EventEmitter<DashboardOptions>();
  @Output() close = new EventEmitter<void>();

  // Edited copy: nothing changes on the dashboard until Apply
  public values: DashboardOptions;
  public title = $localize`:@@dashboardOptionsTitle:Opciones del informe`;

  ngOnInit(): void {
    this.values = { ...this.options };
  }

  public onApply(): void {
    this.apply.emit({ ...this.values });
  }

  public onClose(): void {
    this.close.emit();
  }
}
