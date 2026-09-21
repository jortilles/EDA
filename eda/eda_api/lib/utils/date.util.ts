

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

    public static convertDashboardDate(date: string | Date | null | undefined) {

        // Si no hay fecha, usar la actual (con hora)
        if (!date) {
            return new Date().toISOString();
        }

        // Si es un objeto Date, devolver el ISO completo
        if (date instanceof Date) {
            return date.toISOString();
        }

        // Ya es una cadena (ISO u otro formato existente): dejarla tal cual
        return date;
    }

}