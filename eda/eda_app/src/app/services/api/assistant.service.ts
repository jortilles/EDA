import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AssistantService extends ApiService{

  public AiRouter = '/assistant';

  sendChat(message: string): Observable<string> {
    return this.post(`${this.AiRouter}/response`, { input: message }).pipe(
      map((res: any) => res.text ?? '')
    );
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

  getSuggestions(schema: any[]): Observable<string[]> {
    return this.post(`${this.AiRouter}/suggestions`, { schema }).pipe(
      map((resp: any) => resp.suggestions ?? [])
    );
  }

  getConfig(): Observable<any> {
    return this.get(`${this.AiRouter}/config`);
  }

  saveConfig(config: { API_KEY: string; MODEL: string; CONTEXT: string; AVAILABLE: boolean; LIMIT: number }): Observable<any> {
    return this.post(`${this.AiRouter}/config`, config);
  }

}
