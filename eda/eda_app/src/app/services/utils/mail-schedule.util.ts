// Send-frequency option lists for the mail-config dialogs.

export const WEEKDAY_OPTIONS = [
  { value: 1, short: 'L', long: 'Lunes' },
  { value: 2, short: 'M', long: 'Martes' },
  { value: 3, short: 'X', long: 'Miércoles' },
  { value: 4, short: 'J', long: 'Jueves' },
  { value: 5, short: 'V', long: 'Viernes' },
  { value: 6, short: 'S', long: 'Sábado' },
  { value: 0, short: 'D', long: 'Domingo' },
];

export const MONTHLY_ORDINAL_OPTIONS = [
  { value: 'first', label: 'Primer' },
  { value: 'second', label: 'Segundo' },
  { value: 'third', label: 'Tercer' },
  { value: 'fourth', label: 'Cuarto' },
  { value: 'last', label: 'Último' },
];

export const MONTH_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export function toggleInArray<T>(arr: T[], value: T): void {
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1); else arr.push(value);
}
