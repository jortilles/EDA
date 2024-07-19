
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
            case 'yesterday': return this.setYesterday();
            case 'beforeYesterday': return this.setBeforeYesterday();
            case 'weekStart': return this.setWeekStart();
            case 'weekStartFull': return this.setWeekStartFull();
            case 'pastWeek': return this.setPastWeek();
            case 'pastWeekFull': return this.setPastWeekFull();
            case 'monthStart': return this.setMonthStart();
            case 'pastMonth': return this.setPastMonth();
            case 'pastMonthFull': return this.setPastMonthFull();
            case 'monthStartPreviousYear': return this.setMonthStartPreviousYear();
            case 'monthFullPreviousYear': return this.setMonthFullPreviousYear();
            case 'yearStart': return this.setYearStart();
            case 'yearStartPreviousYear': return this.setYearStartPreviousYear();
            case 'yearStartPreviousYearFull': return this.setYearStartPreviousYearFull();
            case 'last3': return this.setLast3();
            case 'last7': return this.setLast7();
            case 'last15': return this.setLast15();
            case 'last30': return this.setLast30();
            case 'last60': return this.setLast60();
            case 'last120': return this.setLast120();
            case 'null': return this.nullDate();
        }
    }

    public allDates(): Array<Date> {
        return [new Date('1984-08-01'), new Date('2090-01-01')];
    }
    public setYesterday(): Array<Date> {
        const d = new Date();
        const yesterday = d.setDate(d.getDate() - 1);
        return [new Date(yesterday), new Date(yesterday)]
    }
    public setBeforeYesterday(): Array<Date> {
        const d = new Date();
        const beforeYesterday = d.setDate(d.getDate() - 2);
        return [new Date(beforeYesterday), new Date(beforeYesterday)]
    }
    public setWeekStart(): Array<Date> {
        const getMonday = (d: Date) => {
            d = new Date(d);
            var day = d.getDay(),
                diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
            return new Date(d.setDate(diff));
        }
        const today = new Date();
        const monday = getMonday(new Date());
        return [monday, today];
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
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return [monthStart, today];
    }
    public setPastMonth(): Array<Date> {
        const t = new Date();
        var d = new Date();
        var newMonth = d.getMonth() - 1;
        if(newMonth < 0){
            newMonth += 12;
            d.setFullYear(d.getFullYear() - 1);
        }
        d.setMonth(newMonth);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth(), t.getDate() );

        return [monthStart, monthEnd];
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
        const t = new Date();
        const today = new Date( t.getFullYear()-1, t.getMonth(), t.getDate());
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return [monthStart, today];
    }

    public setMonthFullPreviousYear(): Array<Date> {
        const t = new Date();
        const monthStart = new Date(t.getFullYear()-1, t.getMonth(), 1);
        const today = new Date( t.getFullYear()-1, t.getMonth(), new Date(t.getFullYear(), t.getMonth()+1, 0).getDate() );
        return [monthStart, today];
    }

    public setYearStart(): Array<Date> {
        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return [yearStart, today];
    }

    public setYearStartPreviousYear(): Array<Date> {
        const t = new Date();
        const today = new Date( t.getFullYear()-1, t.getMonth(), t.getDate());
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return [yearStart, today];
    }

    public setYearStartPreviousYearFull(): Array<Date> {
        const pastYearStart = moment().subtract(1,'years').startOf('year').toDate();
        const pastYearEnd = moment().subtract(1,'years').endOf('year').toDate();
        return [pastYearStart, pastYearEnd];
    }

    public setLast3(): Array<Date> {
        const today = new Date();
        const last3 = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000));
        return [last3, today];
    }

    public setLast7(): Array<Date> {
        const today = new Date();
        const last7 = new Date(today.getTime() - (6 * 24 * 60 * 60 * 1000));
        return [last7, today];
    }

    public setLast15(): Array<Date> {
        const today = new Date();
        const last15 = new Date(today.getTime() - (14 * 24 * 60 * 60 * 1000));
        return [last15, today];
    }

    public setLast30(): Array<Date> {
        const today = new Date();
        const last15 = new Date(today.getTime() - (29 * 24 * 60 * 60 * 1000));
        return [last15, today];
    }

    public setLast60(): Array<Date> {
        const today = new Date();
        const last15 = new Date(today.getTime() - (59 * 24 * 60 * 60 * 1000));
        return [last15, today];
    }

    public setLast120(): Array<Date> {
        const today = new Date();
        const last15 = new Date(today.getTime() - (119 * 24 * 60 * 60 * 1000));
        return [last15, today];
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


    public nullDate() {
        return [moment('1900-01-01').toDate(), moment('1900-01-01').toDate()];
    }

}

