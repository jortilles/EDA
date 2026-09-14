import { toInteger } from "lodash";
export class SchedulerFunctions {

  /**
   * Check schedule in hours
   * @param quantity 
   * @param lastUpdated 
   */
  static checkScheduleHours(quantity: number, lastUpdated: string) {

    const MS_PER_MINUTE = 60000;
    let ms = null;
    let now = this.totLocalISOTime(new Date());
    ms = quantity * 60 * MS_PER_MINUTE;
    const timelapse = Date.parse(now) - ms;

    return timelapse >= Date.parse(lastUpdated)

  }

  /**
   * Check schedule in days
   * @param quantity 
   * @param hours 
   * @param minutes 
   * @param currLastUpdated 
   */

  static checkScheduleDays(quantity: number, hours: string, minutes: string, currLastUpdated: string) {
    const now = new Date(this.totLocalISOTime(new Date()));
    const lastUpdated = new Date(Date.parse(currLastUpdated));

    const nextSend = new Date(lastUpdated);
    nextSend.setDate(nextSend.getDate() + quantity);
    nextSend.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

    return now >= nextSend;
  }

  /**
   * Weekly schedule: fires on the given UTC weekday once its HH:MM slot has passed and we have
   * not already sent since that slot.
   * @param weekday 0 (Sun) .. 6 (Sat)
   */
  static checkScheduleWeekly(weekday: number, hours: string, minutes: string, currLastUpdated: string) {
    const now = new Date();
    const last = new Date(Date.parse(currLastUpdated));
    if (now.getUTCDay() !== Number(weekday)) return false;

    const slot = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0
    ));
    return now >= slot && last < slot;
  }

  /**
   * Monthly schedule: fires once per month, on either a day-of-month rule ('dom' + monthlyDay,
   * where 'last' = last day) or an nth-weekday rule ('nth' + monthlyOrdinal + monthlyWeekday).
   */
  static checkScheduleMonthly(mode: string, monthlyDay: any, monthlyOrdinal: string, monthlyWeekday: number, hours: string, minutes: string, currLastUpdated: string) {
    const now = new Date();
    const last = new Date(Date.parse(currLastUpdated));
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;

    const targetFor = (year: number, month: number): Date | null => {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      let dayOfMonth: number;

      if (mode === 'nth') {
        const ordIdx: Record<string, number> = { first: 0, second: 1, third: 2, fourth: 3 };
        if (monthlyOrdinal === 'last') {
          const lastDay = new Date(Date.UTC(year, month + 1, 0));
          const back = (lastDay.getUTCDay() - Number(monthlyWeekday) + 7) % 7;
          dayOfMonth = lastDay.getUTCDate() - back;
        } else {
          const first = new Date(Date.UTC(year, month, 1));
          const forward = (Number(monthlyWeekday) - first.getUTCDay() + 7) % 7;
          dayOfMonth = 1 + forward + (ordIdx[monthlyOrdinal] ?? 0) * 7;
          if (dayOfMonth > daysInMonth) return null; // that occurrence doesn't exist this month
        }
      } else {
        dayOfMonth = monthlyDay === 'last' ? daysInMonth : Math.min(Number(monthlyDay) || 1, daysInMonth);
      }

      return new Date(Date.UTC(year, month, dayOfMonth, h, m, 0, 0));
    };

    const thisMonth = targetFor(now.getUTCFullYear(), now.getUTCMonth());
    if (thisMonth && now >= thisMonth) return last < thisMonth;

    // this month's slot is still in the future -> check last month's occurrence
    const pm = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const prev = targetFor(pm.getUTCFullYear(), pm.getUTCMonth());
    return !!prev && last < prev;
  }

  static totLocalISOTime = (date:Date) => {

    var tzoffset = (date).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;

  }
}