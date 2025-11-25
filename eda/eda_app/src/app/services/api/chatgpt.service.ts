import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatgptService extends ApiService{

  public chatGptRoute = '/chatgpt';

  responseChatGpt(message: string): Observable<any> {
    return this.post(`${this.chatGptRoute}/response`, {input: message})
  }

  availableChatGpt(): Observable<any> {
    return this.get(`${this.chatGptRoute}/availableChatGpt`)
  }

  sendPrompt(text: string, history?: any[]): Observable<{ text: string } | any> {

    const payload = { text, history };

    return this.post(`${this.chatGptRoute}/prompt`, payload).pipe(
      map((resp: any) => {
        // Si tu backend devuelve un campo 'text' u otro, adáptalo aquí.
        // Por defecto devolvemos resp directamente.
        console.log('RECEPCION DE RESP: resp => ', resp);
        
        return resp.response.output_text;
      })
    );
  }

}
