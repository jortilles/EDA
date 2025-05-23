import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

// Modulos necesarios
import { SharedModule } from "@eda/shared/shared.module";

// Servicio ChatGpt
import { ChatgptService } from '@eda/services/api/chatgpt.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ebp-chatgpt',
  standalone: true,
  imports: [SharedModule, FormsModule, CommonModule],
  templateUrl: './ebp-chatgpt.component.html',
  styleUrl: './ebp-chatgpt.component.css'
})
export class EbpChatgptComponent implements OnInit{

  @Input() dataChatGpt: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;
  public messages: { sender: 'user' | 'bot'; content: string }[] = [];
  public userInput: string = '';
  public loading = false;

  constructor(private chatgptService: ChatgptService) {}

  ngOnInit(): void {
    console.log('Inicio del componente ...')
    console.log('recibiendo la data: ', this.dataChatGpt);
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

        console.log('resupesta: ', response);
        const content = response.response.choices[0].message?.content;
        this.messages.push({ sender: 'bot', content: content });
        this.loading = false;
      },
      error: (err) => {
        this.messages.push({ sender: 'bot', content: 'Error al conectar con ChatGPT.' });
        this.loading = false;
        console.error(err);
      }
    })

  }


  public onApply() {
    this.display = false;
    console.log('confirmando ....')
    this.close.emit('Emitiendo este valor ');
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    console.log('cancenlando ....')
    this.display = false;
    this.close.emit('Emitiendo este valor de cancelar ');
  }


}
