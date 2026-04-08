import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IaFormStateService {
    
    // Valor referencial
    formData = signal({
        API_KEY: "",
        MODEL: "",
        CONTEXT: "",
        AVAILABLE: false,
        LIMIT: 100
    })

    setFormData(data: any){
        this.formData.set(data);
    }

}