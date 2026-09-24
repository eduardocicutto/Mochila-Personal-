import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isPushConfigured, sendPushToUser } from '@/lib/push';
import { findDueReminders, getZonedNow, WorkCalendarEntry } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

// A reminder is still sent if the cron runs up to this many minutes late
const WINDOW_MINUTES = 15;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization');
  const query = new URL(request.url).searchParams.get('secret');
  return header === `Bearer ${secret}` || query === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json({ error: 'Notificaciones push no configuradas en el servidor' }, { status: 503 });
  }

  try {
    // Only users with at least one registered device can receive anything
    const users = await prisma.user.findMany({
      where: { pushSubscriptions: { some: {} } },
      include: {
        settings: true,
        reminders: true,
        savedSchedules: true,
        calendarEntries: true,
      },
    });

    let sent = 0;
    for (const user of users) {
      if (user.settings?.vacationMode) continue;

      const now = getZonedNow(user.settings?.timezone || 'America/Argentina/Buenos_Aires');
      const calendarEntries: Record<string, WorkCalendarEntry> = {};
      for (const e of user.calendarEntries) calendarEntries[e.dateStr] = e;

      const due = findDueReminders({
        userId: user.id,
        nowDateStr: now.dateStr,
        nowMinutes: now.minutes,
        reminders: user.reminders,
        calendarEntries,
        schedules: user.savedSchedules.map((s) => ({
          name: s.name,
          startTime: s.startTime,
          active: s.active,
          workDays: JSON.parse(s.workDays || '[]'),
        })),
        windowMinutes: WINDOW_MINUTES,
      });

      for (const reminder of due) {
        // Claim the key first; if it already exists this reminder was sent by an earlier run
        try {
          await prisma.notificationLog.create({ data: { userId: user.id, key: reminder.key } });
        } catch (e) {
          continue;
        }
        const delivered = await sendPushToUser(user.id, {
          title: reminder.title,
          body: reminder.body,
          tag: reminder.key,
        });
        if (delivered > 0) sent++;
      }
    }

    // Keep the log small: nothing older than 30 days is needed for de-duplication
    await prisma.notificationLog.deleteMany({
      where: { sentAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    return NextResponse.json({ success: true, usersChecked: users.length, sent });
  } catch (err) {
    console.error('Reminder cron error:', err);
    return NextResponse.json({ error: 'Error al procesar recordatorios' }, { status: 500 });
  }
}
