

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
    
            // Si no hay fecha, usar la actual
        if (!date) {
            return new Date().toISOString().split("T")[0];
        }

        // Si es un objeto Date
        if (date instanceof Date) {
            return date.toISOString().split("T")[0];
        }

        // Si es una cadena con formato ISO
        if (typeof date === "string" && date.includes("T")) {
            return date.split("T")[0];
        }

        // Si es una cadena simple 
        if (typeof date === "string") {
            return date;
        }

        // Fallback (por si acaso)
        return new Date().toISOString().split("T")[0];
    }

}