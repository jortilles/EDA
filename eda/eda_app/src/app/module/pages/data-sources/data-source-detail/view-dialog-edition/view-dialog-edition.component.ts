import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-view-dialog-edition',
  templateUrl: './view-dialog-edition.component.html',
  styleUrls: ['./view-dialog-edition.component.css']
})
export class ViewDialogEditionComponent implements OnInit {

  @Input() viewInEdition: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  
  public display: boolean = false;


  constructor() { }

  ngOnInit(): void {

  }

  viewDialogEditionApply() {
    
    console.log('Aplicando los cambios')
    
    this.display = false;
    this.close.emit(this.viewInEdition);
  }

  viewDialogEditionClose() {

    console.log('Cancelando los cambios')


    this.display = false;
    this.close.emit('cancel');

  }


}
