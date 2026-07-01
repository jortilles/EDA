/* SDA CUSTOM */import { Component, EventEmitter, OnInit, Output, Input  } from '@angular/core';
/* SDA CUSTOM */import { rangeDateFormats } from './date-format-dialog.index'
/* SDA CUSTOM */import { SelectItem } from 'primeng/api';
/* SDA CUSTOM */
/* SDA CUSTOM */// Services
/* SDA CUSTOM */import { ChartUtilsService, FilterType } from '@eda/services/service.index';
/* SDA CUSTOM */import { EdaDatePickerConfig } from '@eda/shared/components/eda-date-picker/datePickerConfig';
/* SDA CUSTOM */
/* SDA CUSTOM */interface dataFormatSettings {
/* SDA CUSTOM */  operator: string,
/* SDA CUSTOM */  dynamic: boolean,
/* SDA CUSTOM */  dynamicValue: string | null,
/* SDA CUSTOM */  dynamicLabel: string | null,
/* SDA CUSTOM */  dateValue: any | null
/* SDA CUSTOM */}
/* SDA CUSTOM */
/* SDA CUSTOM */@Component({
/* SDA CUSTOM */  selector: 'date-format-dialog',
/* SDA CUSTOM */  templateUrl: './date-format-dialog.component.html',
/* SDA CUSTOM */  styleUrls: ['./date-format-dialog.component.css']
/* SDA CUSTOM */})
/* SDA CUSTOM */
/* SDA CUSTOM */export class DateFormatDialogComponent implements OnInit {
/* SDA CUSTOM */
/* SDA CUSTOM */  @Output() close: EventEmitter<any> = new EventEmitter<any>();
/* SDA CUSTOM */  @Input() cleanButtonsAvailable: boolean = false;
/* SDA CUSTOM */  @Input() selectedColumn: any;
/* SDA CUSTOM */  @Input() currentFilter: any; // Existing filter with operator and value for preloading
/* SDA CUSTOM */
/* SDA CUSTOM */  public dateFormatDialogTextHeader: string = $localize`:@@dateFormatDialogTextHeader:Filtro:`;
/* SDA CUSTOM */
/* SDA CUSTOM */  public display: boolean = false;
/* SDA CUSTOM */  public filterTypeSelected: FilterType;
/* SDA CUSTOM */  public filter = {
/* SDA CUSTOM */    switch: false,
/* SDA CUSTOM */    types: [],
/* SDA CUSTOM */    forDisplay: [],
/* SDA CUSTOM */    selecteds: [],
/* SDA CUSTOM */    range: null
/* SDA CUSTOM */  };
/* SDA CUSTOM */
/* SDA CUSTOM */  public isDateFormatAvailable: boolean = false;
/* SDA CUSTOM */  public dateFormatSelected: any;
/* SDA CUSTOM */  public rangeDateFormat: any = {
/* SDA CUSTOM */    types: [],
/* SDA CUSTOM */  }
/* SDA CUSTOM */  
/* SDA CUSTOM */  public showDateFormatSelecter: boolean = true;
/* SDA CUSTOM */  public showEdaDatePicker: boolean = false;
/* SDA CUSTOM */
/* SDA CUSTOM */  public showEdaDatePickerSingleSelection: boolean = false;
/* SDA CUSTOM */  public showEdaDatePickerMultipleSelection: boolean = false;
/* SDA CUSTOM */
/* SDA CUSTOM */  public dateFormatSet: dataFormatSettings;
/* SDA CUSTOM */  public dateFormatCustomValue: any = {};
/* SDA CUSTOM */  
/* SDA CUSTOM */  public datePickerConfig: EdaDatePickerConfig;
/* SDA CUSTOM */
/* SDA CUSTOM */  public get isReadyForConfirmation(): boolean {
/* SDA CUSTOM */    if (this.filterTypeSelected == null || this.dateFormatSelected == null) return true;
/* SDA CUSTOM */    const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
/* SDA CUSTOM */    if (noDateNeeded.includes(this.filterTypeSelected.value)) return false;
/* SDA CUSTOM */    if (this.dateFormatSelected.value === 'customDate') {
/* SDA CUSTOM */      return !this.dateFormatCustomValue?.value1;
/* SDA CUSTOM */    }
/* SDA CUSTOM */    return false;
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  constructor(
/* SDA CUSTOM */    private chartUtils: ChartUtilsService,
/* SDA CUSTOM */  ) {
/* SDA CUSTOM */
/* SDA CUSTOM */    // Operators for date type
/* SDA CUSTOM */    this.filter.types = this.chartUtils.filterTypes.filter((ft: any) => ft.value !== 'like' && ft.value !== 'not_like');
/* SDA CUSTOM */
/* SDA CUSTOM */    // All the date formats
/* SDA CUSTOM */    this.rangeDateFormat.types = [...rangeDateFormats];
/* SDA CUSTOM */
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  ngOnInit(): void {
/* SDA CUSTOM */    this.loadExistingDateFilterValues();
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  private loadExistingDateFilterValues(): void {
/* SDA CUSTOM */    if (!this.currentFilter || !this.currentFilter.dateFilterType) {
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    const filter = this.currentFilter;
/* SDA CUSTOM */    const operatorValue = filter.dateFilterType;
/* SDA CUSTOM */
/* SDA CUSTOM */    // Set the filter type (operator)
/* SDA CUSTOM */    this.filterTypeSelected = this.filter.types.find((ft: any) => ft.value === operatorValue);
/* SDA CUSTOM */    if (!this.filterTypeSelected) {
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    // Handle filter type change to setup available date formats
/* SDA CUSTOM */    this.handleFilterChange(this.filterTypeSelected);
/* SDA CUSTOM */
/* SDA CUSTOM */    // Check if it's a dynamic/predefined range
/* SDA CUSTOM */    if (filter.dynamicValue) {
/* SDA CUSTOM */      this.dateFormatSelected = this.rangeDateFormat.types.find(
/* SDA CUSTOM */        (ft: any) => ft.value === filter.dynamicValue
/* SDA CUSTOM */      );
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    // Check for custom date values (static dates)
/* SDA CUSTOM */    const hasStaticDates = filter.selectedItems && filter.selectedItems.length > 0;
/* SDA CUSTOM */    if (hasStaticDates && !filter.dynamicValue) {
/* SDA CUSTOM */      // Set to custom date option
/* SDA CUSTOM */      this.dateFormatSelected = this.rangeDateFormat.types.find(
/* SDA CUSTOM */        (ft: any) => ft.value === 'customDate'
/* SDA CUSTOM */      );
/* SDA CUSTOM */      // Handle the date format change to show picker
/* SDA CUSTOM */      this.handleDateFormatChange(this.dateFormatSelected);
/* SDA CUSTOM */      // Load the custom date values into the picker
/* SDA CUSTOM */      this.loadCustomDateValues(filter);
/* SDA CUSTOM */      // Refresh picker config with the loaded date values
/* SDA CUSTOM */      this.initDatePickerConfig();
/* SDA CUSTOM */    }
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  private loadCustomDateValues(filter: any): void {
/* SDA CUSTOM */    const items = filter.selectedItems;
/* SDA CUSTOM */    if (!items || items.length === 0) return;
/* SDA CUSTOM */
/* SDA CUSTOM */    // Handle array of dates (in/not_in) or single/between dates
/* SDA CUSTOM */    if (Array.isArray(items[0])) {
/* SDA CUSTOM */      // Multiple dates for in/not_in
/* SDA CUSTOM */      this.dateFormatCustomValue = { value1: items[0] };
/* SDA CUSTOM */    } else if (items.length >= 2) {
/* SDA CUSTOM */      // Between dates (range)
/* SDA CUSTOM */      this.dateFormatCustomValue = { value1: items[0], value2: items[1] };
/* SDA CUSTOM */    } else {
/* SDA CUSTOM */      // Single date
/* SDA CUSTOM */      this.dateFormatCustomValue = { value1: items[0] };
/* SDA CUSTOM */    }
/* SDA CUSTOM */  }
/* SDA CUSTOM */  
/* SDA CUSTOM */  public onApplyDateFormatDialog() {
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */      // Preparing the dateFormatSet
/* SDA CUSTOM */      const operator = this.filterTypeSelected.value;
/* SDA CUSTOM */      const dynamic = this.dateFormatSelected.value === 'customDate' ? false : true;
/* SDA CUSTOM */      const dynamicValue = dynamic ? this.dateFormatSelected.value : null;
/* SDA CUSTOM */      const dateValue = dynamic ? null : this.dateFormatCustomValue;
/* SDA CUSTOM */
/* SDA CUSTOM */      const dynamicLabel = dynamic ? this.dateFormatSelected.value : null;
/* SDA CUSTOM */      this.dateFormatSet = { operator, dynamic, dynamicValue, dynamicLabel, dateValue }
/* SDA CUSTOM */
/* SDA CUSTOM */      this.close.emit({
/* SDA CUSTOM */        dateFormatSet: this.dateFormatSet,
/* SDA CUSTOM */        filterSelected: this.filterTypeSelected,
/* SDA CUSTOM */      });
/* SDA CUSTOM */
/* SDA CUSTOM */      // restoring values
/* SDA CUSTOM */      this.filterTypeSelected = null;
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  public oncloseDateFormatDialog() {
/* SDA CUSTOM */      this.close.emit(false);
/* SDA CUSTOM */
/* SDA CUSTOM */      // restoring values
/* SDA CUSTOM */      this.filterTypeSelected = null;
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  public onCleanDateFormatDialog() {
/* SDA CUSTOM */      this.close.emit({ clean: true });
/* SDA CUSTOM */
/* SDA CUSTOM */      // restoring values
/* SDA CUSTOM */      this.filterTypeSelected = null;
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */      this.dateFormatCustomValue = {};
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  processPickerEvent(event) {
/* SDA CUSTOM */    
/* SDA CUSTOM */    let filterValue: any = {};
/* SDA CUSTOM */
/* SDA CUSTOM */    if (event.dates) {
/* SDA CUSTOM */      const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
/* SDA CUSTOM */      const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];
/* SDA CUSTOM */
/* SDA CUSTOM */      if (!dates[1]) {
/* SDA CUSTOM */          dates[1] = dates[0];
/* SDA CUSTOM */      }
/* SDA CUSTOM */
/* SDA CUSTOM */      this.filter.range = event.range;
/* SDA CUSTOM */
/* SDA CUSTOM */      const isInFilter = this.filterTypeSelected?.value === 'in' || this.filterTypeSelected?.value === 'not_in';
/* SDA CUSTOM */      if (isInFilter) {
/* SDA CUSTOM */          // multiple selection mode: dates is an array of individually picked Date objects
/* SDA CUSTOM */          filterValue.value1 = dates
/* SDA CUSTOM */              .filter((d: any) => d != null)
/* SDA CUSTOM */              .map((date: any) => {
/* SDA CUSTOM */                  const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(new Date(date));
/* SDA CUSTOM */                  return `${ye}-${mo}-${da}`;
/* SDA CUSTOM */              });
/* SDA CUSTOM */      } else {
/* SDA CUSTOM */          const stringRange = [dates[0], dates[1]].map(date => {
/* SDA CUSTOM */              const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
/* SDA CUSTOM */              return `${ye}-${mo}-${da}`;
/* SDA CUSTOM */          });
/* SDA CUSTOM */          filterValue.value1 = stringRange[0];
/* SDA CUSTOM */          if (this.filterTypeSelected.value === 'between') {
/* SDA CUSTOM */              filterValue.value2 = stringRange[1];
/* SDA CUSTOM */          }
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    // take the value of the new object
/* SDA CUSTOM */    this.dateFormatCustomValue = JSON.parse(JSON.stringify(filterValue));
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */  public handleFilterChange(filterTypeSelected: FilterType) {
/* SDA CUSTOM */
/* SDA CUSTOM */    this.showDateFormatSelecter = true;
/* SDA CUSTOM */    this.showEdaDatePicker = false;
/* SDA CUSTOM */    this.showEdaDatePickerSingleSelection = false;
/* SDA CUSTOM */    this.showEdaDatePickerMultipleSelection = false
/* SDA CUSTOM */
/* SDA CUSTOM */    if (filterTypeSelected !== undefined && filterTypeSelected !== null) {
/* SDA CUSTOM */      this.isDateFormatAvailable = true 
/* SDA CUSTOM */    } else {
/* SDA CUSTOM */      // selection deleted
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */      this.isDateFormatAvailable = false;
/* SDA CUSTOM */      this.rangeDateFormat.types = [];
/* SDA CUSTOM */      return
/* SDA CUSTOM */    }
/* SDA CUSTOM */    
/* SDA CUSTOM */    if(['=', '!=', '>', '<', '>=', '<='].includes(filterTypeSelected.value)) {
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */      this.rangeDateFormat.types = rangeDateFormats.filter((ft: any, index: number) => index<5);
/* SDA CUSTOM */      this.rangeDateFormat.types.push(rangeDateFormats[rangeDateFormats.length-1]);
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    if(['in', 'not_in'].includes(filterTypeSelected.value)) {
/* SDA CUSTOM */      this.dateFormatSelected = null;
/* SDA CUSTOM */      this.rangeDateFormat.types = rangeDateFormats.filter((ft: any, index: number) => index>=5);
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    if(['between', 'not_between'].includes(filterTypeSelected.value)) {
/* SDA CUSTOM */      this.dateFormatSelected = {label: 'Seleccionar fecha', value: 'customDate'}
/* SDA CUSTOM */      this.showDateFormatSelecter = false;
/* SDA CUSTOM */      this.showEdaDatePicker = true;
/* SDA CUSTOM */      this.initDatePickerConfig();
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    if(['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(filterTypeSelected.value)) {
/* SDA CUSTOM */      this.dateFormatSelected = {label: 'Seleccionar fecha', value: 'customDate'}
/* SDA CUSTOM */      this.showDateFormatSelecter = false;
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  public handleDateFormatChange(dateFormatSelected: any) {
/* SDA CUSTOM */    this.showEdaDatePickerSingleSelection = false;
/* SDA CUSTOM */    this.showEdaDatePickerMultipleSelection = false;
/* SDA CUSTOM */
/* SDA CUSTOM */    if (!dateFormatSelected) return;
/* SDA CUSTOM */
/* SDA CUSTOM */    if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterTypeSelected.value) && dateFormatSelected.value === 'customDate') {
/* SDA CUSTOM */      this.showEdaDatePickerSingleSelection = true;
/* SDA CUSTOM */      this.initDatePickerConfig();
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    if(['in', 'not_in'].includes(this.filterTypeSelected.value) && dateFormatSelected.value === 'customDate') {
/* SDA CUSTOM */      this.showEdaDatePickerMultipleSelection = true;
/* SDA CUSTOM */      this.initDatePickerConfig();
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */  private initDatePickerConfig(): void {
/* SDA CUSTOM */    this.datePickerConfig = new EdaDatePickerConfig();
/* SDA CUSTOM */    this.datePickerConfig.dateRange = [];
/* SDA CUSTOM */    this.datePickerConfig.range = null;
/* SDA CUSTOM */
/* SDA CUSTOM */    if (this.dateFormatCustomValue?.value1) {
/* SDA CUSTOM */      const v1 = this.dateFormatCustomValue.value1;
/* SDA CUSTOM */      if (Array.isArray(v1)) {
/* SDA CUSTOM */        // multiple selection: array of date strings
/* SDA CUSTOM */        this.datePickerConfig.dateRange = v1.map((d: string) => new Date(d.replace(/-/g, '/')));
/* SDA CUSTOM */      } else {
/* SDA CUSTOM */        this.datePickerConfig.dateRange.push(new Date(v1.replace(/-/g, '/')));
/* SDA CUSTOM */        if (this.dateFormatCustomValue.value2) {
/* SDA CUSTOM */          this.datePickerConfig.dateRange.push(new Date(this.dateFormatCustomValue.value2.replace(/-/g, '/')));
/* SDA CUSTOM */        }
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }
/* SDA CUSTOM */  }
/* SDA CUSTOM */
/* SDA CUSTOM */
/* SDA CUSTOM */}
