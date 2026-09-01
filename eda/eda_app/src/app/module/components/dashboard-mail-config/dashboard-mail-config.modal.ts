import { Component, Input, OnInit } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MultiSelectModule } from "primeng/multiselect";
import { CalendarModule } from 'primeng/calendar';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { MailVarSuggestDirective } from "@eda/shared/directives/mail-var-suggest.directive";
import { DashboardPage } from "../../pages/dashboard/dashboard.page";
import { MailConfigModalBase } from "../mail-config/mail-config-modal.base";

@Component({
  selector: 'app-dashboard-mail-config',
  standalone: true,
  imports: [CommonModule, FormsModule, MultiSelectModule, CalendarModule, InputSwitchModule, DropdownModule, EdaDialog2Component, MailVarSuggestDirective],
  templateUrl: '../mail-config/mail-config-modal.html',
  styleUrls: ['../mail-config/mail-config-modal.css'],
})
export class DashboardMailConfigModal extends MailConfigModalBase implements OnInit {
  @Input() dashboard!: DashboardPage;

  get isAlert(): boolean { return false; }
  protected get variablePanels(): any[] { return this.dashboard?.panels as any[]; }
  protected get linkDashboardId(): string { return this.dashboard?.dashboardId ?? ''; }

  override get subtitle(): string { return this.dashboard?.dashboard?.config?.title ?? ''; }
  override get pdfName(): string { return `${this.dashboard?.dashboard?.config?.title || 'informe'}.pdf`; }
  /** The dashboard dialog lets you save even a barely-filled config (existing behaviour). */
  override disableApply(): boolean { return false; }

  loadConfig(): void {
    const c = this.dashboard?.dashboard?.config?.sendViaMailConfig;
    this.loadSchedule(c);
    if (!c?.enabled) this.enabled = true;
  }

  save(): void {
    this.apply.emit({
      ...this.schedulePayload(),
      lastUpdated: new Date().toISOString(),
      dashboard: this.dashboard,
    });
  }

  async sendNow(): Promise<void> {
    await this.runSend(
      this.mailService.sendDashboardNow({
        dashboardId: this.dashboard.dashboardId,
        to: this.registeredEmails,
        toExternal: this.parseOtherRecipients(),
        subject: this.mailSubject,
        message: this.mailMessage,
        aiAnalysis: this.aiAvailable && this.aiAnalysis,
      }),
      $localize`:@@mailSendNowStarted:Envío iniciado. Los informes se están generando y llegarán en unos minutos.`,
    );
  }

  // ---- live values from the panels still rendered behind the dialog ----

  private panelChartComp(panelId: string): any {
    const arr = (this.dashboard as any)?.edaPanels?.toArray?.() ?? [];
    return arr.find((p: any) => p?.panel?.id === panelId)?.panelChart;
  }

  override getPanelCurrentValue(panelId: string): string {
    try {
      const v = this.panelChartComp(panelId)?.componentRef?.instance?.inject?.value;
      if (v === undefined || v === null || v === '') return '—';
      const n = Number(v);
      return Number.isFinite(n) ? n.toLocaleString('de-DE') : String(v);
    } catch {
      return '—';
    }
  }

  override getPanelSeries(panelId: string): { label: string; value: number }[] {
    try {
      const pc = this.panelChartComp(panelId);
      const num = (x: any) => Number(x && typeof x === 'object' ? (x.y ?? x.value ?? x.v) : x) || 0;

      const ec = pc?.componentRef?.instance?.inject?.edaChart;
      const ecLabels: any[] = ec?.chartLabels ?? [];
      const dataset: any = (ec?.chartDataset ?? []).find((d: any) => !d?.isTrend) ?? (ec?.chartDataset ?? [])[0];
      const ecValues: any[] = dataset?.data ?? [];
      if (ecLabels.length && ecValues.length) {
        return ecLabels.map((lab, i) => ({ label: String(lab ?? ''), value: num(ecValues[i]) }));
      }

      const data = pc?.props?.data ?? pc?.data;
      const labels: string[] = data?.labels ?? [];
      const rows: any[][] = data?.values ?? [];
      if (!rows.length || labels.length < 1) return [];
      let numIdx = -1;
      for (let c = labels.length - 1; c >= 0; c--) {
        if (rows.every(r => r[c] === null || r[c] === '' || Number.isFinite(Number(r[c])))) { numIdx = c; break; }
      }
      if (numIdx < 0) return [];
      const labIdx = labels.findIndex((_, i) => i !== numIdx);
      return rows.map(r => ({ label: labIdx >= 0 ? String(r[labIdx] ?? '') : '', value: Number(r[numIdx]) || 0 }));
    } catch {
      return [];
    }
  }
}
