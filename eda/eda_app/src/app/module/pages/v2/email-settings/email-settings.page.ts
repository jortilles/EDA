import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MailService, AlertService, DashboardService,SpinnerService } from '@eda/services/service.index';
import { lastValueFrom } from 'rxjs';
import { IconComponent } from '@eda/shared/components/icon/icon.component';


interface AlertItem {
  id: string;
  alerts: string;
  panel: string;
  dashboard: string;
  datamodel: string;
}

interface DashboardItem {
  id: string;
  dashboard: string;
  datamodel: string; 
}

interface DashboardSummary {
  _id: string;
  config?: {
    haveAlerts?: boolean;
  }
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
            output?: { config?: { alertLimits?: Array<{
              operand: string;
              value: string | number;
              mailing?: { enabled?: boolean };
            }> } };
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

  constructor() {
  this.emailForm = this.fb.group({
    host: [null, Validators.required],
    port: [null, Validators.required],
    secure: [false, Validators.required],
    user: [null, Validators.required],
    password: [null, Validators.required],
  });
  }
  
private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private mailService = inject(MailService);
  private dashboardService = inject(DashboardService);
  private spinnerService = inject(SpinnerService);
  private router = inject(Router);


  tlsEnabled = signal<boolean>(false);
  emailForm: FormGroup;
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

  async ngOnInit(): Promise<void> {
    await this.loadEmailSettings();
    await this.loadDashboardsData();   
  }

private async loadEmailSettings() {
  const mailSettings = await lastValueFrom(this.mailService.getConfiguration());
  this.emailForm.patchValue({
    host: mailSettings.config.host,
    port: mailSettings.config.port,
    secure: mailSettings.config.secure,
    user: mailSettings.config.auth.user,
    password: null
  });

  this.tlsEnabled.set(mailSettings.config.secure);
}

  private async loadDashboardsData() {
    // Todos los dashboards
    const list = await lastValueFrom(this.dashboardService.getDashboards()) as DashboardsListResponse;
      
    // Unimos todos los dashboards en un solo array
    const allDashboards = [
      ...(list.dashboards ?? []),
      ...(list.group ?? []),
      ...(list.publics ?? []),
      ...(list.shared ?? []),
    ];

    // IDs de los dashboards
    const ids = allDashboards.map(d => d._id);

    // Pedimos los detalles de dashboards
    const detailPromises = ids.map(id => lastValueFrom(this.dashboardService.getDashboard(id)));
    const details = (await Promise.all(detailPromises)) as DashboardDetailResponse[];

    // Rellenamos signals
    const alerts: AlertItem[] = [];
    const dashboardsForMail: DashboardItem[] = [];

    for (const d of details) {
      const dash = d.dashboard;
      const title = dash.config?.title ?? '';
      const modelName = d.datasource?.name ?? '';
      const dashId = dash._id;

      // Dashboard signals
      const panels = dash.config?.panel ?? [];
        if (dash.config?.sendViaMailConfig?.enabled) {
          dashboardsForMail.push({
            id: dashId,
            dashboard: title,
            datamodel: modelName,
          });
      }
      
      this.dashboardItems.set(dashboardsForMail);

      // Alerts signals
      for (const p of panels) {
        const isKpi = p?.content?.chart.startsWith('kpi');
        const limits = p?.content?.query?.output?.config?.alertLimits ?? [];
        if (!isKpi || limits.length === 0) continue;

        for (const a of limits) {
          alerts.push({
            id: dashId,
            alerts: `KPI ${a.operand} ${a.value}`,
            panel: p.title,
            dashboard: title,
            datamodel: modelName,
          });
        }
      }
    }
    this.alertItems.set(alerts);
  }

  goToDashboardById(id: string) {
    this.router.navigate(['/dashboard', id]);
  }

  toggleTls() {
    this.tlsEnabled.update(v => !v);
  }

  async handleCheckCredentials() {
    this.spinnerService.on();
    const options = this.getOptions();

    this.mailService.checkConfiguration(options).subscribe(
      res => {
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@mailConfOk:Credenciales  correctas`);
      },
      err => {
        this.alertService.addError(err)
      }
    );
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
    const v = this.emailForm.value;
    return {
      host: v.host,
      port: v.port,
      secure: v.secure,
      auth: { user: v.user, pass: v.password },
      tls: { rejectUnauthorized: v.secure ? true : false }
    };
  }

    public sendMailconfig() {
  }
}
