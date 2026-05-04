import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { AlertService, SpinnerService } from '@eda/services/service.index';
import { AssistantService } from '@eda/services/api/assistant.service';
import { IaFormStateService } from '@eda/services/shared/IaFormState.service';

@Component({
  selector: 'app-ai-management',
  standalone: true,
  templateUrl: 'ai-management.page.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AiManagementPage implements OnInit {

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private assistantService = inject(AssistantService);
  private spinnerService = inject(SpinnerService);
  private iaFormStateService = inject(IaFormStateService)

  isSubmitting = signal(false);
  availableEnabled = signal(false);
  showApiKey = signal(false);
  showAwsSecretKey = signal(false);

  aiForm: FormGroup;

  get isBedrock(): boolean {
    return this.aiForm.get('PROVIDER')?.value === 'bedrock';
  }

  constructor() {
    this.aiForm = this.fb.group({
      PROVIDER: ['openai', Validators.required],
      API_KEY: ['', Validators.required],
      AWS_ACCESS_KEY: [''],
      AWS_SECRET_KEY: [''],
      AWS_REGION: [''],
      MODEL: ['', Validators.required],
      CONTEXT: ['', Validators.required],
      AVAILABLE: [false],
      LIMIT: [100, [Validators.required, Validators.min(1)]],
      MAX_TOKENS: [1000, [Validators.required, Validators.min(1)]],
      EDA_APP_URL: ['', Validators.required],
      MCP_URL: ['', Validators.required],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadConfig();
  }

  private async loadConfig() {
    try {
      this.spinnerService.on();
      const res = await lastValueFrom(this.assistantService.getConfig());
      const cfg = res.config;
      this.aiForm.patchValue({
        PROVIDER: cfg.PROVIDER ?? 'openai',
        API_KEY: this.API_KEY_PLACEHOLDER,
        AWS_ACCESS_KEY: cfg.AWS_ACCESS_KEY ?? '',
        AWS_SECRET_KEY: cfg.AWS_SECRET_KEY ? this.AWS_SECRET_PLACEHOLDER : '',
        AWS_REGION: cfg.AWS_REGION ?? '',
        MODEL: cfg.MODEL,
        CONTEXT: cfg.CONTEXT,
        AVAILABLE: cfg.AVAILABLE,
        LIMIT: cfg.LIMIT,
        MAX_TOKENS: cfg.MAX_TOKENS ? cfg.MAX_TOKENS : 1000,
        EDA_APP_URL: cfg.EDA_APP_URL ? cfg.EDA_APP_URL : '',
        MCP_URL: cfg.MCP_URL ? cfg.MCP_URL : '',
      });
      this.availableEnabled.set(cfg.AVAILABLE);
      this.iaFormStateService.setFormData(cfg);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.spinnerService.off();
    }
  }

  toggleAvailable() {
    this.availableEnabled.update(v => !v);
    this.aiForm.patchValue({ AVAILABLE: this.availableEnabled() });
  }

  toggleShowApiKey() {
    this.showApiKey.update(v => !v);
  }

  readonly API_KEY_PLACEHOLDER = 'you should know..... ;)';
  readonly AWS_SECRET_PLACEHOLDER = 'you should know..... ;)';

  toggleShowAwsSecretKey() {
    this.showAwsSecretKey.update(v => !v);
  }

  async handleSubmit() {
    if (this.aiForm.invalid) return;
    this.isSubmitting.set(true);
    try {
      const payload = { ...this.aiForm.value };
      if (payload.API_KEY === this.API_KEY_PLACEHOLDER) {
        delete payload.API_KEY;
      }
      if (payload.AWS_SECRET_KEY === this.AWS_SECRET_PLACEHOLDER) {
        delete payload.AWS_SECRET_KEY;
      }
      this.iaFormStateService.setFormData(payload); 
      await lastValueFrom(this.assistantService.saveConfig(payload));
      this.alertService.addSuccess($localize`:@@aiConfigSaved:Configuración de IA guardada correctamente`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
