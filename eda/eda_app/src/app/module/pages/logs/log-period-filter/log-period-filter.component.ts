import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import moment from 'moment';

export interface LogDateRangeChange {
    useExactDate: boolean;
    date?: string;
    startDate?: string;
    endDate?: string;
    // Whether the resolved range reaches today — callers use this to decide if a "live tail" makes sense
    includesToday: boolean;
}

@Component({
    standalone: true,
    selector: 'app-log-period-filter',
    templateUrl: './log-period-filter.component.html',
    styleUrls: ['./log-period-filter.component.css'],
    imports: [CommonModule, FormsModule, CalendarModule, DropdownModule]
})
export class LogPeriodFilterComponent implements OnInit {

    @Output() rangeChange = new EventEmitter<LogDateRangeChange>();

    public selectedDate: Date | null = new Date();
    public firstDayOfWeek: number = 1;
    public calendarLocale: any = {};
    public minSelectableDate: Date;
    public maxSelectableDate: Date;
    public useExactDateFilter: boolean = false;

    public selectPeriodPlaceholder: string = $localize`:@@SelectPeriodPlaceholder:Selecciona periodo`;

    public periods: any[] = [
        { label: $localize`:@@Today:Hoy`, value: 'today' },
        { label: $localize`:@@Yesterday:Ayer`, value: 'yesterday' },
        { label: $localize`:@@Last5Days:Últimos 5 días`, value: 'last5days' },
        { label: $localize`:@@Last10Days:Últimos 10 días`, value: 'last10days' },
    ];
    public selectedPeriod: string | null = 'today';

    constructor() {
        this.maxSelectableDate = moment().endOf('day').toDate();
        this.minSelectableDate = moment().subtract(9, 'days').startOf('day').toDate();
        this.calendarLocale = this.resolveCalendarLocaleFromActiveLanguage();
        this.firstDayOfWeek = this.calendarLocale && this.calendarLocale.firstDayOfWeek !== undefined ? this.calendarLocale.firstDayOfWeek : 1;
    }

    ngOnInit(): void {
        this.emitChange();
    }

    getPeriodRange(period: string | null): { start: string, end: string } {
        const today = moment();
        let start = moment();
        let end = moment();

        if (!period) {
            period = 'today';
        }

        switch (period) {
            case 'today':
                start = today;
                end = today;
                break;
            case 'yesterday':
                start = moment().subtract(1, 'days');
                end = start;
                break;
            case 'last5days':
                start = moment().subtract(4, 'days');
                end = today;
                break;
            case 'last10days':
                start = moment().subtract(9, 'days');
                end = today;
                break;
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        };
    }

    onPeriodChange() {
        if (!this.selectedPeriod) {
            return;
        }
        // Clear date picker only for multi-day periods; keep the visible date for single-day periods
        const range = this.getPeriodRange(this.selectedPeriod);
        if (range.start === range.end) {
            this.selectedDate = moment(range.start, 'YYYY-MM-DD').toDate();
        } else {
            this.selectedDate = null;
        }
        this.useExactDateFilter = false;
        this.emitChange();
    }

    // Enable exact-date mode when a day is picked in the calendar (restricted to the last 10 days)
    onDateChange() {
        const selectedMoment = moment(this.selectedDate);
        const minMoment = moment(this.minSelectableDate);
        const maxMoment = moment(this.maxSelectableDate);
        const todayMoment = moment().startOf('day');
        const yesterdayMoment = moment().subtract(1, 'day').startOf('day');

        if (selectedMoment.isBefore(minMoment, 'day')) {
            this.selectedDate = minMoment.toDate();
        } else if (selectedMoment.isAfter(maxMoment, 'day')) {
            this.selectedDate = maxMoment.toDate();
        }

        const normalizedSelected = moment(this.selectedDate).startOf('day');
        if (normalizedSelected.isSame(todayMoment, 'day')) {
            this.selectedPeriod = 'today';
            this.useExactDateFilter = false;
        } else if (normalizedSelected.isSame(yesterdayMoment, 'day')) {
            this.selectedPeriod = 'yesterday';
            this.useExactDateFilter = false;
        } else {
            this.selectedPeriod = null;
            this.useExactDateFilter = true;
        }
        this.emitChange();
    }

    private emitChange() {
        const todayStr = moment().format('YYYY-MM-DD');
        if (this.useExactDateFilter) {
            const date = moment(this.selectedDate).format('YYYY-MM-DD');
            this.rangeChange.emit({ useExactDate: true, date, includesToday: date === todayStr });
        } else {
            const range = this.getPeriodRange(this.selectedPeriod);
            this.rangeChange.emit({ useExactDate: false, startDate: range.start, endDate: range.end, includesToday: range.end >= todayStr });
        }
    }

    // Use the active app language from the URL (not browser locale), english fallback
    private resolveCalendarLocaleFromActiveLanguage() {
        const url = window.location.href;
        const lanCa = /\/ca\//i;
        const lanEs = /\/es\//i;

        const localesByLanguage = {
            es: {
                firstDayOfWeek: 1,
                dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
                dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'],
                dayNamesMin: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
                monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
                monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                today: 'Hoy',
                clear: 'Limpiar',
                weekHeader: 'Semana'
            },
            ca: {
                firstDayOfWeek: 1,
                dayNames: ['Diumenge', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte'],
                dayNamesShort: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
                dayNamesMin: ['Dg', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds'],
                monthNames: ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'],
                monthNamesShort: ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'],
                today: 'Avui',
                clear: 'Netejar',
                weekHeader: 'Setmana'
            },
            en: {
                firstDayOfWeek: 1,
                dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                dayNamesMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                monthNames: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                today: 'Today',
                clear: 'Clear',
                weekHeader: 'Wk'
            }
        };

        if (lanCa.test(url)) return localesByLanguage.ca;
        if (lanEs.test(url)) return localesByLanguage.es;
        return localesByLanguage.en;
    }
}
