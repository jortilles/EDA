import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatOption {
  num: number;
  label: string;
  type?: 'dashboard' | 'datasource' | 'paste' | 'generate_confirm';
  dashboard_id?: string;
  panel_index?: number;
  dashboard_url?: string;
  pasteText?: string;
  datasource_id?: string;
  datasource_name?: string;
  campos_consulta?: string[];
  dashboard_nombre?: string;
  panel_titulo?: string;
  tiene_filtros?: boolean;
  filtros_nombres?: string;
  // generate_confirm fields
  proposed_title?: string;
  description?: string;
  visibility?: string;
}

export interface BarChartDataset {
  label: string;
  values: number[];
}

export interface BarChart {
  type: 'bar';
  title: string;
  labels: string[];
  datasets: BarChartDataset[];
  labelKey: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  displayContent?: string;
  options?: ChatOption[];
  chart?: BarChart;
}

export type ChatEvent =
  | { type: 'status'; code: string }
  | { type: 'token'; text: string }
  | { type: 'response'; ok: boolean; response: string; options?: ChatOption[]; chart?: BarChart };

@Injectable({
  providedIn: 'root'
})
export class IaChatService extends ApiService {
  private readonly route = '/ia/chat';

  sendMessage(messages: ChatMessage[]): Observable<ChatEvent> {
    return new Observable(observer => {
      const token = localStorage.getItem('token') ?? '';
      const url = `${this.API}${this.route}?token=${encodeURIComponent(token)}`;
      const controller = new AbortController();

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      }).then(async (resp) => {
        if (!resp.ok) {
          const text = await resp.text().catch(() => resp.statusText);
          observer.error(new Error(text));
          return;
        }

        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ') && currentEvent) {
              const raw = line.slice(6).trim();
              try {
                const parsed = JSON.parse(raw);
                if (currentEvent === 'status') {
                  observer.next({ type: 'status', code: parsed.code });
                } else if (currentEvent === 'token') {
                  observer.next({ type: 'token', text: parsed.text });
                } else if (currentEvent === 'response') {
                  observer.next({ type: 'response', ok: parsed.ok, response: parsed.response, options: parsed.options, chart: parsed.chart });
                  observer.complete();
                  return;
                }
              } catch { /* ignore malformed SSE data */ }
              currentEvent = '';
            }
          }
        }
        observer.complete();
      }).catch(err => {
        if (err.name !== 'AbortError') observer.error(err);
        else observer.complete();
      });

      return () => controller.abort();
    });
  }

  generateDashboard(body: { datasource_id: string; description: string; title: string; visible: string; group?: string[] }): Observable<any> {
    return this.post('/assistant/generate-dashboard', body) as Observable<any>;
  }

  getConfig(): Observable<{ available: boolean }> {
    return this.get(`${this.route}/config`) as Observable<{ available: boolean }>;
  }
}
