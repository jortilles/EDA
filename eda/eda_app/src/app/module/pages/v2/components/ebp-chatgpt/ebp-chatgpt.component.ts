import { Component, EventEmitter, OnInit, Output } from '@angular/core';

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

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;
  public messages: { sender: 'user' | 'bot'; content: string }[] = [];
  public userInput: string = '';
  public loading = false;

  constructor(private chatgptService: ChatgptService) {}

  ngOnInit(): void {
    console.log('Inicio del componente ...')
  }

  sendMessage() { 
    const input = this.userInput.trim();
    if(!input) return;

    this.messages.push({ sender: 'user', content: input });
    this.userInput = '';
    this.loading = true;

    this.chatgptService.responseChatGpt(input).subscribe({
      next: (response) => {

        console.log('response : ', response);
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
