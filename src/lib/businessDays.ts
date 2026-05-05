function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addBusinessDays(from: Date, n: number): Date {
  const cursor = new Date(from);
  if (n === 0) return cursor;
  const sign = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    cursor.setDate(cursor.getDate() + sign);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return cursor;
}

export function businessDaysBetween(from: Date, to: Date): number {
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (a.getTime() === b.getTime()) return 0;

  const sign = b.getTime() > a.getTime() ? 1 : -1;
  let count = 0;
  const cursor = new Date(a);

  while (cursor.getTime() !== b.getTime()) {
    cursor.setDate(cursor.getDate() + sign);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) count += sign;
  }

  return count;
}

export function formatBusinessDaysLabel(target: Date, now: Date = new Date()): string {
  const days = businessDaysBetween(now, target);
  if (days === 0) {
    const t = startOfDay(target).getTime();
    const n = startOfDay(now).getTime();
    if (t === n) return "Hoy";
    return t > n ? "Hoy" : "Hoy";
  }
  if (days === 1) return "Manana";
  if (days === -1) return "Hace 1 dia habil";
  if (days > 0) return `En ${days} dias habiles`;
  return `Hace ${Math.abs(days)} dias habiles`;
}
