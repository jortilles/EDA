// Send-frequency option lists for the mail-config dialogs.

export const WEEKDAY_OPTIONS = [
  { value: 1, short: 'L', long: $localize`:@@weekdayMonday:Lunes` },
  { value: 2, short: 'M', long: $localize`:@@weekdayTuesday:Martes` },
  { value: 3, short: 'X', long: $localize`:@@weekdayWednesday:Miércoles` },
  { value: 4, short: 'J', long: $localize`:@@weekdayThursday:Jueves` },
  { value: 5, short: 'V', long: $localize`:@@weekdayFriday:Viernes` },
  { value: 6, short: 'S', long: $localize`:@@weekdaySaturday:Sábado` },
  { value: 0, short: 'D', long: $localize`:@@weekdaySunday:Domingo` },
];

export const MONTHLY_ORDINAL_OPTIONS = [
  { value: 'first', label: $localize`:@@ordinalFirst:Primer` },
  { value: 'second', label: $localize`:@@ordinalSecond:Segundo` },
  { value: 'third', label: $localize`:@@ordinalThird:Tercer` },
  { value: 'fourth', label: $localize`:@@ordinalFourth:Cuarto` },
  { value: 'last', label: $localize`:@@ordinalLast:Último` },
];

export const MONTH_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

export function toggleInArray<T>(arr: T[], value: T): void {
  const i = arr.indexOf(value);
  if (i >= 0) arr.splice(i, 1); else arr.push(value);
}
