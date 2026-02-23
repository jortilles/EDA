export class TimeFormatService {

  // Suma unidades a una fecha
  static addToDate(
    date: Date,
    unit: 'day' | 'month' | 'hour' | 'minute'
  ): Date {
    const newDate = new Date(date);

    switch (unit) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'hour':
        newDate.setHours(newDate.getHours() + 1);
        break;
      case 'minute':
        newDate.setMinutes(newDate.getMinutes() + 1);
        break;
    }

    return newDate;
  }

  // Formatea fechas
  static formatDate(date: Date, format: string): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    switch (format) {
      case 'month':
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
      case 'day':
        return date.toISOString().slice(0, 10);
      case 'day_hour':
        return date.toISOString().replace('T', ' ').slice(0, 13);
      case 'day_hour_minute':
        return date.toISOString().replace('T', ' ').slice(0, 16);
      default:
        return date.toISOString();
    }
  }

  static nextInSequenceGeneric(format: string, lastValue: string, labelsReturned: number): string[] {
    const result: string[] = [];
    let currentValue = lastValue;

    for (let i = 0; i < labelsReturned; i++) {
      currentValue = this.nextSingleValue(format, currentValue);
      result.push(currentValue);
    }

    return result;
  }

  // Obtiene el siguiente valor de una secuencia
  private static nextSingleValue(format: string, lastValue: string): string {
    switch (format) {
      case 'year':
        return (Number(lastValue) + 1).toString();

      case 'quarter': {
        const [y, q] = lastValue.split('-Q').map(Number);
        const nextQ = q < 4 ? q + 1 : 1;
        const nextY = q < 4 ? y : y + 1;
        return `${nextY}-Q${nextQ}`;
      }

      case 'month': {
        const [year, month] = lastValue.split('-').map(Number);
        const nextDate = this.addToDate(new Date(year, month - 1, 1), 'month');
        return this.formatDate(nextDate, 'month');
      }

      case 'week': {
        const [yw, w] = lastValue.split('-W').map(Number);
        const nextW = w < 52 ? w + 1 : 1;
        const nextYW = w < 52 ? yw : yw + 1;
        return `${nextYW}-${String(nextW).padStart(2, '0')}`;
      }

      case 'week_day': {
        const dayNumber = Number(lastValue); // día actual 1-7
        const nextDayNumber = dayNumber < 7 ? dayNumber + 1 : 1; // siguiente día de la semana
        return nextDayNumber.toString();
      }

      case 'day': {
        const nextDay = this.addToDate(this.parseDate(lastValue, format), 'day');
        return this.formatDate(nextDay, format);
      }

      case 'day_hour': {
        const [year, month, day] = lastValue.split('-').map(Number);
        const nextDay = this.addToDate(new Date(year, month - 1, day, 12), 'day'); // empezamos con 12h
        nextDay.setHours(13, 0, 0, 0); // aseguramos hora 12:00 exacta
        return this.formatDate(nextDay, 'day_hour');
      }

      case 'day_hour_minute': {
        const [datePart] = lastValue.split(' '); // ignoramos hora/minuto originales
        const [year, month, day] = datePart.split('-').map(Number);
        const nextDay = this.addToDate(new Date(year, month - 1, day, 12), 'day'); // empezamos con 12h
        nextDay.setHours(13, 0, 0, 0); // fijamos 12:00
        return this.formatDate(nextDay, 'day_hour_minute'); // mantiene formato
      }


      case 'timestamp':
        return lastValue;

      default:
        const nextDay = this.addToDate(this.parseDate(lastValue, format), 'day');
        return this.formatDate(nextDay, format);
      }
  }

  private static parseDate(lastValue: string, format: string): Date {
    switch (format) {
      case 'day':
        return new Date(lastValue);

      case 'month': {
        const [year, month] = lastValue.split('-').map(Number);
        return new Date(year, month - 1, 1);
      }

      case 'day_hour': {
        const [datePart, hourPart] = lastValue.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const hour = Number(hourPart ?? 0);
        return new Date(year, month - 1, day, hour);
      }

      case 'day_hour_minute': {
        const [datePart, timePart] = lastValue.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = (timePart ?? '0:0').split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
      }

      case 'week_day': {
        // Para week_day asumimos un número de 1 a 7, convertimos al próximo lunes relativo a hoy
        const today = new Date();
        const dayNumber = Number(lastValue);
        const nextDay = new Date(today);
        nextDay.setDate(today.getDate() + ((dayNumber - today.getDay() + 7) % 7));
        return nextDay;
      }

      default:
        return new Date(lastValue);
    }
  }
}
