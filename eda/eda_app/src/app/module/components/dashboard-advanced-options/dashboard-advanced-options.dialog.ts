import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { InputSwitchModule } from "primeng/inputswitch";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";
import { DashboardEditStyleDialog } from "../dashboard-edit-style/dashboard-edit-style.dialog";
import { DashboardVisibleModal } from "../dashboard-visible/dashboard-visible.modal";
import { DashboardMailConfigModal } from "../dashboard-mail-config/dashboard-mail-config.modal";
import { DashboardCustomActionDialog } from "../dashboard-custom-action/dashboard-custom-action.dialog";
import { DashboardTagModal } from "../../pages/dashboard/dashboard-tag/dashboard-tag.modal";

export interface AdvancedOptionItem {
  id: string;
  label: string;
  icon: string;
  type: 'action' | 'toggle';
  value?: boolean;
  command?: () => void;
  /** id of a special inline control rendered under this row when active (e.g. refresh seconds input) */
  extra?: string;
  /** when set, clicking this row embeds the matching form in the content pane instead of running command() */
  embed?: string;
}

export interface AdvancedOptionGroup {
  id: string;
  label: string;
  icon: string;
  items: AdvancedOptionItem[];
}

@Component({
  selector: 'app-dashboard-advanced-options',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputSwitchModule,
    EdaDialog2Component,
    DashboardEditStyleDialog,
    DashboardVisibleModal,
    DashboardMailConfigModal,
    DashboardCustomActionDialog,
    DashboardTagModal,
  ],
  templateUrl: './dashboard-advanced-options.dialog.html',
  styleUrls: ['./dashboard-advanced-options.dialog.css'],
})
export class DashboardAdvancedOptionsDialog {
  @Input() groups: AdvancedOptionGroup[] = [];
  @Input() refreshTime: number | null = null;
  @Input() dashboard: DashboardPage;
  @Output() refreshTimeChange = new EventEmitter<number>();
  @Output() applyEmbed = new EventEmitter<{ id: string; value: any }>();
  @Output() close = new EventEmitter<void>();

  /** embedded form committed by clicking a row; persists until closed/applied */
  public activeEmbedId: string | null = null;

  public selectEmbed(embedId: string): void {
    this.activeEmbedId = embedId;
  }

  public onEmbedApply(id: string, value: any): void {
    this.applyEmbed.emit({ id, value });
    this.activeEmbedId = null;
  }

  public onEmbedClose(): void {
    this.activeEmbedId = null;
  }

  public onEmbedTagClose(tags?: any[]): void {
    if (tags) {
      this.applyEmbed.emit({ id: 'addTag', value: tags });
    }
    this.activeEmbedId = null;
  }

  public onClose(): void {
    this.close.emit();
  }
}
