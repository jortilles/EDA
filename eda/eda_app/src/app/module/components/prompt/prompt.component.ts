import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Componentes
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';


interface ChatMessage {
    id?: string | number;
    role: 'user' | 'assistant' | 'system' | 'error';
    content: string;
    timestamp?: number;
}


@Component({
selector: 'Prompt',
standalone: true,
imports: [SharedModule, FormsModule, CommonModule],
templateUrl: './prompt.component.html',
styleUrls: ['./prompt.component.css']
})
export class PromptComponent implements OnInit, AfterViewChecked {

    @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
    @Input() edaBlankPanel: EdaBlankPanelComponent;
    @Output() newCurrentQuery: EventEmitter<any[]> = new EventEmitter();
    @Output() principalTable: EventEmitter<any[]> = new EventEmitter();


    messages: ChatMessage[] = [];
    inputText = '';
    sending = false;
    schema: any[] = [] ;
    firstTime: boolean = true;

    constructor(private chatgptService: ChatgptService) {}

    ngOnInit(): void {
        this.initSchema(this.edaBlankPanel.tables)
    }

    initSchema(tables: any[]) {
        let schema = [];

        tables.forEach((table: any) => {
            let columns = [];
            table.columns.forEach((column: any) => {
                columns.push(column.column_name);
            })
            schema.push({
                table: table.table_name,
                columns: columns
            })
        })

        this.schema = schema;
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    sendMessage(): void {

        const tables = this.edaBlankPanel.tables;

        // Primeras pruebas sin filtros
        const params = {
            table: '',
            dataSource: this.edaBlankPanel.dataSource._id,
            panel: this.edaBlankPanel.panel.id,
            dashboard: this.edaBlankPanel.inject.dashboard_id,
            filters: [],
            config: null,
            queryLimit: this.edaBlankPanel.queryLimit,
            joinType: this.edaBlankPanel.joinType,
            rootTable: this.edaBlankPanel.rootTable?.table_name,
            connectionProperties: this.edaBlankPanel.connectionProperties
        }


        const text = this.inputText?.trim();

        if (!text) return;

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.inputText = '';
        this.sending = true;

        
        // Llamada al servicio que envía el prompt al backend / OpenAI
        this.chatgptService.sendPrompt(text, this.messages, tables, this.schema, this.firstTime).subscribe({
            next: (resp) => {
                // Esperamos que `resp` contenga la respuesta ya procesada como texto. Adapta según tu backend.

                const currentQuery = resp.response.currentQuery;
                const principalTable = resp.response.principalTable;

                if(currentQuery) {
                    if( currentQuery.length !==0 ) {
                        this.newCurrentQuery.emit(currentQuery);
                        this.principalTable.emit(principalTable);
                    }
                }

                const text = resp.response.output_text
                const assistantMessage: ChatMessage = { role: 'assistant', content: text ?? String(text), timestamp: Date.now() };
                this.messages.push(assistantMessage);
                this.sending = false;

                // Cambiamos a false despues de la primera consulta
                this.firstTime = false;
            },
            error: (err) => {
                console.error('Error al enviar prompt:', err);
                this.messages.push({ role: 'error', content: 'Error al obtener respuesta. Intenta de nuevo.', timestamp: Date.now() });
                this.sending = false;
            }
        });
    }


    // Envia con Enter (shift+Enter para nueva línea)
    onKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }


    private scrollToBottom(): void {
        try {
            const el = this.messagesContainer?.nativeElement;
            if (el) {
                el.scrollTop = el.scrollHeight;
            }
        } catch (e) {
            // ignore
        }
    }
}