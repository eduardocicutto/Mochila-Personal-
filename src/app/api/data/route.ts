import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DEFAULT_REMINDERS, MAX_DAYS_BEFORE } from '@/lib/reminders';

export async function GET() {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = sessionUser.id;

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    const catalogItems = await prisma.catalogItem.findMany({
      where: { userId },
    });

    const customModulesRaw = await prisma.customModule.findMany({
      where: { userId },
    });

    const savedSchedulesRaw = await prisma.savedSchedule.findMany({
      where: { userId },
    });

    const calendarEntriesRaw = await prisma.calendarEntry.findMany({
      where: { userId },
    });

    // Parse JSON fields safely
    const customModules = customModulesRaw.map((m) => ({
      ...m,
      options: typeof m.options === 'string' ? JSON.parse(m.options) : m.options,
    }));

    const savedSchedules = savedSchedulesRaw.map((s) => ({
      ...s,
      workDays: typeof s.workDays === 'string' ? JSON.parse(s.workDays) : s.workDays,
    }));

    const calendarEntriesMap: Record<string, { isWorkDay: boolean; shiftName: string; startTime: string; endTime: string }> = {};
    calendarEntriesRaw.forEach((e) => {
      calendarEntriesMap[e.dateStr] = {
        isWorkDay: e.isWorkDay,
        shiftName: e.shiftName || '',
        startTime: e.startTime || '',
        endTime: e.endTime || '',
      };
    });

    let scheduleSettings = {
      notifyDayBefore: true,
      nightNotifyTimes: ['21:00'],
      notifySameDay: true,
      morningNotifyTimes: ['07:00'],
      startTime: '08:00',
      endTime: '17:00',
      alarmSound: 'classic',
      alarmVolume: 80,
      alarmVibrate: true,
    };

    if (userSettings?.scheduleSettings) {
      try {
        scheduleSettings = { ...scheduleSettings, ...JSON.parse(userSettings.scheduleSettings) };
      } catch (e) {}
    }

    let reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ daysBefore: 'desc' }, { time: 'asc' }],
    });

    // First load after reminders became their own table: carry over the old night/morning settings
    const settingsJson = (() => {
      try {
        return JSON.parse(userSettings?.scheduleSettings || '{}');
      } catch (e) {
        return {};
      }
    })();
    if (reminders.length === 0 && !settingsJson.remindersMigrated) {
      const legacy = [
        ...scheduleSettings.nightNotifyTimes.map((time) => ({ daysBefore: 1, time, enabled: scheduleSettings.notifyDayBefore })),
        ...scheduleSettings.morningNotifyTimes.map((time) => ({ daysBefore: 0, time, enabled: scheduleSettings.notifySameDay })),
      ];
      const initial = legacy.length > 0 ? legacy : DEFAULT_REMINDERS;
      await prisma.reminder.createMany({ data: initial.map((r) => ({ ...r, userId })) });
      await prisma.userSettings.upsert({
        where: { userId },
        update: { scheduleSettings: JSON.stringify({ ...settingsJson, remindersMigrated: true }) },
        create: { userId, scheduleSettings: JSON.stringify({ remindersMigrated: true }) },
      });
      reminders = await prisma.reminder.findMany({
        where: { userId },
        orderBy: [{ daysBefore: 'desc' }, { time: 'asc' }],
      });
    }

    return NextResponse.json({
      user: sessionUser,
      settings: {
        darkMode: userSettings?.darkMode ?? false,
        vacationMode: userSettings?.vacationMode ?? false,
        scheduleMode: userSettings?.scheduleMode ?? 'weekly',
        activeTab: userSettings?.activeTab ?? 'home',
        scheduleSettings,
      },
      catalogItems,
      customModules,
      savedSchedules,
      calendarEntries: calendarEntriesMap,
      reminders: reminders.map((r) => ({ id: r.id, daysBefore: r.daysBefore, time: r.time, enabled: r.enabled })),
    });
  } catch (err) {
    console.error('Data GET error:', err);
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = sessionUser.id;
    const body = await request.json();
    const { settings, catalogItems, customModules, savedSchedules, calendarEntries, reminders } = body;

    // 1. Update UserSettings
    if (settings) {
      // Keep the migration flag so old night/morning settings are never re-imported as reminders
      const scheduleSettingsJson = JSON.stringify({ ...(settings.scheduleSettings || {}), remindersMigrated: true });
      const timezone = typeof settings.timezone === 'string' && settings.timezone ? { timezone: settings.timezone } : {};
      await prisma.userSettings.upsert({
        where: { userId },
        update: {
          darkMode: settings.darkMode,
          vacationMode: settings.vacationMode,
          scheduleMode: settings.scheduleMode,
          activeTab: settings.activeTab,
          scheduleSettings: scheduleSettingsJson,
          ...timezone,
        },
        create: {
          userId,
          darkMode: settings.darkMode,
          vacationMode: settings.vacationMode,
          scheduleMode: settings.scheduleMode,
          activeTab: settings.activeTab,
          scheduleSettings: scheduleSettingsJson,
          ...timezone,
        },
      });
    }

    // 2. Update CatalogItems
    if (Array.isArray(catalogItems)) {
      await prisma.catalogItem.deleteMany({ where: { userId } });
      for (const item of catalogItems) {
        await prisma.catalogItem.create({
          data: {
            id: String(item.id),
            userId,
            name: item.name,
            category: item.category,
            icon: item.icon,
            gradientClass: item.gradientClass,
            packed: !!item.packed,
          },
        });
      }
    }

    // 3. Update CustomModules
    if (Array.isArray(customModules)) {
      await prisma.customModule.deleteMany({ where: { userId } });
      for (const mod of customModules) {
        await prisma.customModule.create({
          data: {
            id: String(mod.id),
            userId,
            title: mod.title,
            subtitle: mod.subtitle || '',
            icon: mod.icon,
            colorClass: mod.colorClass,
            enabled: !!mod.enabled,
            selectedOption: mod.selectedOption || '',
            options: JSON.stringify(mod.options || []),
          },
        });
      }
    }

    // 4. Update SavedSchedules
    if (Array.isArray(savedSchedules)) {
      await prisma.savedSchedule.deleteMany({ where: { userId } });
      for (const sch of savedSchedules) {
        await prisma.savedSchedule.create({
          data: {
            id: String(sch.id),
            userId,
            name: sch.name,
            workDays: JSON.stringify(sch.workDays || []),
            startTime: sch.startTime,
            endTime: sch.endTime,
            colorClass: sch.colorClass,
            active: !!sch.active,
          },
        });
      }
    }

    // 5. Update CalendarEntries
    if (calendarEntries && typeof calendarEntries === 'object') {
      await prisma.calendarEntry.deleteMany({ where: { userId } });
      const entries = Object.entries(calendarEntries) as [
        string,
        { isWorkDay: boolean; shiftName?: string; startTime?: string; endTime?: string }
      ][];

      for (const [dateStr, entry] of entries) {
        await prisma.calendarEntry.create({
          data: {
            userId,
            dateStr,
            isWorkDay: !!entry.isWorkDay,
            shiftName: entry.shiftName || '',
            startTime: entry.startTime || '',
            endTime: entry.endTime || '',
          },
        });
      }
    }

    // 6. Update Reminders
    if (Array.isArray(reminders)) {
      await prisma.reminder.deleteMany({ where: { userId } });
      for (const rem of reminders) {
        const daysBefore = Math.min(MAX_DAYS_BEFORE, Math.max(0, Math.round(Number(rem.daysBefore) || 0)));
        const time = /^\d{2}:\d{2}$/.test(rem.time) ? rem.time : '21:00';
        await prisma.reminder.create({
          data: {
            id: String(rem.id),
            userId,
            daysBefore,
            time,
            enabled: !!rem.enabled,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Data POST error:', err);
    return NextResponse.json({ error: 'Error al guardar datos' }, { status: 500 });
  }
}
