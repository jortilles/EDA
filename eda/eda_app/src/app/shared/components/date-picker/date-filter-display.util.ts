import { rangeDateFormats } from './date-picker.index';

/** Shared formatting for the date-picker's own "operator + value" summary badge — used by every
 * consumer (global filter bar, global filter admin dialog, panel filter/column dialogs) so the
 * date/label rules only need to change in one place. */

const NO_VALUE_OPERATORS = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
const SINGLE_VALUE_OPERATORS = ['=', '!=', '>', '<', '>=', '<='];

/** 'yyyy-mm-dd' -> 'dd-mm-yy' */
export function formatDateForDisplay(date: string | null | undefined): string {
    if (!date) return '';
    const [ye, mo, da] = date.split('-');
    return `${da}-${mo}-${ye.slice(2)}`;
}

/** Label for a dynamic range value (e.g. 'thisWeek' -> "Esta semana"), used both standalone
 * (the "Filtros activos" list) and inside getDateFilterValueLabel below. */
export function getDynamicRangeLabel(rangeValue: string): string {
    return rangeDateFormats.find(r => r.value === rangeValue)?.label || rangeValue;
}

/** Operator badge text, e.g. '!=' -> '≠', 'in' -> "Dentro de". */
export function getDateFilterOperatorLabel(operator: string | null | undefined, filterTypesLabels: { value: string, label: string }[]): string {
    if (!operator) return '';
    return filterTypesLabels.find(f => f.value === operator)?.label || operator;
}

/** Value text for the summary badge — a dynamic range label, a single formatted date, a
 * discrete list ("in"/"not_in" with individually picked dates), or a "from - to" pair. */
export function getDateFilterValueLabel(params: {
    operator: string | null | undefined;
    dynamicRangeValue?: string | null;
    value1?: string | string[] | null;
    value2?: string | null;
}): string {
    const { operator, dynamicRangeValue, value1, value2 } = params;
    if (!operator) return '';
    if (NO_VALUE_OPERATORS.includes(operator)) return '';

    if (dynamicRangeValue) return getDynamicRangeLabel(dynamicRangeValue);

    if (!value1) return '';
    if (Array.isArray(value1)) return value1.map(formatDateForDisplay).join(', ');

    if (SINGLE_VALUE_OPERATORS.includes(operator) || !value2) return formatDateForDisplay(value1);

    return `${formatDateForDisplay(value1)} - ${formatDateForDisplay(value2)}`;
}
