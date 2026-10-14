import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule, MultiSelectChangeEvent } from 'primeng/multiselect';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { ClickFilterUtils } from '../panel-utils/click-filter-utils';

@Component({
  standalone: true,
  selector: 'app-click-filter-config-dialog',
  templateUrl: './click-filter-config.dialog.html',
  imports: [CommonModule, FormsModule, MultiSelectModule, EdaDialog2Component]
})
export class ClickFilterConfigDialog implements OnInit {
  @Input() dashboard: any;
  @Input() panel: any;
  @Output() close: EventEmitter<void> = new EventEmitter<void>();

  public otherPanels: any[] = [];

  // Plain stored field (not a getter) so the multiselect always binds a stable
  // reference between user actions, instead of a new array every change-detection cycle.
  public affectingSelection: any[] = [];

  ngOnInit(): void {
    this.otherPanels = (this.dashboard?.panels || []).filter((p: any) => p.id !== this.panel.id);
    this.affectingSelection = this.currentlyAffecting();
  }

  public isClickable(): boolean {
    return this.panel.clickFiltersEnabled ?? true;
  }

  public toggleClickable(): void {
    this.panel.clickFiltersEnabled = !this.isClickable();
  }

  public isApplyToAll(): boolean {
    return this.panel.clickFilterApplyToAll ?? true;
  }

  public toggleApplyToAll(): void {
    this.panel.clickFilterApplyToAll = !this.isApplyToAll();
    // Switching to explicit mode starts from "affects everyone" so the user only has to uncheck.
    this.panel.clickFilterTargets = this.panel.clickFilterApplyToAll
      ? []
      : this.otherPanels.map((p: any) => p.id);
  }

  public isTarget(otherPanel: any): boolean {
    return (this.panel.clickFilterTargets || []).includes(otherPanel.id);
  }

  public toggleTarget(otherPanel: any): void {
    if (!this.panel.clickFilterTargets) this.panel.clickFilterTargets = [];
    this.panel.clickFilterTargets = this.isTarget(otherPanel)
      ? this.panel.clickFilterTargets.filter((id: string) => id !== otherPanel.id)
      : [...this.panel.clickFilterTargets, otherPanel.id];
  }

  public isAffectedBy(otherPanel: any): boolean {
    return ClickFilterUtils.affectsPanel(otherPanel, this.panel.id);
  }

  private currentlyAffecting(): any[] {
    return this.otherPanels.filter((p: any) => this.isAffectedBy(p));
  }

  public onAffectingSelectionChange(event: MultiSelectChangeEvent): void {
    this.applyAffectingSelection(event.value || []);
  }

  /** Removes a panel from the chip row below the picker. */
  public removeAffecting(otherPanel: any): void {
    this.applyAffectingSelection(this.affectingSelection.filter((p: any) => p.id !== otherPanel.id));
  }

  private applyAffectingSelection(selected: any[]): void {
    const newIds = new Set(selected.map((p: any) => p.id));

    for (const otherPanel of this.otherPanels) {
      const shouldAffect = newIds.has(otherPanel.id);
      if (this.isAffectedBy(otherPanel) !== shouldAffect) {
        const allOtherIds = (this.dashboard?.panels || [])
          .map((p: any) => p.id)
          .filter((id: string) => id !== otherPanel.id);
        ClickFilterUtils.setAffectsPanel(otherPanel, allOtherIds, this.panel.id, shouldAffect);
      }
    }

    this.affectingSelection = selected;
  }

  public onClose(): void {
    this.close.emit();
  }
}
