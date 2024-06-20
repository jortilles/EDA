import { DateUtils } from './../../../services/utils/date-utils.service';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { EdaDatePickerConfig } from './datePickerConfig';
import { locales } from './date-locales';



@Component({
	selector: 'eda-date-picker',
	templateUrl: './eda-date-picker.component.html',
	styleUrls: ['./eda-date-picker.component.css']
})

export class EdaDatePickerComponent implements OnChanges {

	@Input() inject: EdaDatePickerConfig;
	@Input() autoRemove: boolean = false;
	@Input() autoClear: boolean = false;
	@Output() onDatesChanges = new EventEmitter<any>();
	@Output() onRemove = new EventEmitter<void>();

	public active: boolean = false;
	public locale: {};
	public firstDayOfWeek: number = 1;

	public ranges: Array<SelectItem> = [
		{ label: $localize`:@@DatePickerAll:Todas`, value: 'all' },
		{ label: $localize`:@@DatePickerYesterday:Ayer`, value: 'yesterday' },
		{ label: $localize`:@@DatePickerBeforeYesterday:Antes de Ayer`, value: 'beforeYesterday' },
		{ label: $localize`:@@DatePickerWeek:Ésta semana`, value: 'weekStart' },
		{ label: $localize`:@@DatePickerWeekFull:Ésta semana al completo`, value: 'weekStartFull' },
		{ label: $localize`:@@DatePickerLastWeek:La semana pasada`, value: 'pastWeek' },
		{ label: $localize`:@@DatePickerLastWeekFull:La semana pasada completa`, value: 'pastWeekFull' },
		{ label: $localize`:@@DatePickerMonth:Éste mes`, value: 'monthStart' },
		{ label: $localize`:@@DatePickerLastMonth:El mes pasado`, value: 'pastMonth' },
		{ label: $localize`:@@DatePickerLastMonthFull:El mes pasado completo`, value: 'pastMonthFull' },
		{ label: $localize`:@@DatePickerMonthPreviousYear:Éste mes del año pasado`, value: 'monthStartPreviousYear' },
		{ label: $localize`:@@DatePickerMonthPreviousYearFull:Éste mes al completo del año pasado`, value: 'monthFullPreviousYear' },
		{ label: $localize`:@@DatePickerYear:Éste año`, value: 'yearStart' },
		{ label: $localize`:@@DatePickerYearPreviousYear:El año pasado`, value: 'yearStartPreviousYear' },
		{ label: $localize`:@@DatePickerLast3:Últimos 3 días`, value: 'last3' },
		{ label: $localize`:@@DatePickerLast7:Últimos 7 días`, value: 'last7' },
		{ label: $localize`:@@DatePickerLast15:Últimos 15 días`, value: 'last15' },
		{ label: $localize`:@@DatePickerLast30:Últimos 30 días`, value: 'last30' },
		{ label: $localize`:@@DatePickerLast60:Últimos 60 días`, value: 'last60' },
		{ label: $localize`:@@DatePickerLast120:Últimos 120 días`, value: 'last120' },
		{ label: $localize`:@@DatePickerNull:Fecha nula`, value: 'null' },
	];

	public selectedRange: SelectItem;
	public rangePlaceholder: string = $localize`:@@DateSelectRange:Selecciona un rango`;
	public rangeDates: any;

	constructor(
		private dateUtilsService: DateUtils) {
		const url = window.location.href;
		let lan_ca = new RegExp('\/ca\/', 'i');
		let lan_es = new RegExp('\/es\/', 'i');
		this.locale = lan_ca.test(url) ? locales.ca : lan_es.test(url) ? locales.es : locales.en;
		//this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 0;
		this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 1;
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
	}

	public emitChanges(): void {
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
		this.rangeDates = this.dateUtilsService.getRange(value);
	}
}