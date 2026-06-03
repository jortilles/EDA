import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { SharedModule } from "@eda/shared/shared.module";
import { AssistantService } from '@eda/services/api/assistant.service';
import { IaChatService, ChatMessage } from '@eda/services/api/ia-chat.service';
import { IaFormStateService } from '@eda/services/shared/IaFormState.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'chat-eda-ai',
  standalone: true,
  imports: [SharedModule, FormsModule, CommonModule, DialogModule],
  templateUrl: './chat-eda-ai.component.html',
  styleUrl: './chat-eda-ai.component.css'
})
export class ChatEdaAIComponent implements AfterViewChecked {

  @Input() dataChatGpt: any;
  @Input() display: boolean = true;
  @Output() close: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef;

  private assistantService = inject(AssistantService);
  private iaChatService = inject(IaChatService);
  private cdr = inject(ChangeDetectorRef);
  private iaFormStateService = inject(IaFormStateService);
  private sanitizer = inject(DomSanitizer);

  public messages: { sender: 'user' | 'bot'; content: string; copied?: boolean }[] = [];
  public userInput: string = '';
  public loading = false;

  private shouldScroll = false;
  private dataContext: string | null = null;

  get providerName(): string {
    return this.iaFormStateService.formData().PROVIDER ?? 'IA';
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearMessages(): void {
    this.messages = [];
    this.dataContext = null;
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }

  sendMessage() {
    const trimmed = this.userInput.trim();
    if (!trimmed || this.loading) return;

    if (!this.dataContext) {
      this.dataContext = this.dataChatGpt.values.map((row: any) => {
        return this.dataChatGpt.labels.map((label: string, i: number) => `${label}: ${row[i]}`).join(', ');
      }).join('\n');
    }

    const input = `Responde con esta data:\n${this.dataContext}\n${trimmed}`;

    this.messages.push({ sender: 'user', content: trimmed });
    this.userInput = '';
    this.loading = true;
    setTimeout(() => {
      if (this.chatInput?.nativeElement) {
        this.chatInput.nativeElement.style.height = 'auto';
      }
    });
    this.shouldScroll = true;
    setTimeout(() => this.chatInput.nativeElement.focus());

    const chatMessages: ChatMessage[] = [
      ...this.messages.slice(0, -1).map(m => ({
        role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: input },
    ];

    this.messages.push({ sender: 'bot', content: '' });
    const botIndex = this.messages.length - 1;

    this.iaChatService.sendMessage(chatMessages).subscribe({
      next: (event) => {
        if (event.type === 'token') {
          this.messages[botIndex].content += event.text;
          this.shouldScroll = true;
          this.cdr.detectChanges();
        } else if (event.type === 'response') {
          this.messages[botIndex].content = event.response;
          this.loading = false;
          this.shouldScroll = true;
        }
      },
      error: (err) => {
        this.messages[botIndex].content = 'Error al conectar con la IA.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.warn($localize`:@@scrollError:Error haciendo scroll:`, err);
    }
  }

  public onApply() {
    this.display = false;
    this.close.emit();
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }

  renderMarkdown(content: string): SafeHtml {
    const html = marked.parse(content) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  copyMessage(msg: { content: string; copied?: boolean }) {
    navigator.clipboard.writeText(msg.content).then(() => {
      msg.copied = true;
      setTimeout(() => msg.copied = false, 2000);
    });
  }
}
