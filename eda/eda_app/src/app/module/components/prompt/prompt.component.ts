import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { AssistantService } from '@eda/services/api/assistant.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Components
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';

// Chart suggestion interface for the AI assistant
interface ChartSuggestion {
    type: string;
    subType: string;
    label: string;
}
// AI chat message interface
interface ChatMessage {
    id?: string | number;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp?: number;
    copied?: boolean;
    suggestedCharts?: ChartSuggestion[];
}


@Component({
selector: 'Prompt',
standalone: true,
imports: [SharedModule, FormsModule, CommonModule],
templateUrl: './prompt.component.html',
styleUrls: ['./prompt.component.css']
})
export class PromptComponent implements OnInit, AfterViewInit {

    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @Input() edaBlankPanel: EdaBlankPanelComponent;
    @Output() newCurrentQuery: EventEmitter<any[]> = new EventEmitter();
    @Output() newSelectedFilters: EventEmitter<any> = new EventEmitter();
    @Output() principalTable: EventEmitter<any> = new EventEmitter();
    @Output() chartSelected = new EventEmitter<{ type: string, subType: string }>();

    // Variable temporarily stored in EDA-BLANK-PANEL
    @Input() messages: ChatMessage[];
    @Output() messagesChange = new EventEmitter<ChatMessage[]>();

    private static suggestionsCache = new Map<string, string[]>();

    inputText = '';
    sending = false;
    suggestions: string[] = [];
    loadingSuggestions = false;
    schema: any[] = [] ; // Schema of all tables and their columns
    firstTime: boolean = true;
    private shouldAutoScroll: boolean = true;
    loading: boolean = false;
    isCopied: boolean = false;

    // Filter resolution state: activated when the backend responds with awaiting_resolution or awaiting_selection
    private resolutionState: { options: string[], unresolvedFilter: any, pendingResult: any } | null = null;

    constructor(private assistantService: AssistantService, private sanitizer: DomSanitizer) {}

    // Initialize scroll to the position of the last assistant response message
    ngAfterViewInit(): void {
        const el = this.messagesContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }

    ngOnInit(): void {
        const tables = this.edaBlankPanel.tables;
        this.initSchema(tables);
        this.loadSuggestions();
    }

    private loadSuggestions(): void {
        const dsId = this.edaBlankPanel.dataSource._id;
        const cached = PromptComponent.suggestionsCache.get(dsId);
        if (cached) {
            this.suggestions = cached;
            return;
        }
        this.loadingSuggestions = true;
        this.assistantService.getSuggestions(this.schema).subscribe({
            next: (suggestions) => {
                this.suggestions = suggestions;
                PromptComponent.suggestionsCache.set(dsId, suggestions);
                this.loadingSuggestions = false;
            },
            error: () => {
                this.loadingSuggestions = false;
            }
        });
    }

    initSchema(tables: any[]) {
        let schema = [];

        tables.forEach((table: any) => {
            let columns = [];
            table.columns.forEach((column: any) => {
                if(column.visible) {
                    columns.push({
                        column: column.column_name,
                        column_type: column.column_type,
                        description: column.description?.default,
                        ia_visibility: column.ia_visibility,
                    });
                }

            });
            schema.push({
                table: table.table_name,
                description: table.description?.default ?? table.description ?? '',
                columns: columns,
            })
        })

        // console.log('this.edaBlankPanel: ', this.edaBlankPanel)
        // console.log('schema: ', schema)

        this.schema = schema;
    }

    sendMessage(): void {

        const data = this.edaBlankPanel.tables; // tables
        const text = this.inputText?.trim();

        // Filter empty text.
        if (!text) return;

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);

        
        this.loading = true;
        this.isCopied = false;

        // Autoscroll when sending messages
        this.shouldAutoScroll = true;
        this.scrollToBottom()

        this.inputText = ''; // Once the entered text is stored, the input is reset
        this.sending = true;
        
        // Call to the service that sends the prompt to the Backend / OpenAI
        const histoty = this.messages;
        const schema = this.schema;
        const firstTime = this.firstTime;
        const parameters: any = {
            firstTime: firstTime,
            dataSource_id: this.edaBlankPanel.dataSource._id,
            dataSource_name: this.edaBlankPanel.dataSource.name,
        }

        // If there is an active resolution state, the user is choosing filter values
        if (this.resolutionState) {
            const selectedValues = this.parseSelection(text, this.resolutionState.options);
            parameters.filterResolution = {
                state: 'user_selected',
                selectedValues,
                unresolvedFilter: this.resolutionState.unresolvedFilter,
                pendingResult: this.resolutionState.pendingResult
            };
            this.resolutionState = null;
        }

        // console.log('this.edaBlankPanel: ', this.edaBlankPanel);
        // console.log('text: ', text);
        // console.log('histoty', histoty);
        // console.log('data: ', data);
        // console.log('schema: ', schema);
        // console.log('firstTime: ', firstTime);
        

        this.assistantService.sendPrompt(text, histoty, data, schema, parameters).subscribe({
            next: (resp) => {
                // We expect `resp` to contain the already processed response as text. Adapt according to your backend.
                const currentQuery = resp.response.currentQuery;
                const principalTable = resp.response.principalTable;
                const selectedFilters = resp.response.selectedFilters;
                const filteredColumns = resp.response.filteredColumns;
                const queryLimit = resp.response.queryLimit;
                
                console.log('----------- LLEGADA AL COMPONENTE -----------');
                console.log('--> RESPUESTA COMPONENTE: ', resp);
                console.log('--> currentQuery: ', currentQuery);
                console.log('--> principalTable: ', principalTable);
                console.log('--> selectedFilters: ', selectedFilters);
                console.log('--> filteredColumns: ', filteredColumns);

                // Capture the resolution state if the backend is waiting for a user selection
                const responseType = resp.response.type;
                if (responseType === 'awaiting_resolution' || responseType === 'awaiting_selection') {
                    this.resolutionState = {
                        options: resp.response.options ?? [],
                        unresolvedFilter: resp.response.unresolvedFilter,
                        pendingResult: resp.response.pendingResult
                    };
                } else {
                    // Normal response or query_ready: emit data to the panel
                    this.resolutionState = null;
                    if (currentQuery && currentQuery.length !== 0) {
                        this.newCurrentQuery.emit(currentQuery);
                        this.principalTable.emit({principalTable, currentQuery, queryLimit});
                        this.newSelectedFilters.emit({selectedFilters, filteredColumns});
                    }
                }

                const text = resp.response.output_text
                const assistantMessage: ChatMessage = {
                    role: 'assistant',
                    content: text ?? String(text),
                    timestamp: Date.now(),
                    suggestedCharts: resp.response.suggestedCharts ?? []
                };
                                
                this.messages.push(assistantMessage);

                this.sending = false;
                this.loading = false;

                // Autoscroll when receiving messages
                this.shouldAutoScroll = true;
                this.scrollToBottom()

                // Set to false after the first query
                this.firstTime = false;
            },
            error: (err) => {
                console.error('Error al enviar prompt:', err);
                const msg = this.classifyError(err);
                this.messages.push({ role: 'error', content: msg, timestamp: Date.now() });
                this.loading = false;
                this.sending = false;
            }
        });
    }

    // Send with Enter (Shift+Enter for a line break without sending).
    onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    scrollToBottom(): void {
        if (!this.shouldAutoScroll) return;

        setTimeout(() => {
            const el = this.messagesContainer?.nativeElement;
            if (el) {
            el.scrollTop = el.scrollHeight;
            }

            this.shouldAutoScroll = false;
        });
    }
    
    // Edit distance between two strings
    private levenshtein(a: string, b: string): number {
        const m = a.length, n = b.length;
        const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
            Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
        );
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    }

    // Tries to find the best match for a given term: exact → contains → fuzzy
    private findBestMatch(term: string, options: string[]): string | null {
        const lower = term.toLowerCase();

        // 1. Exact case-insensitive
        const exact = options.find(opt => opt.toLowerCase() === lower);
        if (exact) return exact;

        // 2. Option contains the term ("train" → "Trains")
        const contains = options.find(opt => opt.toLowerCase().includes(lower));
        if (contains) return contains;

        // 3. Fuzzy: Levenshtein with 40% threshold of term length (min 2)
        const threshold = Math.max(2, Math.floor(lower.length * 0.4));
        let bestMatch: string | null = null;
        let bestDist = Infinity;
        for (const opt of options) {
            const dist = this.levenshtein(lower, opt.toLowerCase());
            if (dist < bestDist && dist <= threshold) {
                bestDist = dist;
                bestMatch = opt;
            }
        }
        return bestMatch;
    }

    // Converts the user response ("2", "I want 3", "trainds") into real values from the options array
    private parseSelection(input: string, options: string[]): string[] {
        const trimmed = input.trim();

        // 1. Extract numbers from text ("I want 3 and 5" → [options[2], options[4]])
        const numbers = trimmed.match(/\d+/g);
        if (numbers) {
            const mapped = numbers
                .map(n => parseInt(n, 10))
                .filter(n => n >= 1 && n <= options.length)
                .map(n => options[n - 1]);
            if (mapped.length > 0) return mapped;
        }

        // 2. Split by comma and match each part against the options
        const parts = trimmed.split(',').map(v => v.trim()).filter(v => v.length > 0);
        const results: string[] = [];

        for (const part of parts) {
            // Try the full phrase first ("classic cars" → "Classic Cars")
            const wholeMatch = this.findBestMatch(part, options);
            if (wholeMatch) { results.push(wholeMatch); continue; }

            // If the whole phrase doesn't match, try word by word filtering short stopwords
            const words = part.split(/\s+/).filter(w => w.length >= 3);
            for (const word of words) {
                const wordMatch = this.findBestMatch(word, options);
                if (wordMatch) results.push(wordMatch);
            }
        }

        // Deduplicate in case multiple words resolve to the same value
        return [...new Set(results.length > 0 ? results : [trimmed])];
    }

    // Function that handles the possible chart suggestions for the query
    selectChart(msg: ChatMessage, chart: ChartSuggestion): void {
        msg.suggestedCharts = [];
        this.chartSelected.emit({ type: chart.type, subType: chart.subType });
    }

    copyMessage(message: ChatMessage) {
        navigator.clipboard.writeText(message.content).then(() => {
            this.messages.forEach(m => m.copied = false);
            message.copied = true;
        }).catch(err => {
            console.error('Error al copiar:', err);
        });
    }

    sendSuggestion(text: string): void {
        this.inputText = text;
        this.sendMessage();
    }

    private classifyError(err: any): string {
        const status = err?.status;
        const body = err?.error?.response ?? err?.error?.message ?? err?.message ?? '';
        const lower = (typeof body === 'string' ? body : JSON.stringify(body)).toLowerCase();

        if (status === 429 || lower.includes('rate limit') || lower.includes('too many requests'))
            return 'Demasiadas solicitudes. Espera unos segundos antes de volver a intentarlo.';
        if (status === 401 || status === 403)
            return 'Credenciales no válidas o sin permisos para usar el asistente.';
        if (status === 402 || lower.includes('insufficient_quota') || lower.includes('billing'))
            return 'Cuota de la API agotada. Contacta con el administrador.';
        if (status === 503 || status === 502)
            return 'El servicio de IA no está disponible en este momento. Inténtalo más tarde.';
        if (status === 504 || lower.includes('timeout') || lower.includes('timed out'))
            return 'La respuesta tardó demasiado. Inténtalo de nuevo o simplifica tu pregunta.';
        if (lower.includes('context_length_exceeded') || lower.includes('maximum context') || lower.includes('token'))
            return 'Límite de tokens superado. La conversación es demasiado larga; inicia una nueva consulta.';
        if (status === 0 || lower.includes('network') || lower.includes('failed to fetch'))
            return 'Sin conexión. Comprueba tu red e inténtalo de nuevo.';
        if (lower.includes('model') && (lower.includes('not available') || lower.includes('overloaded')))
            return 'El modelo de IA no está disponible en este momento. Inténtalo más tarde.';
        return body || 'Error al comunicarse con el asistente. Inténtalo de nuevo.';
    }

    autoResize(event: Event): void {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    renderMarkdown(content: string): SafeHtml {
        const escaped = content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const html = '<p>' + escaped
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>') + '</p>';
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }
}