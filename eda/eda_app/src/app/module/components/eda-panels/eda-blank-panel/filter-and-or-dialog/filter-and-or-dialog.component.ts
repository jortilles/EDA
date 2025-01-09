import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
  styleUrls: ['./filter-and-or-dialog.component.css']
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() selectedFilters: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;


  constructor() { }

  ngOnInit(): void {
  }

  public onApplyFilterAndOrDialog() {
    console.log('desde el hijo: onApplyFilterAndOrDialog')
    console.log('A llegado el currenquery: ', this.selectedFilters)
    this.close.emit();
  }

  public oncloseFilterAndOrDialog() {
    console.log('desde el hijo: oncloseFilterAndOrDialog')
    this.close.emit();
  }

  public disableApply() {
    return false;
  }

}
