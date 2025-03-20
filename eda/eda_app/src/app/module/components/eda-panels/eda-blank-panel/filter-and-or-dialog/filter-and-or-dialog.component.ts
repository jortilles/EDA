import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';

@Component({
  selector: 'filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
  styleUrls: ['./filter-and-or-dialog.component.css']
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() selectedFilters: any[] = [];
  @Input() globalFilters: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;
  public dashboardRecibido = [];


  constructor() { }

  ngOnInit(): void {
  }

  // Recibe el dashboard del componente <eda-filter-and-or>
  public handleDashboardChanged(event: any) {
    this.dashboardRecibido = event
  }

  public onApplyFilterAndOrDialog() {
    console.log('Dashboard final para tratar: ', this.dashboardRecibido);
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
