
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
        }
    }

    public allDates(): Array<Date> {
        const mostOldDate = moment('1939-01-01').toDate();
        const today = moment().toDate();
        return [mostOldDate, today];
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
        const endOnFriday = moment().startOf('isoWeek').add(4,'days').toDate();
        return [startOnMonday,endOnFriday];
    }

    public setWeekStartFull(): Array<Date> {
        const startOnMonday = moment().startOf('isoWeek').toDate();
        const endOnSunday = moment().startOf('isoWeek').add(6,'days').toDate();
        return [startOnMonday, endOnSunday];
    }

    public setPastWeek(): Array<Date> {
        const pastWeekMonday = moment().subtract(1,'weeks').startOf('isoWeek').toDate();
        const pastWeekFriday = moment().subtract(1,'weeks').startOf('isoWeek').add(4,'days').toDate();
        return [pastWeekMonday, pastWeekFriday];
    }

    public setPastWeekFull(): Array<Date> {
        const pastWeekMonday = moment().subtract(1,'weeks').startOf('isoWeek').toDate();
        const pastWeekSunday = moment().subtract(1,'weeks').startOf('isoWeek').add(6,'days').toDate();
        return [pastWeekMonday, pastWeekSunday];
    }

    public setMonthStart(): Array<Date> { 
        const today = moment().toDate();
        const monthStart = moment().startOf('month').toDate();
        return [monthStart, today];
    }

    public setPastMonth(): Array<Date> {
        const monthStart = moment().subtract(1,'months').startOf('month').toDate();
        const pastMonthDay = moment().subtract(1,'months').toDate();
        return [monthStart, pastMonthDay];
    }
    
    public setPastMonthFull(): Array<Date> {
        const monthStart = moment().subtract(1,'months').startOf('month').toDate();
        const monthEnd = moment().subtract(1,'months').endOf('month').toDate();
        console.log("StartofMonth: ", monthStart)
        console.log("EndOfMonth:", monthEnd);
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

}