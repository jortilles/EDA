import { Injectable, inject, signal } from '@angular/core';
import { AssistantService } from '@eda/services/api/assistant.service';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IaFormStateService {

    private assistantService = inject(AssistantService);

    formData = signal({
        PROVIDER: "",
        API_KEY: "",
        MODEL: "",
        CONTEXT: "",
        AVAILABLE: false,
        LIMIT: 100
    });

    constructor() {
        this.loadConfig();
    }

    private async loadConfig() {
        try {
            const res = await lastValueFrom(this.assistantService.getConfig());
            this.formData.set(res.config);
        } catch(error) {
            console.log('Error en la carga de la configuración de la IA: ', error);
        }
    }

    setFormData(data: any) {
        this.formData.set(data);
    }

}
