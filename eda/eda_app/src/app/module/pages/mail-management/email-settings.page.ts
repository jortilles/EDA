import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { from, lastValueFrom } from 'rxjs';
import { mergeMap, toArray, tap, finalize } from 'rxjs/operators';
import { MailService, AlertService, DashboardService, SpinnerService } from '@eda/services/service.index';

interface AlertItem {
  id: string;
  alerts: string;
  panel: string;
  dashboard: string;
  datamodel: string;
  operand: string;
  value: string | number;
}

interface DashboardItem {
  id: string;
  dashboard: string;
  datamodel: string;
}

interface DashboardSummary {
  _id: string;
  config?: { haveAlerts?: boolean };
}

interface DashboardsListResponse {
  dashboards?: DashboardSummary[];
  group?: DashboardSummary[];
  publics?: DashboardSummary[];
  shared?: DashboardSummary[];
}

interface DashboardDetailResponse {
  dashboard: {
    _id: string;
    config: {
      title: string;
      sendViaMailConfig?: { enabled?: boolean };
      panel?: Array<{
        title: string;
        content?: {
          chart?: string;
          query?: {
            query?: { fields?: Array<{ display_name: string }> };
            output?: {
              config?: {
                alertLimits?: Array<{
                  operand: string;
                  value: string | number;
                  mailing?: { enabled?: boolean };
                }>;
              };
            };
          };
        };
      }>;
    };
  };
  datasource?: { name?: string };
}

@Component({
  selector: 'app-email-settings',
  standalone: true,
  templateUrl: 'email-settings.page.html',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  styles: []
})
export class EmailSettingsPage implements OnInit {

  // --- Services ---
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private mailService = inject(MailService);
  private dashboardService = inject(DashboardService);
  private spinnerService = inject(SpinnerService);
  // --- Signals ---
  loadingSignal = signal(true);
  tlsEnabled = signal<boolean>(false);
  isChecking = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);

  alertsPerPage = signal<string>('10');
  dashboardsPerPage = signal<string>('10');
  alertItems = signal<AlertItem[]>([]);
  dashboardItems = signal<DashboardItem[]>([]);

  alertsPaged = computed(() => {
    const n = Number(this.alertsPerPage() || 10);
    return this.alertItems().slice(0, n);
  });

  dashboardsPaged = computed(() => {
    const n = Number(this.dashboardsPerPage() || 10);
    return this.dashboardItems().slice(0, n);
  });

  // --- Unified form ---
  unifiedForm: FormGroup;

  get configType(): 'SMPT' | 'GMAIL' {
    return this.unifiedForm.get('configType')?.value || 'SMPT';
  }

  constructor() {
    this.unifiedForm = this.fb.group({
      configType: ['SMPT'],
      host: [null],
      port: [null],
      user: [null, Validators.required],
      password: [null],
      clientId: [null],
      clientSecret: [null],
      refreshToken: [null],
      secure: [false],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadEmailSettings();
    await this.loadDashboardsData();
  }

  // =====================================================
  //   CARGA DE CONFIGURACIÓN DE CORREO
  // =====================================================
  private async loadEmailSettings() {
    const mailSettings = await lastValueFrom(this.mailService.getConfiguration());
    const config = mailSettings.config;

    if (config.configType === 'GMAIL') {
      this.unifiedForm.patchValue({
        configType: 'GMAIL',
        user: config.auth?.user,
        clientId: config.auth?.clientId,
        clientSecret: config.auth?.clientSecret,
        refreshToken: config.auth?.refreshToken,
        secure: config.secure ?? false,
      });
      this.tlsEnabled.set(config.tls?.rejectUnauthorized ?? false);
    } else {
      this.unifiedForm.patchValue({
        configType: 'SMPT',
        host: config.host,
        port: config.port,
        user: config.auth?.user,
        password: null,
        secure: config.secure ?? false,
      });
      this.tlsEnabled.set(config.secure ?? false);
    }
  }

  // =====================================================
  //   CARGA DE DASHBOARDS (OPTIMIZADA CON RXJS)
  // =====================================================
  private async loadDashboardsData() {
    const list = await lastValueFrom(this.dashboardService.getDashboards()) as DashboardsListResponse;

    const allDashboards = [
      ...(list.dashboards ?? []),
      ...(list.group ?? []),
      ...(list.publics ?? []),
      ...(list.shared ?? []),
    ];

    const ids = allDashboards.map(d => d._id);
    const dashboardsForMail: DashboardItem[] = [];
    const alerts: AlertItem[] = [];

    this.loadingSignal.set(true);

    await lastValueFrom(
      from(ids).pipe(
        mergeMap(id => this.dashboardService.getDashboard(id), 5),
        tap((d: DashboardDetailResponse) => {
          const dash = d.dashboard;
          const title = dash.config?.title ?? '';
          const modelName = d.datasource?.name ?? '';
          const dashId = dash._id;

          if (dash.config?.sendViaMailConfig?.enabled) {
            dashboardsForMail.push({ id: dashId, dashboard: title, datamodel: modelName });
          }

          const panels = dash.config?.panel ?? [];
          for (const p of panels) {
            const isKpi = p?.content?.chart?.startsWith('kpi');
            const limits = p?.content?.query?.output?.config?.alertLimits ?? [];
            if (!isKpi || limits.length === 0) continue;

            for (const a of limits) {
              if ((a as any).mailing?.enabled === true) {
                alerts.push({
                  id: dashId,
                  alerts: `KPI ${a.operand} ${a.value}`,
                  panel: p.title,
                  dashboard: title,
                  datamodel: modelName,
                  operand: a.operand,
                  value: a.value,
                });
              }
            }
          }

          this.dashboardItems.set([...dashboardsForMail]);
          this.alertItems.set([...alerts]);
        }),
        toArray(),
        finalize(() => this.loadingSignal.set(false))
      )
    );

    this.dashboardItems.set(dashboardsForMail);
    this.alertItems.set(alerts);
    this.loadingSignal.set(false);
  }

  getDashboardUrl(id: string): string {
    const locale = window.location.pathname.split('/').filter(Boolean)[0] || 'es';
    return `${window.location.origin}/${locale}/#/dashboard/${id}`;
  }

  async deleteAlertMailConfig(item: AlertItem) {
    try {
      const response = await lastValueFrom(this.dashboardService.getDashboard(item.id)) as DashboardDetailResponse;
      const dashboard = response.dashboard;
      const panels = dashboard.config?.panel ?? [];
      for (const p of panels) {
        if (p.title !== item.panel) continue;
        const limits = p.content?.query?.output?.config?.alertLimits ?? [];
        for (const a of limits) {
          if (a.operand === item.operand && String(a.value) === String(item.value)) {
            (a as any).mailing = { ...(a as any).mailing, enabled: false };
          }
        }
      }
      const mailingAlertsEnabled = panels.some((p: any) =>
        p.content?.chart === 'kpi' &&
        p.content?.query?.output?.config?.alertLimits?.some((a: any) => a.mailing?.enabled === true)
      );
      (dashboard.config as any).mailingAlertsEnabled = mailingAlertsEnabled;
      await lastValueFrom(this.dashboardService.updateDashboard(item.id, {
        config: dashboard.config,
        group: (response as any).group ?? []
      }));
      this.alertItems.update(items => items.filter(i => !(i.id === item.id && i.panel === item.panel && i.operand === item.operand && String(i.value) === String(item.value))));
      this.alertService.addSuccess($localize`:@@alertMailDeleted:Alerta de correo eliminada`);
    } catch (err: any) {
      this.alertService.addError(err);
    }
  }

  async deleteDashboardMailConfig(id: string) {
    try {
      const response = await lastValueFrom(this.dashboardService.getDashboard(id)) as DashboardDetailResponse;
      const dashboard = response.dashboard;
      if (dashboard.config?.sendViaMailConfig) {
        dashboard.config.sendViaMailConfig.enabled = false;
      }
      await lastValueFrom(this.dashboardService.updateDashboard(id, {
        config: dashboard.config,
        group: (response as any).group ?? []
      }));
      this.dashboardItems.update(items => items.filter((d: DashboardItem) => d.id !== id));
      this.alertService.addSuccess($localize`:@@dashboardMailDeleted:Configuración de envío eliminada`);
    } catch (err: any) {
      this.alertService.addError(err);
    }
  }

  isSendingNow = signal<boolean>(false);//borrar

  async handleSendNow() {
    this.isSendingNow.set(true);
    try {
      await lastValueFrom(this.mailService.sendNow());
      this.alertService.addSuccess($localize`:@@mailSentNow:Envío iniciado correctamente`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSendingNow.set(false);
    }
  }

  toggleTls() {
    this.tlsEnabled.update(v => !v);
  }

  async handleCheckCredentials() {
    this.spinnerService.on();
    const options = this.getOptions();
    this.mailService.checkConfiguration(options).subscribe({
      next: () => {
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@mailConfOk:Credenciales correctas`);
      },
      error: err => {
        this.spinnerService.off();
        this.alertService.addError(err);
      }
    });
  }

  async handleSubmit() {
    this.isSubmitting.set(true);
    try {
      const options = this.getOptions();
      await lastValueFrom(this.mailService.saveConfiguration(options));
      this.alertService.addSuccess($localize`:@@mailConfSaved:Configuración guardada correctamente`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private getOptions() {
    const v = this.unifiedForm.value;
    if (v.configType === 'GMAIL') {
      return {
        configType: 'GMAIL',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          type: 'OAuth2',
          user: v.user,
          clientId: v.clientId,
          clientSecret: v.clientSecret,
          refreshToken: v.refreshToken,
        },
        tls: { rejectUnauthorized: this.tlsEnabled() }
      };
    }
    return {
      configType: 'SMPT',
      host: v.host,
      port: v.port,
      secure: v.secure,
      auth: { user: v.user, pass: v.password },
      tls: { rejectUnauthorized: !!v.secure }
    };
  }

}
