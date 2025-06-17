import { Component, EventEmitter, OnInit, Output, Input  } from '@angular/core';
import { EdaFilterAndOrComponent } from '../../../eda-filter-and-or/eda-filter-and-or.component';


@Component({
  selector: 'filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
  styleUrls: ['./filter-and-or-dialog.component.css']
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() selectedFilters: any[] = [];
  @Input() globalFilters: any[] = [];
  @Input() tables: any[] = [];
  @Input() sortedFilters: any[] = []; // sortedFilters from the API
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() newSortedFilters: EventEmitter<any[]> = new EventEmitter<any[]>();


  public display: boolean = false;
  public dashboardRecibido = [];

  constructor() { }

  ngOnInit(): void {
  }

    // Receive the component dashboard from eda-filter-and-or
    public handleDashboardChanged(event: any) {
      this.dashboardRecibido = event
    }
  
    public onApplyFilterAndOrDialog() {
      if (this.dashboardRecibido?.length) {
        EdaFilterAndOrComponent.guardarDashboard(this.dashboardRecibido);
        this.newSortedFilters.emit(this.dashboardRecibido); // Emitting to EBP
      }
      this.close.emit();
    }
  
    public oncloseFilterAndOrDialog() {
      this.close.emit();
    }

}
