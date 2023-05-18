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
    console.log('Ahora mismo son las : ' + date);

    date.setHours(parseInt(hours));
    date.setMinutes(0);
    console.log('Se debe actualizar a las  : ' + date);

    let lastUpdated = new Date(Date.parse(currLastUpdated));
    console.log('Ultima actualizacion');
    console.log(lastUpdated);
    //console.log('Fecha de referencia');
    //console.log(date);

    if (lastUpdated > date) {
      //Se ha recargado hoy...
      console.log('recargado más recientemente... No actualizo');
      //console.log(lastUpdated);
      //console.log(date);
      return false;
    } else {


      lastUpdated.setDate(lastUpdated.getDate() + quantity);

      let difference = lastUpdated.getTime() - date.getTime();
      let TotalDays = (difference / (1000 * 3600 * 24));
      console.log('Han pasado dias' + TotalDays);
      if (quantity < 0) {
        console.log('No han pasado suficientes dias no actualizo');
        return false;
      } else {
        console.log('Si han pasado suficientes dias actualizo');
        return true;
      }
    }
  }


  static totLocalISOTime = (date: Date) => {

    var tzoffset = (date).getTimezoneOffset() * 60000; //offset in milliseconds
    var localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
    return localISOTime;

  }
}
