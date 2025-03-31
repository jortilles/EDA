

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

    public static convertDashboardDate(date: string) {
        // Modificamos la fecha para solo mostrar YYYY/MM/DD sin la hora
        if (date && date.length > 0) {
            return date.split("T")[0];
        } else {
            return new Date().toISOString().split("T")[0];
        }
    }
}