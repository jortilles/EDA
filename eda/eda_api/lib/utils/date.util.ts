

export class DateUtil {


    // Función para validar y convertir dates
    public static isValidDate(date: string, formato: string) {
        try {
            const [day, month, year] = date.split(formato.includes('/') ? '/' : '-');
            const formatDate: any = new Date(Number(year), Number(month) - 1, Number(day));
            return formatDate instanceof Date && !isNaN(Number(formatDate));
        } catch (err) {
            console.error('isValidDateError:', date);
        }
    }

    public static convertDate(date: any) {
        if (DateUtil.isValidDate(date, 'DD/MM/YYYY')) {
            const [year, month, day] = date.split('/').reverse()
            return new Date(Number(year), Number(month) - 1, Number(day));
        } else if (DateUtil.isValidDate(date, 'YYYY-MM-DD')) {
            const [year, month, day] = date.split('-');
            return new Date(Number(year), Number(month) - 1, Number(day));
        } else {
            return null;
        }

    }

}