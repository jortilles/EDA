import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconComponent } from '@eda/shared/components/icon/icon.component';
import { MailService } from '@eda/services/service.index';
import { AlertService } from "@eda/services/service.index";
import { lastValueFrom } from 'rxjs';

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

@Component({
  selector: 'app-email-settings',
	templateUrl: 'email-settings.page.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, IconComponent],
  styles: []
})
export class EmailSettingsPage implements OnInit {
  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
	private mailService = inject(MailService);
  // Signals para el estado
  tlsEnabled = signal<boolean>(false);
	emailForm: FormGroup
  isChecking = signal<boolean>(false);
  isSubmitting = signal<boolean>(false);
  alertsPerPage = signal<string>("10");
  dashboardsPerPage = signal<string>("10");

  // Datos de ejemplo
  alertItems = signal<AlertItem[]>([
    { id: "1", alerts: "Alert 1", panel: "Panel A", dashboard: "Main", datamodel: "Model 1" },
    { id: "2", alerts: "Alert 2", panel: "Panel B", dashboard: "Analytics", datamodel: "Model 2" },
    { id: "3", alerts: "Alert 3", panel: "Panel C", dashboard: "Sales", datamodel: "Model 3" },
  ]);

  dashboardItems = signal<DashboardItem[]>([
    { id: "1", dashboard: "Main Dashboard", datamodel: "Sales Model" },
    { id: "2", dashboard: "Analytics Dashboard", datamodel: "User Model" },
    { id: "3", dashboard: "Performance Dashboard", datamodel: "Traffic Model" },
  ]);

	ngOnInit(): void {
		this.loadEmailSettings();
	}
	
	private async loadEmailSettings() {
		const mailSettings = await lastValueFrom(this.mailService.getConfiguration());
		this.emailForm = this.fb.group({
			host: [mailSettings.config.host, Validators.required],
			port: [mailSettings.config.port, Validators.required],
			secure: [mailSettings.config.secure, Validators.required],
			user: [mailSettings.config.auth.user, Validators.required],
			password: [null, Validators.required],
		});

		this.tlsEnabled.set(mailSettings.config.secure);
	}

  // Métodos
  toggleTls() {
    this.tlsEnabled.update(value => !value);
  }

  async handleCheckCredentials() {
		// TODO
    this.isChecking.set(true);
    // Simular verificación
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isChecking.set(false);
    
    this.alertService.addSuccess($localize`:@@validCredentials:Las credenciales son válidas`);
  }

  async handleSubmit() {
		// TODO
    this.isSubmitting.set(true);
    // Simular envío
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.isSubmitting.set(false);
    
    this.alertService.addSuccess($localize`:@@mailConfSaved:Configuración guardada correctamente`);
  }

	public sendMailconfig() {
		// TODO
    // const options = this.getOptions();
    // this.spinnerService.on();
    // this.mailService.saveConfiguration(options).subscribe(
    //   res => {
    //     this.spinnerService.off();
    //     this.alertService.addSuccess($localize`:@@mailConfSaved:Configuración guardada correctamente`);
    //   },
    //   err => {
    //     this.spinnerService.off();
    //     this.alertService.addError(err)
    //   }
    // );

  }
}