export class SchedulerFunctions {

  /**
   * Check schedule in hours
   * @param quantity 
   * @param lastUpdated 
   */
  static checkScheduleHours(quantity: number, lastUpdated: string) {

    const MS_PER_MINUTE = 60000;
    let ms = null;
    let now = new Date().toISOString();
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

    let now = new Date().toISOString();
    let date = new Date(Date.parse(now));
    const timelapse = date.setDate(date.getDate() - quantity);

    const time_lapse_date = new Date(timelapse);
    time_lapse_date.setHours(0, 0, 0, 0);

    const tl_hourToInt = this.hoursToInt(new Date(timelapse));
    const lu_hourToInt = parseInt(`${hours}${minutes}`);

    const hourCheck = tl_hourToInt >= lu_hourToInt;

    let lastUpdated = new Date(Date.parse(currLastUpdated));
    lastUpdated.setHours(0, 0, 0, 0);

    return time_lapse_date >= lastUpdated && hourCheck;

  }

  static hoursToInt(date: Date) {

    let hour = date.getHours();
    let hourStr = hour > 10 ? `0${hour}` : `${hour}`;
    let minutes = date.getMinutes();
    let minutesStr = minutes > 10 ? `0${minutes}` : `${minutes}`;
    const hourToInt = parseInt(`${hourStr}${minutesStr}`);
    return hourToInt;

  }
}