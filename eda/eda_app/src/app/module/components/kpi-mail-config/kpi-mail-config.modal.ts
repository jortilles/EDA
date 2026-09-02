import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from "primeng/calendar";
import { InputSwitchModule } from "primeng/inputswitch";
import { DropdownModule } from "primeng/dropdown";
import { DialogModule } from "primeng/dialog";
import { TooltipModule } from "primeng/tooltip";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { MailVarSuggestDirective } from "@eda/shared/directives/mail-var-suggest.directive";
import { MailConfigModalBase } from "../mail-config/mail-config-modal.base";

@Component({
  selector: 'app-kpi-mail-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule, CalendarModule, InputSwitchModule, DropdownModule, DialogModule, TooltipModule, EdaDialog2Component, MailVarSuggestDirective],
  templateUrl: '../mail-config/mail-config-modal.html',
  styleUrls: ['../mail-config/mail-config-modal.css'],
})
export class KpiMailConfigModal extends MailConfigModalBase implements OnInit {
  @Input() alert: any;
  @Input() dashboardId = '';
  @Input() panelId = '';
  @Input() kpiPanels: any[] = [];

  get isAlert(): boolean { return true; }
  protected get variablePanels(): any[] { return this.kpiPanels; }
  protected get linkDashboardId(): string { return this.dashboardId; }
  protected override footerCondition = ', si el KPI cumple la condición';

  loadConfig(): void {
    this.loadSchedule(this.alert?.mailing);
  }

  save(): void {
    this.apply.emit({
      ...this.schedulePayload(),
      lastUpdated: '2000-01-01T00:00:01.000',
    });
  }

  async sendNow(): Promise<void> {
    await this.runSend(
      this.mailService.sendAlertNow({
        dashboardId: this.dashboardId,
        panelId: this.panelId,
        operand: this.alert?.operand,
        value: this.alert?.value,
        to: this.registeredEmails,
        toExternal: this.parseOtherRecipients(),
        subject: this.mailSubject,
        message: this.mailMessage,
        aiAnalysis: this.aiAvailable && this.aiAnalysis,
      }),
      $localize`:@@alertSendNowDone:Alerta enviada (si el KPI cumple la condición en este momento)`,
    );
  }
}
