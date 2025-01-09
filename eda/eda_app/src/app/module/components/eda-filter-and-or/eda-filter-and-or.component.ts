import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'eda-filter-and-or',
  templateUrl: './eda-filter-and-or.component.html',
  styleUrls: ['./eda-filter-and-or.component.css']
})
export class EdaFilterAndOrComponent implements OnInit {

  @Input() selectedFilters: any[] = []; // Valor que es 

  constructor() { }

  ngOnInit(): void {
    console.log('EdaFilterAndOrComponent ->>>>>', this.selectedFilters);
  }

}
