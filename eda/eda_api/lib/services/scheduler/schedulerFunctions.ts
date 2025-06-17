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

    let now = this.totLocalISOTime(new Date());
    let date = new Date(Date.parse(now));

    date.setHours( parseInt(hours));
    date.setMinutes(0);

    let lastUpdated = new Date(Date.parse(currLastUpdated));
    console.log('Ultima actualizacion');
    console.log(lastUpdated);

    let min = lastUpdated.getMinutes() + parseInt(minutes);
    let hour = lastUpdated.getHours() + parseInt(hours);
    let day = lastUpdated.setDate(lastUpdated.getDate() + quantity);
    let month = lastUpdated.setMonth(lastUpdated.getMonth());
    let year = lastUpdated.setFullYear(lastUpdated.getFullYear(),month, day);

    let nextUpdate = new Date(year, month, day, hour, min)
    
    if(nextUpdate >= date){
      //Se ha recargado hoy...
      console.log('Actualizando caché a las : ' + date)
      return true;
    }else{
      console.log('No se ha actualizado la caché');
      return false;
      }
      
  }

  static totLocalISOTime = (date:Date) => {

    var tzoffset = (date).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;

  }
}