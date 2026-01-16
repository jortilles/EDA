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
        const nextDate = this.addToDate(
          new Date(year, month - 1, 1),
          'month'
        );
        return this.formatDate(nextDate, 'month');
      }

      case 'week': {
        const [yw, w] = lastValue.split('-W').map(Number);
        const nextW = w < 52 ? w + 1 : 1;
        const nextYW = w < 52 ? yw : yw + 1;
        return `${nextYW}-${String(nextW).padStart(2, '0')}`;
      }

      case 'day': {
        const nextDay = this.addToDate(new Date(lastValue), 'day');
        return this.formatDate(nextDay, 'day');
      }

      case 'week_day':
        return ((Number(lastValue) % 7) + 1).toString();

      case 'day_hour': {
        const nextHour = this.addToDate(new Date(lastValue), 'hour');
        return this.formatDate(nextHour, 'day_hour');
      }

      case 'day_hour_minute': {
        const nextMinute = this.addToDate(new Date(lastValue), 'minute');
        return this.formatDate(nextMinute, 'day_hour_minute');
      }

      case 'timestamp':
        return lastValue;

      default:
        throw new Error(`Formato no soportado: ${format}`);
    }
  }

}
