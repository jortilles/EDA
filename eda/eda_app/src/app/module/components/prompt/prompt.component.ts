import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { AssistantService } from '@eda/services/api/assistant.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Componentes
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';

// Interfaz de mensajes del chat con IA
interface ChatMessage {
    id?: string | number;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp?: number;
    copied?: boolean;
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

    // Variable almacenada temporalmente en el EDA-BLANK-PANEL
    @Input() messages: ChatMessage[];
    @Output() messagesChange = new EventEmitter<ChatMessage[]>();

    private static suggestionsCache = new Map<string, string[]>();

    inputText = '';
    sending = false;
    suggestions: string[] = [];
    loadingSuggestions = false;
    schema: any[] = [] ; // Esquema de todas las tablas y sus columnas
    firstTime: boolean = true;
    private shouldAutoScroll: boolean = true;
    loading: boolean = false;
    isCopied: boolean = false;

    // Estado de resolución de filtros: se activa cuando el backend responde con awaiting_resolution o awaiting_selection
    private resolutionState: { options: string[], unresolvedFilter: any, pendingResult: any } | null = null;

    constructor(private assistantService: AssistantService, private sanitizer: DomSanitizer) {}

    // Iniciamos el scroll a la misma altura donde termino el ultimo mensaje de respuesta del asistente
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
                columns.push({
                    column: column.column_name,
                    column_type: column.column_type,
                    description: column.description?.default,
                });
            });
            schema.push({
                table: table.table_name,
                description: table.description?.default ?? table.description ?? '',
                columns: columns,
            })
        })

        console.log('this.edaBlankPanel: ', this.edaBlankPanel)
        console.log('schema: ', schema)

        this.schema = schema;
    }

    sendMessage(): void {

        const data = this.edaBlankPanel.tables; // tablas
        const text = this.inputText?.trim();

        // Filtra un texto vacio.
        if (!text) return;

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);

        
        this.loading = true;
        this.isCopied = false;

        // Autoscroll cuando enviamos los mensajes
        this.shouldAutoScroll = true;
        this.scrollToBottom()

        this.inputText = ''; // Una vez almacenado el texto ingresado se reinicia el input
        this.sending = true;
        
        // Llamada al servicio que envía el prompt al Backend / OpenAI
        const histoty = this.messages;
        const schema = this.schema;
        const firstTime = this.firstTime;
        const parameters: any = {
            firstTime: firstTime,
            dataSource_id: this.edaBlankPanel.dataSource._id,
            dataSource_name: this.edaBlankPanel.dataSource.name,
        }

        // Si hay un estado de resolución activo, el usuario está eligiendo valores del filtro        
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
                // Esperamos que `resp` contenga la respuesta ya procesada como texto. Adapta según tu backend.
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

                // Capturamos el estado de resolución si el backend está esperando una elección del usuario
                const responseType = resp.response.type;
                if (responseType === 'awaiting_resolution' || responseType === 'awaiting_selection') {
                    this.resolutionState = {
                        options: resp.response.options ?? [],
                        unresolvedFilter: resp.response.unresolvedFilter,
                        pendingResult: resp.response.pendingResult
                    };
                } else {
                    // Respuesta normal o query_ready: emitimos los datos al panel
                    this.resolutionState = null;
                    if (currentQuery && currentQuery.length !== 0) {
                        this.newCurrentQuery.emit(currentQuery);
                        this.principalTable.emit({principalTable, currentQuery, queryLimit});
                        this.newSelectedFilters.emit({selectedFilters, filteredColumns});
                    }
                }

                const text = resp.response.output_text
                const assistantMessage: ChatMessage = { role: 'assistant', content: text ?? String(text), timestamp: Date.now() };
                                
                this.messages.push(assistantMessage);

                this.sending = false;
                this.loading = false;

                // Autoscroll cuando recibimos los mensajes
                this.shouldAutoScroll = true;
                this.scrollToBottom()

                // Cambiamos a false despues de la primera consulta
                this.firstTime = false;
            },
            error: (err) => {
                console.error('Error al enviar prompt:', err);
                const msg = err?.error?.response ?? err?.message ?? 'Error desconocido';
                this.messages.push({ role: 'error', content: msg, timestamp: Date.now() });
                this.loading = false;
                this.sending = false;
            }
        });
    }

    // Envia con Enter y (shift + Enter para un salto de linea sin enviar).
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
    
    // Distancia de edición entre dos strings
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

    // Intenta encontrar la mejor opción para un término dado: exacto → contiene → fuzzy
    private findBestMatch(term: string, options: string[]): string | null {
        const lower = term.toLowerCase();

        // 1. Exacto case-insensitive
        const exact = options.find(opt => opt.toLowerCase() === lower);
        if (exact) return exact;

        // 2. La opción contiene el término ("train" → "Trains")
        const contains = options.find(opt => opt.toLowerCase().includes(lower));
        if (contains) return contains;

        // 3. Fuzzy: Levenshtein con umbral del 40% de la longitud del término (mín 2)
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

    // Convierte la respuesta del usuario ("2", "quiero el 3", "trainds") en valores reales del array de opciones
    private parseSelection(input: string, options: string[]): string[] {
        const trimmed = input.trim();

        // 1. Extraer números del texto ("quiero el 3 y 5" → [options[2], options[4]])
        const numbers = trimmed.match(/\d+/g);
        if (numbers) {
            const mapped = numbers
                .map(n => parseInt(n, 10))
                .filter(n => n >= 1 && n <= options.length)
                .map(n => options[n - 1]);
            if (mapped.length > 0) return mapped;
        }

        // 2. Separar por comas y buscar cada parte contra las opciones
        const parts = trimmed.split(',').map(v => v.trim()).filter(v => v.length > 0);
        const results: string[] = [];

        for (const part of parts) {
            // Intentar la frase completa primero ("classic cars" → "Classic Cars")
            const wholeMatch = this.findBestMatch(part, options);
            if (wholeMatch) { results.push(wholeMatch); continue; }

            // Si no matchea la frase entera, probar palabra a palabra filtrando stopwords cortas
            const words = part.split(/\s+/).filter(w => w.length >= 3);
            for (const word of words) {
                const wordMatch = this.findBestMatch(word, options);
                if (wordMatch) results.push(wordMatch);
            }
        }

        // Deduplicar en caso de que varias palabras resuelvan al mismo valor
        return [...new Set(results.length > 0 ? results : [trimmed])];
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