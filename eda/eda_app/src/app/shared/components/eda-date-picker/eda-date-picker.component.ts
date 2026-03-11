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
		/**SDA CUSTOM  */ //	{ label: $localize`:@@DatePickerAll:Todas`, value: 'all' },
		// Days
		{ label: $localize`:@@DatePickerBeforeYesterday:Antes de Ayer`, value: 'beforeYesterday' },
		{ label: $localize`:@@DatePickerYesterday:Ayer`, value: 'yesterday' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerToday:Hoy`, value: 'today' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerTomorrow:Mañana`, value: 'tomorrow' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerPastTomorrow:Pasado mañana`, value: 'pastTomorrow' },
		// Weeks
		{ label: $localize`:@@DatePickerLastWeekFull:La semana pasada completa`, value: 'pastWeekFull' },
		{ label: $localize`:@@DatePickerLastWeek:La semana pasada (hasta equivalente a hoy)`, value: 'pastWeek' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerWeekFull:Esta semana al completo`, value: 'weekStartFull' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerWeek:Esta semana (hasta hoy)`, value: 'weekStart' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNextWeek:Próxima semana`, value: 'nextWeek' },

    // Months
		{ label: $localize`:@@DatePickerLastMonthFull:El mes pasado completo`, value: 'pastMonthFull' },
		{ label: $localize`:@@DatePickerLastMonth:El mes pasado (hasta equivalente a hoy)`, value: 'pastMonth' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerMonthFull:Este mes completo`, value: 'monthStartFull' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerMonth:Este mes (hasta hoy)`, value: 'monthStart' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNextMonth:Próximo mes`, value: 'nextMonth' },
		{ label: $localize`:@@DatePickerMonthPreviousYearFull:Éste mes al completo del año pasado`, value: 'monthFullPreviousYear' },
		{ label: $localize`:@@DatePickerMonthPreviousYear:Este mes del año pasado (hasta equivalente a hoy)`, value: 'monthStartPreviousYear' },
		{ label: $localize`:@@DatePickerLastQuarter:Último trimestre`, value: 'lastQuarter' },
		/* SDA CUSTOM */  { label: $localize`:@@DatePickerThisQuarter:Este trimestre`, value: 'quarterStart' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNextQuarter:Próximo trimestre`, value: 'nextQuarter' },

    // Years
		{ label: $localize`:@@DatePickerYearPreviousYearFull:El año pasado, completo`, value: 'yearStartPreviousYearFull' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerYearPreviousYear:El año pasado (hasta equivalente a hoy)`, value: 'yearStartPreviousYear' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerYearFull:Este año al completo`, value: 'yearStartFull' },
		/**SDA CUSTOM  */	{ label: $localize`:@@DatePickerYear:Este año (hasta hoy)`, value: 'yearStart' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNextYear:Próximo año`, value: 'nextYear' },
		// Last N days
		{ label: $localize`:@@DatePickerLast3:Últimos 3 días`, value: 'last3' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext3:Próximos 3 días`, value: 'next3' },
		{ label: $localize`:@@DatePickerLast7:Últimos 7 días`, value: 'last7' },
		/* SDA CUSTOM */	{ label: $localize`:@@DatePickerNext7:Próximos 7 días`, value: 'next7' },
		{ label: $localize`:@@DatePickerLast15:Últimos 15 días`, value: 'last15' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext15:Próximos 15 días`, value: 'next15' },
		{ label: $localize`:@@DatePickerLast30:Últimos 30 días`, value: 'last30' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext30:Próximos 30 días`, value: 'next30' },
		{ label: $localize`:@@DatePickerLast60:Últimos 60 días`, value: 'last60' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext60:Próximos 60 días`, value: 'next60' },
		{ label: $localize`:@@DatePickerLast90:Últimos 90 días`, value: 'last90' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext90:Próximos 90 días`, value: 'next90' },
		{ label: $localize`:@@DatePickerLast120:Últimos 120 días`, value: 'last120' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerNext120:Próximos 120 días`, value: 'next120' },
		/* SDA CUSTOM */ 	{ label: $localize`:@@DatePickerBeforeTodayIncluded:Todo hasta hoy`, value: 'beforeTodayIncluded' },
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
