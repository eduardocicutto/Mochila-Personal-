// Lógica de recordatorios compartida entre la app (alarma con la app abierta)
// y el servidor (notificaciones push con la app cerrada).

export interface Reminder {
  id: string;
  daysBefore: number; // 0 = el mismo día, 1 = un día antes, etc.
  time: string; // HH:MM en hora local del usuario
  enabled: boolean;
}

export interface WorkSchedule {
  name: string;
  workDays: number[];
  startTime: string;
  active: boolean;
}

export interface WorkCalendarEntry {
  isWorkDay: boolean;
  shiftName?: string | null;
  startTime?: string | null;
}

export interface DueReminder {
  key: string;
  reminderId: string;
  workDate: string;
  title: string;
  body: string;
}

export const MAX_DAYS_BEFORE = 7;

export const DEFAULT_REMINDERS: Omit<Reminder, 'id'>[] = [
  { daysBefore: 1, time: '21:00', enabled: true },
  { daysBefore: 0, time: '07:00', enabled: true },
];

export function reminderDaysLabel(daysBefore: number): string {
  if (daysBefore === 0) return 'El mismo día';
  if (daysBefore === 1) return '1 día antes';
  return `${daysBefore} días antes`;
}

// Date strings are YYYY-MM-DD; arithmetic is done in UTC so it never shifts with DST
export function addDaysToDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export function dayOfWeekFromDateStr(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Fecha (YYYY-MM-DD) y minuto del día actuales en la zona horaria indicada. */
export function getZonedNow(timeZone: string, now: Date = new Date()): { dateStr: string; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
  } catch (e) {
    return getZonedNow('America/Argentina/Buenos_Aires', now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return {
    dateStr: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** Un día cargado en el calendario manda; si no, se usa el turno semanal activo que incluya ese día. */
export function resolveWorkDay(
  dateStr: string,
  calendarEntries: Record<string, WorkCalendarEntry>,
  schedules: WorkSchedule[]
): { isWorkDay: boolean; shiftName: string; startTime: string } {
  const entry = calendarEntries[dateStr];
  if (entry) {
    return {
      isWorkDay: !!entry.isWorkDay,
      shiftName: entry.shiftName || 'Turno',
      startTime: entry.startTime || '',
    };
  }
  const dow = dayOfWeekFromDateStr(dateStr);
  const matched = schedules.find((s) => s.active && s.workDays.includes(dow));
  if (matched) {
    return { isWorkDay: true, shiftName: matched.name, startTime: matched.startTime };
  }
  return { isWorkDay: false, shiftName: '', startTime: '' };
}

const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export function buildReminderMessage(
  daysBefore: number,
  workDate: string,
  shiftName: string,
  startTime: string
): { title: string; body: string } {
  const entryText = startTime ? ` Entras a las ${startTime}.` : '';
  if (daysBefore === 0) {
    return {
      title: `☀️ Hoy Trabajas — ${shiftName}`,
      body: `¡Revisa tu mochila antes de salir!${entryText} Abre WorkPacker y chequea tu lista.`,
    };
  }
  if (daysBefore === 1) {
    return {
      title: `🌙 Mañana Trabajas — ${shiftName}`,
      body: `¡Prepara tu mochila esta noche!${entryText} Revisa tu lista de chequeo en WorkPacker.`,
    };
  }
  const [, m, d] = workDate.split('-');
  const weekday = WEEKDAY_NAMES[dayOfWeekFromDateStr(workDate)];
  return {
    title: `📅 Trabajas el ${weekday} ${d}/${m} — ${shiftName}`,
    body: `Faltan ${daysBefore} días.${entryText} Revisa tu lista de chequeo en WorkPacker.`,
  };
}

/**
 * Recordatorios cuya hora de aviso cayó dentro de los últimos `windowMinutes` minutos
 * (incluido el minuto actual). La ventana tolera que el cron corra con demora.
 */
export function findDueReminders(opts: {
  userId: string;
  nowDateStr: string;
  nowMinutes: number;
  reminders: Reminder[];
  calendarEntries: Record<string, WorkCalendarEntry>;
  schedules: WorkSchedule[];
  windowMinutes: number;
}): DueReminder[] {
  const { userId, nowDateStr, nowMinutes, reminders, calendarEntries, schedules, windowMinutes } = opts;
  const due: DueReminder[] = [];

  for (const reminder of reminders) {
    if (!reminder.enabled || !/^\d{2}:\d{2}$/.test(reminder.time)) continue;
    const reminderMinutes = timeToMinutes(reminder.time);

    // The window can cross midnight, so check today's and yesterday's fire time
    for (const dayOffset of [0, -1]) {
      const minutesAgo = nowMinutes - reminderMinutes - dayOffset * 1440;
      if (minutesAgo < 0 || minutesAgo >= windowMinutes) continue;

      const fireDate = addDaysToDateStr(nowDateStr, dayOffset);
      const workDate = addDaysToDateStr(fireDate, reminder.daysBefore);
      const day = resolveWorkDay(workDate, calendarEntries, schedules);
      if (!day.isWorkDay) continue;

      const { title, body } = buildReminderMessage(reminder.daysBefore, workDate, day.shiftName, day.startTime);
      due.push({
        key: `${userId}:${reminder.id}:${workDate}`,
        reminderId: reminder.id,
        workDate,
        title,
        body,
      });
    }
  }

  return due;
}
