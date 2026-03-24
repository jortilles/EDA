import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { lastValueFrom } from 'rxjs';
import { AlertService, SpinnerService } from '@eda/services/service.index';
import { ChatgptService } from '@eda/services/api/chatgpt.service';

@Component({
  selector: 'app-ai-management',
  standalone: true,
  templateUrl: 'ai-management.page.html',
  imports: [CommonModule, ReactiveFormsModule],
})
export class AiManagementPage implements OnInit {

  private fb = inject(FormBuilder);
  private alertService = inject(AlertService);
  private chatgptService = inject(ChatgptService);
  private spinnerService = inject(SpinnerService);

  isSubmitting = signal(false);
  availableEnabled = signal(false);
  showApiKey = signal(false);

  aiForm: FormGroup;

  constructor() {
    this.aiForm = this.fb.group({
      API_KEY: ['', Validators.required],
      MODEL: ['', Validators.required],
      CONTEXT: ['', Validators.required],
      AVAILABLE: [false],
      LIMIT: [100, [Validators.required, Validators.min(1)]],
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadConfig();
  }

  private async loadConfig() {
    try {
      this.spinnerService.on();
      const res = await lastValueFrom(this.chatgptService.getConfig());
      const cfg = res.config;
      this.aiForm.patchValue({
        API_KEY: this.API_KEY_PLACEHOLDER,
        MODEL: cfg.MODEL,
        CONTEXT: cfg.CONTEXT,
        AVAILABLE: cfg.AVAILABLE,
        LIMIT: cfg.LIMIT,
      });
      this.availableEnabled.set(cfg.AVAILABLE);
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

  async handleSubmit() {
    if (this.aiForm.invalid) return;
    this.isSubmitting.set(true);
    try {
      const payload = { ...this.aiForm.value };
      if (payload.API_KEY === this.API_KEY_PLACEHOLDER) {
        delete payload.API_KEY;
      }
      await lastValueFrom(this.chatgptService.saveConfig(payload));
      this.alertService.addSuccess($localize`:@@aiConfigSaved:Configuración de IA guardada correctamente`);
    } catch (err: any) {
      this.alertService.addError(err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
