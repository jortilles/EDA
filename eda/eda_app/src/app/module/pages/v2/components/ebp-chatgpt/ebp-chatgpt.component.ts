import { Component, EventEmitter, OnInit, Output } from '@angular/core';

// Modulos necesarios
import { SharedModule } from "@eda/shared/shared.module";


@Component({
  selector: 'app-ebp-chatgpt',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './ebp-chatgpt.component.html',
  styleUrl: './ebp-chatgpt.component.css'
})
export class EbpChatgptComponent implements OnInit{

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  public display: boolean = false;

  ngOnInit(): void {
    console.log('Inicio del componente ...')
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
