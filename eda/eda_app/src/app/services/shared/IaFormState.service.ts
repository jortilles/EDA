import { Injectable, inject, signal } from '@angular/core';
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { lastValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IaFormStateService {

    private chatgptService = inject(ChatgptService);

    formData = signal({
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
            const res = await lastValueFrom(this.chatgptService.getConfig());
            this.formData.set(res.config);
        } catch(error) {
            console.log('Error en la carga de la configuración de la IA: ', error);
        }
    }

    setFormData(data: any) {
        this.formData.set(data);
    }

}
