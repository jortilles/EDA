import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css']
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any; // Podemos crear una clase para categorizar los valores

  constructor() { }

  ngOnInit(): void {
  }

}
