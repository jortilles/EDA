import { Component, inject, OnInit, AfterViewChecked, signal, ViewChild, ElementRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NgChartsModule } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import { IaChatService, ChatMessage, ChatOption, BarChart } from '@eda/services/api/ia-chat.service';
import type { ChatEvent } from '@eda/services/api/ia-chat.service';
import { CORPORATE_COLORS } from '@eda/configs/index';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './chatbot.component.html',
  styleUrls: ['./chatbot.component.css']
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
  private iaChatService = inject(IaChatService);
  private sanitizer = inject(DomSanitizer);
  private zone = inject(NgZone);

  private markdownCache = new Map<string, SafeHtml>();
  @ViewChild('chatMessages') private chatMessagesRef!: ElementRef;
  @ViewChild('chatInputEl') private chatInputEl!: ElementRef<HTMLTextAreaElement>;

  chatOpen = signal(false);
  chatAvailable = signal(false);
  chatLoading = signal(false);
  chatStatusMessage = signal('');
  chatHistory: ChatMessage[] = [];

  private readonly chartPalette = ['b3', '99', '80', '70', '60'];
  private readonly chartExtraColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  private chartDataCache = new WeakMap<BarChart, ChartData<'bar'>>();
  private chartOptsCache = new WeakMap<BarChart, ChartOptions<'bar'>>();

  private readonly statusLabels: Record<string, string> = {
    connecting: $localize`:@@chatStatusConnecting:Conectando con las fuentes de datos...`,
    analyzing:  $localize`:@@chatStatusAnalyzing:Analizando tu pregunta...`,
    searching:  $localize`:@@chatStatusSearching:Buscando datos...`,
    processing: $localize`:@@chatStatusProcessing:Procesando resultados...`,
    preparing:  $localize`:@@chatStatusPreparing:Preparando respuesta...`,
  };

  private shouldScrollChat = false;
  private chatInputListenerAdded = false;

  public chatSuggestion2: string = $localize`:@@chatSuggestion2:¿Qué datasources hay?`;
  readonly chatFallbackYes: string = $localize`:@@chatFallbackYes:Sí`;
  readonly chatFallbackSearchIn: string = $localize`:@@chatFallbackSearchIn:Buscar en...`;
  readonly chatFallbackSearchInPrefix: string = $localize`:@@chatFallbackSearchInPrefix:Buscar en: `;

  ngOnInit(): void {
    this.iaChatService.getConfig().subscribe({
      next: (cfg) => this.chatAvailable.set(cfg.available),
      error: () => this.chatAvailable.set(false),
    });
  }

  ngAfterViewChecked(): void {
    if (!this.chatInputListenerAdded && this.chatInputEl?.nativeElement) {
      this.chatInputListenerAdded = true;
      this.zone.runOutsideAngular(() => {
        this.chatInputEl.nativeElement.addEventListener('input', () => {
          const el = this.chatInputEl.nativeElement;
          el.style.height = 'auto';
          el.style.height = Math.min(el.scrollHeight, 120) + 'px';
        });
      });
    }
    if (this.shouldScrollChat && this.chatMessagesRef) {
      const el = this.chatMessagesRef.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScrollChat = false;
    }
  }

  buildChartData(chart: BarChart): ChartData<'bar'> {
    if (this.chartDataCache.has(chart)) return this.chartDataCache.get(chart)!;
    const primary = CORPORATE_COLORS.primary;
    const result: ChartData<'bar'> = {
      labels: chart.labels,
      datasets: chart.datasets.map((ds, i) => {
        const base = i === 0 ? primary : (this.chartExtraColors[i - 1] ?? this.chartExtraColors[this.chartExtraColors.length - 1]);
        const alpha = this.chartPalette[i] ?? 'b3';
        return { label: ds.label, data: ds.values, backgroundColor: base + alpha, borderColor: base, borderWidth: 1, borderRadius: 4 };
      }),
    };
    this.chartDataCache.set(chart, result);
    return result;
  }

  buildChartOptions(chart: BarChart): ChartOptions<'bar'> {
    if (this.chartOptsCache.has(chart)) return this.chartOptsCache.get(chart)!;
    const result: ChartOptions<'bar'> = {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 400 },
      plugins: {
        legend: { display: chart.datasets.length > 1, labels: { font: { size: 10 }, boxWidth: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-ES')}` } },
      },
      scales: {
        x: { ticks: { font: { size: 9 }, maxRotation: 35 } },
        y: { beginAtZero: true, ticks: { font: { size: 9 } } },
      },
    };
    this.chartOptsCache.set(chart, result);
    return result;
  }

  resetChat(): void {
    this.chatHistory = [];
    this.chatLoading.set(false);
    this.chatStatusMessage.set('');
    setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
  }

  toggleChat(): void {
    const opening = !this.chatOpen();
    this.chatOpen.set(opening);
    if (opening) {
      setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
    }
  }

  useSuggestion(text: string): void {
    if (this.chatInputEl?.nativeElement) {
      this.chatInputEl.nativeElement.value = text;
    }
    this.sendChatMessage();
  }

  pasteToInput(text: string): void {
    if (this.chatInputEl?.nativeElement) {
      this.chatInputEl.nativeElement.value = text;
      this.chatInputEl.nativeElement.dispatchEvent(new Event('input'));
      this.chatInputEl.nativeElement.focus();
    }
  }

  onChatKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendChatMessage();
    }
  }

  sendChatMessage(): void {
    const text = this.chatInputEl?.nativeElement.value.trim() ?? '';
    if (!text || this.chatLoading()) return;

    this.chatHistory.push({ role: 'user', content: text });
    this.chatInputEl.nativeElement.value = '';
    this.chatInputEl.nativeElement.style.height = 'auto';
    this.chatLoading.set(true);
    this.chatStatusMessage.set('');
    this.shouldScrollChat = true;

    this.iaChatService.sendMessage(this.chatHistory).subscribe(this.chatHandlers());
  }

  selectOption(option: ChatOption): void {
    if (option.type === 'paste') {
      this.pasteToInput(this.chatFallbackSearchInPrefix);
      return;
    }
    if (this.chatLoading()) return;
    const msgWithOptions = [...this.chatHistory].reverse().find(m => m.role === 'assistant' && m.options && m.options.length > 0);
    if (msgWithOptions) msgWithOptions.options = [];
    let displayLabel: string;
    let apiMsg: string;
    if (option.type === 'datasource') {
      displayLabel = option.label;
      apiMsg = option.datasource_id
        ? `sí (ejecuta get_data_from_dashboard con datasource_id="${option.datasource_id}"${option.campos_consulta?.length ? ` y campos_consulta=${JSON.stringify(option.campos_consulta)}` : ''})`
        : 'sí';
    } else {
      displayLabel = $localize`:@@chatOptionSelectedLabel:Opción` + ` ${option.num}: ${option.label}`;
      apiMsg = `${displayLabel} (dashboard_id: ${option.dashboard_id}, panel_index: ${option.panel_index})`;
    }
    this.chatHistory.push({ role: 'user', content: apiMsg, displayContent: displayLabel });
    this.chatLoading.set(true);
    this.chatStatusMessage.set('');
    this.shouldScrollChat = true;
    this.iaChatService.sendMessage(this.chatHistory).subscribe(this.chatHandlers());
  }

  private chatHandlers() {
    return {
      next: (event: ChatEvent) => {
        if (event.type === 'status') {
          this.chatStatusMessage.set(this.statusLabels[event.code] ?? '');
          this.shouldScrollChat = true;
        } else if (event.type === 'response') {
          this.chatStatusMessage.set('');
          this.chatHistory.push({ role: 'assistant', content: event.response, options: event.options ?? [], chart: event.chart });
          this.chatLoading.set(false);
          this.shouldScrollChat = true;
          setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
        }
      },
      error: () => {
        this.chatStatusMessage.set('');
        this.chatHistory.push({ role: 'assistant', content: $localize`:@@chatErrorConnecting:Error al conectar con el asistente.` });
        this.chatLoading.set(false);
        this.shouldScrollChat = true;
        setTimeout(() => this.chatInputEl?.nativeElement?.focus(), 50);
      },
    };
  }

  renderMarkdown(text: string): SafeHtml {
    if (this.markdownCache.has(text)) return this.markdownCache.get(text)!;

    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const codeBlocks: string[] = [];
    let html = text.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) => {
      const idx = codeBlocks.push(esc(code.trim())) - 1;
      return `\x00CODE${idx}\x00`;
    });

    const inlineCodes: string[] = [];
    html = html.replace(/`([^`\n]+)`/g, (_, code) => {
      const idx = inlineCodes.push(esc(code)) - 1;
      return `\x00INLINE${idx}\x00`;
    });

    const linkBlocks: string[] = [];
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label, url) => {
      const idx = linkBlocks.push(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${label}</a>`
      ) - 1;
      return `\x00LINK${idx}\x00`;
    });

    const tableBlocks: string[] = [];
    const rawLines = html.split('\n');
    const processedLines: string[] = [];
    let li = 0;
    while (li < rawLines.length) {
      const cur = rawLines[li].trim();
      const nxt = rawLines[li + 1]?.trim() ?? '';
      if (cur.startsWith('|') && /^\|(?:[ \t]*:?-+:?[ \t]*\|)+$/.test(nxt)) {
        const headers = cur.split('|').slice(1, -1)
          .map(h => `<th>${h.trim()}</th>`).join('');
        li += 2;
        const bodyRows: string[] = [];
        while (li < rawLines.length && rawLines[li].trim().startsWith('|')) {
          const cells = rawLines[li].trim().split('|').slice(1, -1)
            .map(c => `<td>${c.trim()}</td>`).join('');
          bodyRows.push(`<tr>${cells}</tr>`);
          li++;
        }
        const tHtml = `<div class="chat-table-wrapper"><table class="chat-table"><thead><tr>${headers}</tr></thead><tbody>${bodyRows.join('')}</tbody></table></div>`;
        const tIdx = tableBlocks.push(tHtml) - 1;
        processedLines.push(`\x00TABLE${tIdx}\x00`);
      } else {
        processedLines.push(rawLines[li]);
        li++;
      }
    }
    html = processedLines.join('\n');

    html = html.replace(/(https?:\/\/[^\s<>")\]\n\x00]+)/g, (_, url) => {
      const display = url.length > 55 ? url.substring(0, 52) + '…' : url;
      const idx = linkBlocks.push(
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link">${esc(display)}</a>`
      ) - 1;
      return `\x00LINK${idx}\x00`;
    });

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/\b_([^_\n]+)_\b/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/^### (.+)$/gm, '<div class="chat-h3">$1</div>');
    html = html.replace(/^## (.+)$/gm, '<div class="chat-h2">$1</div>');
    html = html.replace(/^# (.+)$/gm, '<div class="chat-h1">$1</div>');
    html = html.replace(/^---+$/gm, '<hr class="chat-hr">');
    html = html.replace(/^[ \t]*\d+\. (.+)$/gm, '<li class="ol-li">$1</li>');
    html = html.replace(/(<li class="ol-li">[\s\S]*?<\/li>)/g, '<ol class="chat-ol">$1</ol>');
    html = html.replace(/<\/ol>\s*<ol class="chat-ol">/g, '');
    html = html.replace(/^[ \t]*[-*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul class="chat-list">$1</ul>');
    html = html.replace(/<\/ul>\s*<ul class="chat-list">/g, '');
    html = html.replace(/\n\n+/g, '</p><p class="mt-2">');
    html = html.replace(/\n/g, '<br>');

    tableBlocks.forEach((t, i) => { html = html.replace(`\x00TABLE${i}\x00`, t); });
    codeBlocks.forEach((code, i) => {
      html = html.replace(`\x00CODE${i}\x00`, `<pre class="chat-code-block"><code>${code}</code></pre>`);
    });
    inlineCodes.forEach((code, i) => {
      html = html.replace(`\x00INLINE${i}\x00`, `<code class="chat-inline-code">${code}</code>`);
    });
    linkBlocks.forEach((link, i) => {
      html = html.replace(`\x00LINK${i}\x00`, link);
    });

    const result = this.sanitizer.bypassSecurityTrustHtml('<p>' + html + '</p>');
    this.markdownCache.set(text, result);
    return result;
  }
}
