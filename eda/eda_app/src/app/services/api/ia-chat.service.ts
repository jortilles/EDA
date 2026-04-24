import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatOption {
  num: number;
  label: string;
  dashboard_id: string;
  panel_index: number;
  dashboard_url: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  options?: ChatOption[];
}

@Injectable({
  providedIn: 'root'
})
export class IaChatService extends ApiService {
  private readonly route = '/ia/chat';

  sendMessage(messages: ChatMessage[]): Observable<{ ok: boolean; response: string; options?: ChatOption[] }> {
    return this.post(this.route, { messages }) as Observable<{ ok: boolean; response: string; options?: ChatOption[] }>;
  }

  getConfig(): Observable<{ available: boolean }> {
    return this.get(`${this.route}/config`) as Observable<{ available: boolean }>;
  }
}
