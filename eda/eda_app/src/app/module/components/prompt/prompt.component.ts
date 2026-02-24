import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Componentes
import { EdaBlankPanelComponent } from '@eda/components/eda-panels/eda-blank-panel/eda-blank-panel.component';

// Interfaz de mensajes del chat con IA
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
    @Output() principalTable: EventEmitter<any> = new EventEmitter();

    // Variable almacenada temporalmente en el EDA-BLANK-PANEL
    @Input() messages: ChatMessage[];
    @Output() messagesChange = new EventEmitter<ChatMessage[]>();

    inputText = '';
    sending = false;
    schema: any[] = [] ; // Esquema de todas las tablas y sus columnas
    firstTime: boolean = true;

    constructor(private chatgptService: ChatgptService) {}

    ngOnInit(): void {
        const tables = this.edaBlankPanel.tables

        console.log('MIRAAAAAAAAAAAAAAAAAAA => tables: ', tables);
        console.log('selectedFilters: ', this.edaBlankPanel.selectedFilters)

        // debugger;

        this.initSchema(tables);
    }

    initSchema(tables: any[]) {
        let schema = [];

        tables.forEach((table: any) => {
            let columns = [];
            table.columns.forEach((column: any) => {
                columns.push({
                    column: column.column_name,
                    column_type: column.column_type,
                });
            });
            schema.push({
                table: table.table_name,
                columns: columns,
            })
        })

        this.schema = schema;
        console.log('SCHEMA ::: ', this.schema);
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    sendMessage(): void {

        const data = this.edaBlankPanel.tables; // tablas
        const text = this.inputText?.trim(); //

        // Filtra un texto vacio.
        if (!text) return;

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.inputText = ''; // Una vez almacenado el texto ingresado se reinicia el input
        this.sending = true;
        
        // Llamada al servicio que envía el prompt al Backend / OpenAI
        const histoty = this.messages;
        const schema = this.schema;
        const firstTime = this.firstTime;

        this.chatgptService.sendPrompt(text, histoty, data, schema, firstTime).subscribe({
            next: (resp) => {
                // Esperamos que `resp` contenga la respuesta ya procesada como texto. Adapta según tu backend.

                // console.log('PROMPT =>', resp);

                const currentQuery = resp.response.currentQuery;
                const principalTable = resp.response.principalTable;
                
                console.log('----------- COMPONENTE -----------')
                console.log('currentQuery: ', currentQuery)
                console.log('principalTable: ', principalTable)

                if(currentQuery) {
                    if( currentQuery.length !==0 ) {
                        this.newCurrentQuery.emit(currentQuery);
                        this.principalTable.emit({principalTable, currentQuery});
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

    // Envia con Enter y (shift + Enter para un salto de linea sin enviar).
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
        } catch (error) {
            console.log('Error en scrollToBottom: ', error);
        }
    }
}