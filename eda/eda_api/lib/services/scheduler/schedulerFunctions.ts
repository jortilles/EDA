import { toInteger } from "lodash";
import date from 'date-and-time';
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

    let lastUpdated = new Date(Date.parse(currLastUpdated));
    let nextUpdate =  lastUpdated ;
    nextUpdate = date.addDays(lastUpdated, quantity);
    nextUpdate.setHours( parseInt(hours) );
    nextUpdate.setMinutes(  parseInt(minutes) );
    const ahora = new Date();
    if( ahora.getTime()  >= nextUpdate.getTime() ){
      //Se ha recargado hoy...
      console.log('Actualizando caché a las : ' + nextUpdate)
      return true;
    }else{
      console.log('No se ha actualizado la caché. se actualizó a las ' + lastUpdated + ' y ahora son las '  + ahora + ' y toca '  + nextUpdate);
      return false;
      }
      
  }

  static totLocalISOTime = (date:Date) => {

    var tzoffset = (date).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;

  }
}