import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

// Modulos necesarios
import { SharedModule } from "@eda/shared/shared.module";

// Servicio ChatGpt
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ebp-chatgpt',
  standalone: true,
  imports: [SharedModule, FormsModule, CommonModule, EdaDialog2Component],
  templateUrl: './ebp-chatgpt.component.html',
  styleUrl: './ebp-chatgpt.component.css'
})
export class EbpChatgptComponent implements OnInit, AfterViewChecked{

  @Input() dataChatGpt: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('messageContainer') private messageContainer!: ElementRef;
  
  public display: boolean = false;
  public messages: { sender: 'user' | 'bot'; content: string }[] = [];
  public userInput: string = '';
  public loading = false;

  constructor(private chatgptService: ChatgptService) {}

  ngOnInit(): void {
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  sendMessage() { 
    let input = this.userInput.trim();

    if(!input) return;

    const stringifiedData = this.dataChatGpt.values.map(row => {
      return this.dataChatGpt.labels.map((label, i) => `${label}: ${row[i]}`).join(', ');
    }).join('\n');

    input = 'Responde con esta data: ' + stringifiedData + ` ${this.userInput}`

    this.messages.push({ sender: 'user', content: this.userInput });
    this.userInput = '';
    this.loading = true;

    this.chatgptService.responseChatGpt(input).subscribe({
      next: (response) => {

        const content = response.response.choices[0].message?.content;
        this.messages.push({ sender: 'bot', content: content });
        this.loading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        this.messages.push({ sender: 'bot', content: 'Error al conectar con ChatGPT.' });
        this.loading = false;
        console.error(err);
      }
    })

    // this.scrollToBottom();

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
