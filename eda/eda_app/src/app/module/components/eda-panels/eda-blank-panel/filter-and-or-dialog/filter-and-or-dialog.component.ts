import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { EdaFilterAndOrComponent } from '../../../eda-filter-and-or/eda-filter-and-or.component';

@Component({
  standalone: true,
  imports: [CommonModule, EdaDialog2Component, EdaFilterAndOrComponent],
  selector: 'filter-and-or-dialog',
  templateUrl: './filter-and-or-dialog.component.html',
})
export class FilterAndOrDialogComponent implements OnInit {

  @Input() selectedFilters: any[] = [];
  @Input() globalFilters: any[] = [];
  @Input() tables: any[] = [];
  @Input() sortedFilters: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() newSortedFilters: EventEmitter<any[]> = new EventEmitter<any[]>();

  public display: boolean = true;
  public dashboardRecibido: any[] = [];

  constructor() { }

  ngOnInit(): void { }

  public handleDashboardChanged(event: any) {
    this.dashboardRecibido = event;
  }

  public onApplyFilterAndOrDialog() {
    if (this.dashboardRecibido?.length) {
      EdaFilterAndOrComponent.guardarDashboard(this.dashboardRecibido);
      this.newSortedFilters.emit(this.dashboardRecibido);
    }
    this.close.emit();
  }

  public oncloseFilterAndOrDialog() {
    this.close.emit();
  }
}
