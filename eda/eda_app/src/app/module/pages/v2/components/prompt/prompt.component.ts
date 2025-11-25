import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';


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

    messages: ChatMessage[] = [];
    inputText = '';
    sending = false;

    constructor(private chatgptService: ChatgptService) {}

    ngOnInit(): void {

    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    sendMessage(): void {
        const text = this.inputText?.trim();

        if (!text) return;

        const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() };
        this.messages.push(userMsg);
        this.inputText = '';
        this.sending = true;

        console.log('text: ', text);
        console.log('messages: ', this.messages);
        // debugger;

        // Llamada al servicio que envía el prompt al backend / OpenAI
        this.chatgptService.sendPrompt(text, this.messages).subscribe({
            next: (resp) => {
                // Esperamos que `resp` contenga la respuesta ya procesada como texto. Adapta según tu backend.
                const assistantMessage: ChatMessage = { role: 'assistant', content: resp?.text ?? String(resp), timestamp: Date.now() };
                this.messages.push(assistantMessage);
                this.sending = false;
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