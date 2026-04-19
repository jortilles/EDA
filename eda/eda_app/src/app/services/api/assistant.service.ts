import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssistantService extends ApiService{

  public AiRouter = '/assistant';

  responseChatGpt(message: string): Observable<any> {
    return this.post(`${this.AiRouter}/response`, {input: message})
  }

  availableChatGpt(): Observable<any> {
    return this.get(`${this.AiRouter}/available`)
  }

  sendPrompt(text: string, history?: any[], data?: any, schema? :any[], parameters? : object): Observable<{ text: string } | any> {

    const payload = { text, history, data, schema, parameters };

    return this.post(`${this.AiRouter}/prompt`, payload).pipe(
      map((resp: any) => {
        return resp;
      })
    );
  }

  getConfig(): Observable<any> {
    return this.get(`${this.AiRouter}/config`);
  }

  saveConfig(config: { API_KEY: string; MODEL: string; CONTEXT: string; AVAILABLE: boolean; LIMIT: number }): Observable<any> {
    return this.post(`${this.AiRouter}/config`, config);
  }

}
