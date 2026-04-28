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
    nextSend.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    return now >= nextSend;
  }

  static totLocalISOTime = (date:Date) => {

    var tzoffset = (date).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;

  }
}