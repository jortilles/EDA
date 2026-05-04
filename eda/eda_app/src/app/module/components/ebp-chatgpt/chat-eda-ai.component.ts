import { AfterViewChecked, Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { SharedModule } from "@eda/shared/shared.module";
import { AssistantService } from '@eda/services/api/assistant.service';
import { IaFormStateService } from '@eda/services/shared/IaFormState.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'chat-eda-ai',
  standalone: true,
  imports: [SharedModule, FormsModule, CommonModule, EdaDialog2Component],
  templateUrl: './chat-eda-ai.component.html',
  styleUrl: './chat-eda-ai.component.css'
})
export class ChatEdaAIComponent implements AfterViewChecked {

  @Input() dataChatGpt: any;
  @Input() display: boolean = false;
  @Output() close: EventEmitter<void> = new EventEmitter<void>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef;

  private assistantService = inject(AssistantService);
  private iaFormStateService = inject(IaFormStateService);

  public messages: { sender: 'user' | 'bot'; content: string }[] = [];
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
    this.shouldScroll = true;
    setTimeout(() => this.chatInput.nativeElement.focus());

    this.assistantService.sendChat(input).subscribe({
      next: (text) => {
        this.messages.push({ sender: 'bot', content: text });
        this.loading = false;
        this.shouldScroll = true;
      },
      error: (err) => {
        this.messages.push({ sender: 'bot', content: `Error al conectar con la IA.` });
        this.loading = false;
        this.shouldScroll = true;
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
}
