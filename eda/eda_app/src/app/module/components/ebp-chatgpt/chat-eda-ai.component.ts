import { AfterViewChecked, Component, ElementRef, EventEmitter, inject, Input, OnInit, Output, ViewChild } from '@angular/core';
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
export class ChatEdaAIComponent implements OnInit, AfterViewChecked {

  @Input() dataChatGpt: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private assistantService = inject(AssistantService);
  private iaFormStateService = inject(IaFormStateService);

  public display: boolean = false;
  public messages: { sender: 'user' | 'bot'; content: string }[] = [];
  public userInput: string = '';
  public loading = false;

  get providerName(): string {
    return this.iaFormStateService.formData().PROVIDER ?? 'IA';
  }

  ngOnInit(): void {}

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() {
    const trimmed = this.userInput.trim();
    if (!trimmed) return;

    const stringifiedData = this.dataChatGpt.values.map((row: any) => {
      return this.dataChatGpt.labels.map((label: string, i: number) => `${label}: ${row[i]}`).join(', ');
    }).join('\n');

    const input = 'Responde con esta data: ' + stringifiedData + ` ${trimmed}`;

    this.messages.push({ sender: 'user', content: trimmed });
    this.userInput = '';
    this.loading = true;

    this.assistantService.sendChat(input).subscribe({
      next: (text) => {
        this.messages.push({ sender: 'bot', content: text });
        this.loading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        this.messages.push({ sender: 'bot', content: `Error al conectar con la IA.` });
        this.loading = false;
        console.error(err);
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.warn($localize`:@@scrollError:Error haciendo scroll:`, err);
    }
  }


  public onApply() {
    this.display = false;
    this.close.emit($localize`:@@emittingValues:Emitiendo este valor`);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit($localize`:@@emittingCancelValues: Emitiendo este valor de cancelar`);
  }


}
