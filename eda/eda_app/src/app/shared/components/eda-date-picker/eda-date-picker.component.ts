import { DateUtils } from './../../../services/utils/date-utils.service';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { EdaDatePickerConfig } from './datePickerConfig';
import { locales } from './date-locales';
import { rangeDateFormats } from '../date-picker/date-picker.index';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button'; 
import { RippleModule } from 'primeng/ripple'; 



@Component({
	standalone: true,
	selector: 'eda-date-picker',
	templateUrl: './eda-date-picker.component.html',
	styleUrls: ['./eda-date-picker.component.css'], 
	imports: [
		CommonModule, FormsModule,
		CalendarModule, DropdownModule,
		ButtonModule, RippleModule, 
  	],
})

export class EdaDatePickerComponent implements OnChanges {

	@Input() inject: EdaDatePickerConfig;
	@Input() autoRemove: boolean = false;
	@Input() autoClear: boolean = false;
	@Input() filterSelected: any = {};
	@Input() selectionMode: 'single' | 'multiple' | 'range' = 'range';
	@Output() onDatesChanges = new EventEmitter<any>();
	@Output() onRemove = new EventEmitter<void>();

	public active: boolean = false;
	public locale: {};
	public firstDayOfWeek: number = 1;

	// Shared with date-picker/'s rangeDateFormats, minus 'customDate': this component has no
	// explicit-date-picking flow (its getRange() always calls dateUtilsService.getRange(value),
	// which has no case for 'customDate' and would throw/emit garbage if it were selectable here.
	public ranges: Array<SelectItem> = rangeDateFormats.filter(r => r.value !== 'customDate');

	public selectedRange: SelectItem;
	public rangePlaceholder: string = $localize`:@@DateSelectRange:Selecciona un rango`;
	public rangeDates: any;
	private _allRanges: Array<SelectItem>;

	constructor(
		private dateUtilsService: DateUtils) {
		const url = window.location.href;
		let lan_ca = new RegExp('\/ca\/', 'i');
		let lan_es = new RegExp('\/es\/', 'i');
		this.locale = lan_ca.test(url) ? locales.ca : lan_es.test(url) ? locales.es : locales.en;
		//this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 0;
		this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 1;
		this._allRanges = [...this.ranges];
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (this.inject) {
			if (!this.selectedRange && this.inject.range) {
				this.selectedRange = this.ranges.filter(r => r.value === this.inject.range)[0].value;
				this.getRange();
			} else if (this.inject.dateRange.length > 0) {
				this.rangeDates = this.inject.dateRange;
			}
		}

		// Control for single selection 
		this.ranges = [...this._allRanges];
		if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterSelected?.value)) {
			this.ranges = this.ranges.filter(r => ['beforeYesterday', 'yesterday', 'today', 'pastTomorrow'].includes(r.value));
		}

	}

	public emitChanges(): void {
		let dates = this.rangeDates;
		if (this.selectionMode === 'single' && dates && !Array.isArray(dates)) dates = [dates, dates];
		this.onDatesChanges.emit({ dates: this.rangeDates, range: this.selectedRange });
		this.active = false;
	}

	public remove() {
		this.onRemove.emit();
	}

	public activate() {
		this.active = true;
	}

	public clearRange() {
		this.selectedRange = null;
	}

	public clearRangeDates() {
		this.rangeDates = null;
		this.selectedRange = null;
		this.emitChanges();
	}

	public getRange() {
		const value = <any>this.selectedRange;
		const dates = this.dateUtilsService.getRange(value);
		this.rangeDates = this.selectionMode === 'single' ? dates[0] : dates;
		this.emitChanges();
	}
}