
import { Injectable } from '@angular/core';

@Injectable()
export class DateUtils {

    getDateFormatApp(date: any, ignoreTimeZone = true) {

    }

    /**Range dates utils */

    public getRange(range: any) {
        switch (range) {
            case 'all': return this.allDates();
            case 'yesterday': return this.setYesterday();
            case 'weekStart': return this.setWeekStart();
            case 'monthStart': return this.setMonthStart();
            case 'yearStart': return this.setYearStart();
            case 'last7': return this.setLast7();
            case 'last15': return this.setLast15();
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
    public setMonthStart(): Array<Date> {
        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return [monthStart, today];
    }
    public setYearStart(): Array<Date> {
        const today = new Date();
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return [yearStart, today];
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

}