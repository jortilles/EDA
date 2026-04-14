import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class IaChatService extends ApiService {
  private readonly route = '/ia/chat';

  sendMessage(messages: ChatMessage[]): Observable<{ ok: boolean; response: string }> {
    return this.post(this.route, { messages }) as Observable<{ ok: boolean; response: string }>;
  }

  getConfig(): Observable<{ available: boolean }> {
    return this.get(`${this.route}/config`) as Observable<{ available: boolean }>;
  }
}
