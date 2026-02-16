
import { Injectable } from '@angular/core';
import moment from 'moment';


@Injectable()
export class DateUtils {
    
    getDateFormatApp(date: any, ignoreTimeZone = true) {

    }

    /**Range dates utils */

    public getRange(range: any) {
        switch (range) {
            case 'all': return this.allDates();
            case 'today': return this.setToday();
            case 'yesterday': return this.setYesterday();
            case 'beforeYesterday': return this.setBeforeYesterday();
            case 'weekStart': return this.setWeekStart();
            case 'weekStartFull': return this.setWeekStartFull();
            case 'pastWeek': return this.setPastWeek();
            case 'pastWeekFull': return this.setPastWeekFull();
            case 'monthStart': return this.setMonthStart();
            case 'monthStartFull': return this.setMonthStartFull();
            case 'pastMonth': return this.setPastMonth();
            case 'pastMonthFull': return this.setPastMonthFull();
            case 'monthStartPreviousYear': return this.setMonthStartPreviousYear();
            case 'monthFullPreviousYear': return this.setMonthFullPreviousYear();
            case 'yearStart': return this.setYearStart();
            case 'yearStartFull': return this.setYearStartFull();
            case 'yearStartPreviousYear': return this.setYearStartPreviousYear();
            case 'yearStartPreviousYearFull': return this.setYearStartPreviousYearFull();
            case 'last3': return this.setLast3();
            case 'last7': return this.setLast7();
            case 'last15': return this.setLast15();
            case 'last30': return this.setLast30();
            case 'last60': return this.setLast60();
            case 'last120': return this.setLast120();
            case 'nextMonth': return this.setNextMonth();
            case 'nextWeek': return this.setNextWeek();
            case 'next30': return this.setNext30();
            case 'next60': return this.setNext60();
            case 'next90': return this.setNext90();
            case 'nextQuarter': return this.setNextQuarter();
            case 'nextYear': return this.setNextYear();
            case 'null': return this.nullDate();
        }
    }

    public allDates(): Array<Date> {
        const mostOldDate = moment('1939-01-01').toDate();
        const today = moment().toDate();
        return [mostOldDate, today];
    }

    public setToday(): Array<Date> {
        const today = moment().toDate();
        return [today, today];
    }

    public setYesterday(): Array<Date> {
        const yesterday = moment().subtract(1,'days').toDate()
        return [yesterday,yesterday];
    }

    public setBeforeYesterday(): Array<Date> {
        const beforeYesterday = moment().subtract(2,'days').toDate();
        return [beforeYesterday,beforeYesterday];
    }

    public setWeekStart(): Array<Date> {
        const startOnMonday = moment().startOf('isoWeek').toDate();
        let today = new Date();
        return [startOnMonday,today];
    }

    /**
     * Establece el inicio y fin de la semana basado en la fecha actual de acuerdo al ISO 8601 que en todos
     * los casos considera el lunes como el primer día de la semana. Utiliza la biblioteca moment.js.
     *
     * @return Array<Date> Un arreglo que contiene dos objetos Date, el primero es el inicio de la semana
     * y el segundo es el fin de la semana.
     *
    */
    public setWeekStartFull(): Array<Date> {
      let now = moment();
      let start = now.clone().startOf('isoWeek').toDate();
      let end = now.clone().endOf('isoWeek').toDate();
      return [start, end];
    }

    public setPastWeek(): Array<Date> {
        const getMonday = (d: Date) => {
            d = new Date(d);
            var day = d.getDay(),
                diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
            return new Date(d.setDate(diff));
        }
        let today = new Date();
        today.setDate(today.getDate() - 7);
        const monday = getMonday(today);
        return [monday, today];
    }

    public setPastWeekFull(): Array<Date> {
        const getMonday = (d: Date) => {
            d = new Date(d);
            var day = d.getDay(),
                diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
            return new Date(d.setDate(diff));
        }
        let today = new Date();
        today.setDate(today.getDate() - 7);
        const monday = getMonday(today);
        today.setDate( monday.getDate() + 6);
        return [monday, today];
    }

    public setMonthStart(): Array<Date> { 
        const today = moment().toDate();
        const monthStart = moment().startOf('month').toDate();
        return [monthStart, today];
    }

    public setMonthStartFull(): Array<Date> { 
        const monthStart = moment().startOf('month').toDate();
        const monthStartEnd = moment().endOf('month').toDate();
        return [monthStart, monthStartEnd];
    }

    public setPastMonth(): Array<Date> {
        const monthStart = moment().subtract(1,'months').startOf('month').toDate();
        const pastMonthDay = moment().subtract(1,'months').toDate();
        return [monthStart, pastMonthDay];
    }
    
    public setPastMonthFull(): Array<Date> {
        const t = new Date();
        var d = new Date();
        var newMonth = d.getMonth() - 1;
        if(newMonth < 0){
            newMonth += 12;
            d.setFullYear(d.getFullYear() - 1);
        }
        d.setMonth(newMonth);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth(),  new Date(d.getFullYear(), d.getMonth()+1, 0).getDate() );

        return [monthStart, monthEnd];
    }

    public setMonthStartPreviousYear(): Array<Date> {
        const monthStartPastYear = moment().subtract(1,'years').startOf('month').toDate();
        const todayPastYear = moment().subtract(1,'years').toDate();
        return [monthStartPastYear,todayPastYear];
    }

    public setMonthFullPreviousYear(): Array<Date> {
        const monthStartPastYear = moment().subtract(1,'years').startOf('month').toDate();
        const monthEndPastYear = moment().subtract(1,'years').endOf('month').toDate();
        return [monthStartPastYear,monthEndPastYear];
    }

    public setYearStart(): Array<Date> {
        const yearStart = moment().startOf('year').toDate();
        const today = moment().toDate();
        return [yearStart, today];
    }

    public setYearStartFull(): Array<Date> {
        const yearStart = moment().startOf('year').toDate();
        const yearEnd = moment().endOf('year').toDate();
        return [yearStart, yearEnd];
    }

    public setYearStartPreviousYear(): Array<Date> {
        const pastYearStart = moment().subtract(1,'years').startOf('year').toDate();
        const pastYearToday = moment().subtract(1,'years').toDate();
        return [pastYearStart, pastYearToday];
    }

    public setYearStartPreviousYearFull(): Array<Date> {
        const pastYearStart = moment().subtract(1,'years').startOf('year').toDate();
        const pastYearEnd = moment().subtract(1,'years').endOf('year').toDate();
        return [pastYearStart, pastYearEnd];
    }

    public setLast3(): Array<Date> {
        const today = moment().toDate();
        const lastTwoDays = moment().subtract(2,'days').toDate();
        return [lastTwoDays, today];
    }

    public setLast7(): Array<Date> {
        const today = moment().toDate();
        const lastSixDays = moment().subtract(6,'days').toDate();
        return [lastSixDays, today];
    }

    public setLast15(): Array<Date> {
        const today = moment().toDate();
        const lastFourteenDays = moment().subtract(14,'days').toDate();
        return [lastFourteenDays, today];
    }

    public setLast30(): Array<Date> {
        const today = moment().toDate();
        const lastTwentyNine = moment().subtract(29,'days').toDate();
        return [lastTwentyNine, today];
    }

    public setLast60(): Array<Date> {
        const today = moment().toDate();
        const lastFiftyNine = moment().subtract(59,'days').toDate();
        return [lastFiftyNine, today];
    }

    public setLast120(): Array<Date> {
        const today = moment().toDate();
        const lastOneHudredNineteen = moment().subtract(119,'days').toDate();
        return [lastOneHudredNineteen, today];
    }

    public rangeToString(range: Array<Date>): Array<string> {
        const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
        if (!range[1]) {
            range[1] = range[0];
        }

        let stringRange = [range[0], range[1]]
            .map(date => {
                let [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
                return `${ye}-${mo}-${da}`
            });
        return stringRange;
    }

    public setNextMonth(): Array<Date> {
        const base = moment().add(1, 'month');
        const monthStart = base.clone().startOf('month').toDate();
        const lastDayOfTheMonth = base.clone().endOf('month').toDate();
        return [monthStart, lastDayOfTheMonth];
    }

    public setNextWeek(): Array<Date> {
        const base = moment().add(1, 'week');
        const weekStart = base.clone().startOf('isoWeek').toDate();
        const weekEnd   = base.clone().endOf('isoWeek').toDate();
        return [weekStart, weekEnd];
    }    

    public setNext30(): Array<Date> {
        const start = moment().add(1, 'day').startOf('day').toDate();
        const end   = moment().add(30, 'day').endOf('day').toDate();
        return [start, end];
    }

    public setNext60(): Array<Date> {
        const start = moment().add(1, 'day').startOf('day').toDate();
        const end   = moment().add(60, 'day').endOf('day').toDate();
        return [start, end];
    }

    public setNext90(): Array<Date> {
        const start = moment().add(1, 'day').startOf('day').toDate();
        const end   = moment().add(90, 'day').endOf('day').toDate();
        return [start, end];
    }

    public setNextQuarter(): Array<Date> {
        const base = moment().add(1, 'quarter');
        const quarterStart = base.clone().startOf('quarter').toDate();
        const quarterEnd   = base.clone().endOf('quarter').toDate();
        return [quarterStart, quarterEnd];
    }

    public setNextYear(): Array<Date> {
        const base = moment().add(1, 'year');
        const yearStart = base.clone().startOf('year').toDate();
        const yearEnd   = base.clone().endOf('year').toDate();
        return [yearStart, yearEnd];
    }

    public nullDate() {
        return [moment('1900-01-01').toDate(), moment('1900-01-01').toDate()];
    }

}

