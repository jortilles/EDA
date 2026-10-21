import { SelectItem } from "primeng/api";

export const rangeDateFormats: Array<SelectItem> = [
        // Days
        { label: $localize`:@@DatePickerBeforeYesterday:Antes de Ayer`, value: 'beforeYesterday' },
        { label: $localize`:@@DatePickerYesterday:Ayer`, value: 'yesterday' },
        { label: $localize`:@@DatePickerToday:Hoy`, value: 'today' },
        { label: $localize`:@@DatePickerTomorrow:Mañana`, value: 'tomorrow' },
        { label: $localize`:@@DatePickerPastTomorrow:Pasado mañana`, value: 'pastTomorrow' },

        // Weeks
        { label: $localize`:@@DatePickerLastWeekFull:La semana pasada completa`, value: 'pastWeekFull' },
        { label: $localize`:@@DatePickerLastWeek:La semana pasada (hasta equivalente a hoy)`, value: 'pastWeek' },
        { label: $localize`:@@DatePickerWeekFull:Esta semana al completo`, value: 'weekStartFull' },
        { label: $localize`:@@DatePickerWeek:Esta semana (hasta hoy)`, value: 'weekStart' },
        { label: $localize`:@@DatePickerNextWeek:Próxima semana`, value: 'nextWeek' },

        // Months
        { label: $localize`:@@DatePickerLastMonthFull:El mes pasado completo`, value: 'pastMonthFull' },
        { label: $localize`:@@DatePickerLastMonth:El mes pasado (hasta equivalente a hoy)`, value: 'pastMonth' },
        { label: $localize`:@@DatePickerMonthFull:Este mes completo`, value: 'monthStartFull' },
        { label: $localize`:@@DatePickerMonth:Este mes (hasta hoy)`, value: 'monthStart' },
        { label: $localize`:@@DatePickerNextMonth:Próximo mes`, value: 'nextMonth' },
        { label: $localize`:@@DatePickerMonthPreviousYearFull:Éste mes al completo del año pasado`, value: 'monthFullPreviousYear' },
        { label: $localize`:@@DatePickerMonthPreviousYear:Este mes del año pasado (hasta equivalente a hoy)`, value: 'monthStartPreviousYear' },

        // Quarters
        { label: $localize`:@@DatePickerLastQuarter:Último trimestre`, value: 'lastQuarter' },
        { label: $localize`:@@DatePickerThisQuarter:Este trimestre`, value: 'quarterStart' },
        { label: $localize`:@@DatePickerNextQuarter:Próximo trimestre`, value: 'nextQuarter' },

        // Years
        { label: $localize`:@@DatePickerYearPreviousYearFull:El año pasado, completo`, value: 'yearStartPreviousYearFull' },
        { label: $localize`:@@DatePickerYearPreviousYear:El año pasado (hasta equivalente a hoy)`, value: 'yearStartPreviousYear' },
        { label: $localize`:@@DatePickerYearFull:Este año al completo`, value: 'yearStartFull' },
        { label: $localize`:@@DatePickerYear:Este año (hasta hoy)`, value: 'yearStart' },
        { label: $localize`:@@DatePickerNextYear:Próximo año`, value: 'nextYear' },

        // Last N days
        { label: $localize`:@@DatePickerLast3:Últimos 3 días`, value: 'last3' },
        { label: $localize`:@@DatePickerNext3:Próximos 3 días`, value: 'next3' },
        { label: $localize`:@@DatePickerLast7:Últimos 7 días`, value: 'last7' },
        { label: $localize`:@@DatePickerNext7:Próximos 7 días`, value: 'next7' },
        { label: $localize`:@@DatePickerLast15:Últimos 15 días`, value: 'last15' },
        { label: $localize`:@@DatePickerNext15:Próximos 15 días`, value: 'next15' },
        { label: $localize`:@@DatePickerLast30:Últimos 30 días`, value: 'last30' },
        { label: $localize`:@@DatePickerNext30:Próximos 30 días`, value: 'next30' },
        { label: $localize`:@@DatePickerLast60:Últimos 60 días`, value: 'last60' },
        { label: $localize`:@@DatePickerNext60:Próximos 60 días`, value: 'next60' },
        { label: $localize`:@@DatePickerLast90:Últimos 90 días`, value: 'last90' },
        { label: $localize`:@@DatePickerNext90:Próximos 90 días`, value: 'next90' },
        { label: $localize`:@@DatePickerLast120:Últimos 120 días`, value: 'last120' },
        { label: $localize`:@@DatePickerNext120:Próximos 120 días`, value: 'next120' },
        { label: $localize`:@@DatePickerLast365:Últimos 365 días`, value: 'last365' },
        { label: $localize`:@@DatePickerNext365:Próximos 365 días`, value: 'next365' },

        // General Ranges
        { label: $localize`:@@DatePickerAll:Todas`, value: 'all' },
        { label: $localize`:@@DatePickerNull:Fecha nula`, value: 'null' },
        { label: $localize`:@@DatePickerBeforeTodayIncluded:Todo hasta hoy`, value: 'beforeTodayIncluded' },

        // Custom date
        { label: $localize`:@@DatePickerCustomDate:Seleccionar fecha`, value: 'customDate' },
];