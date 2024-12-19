import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'app-filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
  styleUrls: ['./filter-and-or-dialog.component.css']
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() currentQuery: any[] = [];
  @Output() currentQueryChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;


  constructor() { }

  ngOnInit(): void {
  }

  public disableApply() {
    return false;
  }

}
