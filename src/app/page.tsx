'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { playAlarmSound, stopAlarmSound, previewAlarmSound } from '@/lib/audio';

// Interfaces
interface CatalogItem {
  id: string | number;
  name: string;
  category: string;
  icon: string;
  gradientClass: string;
  packed: boolean;
}

interface CustomModuleOption {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
}

interface CustomModule {
  id: string | number;
  title: string;
  subtitle: string;
  icon: string;
  colorClass: string;
  enabled: boolean;
  selectedOption: string;
  options: CustomModuleOption[];
}

interface SavedSchedule {
  id: string | number;
  name: string;
  workDays: number[];
  startTime: string;
  endTime: string;
  colorClass: string;
  active: boolean;
}

interface CalendarEntry {
  isWorkDay: boolean;
  shiftName: string;
  startTime: string;
  endTime: string;
}

interface ScheduleSettings {
  notifyDayBefore: boolean;
  nightNotifyTimes: string[];
  notifySameDay: boolean;
  morningNotifyTimes: string[];
  startTime: string;
  endTime: string;
  alarmSound: string;
  alarmVolume: number;
  alarmVibrate: boolean;
}

export default function WorkPackerApp() {
  const router = useRouter();

  // Loading & Auth State
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);

  // App Main States
  const [darkMode, setDarkMode] = useState(false);
  const [vacationMode, setVacationMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'items' | 'schedule' | 'settings'>('home');
  const [scheduleMode, setScheduleMode] = useState<'weekly' | 'calendar'>('weekly');
  const [itemFilterCategory, setItemFilterCategory] = useState('all');

  // Alarm & Toast States
  const [toast, setToast] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [activeAlarmData, setActiveAlarmData] = useState<{ title: string; message: string } | null>(null);
  const [firedAlarmKeys, setFiredAlarmKeys] = useState<Record<string, number>>({});

  // Modals & Form States
  const [showItemModal, setShowItemModal] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [formItem, setFormItem] = useState<CatalogItem>({
    id: '',
    name: '',
    category: 'essential',
    icon: 'fa-solid fa-key',
    gradientClass: 'grad-sky',
    packed: false,
  });

  const [showCustomModuleModal, setShowCustomModuleModal] = useState(false);
  const [isEditingCustomModule, setIsEditingCustomModule] = useState(false);
  const [formCustomModule, setFormCustomModule] = useState<CustomModule>({
    id: '',
    title: '',
    subtitle: '',
    icon: 'fa-solid fa-dumbbell',
    colorClass: 'grad-rose',
    enabled: true,
    selectedOption: '',
    options: [
      { id: 'opt_1', name: 'Opción 1', icon: 'fa-solid fa-check', enabled: true },
      { id: 'opt_2', name: 'Opción 2', icon: 'fa-solid fa-check', enabled: true },
    ],
  });

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [formSchedule, setFormSchedule] = useState<SavedSchedule>({
    id: '',
    name: '',
    workDays: [1, 2, 3, 4, 5],
    startTime: '08:00',
    endTime: '17:00',
    colorClass: 'grad-sky',
    active: true,
  });

  const [calCurrentDate, setCalCurrentDate] = useState(new Date());
  const [calendarEntries, setCalendarEntries] = useState<Record<string, CalendarEntry>>({});
  const [showCalModal, setShowCalModal] = useState(false);
  const [calModalTitle, setCalModalTitle] = useState('');
  const [selectedCalDateStr, setSelectedCalDateStr] = useState('');
  const [calDayForm, setCalDayForm] = useState<CalendarEntry>({
    isWorkDay: true,
    shiftName: 'Turno Regular',
    startTime: '08:00',
    endTime: '17:00',
  });

  // User Credentials Change Form State (in Settings tab)
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
  });
  const [accountStatus, setAccountStatus] = useState({ success: '', error: '', loading: false });

  // Catalog, Modules & Schedules
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [customModules, setCustomModules] = useState<CustomModule[]>([]);
  const [savedSchedules, setSavedSchedules] = useState<SavedSchedule[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSettings>({
    notifyDayBefore: true,
    nightNotifyTimes: ['21:00'],
    notifySameDay: true,
    morningNotifyTimes: ['07:00'],
    startTime: '08:00',
    endTime: '17:00',
    alarmSound: 'classic',
    alarmVolume: 80,
    alarmVibrate: true,
  });

  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Constants & Presets
  const weekDays = [
    { short: 'D', name: 'Domingo' },
    { short: 'L', name: 'Lunes' },
    { short: 'M', name: 'Martes' },
    { short: 'X', name: 'Miércoles' },
    { short: 'J', name: 'Jueves' },
    { short: 'V', name: 'Viernes' },
    { short: 'S', name: 'Sábado' },
  ];

  const gradientPresets = [
    { name: 'Melocotón', class: 'grad-peach' },
    { name: 'Menta', class: 'grad-mint' },
    { name: 'Cielo', class: 'grad-sky' },
    { name: 'Lavanda', class: 'grad-lavender' },
    { name: 'Rosa Pastel', class: 'grad-rose' },
    { name: 'Ámbar', class: 'grad-amber' },
    { name: 'Verde Agua', class: 'grad-teal' },
  ];

  const customModuleIcons = [
    'fa-solid fa-dumbbell',
    'fa-solid fa-shirt',
    'fa-solid fa-laptop',
    'fa-solid fa-umbrella',
    'fa-solid fa-headphones',
    'fa-solid fa-notes-medical',
    'fa-solid fa-dog',
    'fa-solid fa-bicycle',
    'fa-solid fa-glasses',
    'fa-solid fa-briefcase',
    'fa-solid fa-shield-halved',
    'fa-solid fa-book',
    'fa-solid fa-utensils',
    'fa-solid fa-screwdriver-wrench',
  ];

  const iconList = [
    'fa-solid fa-kitchen-set',
    'fa-solid fa-bottle-droplet',
    'fa-solid fa-fire-burner',
    'fa-solid fa-box-archive',
    'fa-solid fa-spoon',
    'fa-solid fa-screwdriver-wrench',
    'fa-solid fa-wrench',
    'fa-solid fa-microchip',
    'fa-solid fa-oil-can',
    'fa-solid fa-plug',
    'fa-solid fa-key',
    'fa-solid fa-id-card',
    'fa-solid fa-laptop',
    'fa-solid fa-charging-station',
    'fa-solid fa-bottle-water',
    'fa-solid fa-mug-hot',
    'fa-solid fa-headphones',
    'fa-solid fa-umbrella',
    'fa-solid fa-shirt',
    'fa-solid fa-glasses',
    'fa-solid fa-wallet',
    'fa-solid fa-notes-medical',
    'fa-solid fa-bag-shopping',
  ];

  const alarmSoundOptions = [
    { id: 'classic', name: 'Clásica', icon: 'fa-solid fa-bell', desc: 'Tono de alarma tradicional' },
    { id: 'gentle', name: 'Suave', icon: 'fa-solid fa-cloud', desc: 'Tono relajado y progresivo' },
    { id: 'urgent', name: 'Urgente', icon: 'fa-solid fa-triangle-exclamation', desc: 'Tono fuerte y repetitivo' },
    { id: 'bell', name: 'Campana', icon: 'fa-solid fa-bell-concierge', desc: 'Campana metálica' },
    { id: 'digital', name: 'Digital', icon: 'fa-solid fa-robot', desc: 'Tono electrónico moderno' },
  ];

  // Haptic feedback
  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(35);
      } catch (e) {}
    }
  };

  // Toast Helper
  const showToastMsg = (title: string, message: string) => {
    setToast({ visible: true, title, message });
    setTimeout(() => {
      setToast({ visible: false, title: '', message: '' });
    }, 4000);
  };

  // Load Initial Data from API & LocalStorage Fallback
  useEffect(() => {
    async function loadData() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/login');
          return;
        }

        const authData = await authRes.json();
        if (!authData.authenticated || !authData.user) {
          router.push('/login');
          return;
        }

        setCurrentUser(authData.user);
        setAccountForm({ username: authData.user.username, password: '' });

        // Fetch DB Data
        const dataRes = await fetch('/api/data');
        if (dataRes.ok) {
          const dbData = await dataRes.json();
          if (dbData.settings) {
            setDarkMode(!!dbData.settings.darkMode);
            setVacationMode(!!dbData.settings.vacationMode);
            setScheduleMode(dbData.settings.scheduleMode || 'weekly');
            setActiveTab(dbData.settings.activeTab || 'home');
            if (dbData.settings.scheduleSettings) {
              setSchedule((prev) => ({ ...prev, ...dbData.settings.scheduleSettings }));
            }
          }
          if (dbData.catalogItems) setCatalogItems(dbData.catalogItems);
          if (dbData.customModules) setCustomModules(dbData.customModules);
          if (dbData.savedSchedules) setSavedSchedules(dbData.savedSchedules);
          if (dbData.calendarEntries) setCalendarEntries(dbData.calendarEntries);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
      const savedFired = localStorage.getItem('workpacker_fired_alarms');
      if (savedFired) {
        try {
          setFiredAlarmKeys(JSON.parse(savedFired));
        } catch (e) {}
      }
    }

    loadData();
  }, [router]);

  // Sync to Database & LocalStorage on State Change
  const syncToDatabase = async (overrideData?: any) => {
    if (!currentUser) return;
    try {
      const payload = overrideData || {
        settings: {
          darkMode,
          vacationMode,
          scheduleMode,
          activeTab,
          scheduleSettings: schedule,
        },
        catalogItems,
        customModules,
        savedSchedules,
        calendarEntries,
      };

      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Failed to sync to database:', e);
    }
  };

  // Alarm engine loop
  useEffect(() => {
    if (loading || !currentUser) return;

    const checkAlarms = () => {
      if (vacationMode) return;
      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Calculate upcoming alarms
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const formatDateStr = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const tStr = formatDateStr(today);
      const tmStr = formatDateStr(tomorrow);

      let tomorrowIsWorkDay = false;
      let tomorrowShiftName = '';

      if (calendarEntries[tmStr]) {
        tomorrowIsWorkDay = !!calendarEntries[tmStr].isWorkDay;
        tomorrowShiftName = calendarEntries[tmStr].shiftName || 'Turno';
      } else {
        const activeSchedules = savedSchedules.filter((s) => s.active);
        const matched = activeSchedules.find((s) => s.workDays.includes(tomorrow.getDay()));
        if (matched) {
          tomorrowIsWorkDay = true;
          tomorrowShiftName = matched.name;
        }
      }

      let todayIsWorkDay = false;
      let todayShiftName = '';
      let todayStartTime = '';

      if (calendarEntries[tStr]) {
        todayIsWorkDay = !!calendarEntries[tStr].isWorkDay;
        todayShiftName = calendarEntries[tStr].shiftName || 'Turno';
        todayStartTime = calendarEntries[tStr].startTime || '';
      } else {
        const activeSchedules = savedSchedules.filter((s) => s.active);
        const matched = activeSchedules.find((s) => s.workDays.includes(today.getDay()));
        if (matched) {
          todayIsWorkDay = true;
          todayShiftName = matched.name;
          todayStartTime = matched.startTime;
        }
      }

      const alarms: { id: string; date: string; time: string; title: string; message: string }[] = [];

      if (tomorrowIsWorkDay && schedule.notifyDayBefore) {
        schedule.nightNotifyTimes.forEach((time, idx) => {
          alarms.push({
            id: `night_${idx}_${tStr}`,
            date: tStr,
            time: time,
            title: `🌙 Mañana Trabajas — ${tomorrowShiftName}`,
            message: '¡Prepara tu mochila esta noche! Revisa tu lista de chequeo en WorkPacker.',
          });
        });
      }

      if (todayIsWorkDay && schedule.notifySameDay) {
        schedule.morningNotifyTimes.forEach((time, idx) => {
          const entryText = todayStartTime ? ` Entras a las ${todayStartTime}.` : '';
          alarms.push({
            id: `morning_${idx}_${tStr}`,
            date: tStr,
            time: time,
            title: `☀️ Hoy Trabajas — ${todayShiftName}`,
            message: `¡Revisa tu mochila antes de salir!${entryText} Abre WorkPacker y chequea tu lista.`,
          });
        });
      }

      alarms.forEach((alarm) => {
        if (alarm.time === currentTimeStr && alarm.date === todayStr && !firedAlarmKeys[alarm.id]) {
          const newFired = { ...firedAlarmKeys, [alarm.id]: Date.now() };
          setFiredAlarmKeys(newFired);
          if (typeof window !== 'undefined') {
            localStorage.setItem('workpacker_fired_alarms', JSON.stringify(newFired));
          }

          // Trigger Alarm Audio & Modal
          playAlarmSound(schedule.alarmSound, schedule.alarmVolume);
          setIsAlarmPlaying(true);

          if (schedule.alarmVibrate && navigator.vibrate) {
            navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
          }

          if (Notification.permission === 'granted') {
            try {
              new Notification(alarm.title, {
                body: alarm.message,
                icon: '/icon-192.png',
              });
            } catch (e) {}
          }

          setActiveAlarmData({ title: alarm.title, message: alarm.message });
          setShowAlarmModal(true);
          showToastMsg(alarm.title, alarm.message);
        }
      });
    };

    const interval = setInterval(checkAlarms, 30000);
    checkAlarms();

    return () => clearInterval(interval);
  }, [loading, currentUser, vacationMode, calendarEntries, savedSchedules, schedule, firedAlarmKeys]);

  // Request Notification Permission
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToastMsg('No Soportado', 'Tu navegador no soporta notificaciones de escritorio.');
      return;
    }

    try {
      const res = await Notification.requestPermission();
      setNotificationPermission(res);
      if (res === 'granted') {
        showToastMsg('Notificaciones Activas ✅', '¡Perfecto! Ahora recibirás tus alarmas de trabajo.');
      } else {
        showToastMsg('Permiso Denegado', 'Las notificaciones están bloqueadas en tu navegador.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handlers for Items
  const toggleItemPacked = (id: string | number) => {
    triggerHaptic();
    const updated = catalogItems.map((item) =>
      item.id === id ? { ...item, packed: !item.packed } : item
    );
    setCatalogItems(updated);
    syncToDatabase({ catalogItems: updated });
  };

  const resetChecklist = () => {
    triggerHaptic();
    const updated = catalogItems.map((item) => ({ ...item, packed: false }));
    setCatalogItems(updated);
    syncToDatabase({ catalogItems: updated });
    showToastMsg('Lista Reiniciada', 'Se desmarcaron todos los objetos.');
  };

  const saveItem = () => {
    if (!formItem.name.trim()) {
      showToastMsg('Campo Vacío', 'Por favor escribe el nombre del objeto.');
      return;
    }

    let updated: CatalogItem[];
    if (isEditingItem) {
      updated = catalogItems.map((i) => (i.id === formItem.id ? { ...formItem } : i));
      showToastMsg('Guardado', 'El objeto ha sido actualizado.');
    } else {
      const newItem = { ...formItem, id: Date.now().toString() };
      updated = [...catalogItems, newItem];
      showToastMsg('Agregado', 'Nuevo objeto añadido a tu lista.');
    }

    setCatalogItems(updated);
    syncToDatabase({ catalogItems: updated });
    setShowItemModal(false);
  };

  const deleteItem = (id: string | number) => {
    const updated = catalogItems.filter((i) => i.id !== id);
    setCatalogItems(updated);
    syncToDatabase({ catalogItems: updated });
    showToastMsg('Eliminado', 'Se ha eliminado el objeto.');
  };

  // Handlers for Custom Modules
  const selectModuleOption = (modId: string | number, optId: string) => {
    triggerHaptic();
    const updated = customModules.map((mod) =>
      mod.id === modId ? { ...mod, selectedOption: optId } : mod
    );
    setCustomModules(updated);
    syncToDatabase({ customModules: updated });
  };

  const saveCustomModule = () => {
    if (!formCustomModule.title.trim()) {
      showToastMsg('Campo requerido', 'Ingresa el título del módulo.');
      return;
    }

    let updated: CustomModule[];
    if (isEditingCustomModule) {
      updated = customModules.map((m) => (m.id === formCustomModule.id ? { ...formCustomModule } : m));
      showToastMsg('Módulo Actualizado', 'Los cambios se han guardado correctamente.');
    } else {
      const newMod = {
        ...formCustomModule,
        id: `mod_${Date.now()}`,
        selectedOption: formCustomModule.options[0]?.id || '',
      };
      updated = [...customModules, newMod];
      showToastMsg('Módulo Creado', 'Tus opciones ya están disponibles como categorías.');
    }

    setCustomModules(updated);
    syncToDatabase({ customModules: updated });
    setShowCustomModuleModal(false);
  };

  const deleteCustomModule = (id: string | number) => {
    const updated = customModules.filter((m) => m.id !== id);
    setCustomModules(updated);
    syncToDatabase({ customModules: updated });
    showToastMsg('Eliminado', 'Se eliminó el módulo personalizado.');
  };

  // Handlers for Weekly Schedules
  const toggleScheduleActive = (id: string | number) => {
    const updated = savedSchedules.map((sch) => {
      if (sch.id === id) {
        const newActive = !sch.active;
        if (newActive) {
          setSchedule((prev) => ({ ...prev, startTime: sch.startTime, endTime: sch.endTime }));
        }
        return { ...sch, active: newActive };
      }
      return sch;
    });
    setSavedSchedules(updated);
    syncToDatabase({ savedSchedules: updated });
  };

  const saveScheduleForm = () => {
    if (!formSchedule.name.trim()) {
      showToastMsg('Campo Requerido', 'Por favor ingresa un nombre para el turno.');
      return;
    }

    let updated: SavedSchedule[];
    if (isEditingSchedule) {
      updated = savedSchedules.map((s) => (s.id === formSchedule.id ? { ...formSchedule } : s));
      showToastMsg('Turno Actualizado', 'El turno ha sido modificado.');
    } else {
      const newSch = { ...formSchedule, id: Date.now().toString(), active: true };
      updated = [...savedSchedules, newSch];
      showToastMsg('Turno Creado', 'Se agregó el nuevo turno a tu lista.');
    }

    setSavedSchedules(updated);
    syncToDatabase({ savedSchedules: updated });
    resetScheduleForm();
  };

  const resetScheduleForm = () => {
    setIsEditingSchedule(false);
    setFormSchedule({
      id: '',
      name: '',
      workDays: [1, 2, 3, 4, 5],
      startTime: '08:00',
      endTime: '17:00',
      colorClass: 'grad-sky',
      active: true,
    });
  };

  const deleteSchedule = (id: string | number) => {
    const updated = savedSchedules.filter((s) => s.id !== id);
    setSavedSchedules(updated);
    syncToDatabase({ savedSchedules: updated });
    showToastMsg('Turno Eliminado', 'Se ha borrado el turno.');
  };

  // Calendar Helpers & Handlers
  const getCalMonthYearLabel = () => {
    const options: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    return calCurrentDate.toLocaleDateString('es-ES', options);
  };

  const changeCalMonth = (delta: number) => {
    setCalCurrentDate(new Date(calCurrentDate.getFullYear(), calCurrentDate.getMonth() + delta, 1));
  };

  const getCalendarGridDays = () => {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const grid = [];
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const pMonth = month === 0 ? 12 : month;
      const pYear = month === 0 ? year - 1 : year;
      const dateStr = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dayNum: d,
        dateStr: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        entry: calendarEntries[dateStr] || null,
      });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dayNum: d,
        dateStr: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        entry: calendarEntries[dateStr] || null,
      });
    }

    const remaining = (7 - (grid.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nMonth = month === 11 ? 1 : month + 2;
      const nYear = month === 11 ? year + 1 : year;
      const dateStr = `${nYear}-${String(nMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dayNum: d,
        dateStr: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        entry: calendarEntries[dateStr] || null,
      });
    }

    return grid;
  };

  const applyWeeklySchedulesToCalendarMonth = () => {
    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const activeSchedules = savedSchedules.filter((s) => s.active);

    const newEntries: Record<string, CalendarEntry> = { ...calendarEntries };

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const dayOfWeek = dateObj.getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      const matchedSchedule = activeSchedules.find((s) => s.workDays.includes(dayOfWeek));
      if (matchedSchedule) {
        newEntries[dateStr] = {
          isWorkDay: true,
          shiftName: matchedSchedule.name,
          startTime: matchedSchedule.startTime,
          endTime: matchedSchedule.endTime,
        };
      } else {
        newEntries[dateStr] = {
          isWorkDay: false,
          shiftName: '',
          startTime: '',
          endTime: '',
        };
      }
    }

    setCalendarEntries(newEntries);
    syncToDatabase({ calendarEntries: newEntries });
    showToastMsg('Calendario Actualizado', 'Se aplicaron los turnos semanales a todo el mes.');
  };

  const openCalDayModal = (day: { dateStr: string; dayNum: number; isCurrentMonth: boolean }) => {
    if (!day.isCurrentMonth) return;
    setSelectedCalDateStr(day.dateStr);
    const existing = calendarEntries[day.dateStr];
    setCalDayForm(
      existing
        ? { ...existing }
        : {
            isWorkDay: true,
            shiftName: 'Turno Regular',
            startTime: '08:00',
            endTime: '17:00',
          }
    );
    setCalModalTitle(`Ajustar Día (${day.dayNum})`);
    setShowCalModal(true);
  };

  const saveCalDayEntry = () => {
    if (selectedCalDateStr) {
      const newEntries = { ...calendarEntries, [selectedCalDateStr]: { ...calDayForm } };
      setCalendarEntries(newEntries);
      syncToDatabase({ calendarEntries: newEntries });
      showToastMsg('Día Configurado', 'Se guardaron los cambios para este día.');
    }
    setShowCalModal(false);
  };

  // Calculated Checklist Filtering
  const getTodayFormatted = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
    const today = new Date().toLocaleDateString('es-ES', options);
    return today.charAt(0).toUpperCase() + today.slice(1);
  };

  const isWorkDayToday = () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const dayOfWeek = today.getDay();

    if (calendarEntries[dateStr] !== undefined) {
      return !!calendarEntries[dateStr].isWorkDay;
    }

    const activeSchedules = savedSchedules.filter((s) => s.active);
    return activeSchedules.some((s) => s.workDays.includes(dayOfWeek));
  };

  const getFilteredItems = () => {
    return catalogItems.filter((item) => {
      if (item.category === 'essential') return true;

      let matches = false;
      customModules.forEach((mod) => {
        if (mod.enabled && mod.selectedOption) {
          const sel = mod.selectedOption;
          if (sel === item.category) matches = true;
          if (sel === 'moto' && (item.category === 'tools_moto' || item.category === 'tools')) matches = true;
          if (sel === 'electronics' && (item.category === 'tools_elec' || item.category === 'tools')) matches = true;
          if (sel === 'cook' && item.category === 'cook') matches = true;
          if (sel === 'tupperware' && item.category === 'tupperware') matches = true;
        }
      });

      return matches;
    });
  };

  const getPackedCount = () => getFilteredItems().filter((i) => i.packed).length;
  const getPackedPercentage = () => {
    const total = getFilteredItems().length;
    if (total === 0) return 0;
    return Math.round((getPackedCount() / total) * 100);
  };

  const getCategoryLabel = (catId: string) => {
    switch (catId) {
      case 'essential':
        return 'Esencial (Siempre)';
      case 'cook':
        return 'Si voy a Cocinar';
      case 'tupperware':
        return 'Si llevo Vianda';
      case 'tools_moto':
        return 'Herramienta Moto';
      case 'tools_elec':
        return 'Herramienta Electrónica';
      case 'tools':
        return 'Herramientas Generales';
      default: {
        for (const mod of customModules) {
          const opt = (mod.options || []).find((o) => o.id === catId);
          if (opt) return `${mod.title}: ${opt.name}`;
        }
        return 'General';
      }
    }
  };

  const getAllCategories = () => {
    const categories = [
      { id: 'essential', name: 'Esencial (Siempre llevar)' },
      { id: 'cook', name: 'Solo si voy a COCINAR allá' },
      { id: 'tupperware', name: 'Solo si llevo VIANDA/COMIDA' },
      { id: 'tools_moto', name: 'Herramienta para MOTO' },
      { id: 'tools_elec', name: 'Herramienta para ELECTRÓNICA' },
      { id: 'tools', name: 'Herramienta GENERAL' },
    ];

    customModules.forEach((mod) => {
      if (mod.enabled && mod.options) {
        mod.options.forEach((opt) => {
          if (opt.enabled !== false) {
            categories.push({
              id: opt.id,
              name: `${mod.title}: ${opt.name}`,
            });
          }
        });
      }
    });

    return categories;
  };

  // Export / Import Backup JSON
  const exportData = () => {
    triggerHaptic();
    const backup = {
      catalogItems,
      customModules,
      savedSchedules,
      calendarEntries,
      schedule,
      darkMode,
      vacationMode,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `WorkPacker_Copia_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToastMsg('Copia Creada 💾', 'Se descargó la copia de seguridad correctamente.');
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.catalogItems) setCatalogItems(data.catalogItems);
        if (data.customModules) setCustomModules(data.customModules);
        if (data.savedSchedules) setSavedSchedules(data.savedSchedules);
        if (data.calendarEntries) setCalendarEntries(data.calendarEntries);
        if (data.schedule) setSchedule(data.schedule);
        if (data.darkMode !== undefined) setDarkMode(data.darkMode);
        if (data.vacationMode !== undefined) setVacationMode(data.vacationMode);
        syncToDatabase(data);
        triggerHaptic();
        showToastMsg('Restauración Exitosa 🎉', 'Todos tus datos y listas han sido cargados.');
      } catch (err) {
        showToastMsg('Error de Archivo', 'El archivo seleccionado no es válido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Update Account Credentials (in Settings Tab)
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountStatus({ success: '', error: '', loading: true });

    try {
      const res = await fetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newUsername: accountForm.username,
          newPassword: accountForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setAccountStatus({ success: '', error: data.error || 'Error al actualizar', loading: false });
        return;
      }

      setAccountStatus({
        success: '¡Credenciales actualizadas exitosamente!',
        error: '',
        loading: false,
      });

      if (data.user) {
        setCurrentUser(data.user);
      }
      setAccountForm((prev) => ({ ...prev, password: '' }));
      showToastMsg('Cuenta Actualizada 👤', 'Tu nombre de usuario y contraseña han sido modificados.');
    } catch (err) {
      setAccountStatus({ success: '', error: 'Error de conexión con el servidor', loading: false });
    }
  };

  // Logout
  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="w-full max-w-md h-[100vh] md:h-[840px] bg-slate-50 md:rounded-3xl shadow-2xl flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Cargando WorkPacker...</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full max-w-md h-[100vh] md:h-[840px] bg-slate-50 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative border border-slate-200/80 ${
        darkMode ? 'dark-mode' : ''
      }`}
    >
      {/* Header */}
      <header className="glass-header px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <i className="fa-solid fa-briefcase text-lg"></i>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">WorkPacker</h1>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                @{currentUser?.username}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{getTodayFormatted()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Dark mode button */}
          <button
            onClick={() => {
              setDarkMode(!darkMode);
              syncToDatabase({ settings: { darkMode: !darkMode, vacationMode, scheduleMode, activeTab, scheduleSettings: schedule } });
              triggerHaptic();
            }}
            title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              darkMode ? 'bg-slate-800 text-amber-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <i className={darkMode ? 'fa-solid fa-sun text-sm' : 'fa-solid fa-moon text-sm'}></i>
          </button>

          {/* Settings button */}
          <button
            onClick={() => setActiveTab('settings')}
            title="Ajustes"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              activeTab === 'settings'
                ? 'bg-blue-100 text-blue-600'
                : darkMode
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>

          {/* Alarm test button */}
          <button
            onClick={() => {
              requestNotificationPermission().then(() => {
                const cookMod = customModules.find((m) => m.id === 'mod_cooking' || m.title.includes('Cocina'));
                const isCooking = cookMod && cookMod.enabled && cookMod.selectedOption === 'cook';
                const text = isCooking
                  ? 'Recordatorio: Mañana trabajas. No olvides la sartén, el salero e ingredientes.'
                  : 'Recordatorio: Mañana trabajas. Prepara tu vianda y elementos esenciales.';

                playAlarmSound(schedule.alarmSound, schedule.alarmVolume);
                setIsAlarmPlaying(true);
                setActiveAlarmData({ title: '🔔 WorkPacker - Prueba', message: text });
                setShowAlarmModal(true);
                showToastMsg('🔔 WorkPacker - Prueba', text);
              });
            }}
            title="Probar notificación y alarma"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <i className="fa-regular fa-bell text-sm"></i>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="absolute top-16 left-4 right-4 z-50 bg-slate-900 text-white rounded-2xl p-4 shadow-xl flex items-start gap-3 border border-slate-800 transition-all duration-300">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
            <i className="fa-solid fa-bell"></i>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-xs text-blue-300 uppercase tracking-wider">{toast.title}</h4>
            <p className="text-sm mt-0.5 text-slate-200 leading-snug">{toast.message}</p>
          </div>
          <button onClick={() => setToast((t) => ({ ...t, visible: false }))} className="text-slate-400 hover:text-white text-xs">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
        {/* TAB 1: PANTALLA PRINCIPAL */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {/* Card Estado de Trabajo */}
            <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white rounded-3xl p-5 shadow-lg shadow-blue-500/15 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
              <div className="flex justify-between items-start mb-3 relative z-10">
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-md">
                  {vacationMode ? '🏖️ Modo Vacaciones' : isWorkDayToday() ? '¡Hoy se trabaja!' : 'Mañana se trabaja'}
                </span>
                <div className="text-right">
                  <p className="text-xs text-blue-100">Próximo turno</p>
                  <p className="text-sm font-bold">{schedule.startTime + ' - ' + schedule.endTime}</p>
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1 relative z-10">¿Qué llevar en la mochila?</h2>
              <p className="text-xs text-blue-100 mb-4 relative z-10">Revisa tus cosas esenciales antes de salir de casa.</p>

              {/* Progress */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex justify-between text-xs font-medium">
                  <span>{getPackedCount()} de {getFilteredItems().length} objetos empacados</span>
                  <span>{getPackedPercentage()}%</span>
                </div>
                <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                  <div className="bg-white h-2 rounded-full transition-all duration-500" style={{ width: `${getPackedPercentage()}%` }}></div>
                </div>
              </div>
            </div>

            {/* Custom Modules Questions */}
            {customModules.map(
              (mod) =>
                mod.enabled && (
                  <div key={mod.id} className="app-card rounded-3xl p-4 shadow-sm border border-slate-200/60">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${mod.colorClass || 'grad-sky'}`}>
                          <i className={mod.icon || 'fa-solid fa-cube'}></i>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{mod.title}</h3>
                          <p className="text-xs text-slate-500">{mod.subtitle}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {mod.options?.map(
                        (opt) =>
                          opt.enabled !== false && (
                            <button
                              key={opt.id}
                              onClick={() => selectModuleOption(mod.id, opt.id)}
                              className={`py-2.5 px-2 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition ${
                                mod.selectedOption === opt.id
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border-blue-600'
                                  : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                              }`}
                            >
                              <i className={`${opt.icon || 'fa-solid fa-circle-check'} text-base`}></i>
                              <span>{opt.name}</span>
                            </button>
                          )
                      )}
                    </div>
                  </div>
                )
            )}

            {/* Interactive Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Lista de Chequeo</h3>
                <button onClick={resetChecklist} className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1">
                  <i className="fa-solid fa-rotate-left"></i> Desmarcar todo
                </button>
              </div>

              <div className="space-y-2">
                {getFilteredItems().map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItemPacked(item.id)}
                    className={`app-card p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition active:scale-[0.98] border ${
                      item.packed ? 'bg-slate-100/70 border-slate-200 opacity-60' : 'bg-white border-slate-200/80 shadow-sm hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-sm ${item.gradientClass}`}>
                        <i className={item.icon}></i>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-slate-800 text-sm ${item.packed ? 'line-through text-slate-400' : ''}`}>{item.name}</h4>
                        <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 inline-block mt-0.5">
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${
                        item.packed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <i className="fa-solid fa-check text-xs"></i>
                    </div>
                  </div>
                ))}

                {getFilteredItems().length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <i className="fa-solid fa-box-open text-3xl mb-2 opacity-50"></i>
                    <p className="text-xs">No hay objetos para esta combinación.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GESTOR DE OBJETOS */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Mis Objetos y Cosas</h2>
                <p className="text-xs text-slate-500">Agrega, edita o elimina elementos de tu catálogo</p>
              </div>
              <button
                onClick={() => {
                  setIsEditingItem(false);
                  setFormItem({
                    id: Date.now().toString(),
                    name: '',
                    category: 'essential',
                    icon: 'fa-solid fa-key',
                    gradientClass: 'grad-sky',
                    packed: false,
                  });
                  setShowItemModal(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition"
              >
                <i className="fa-solid fa-plus text-xs"></i> Agregar
              </button>
            </div>

            {/* Filters */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
              <button
                onClick={() => setItemFilterCategory('all')}
                className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                  itemFilterCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Todos
              </button>
              {getAllCategories().map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setItemFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition ${
                    itemFilterCategory === cat.id ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Existing Items */}
            <div className="space-y-2.5">
              {catalogItems
                .filter(
                  (item) =>
                    itemFilterCategory === 'all' ||
                    item.category === itemFilterCategory ||
                    (itemFilterCategory === 'tools' && item.category.startsWith('tools'))
                )
                .map((item) => (
                  <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0 shadow-sm ${item.gradientClass}`}>
                        <i className={item.icon}></i>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 text-sm">{item.name}</h4>
                        <p className="text-[11px] text-slate-400">{getCategoryLabel(item.category)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setIsEditingItem(true);
                          setFormItem({ ...item });
                          setShowItemModal(true);
                        }}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: HORARIOS & ALARMAS */}
        {activeTab === 'schedule' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Días y Horarios de Trabajo</h2>
              <p className="text-xs text-slate-500">Administra múltiples turnos o planifica tu calendario mensual</p>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-200/80 p-1 rounded-2xl flex text-xs font-semibold">
              <button
                onClick={() => {
                  setScheduleMode('weekly');
                  syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode: 'weekly', activeTab, scheduleSettings: schedule } });
                }}
                className={`flex-1 py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                  scheduleMode === 'weekly' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>Turnos Semanales</span>
              </button>
              <button
                onClick={() => {
                  setScheduleMode('calendar');
                  syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode: 'calendar', activeTab, scheduleSettings: schedule } });
                }}
                className={`flex-1 py-2 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                  scheduleMode === 'calendar' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <i className="fa-solid fa-calendar-days"></i>
                <span>Vista Calendario</span>
              </button>
            </div>

            {/* Weekly Shifts */}
            {scheduleMode === 'weekly' && (
              <div className="space-y-5">
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      {isEditingSchedule ? 'Editar Turno' : 'Añadir Nuevo Turno / Horario'}
                    </h3>
                    {isEditingSchedule && (
                      <button onClick={resetScheduleForm} className="text-xs text-slate-400 hover:text-slate-600 underline">
                        Cancelar edición
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Nombre del Turno / Rotación</label>
                    <input
                      type="text"
                      value={formSchedule.name}
                      onChange={(e) => setFormSchedule({ ...formSchedule, name: e.target.value })}
                      placeholder="Ej: Turno Mañana, Guardia Fin de Semana..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Días Laborales de este Turno</label>
                    <div className="grid grid-cols-7 gap-1">
                      {weekDays.map((day, index) => {
                        const isSelected = formSchedule.workDays.includes(index);
                        return (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              const newDays = isSelected
                                ? formSchedule.workDays.filter((d) => d !== index)
                                : [...formSchedule.workDays, index];
                              setFormSchedule({ ...formSchedule, workDays: newDays });
                            }}
                            className={`py-2.5 rounded-xl text-xs font-semibold transition ${
                              isSelected ? 'bg-blue-600 text-white shadow-sm font-bold' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {day.short}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Hora de Entrada</label>
                      <input
                        type="time"
                        value={formSchedule.startTime}
                        onChange={(e) => setFormSchedule({ ...formSchedule, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-500 block mb-1">Hora de Salida</label>
                      <input
                        type="time"
                        value={formSchedule.endTime}
                        onChange={(e) => setFormSchedule({ ...formSchedule, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Color del Turno</label>
                    <div className="flex gap-2">
                      {gradientPresets.map((grad) => (
                        <button
                          key={grad.class}
                          type="button"
                          onClick={() => setFormSchedule({ ...formSchedule, colorClass: grad.class })}
                          className={`w-7 h-7 rounded-xl shadow-xs transition shrink-0 ${grad.class} ${
                            formSchedule.colorClass === grad.class ? 'ring-2 ring-blue-600 ring-offset-1' : ''
                          }`}
                        ></button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={saveScheduleForm}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition mt-2 flex items-center justify-center gap-1.5"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    <span>{isEditingSchedule ? 'Guardar Cambios del Turno' : 'Guardar y Añadir a la Lista'}</span>
                  </button>
                </div>

                {/* Saved Schedules List */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Turnos Guardados ({savedSchedules.length})
                    </h3>
                    <span className="text-[10px] text-slate-400">Puedes activar varios simultáneamente</span>
                  </div>

                  <div className="space-y-2.5">
                    {savedSchedules.map((sch) => (
                      <div key={sch.id} className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shadow-xs shrink-0 ${sch.colorClass}`}>
                              <i className="fa-solid fa-clock"></i>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-xs">{sch.name}</h4>
                              <p className="text-[11px] font-semibold text-slate-500">{sch.startTime + ' - ' + sch.endTime}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleScheduleActive(sch.id)}
                              className={`w-10 h-6 rounded-full p-0.5 transition duration-200 flex items-center ${
                                sch.active ? 'bg-emerald-500' : 'bg-slate-300'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 bg-white rounded-full shadow-md transition duration-200 ${
                                  sch.active ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              ></div>
                            </button>
                            <button
                              onClick={() => {
                                setIsEditingSchedule(true);
                                setFormSchedule({ ...sch });
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button
                              onClick={() => deleteSchedule(sch.id)}
                              className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition"
                            >
                              <i className="fa-solid fa-trash text-xs"></i>
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-1 pt-1 border-t border-slate-100">
                          {weekDays.map((day, idx) => (
                            <span
                              key={idx}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] ${
                                sch.workDays.includes(idx) ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-300'
                              }`}
                            >
                              {day.short}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}

                    {savedSchedules.length === 0 && (
                      <div className="text-center py-6 text-slate-400 bg-white rounded-2xl border border-slate-200/60 p-4">
                        <i className="fa-regular fa-calendar-xmark text-2xl mb-1 opacity-40"></i>
                        <p className="text-xs">No tienes turnos creados aún.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Month View */}
            {scheduleMode === 'calendar' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => changeCalMonth(-1)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs transition"
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <h3 className="font-bold text-sm text-slate-800 capitalize">{getCalMonthYearLabel()}</h3>
                    <button
                      onClick={() => changeCalMonth(1)}
                      className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 text-xs transition"
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>

                  <button
                    onClick={applyWeeklySchedulesToCalendarMonth}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
                  >
                    <i className="fa-solid fa-wand-magic-sparkles text-blue-600"></i>
                    <span>Rellenar mes con mis turnos semanales</span>
                  </button>

                  <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-400 py-1 border-b border-slate-100">
                    <span>Dom</span>
                    <span>Lun</span>
                    <span>Mar</span>
                    <span>Mié</span>
                    <span>Jue</span>
                    <span>Vie</span>
                    <span>Sáb</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarGridDays().map((day) => (
                      <button
                        key={day.dateStr}
                        type="button"
                        onClick={() => openCalDayModal(day)}
                        disabled={!day.isCurrentMonth}
                        className={`h-13 min-h-[52px] rounded-xl border p-1 flex flex-col justify-between items-stretch transition text-left relative overflow-hidden ${
                          !day.isCurrentMonth
                            ? 'opacity-20 bg-slate-50 border-transparent cursor-default'
                            : 'bg-slate-50/80 hover:bg-blue-50 border-slate-200/70'
                        } ${day.isToday ? 'ring-2 ring-blue-600 font-bold bg-blue-50/50' : ''} ${
                          day.entry && day.entry.isWorkDay ? 'border-blue-400 bg-gradient-to-b from-blue-50/80 to-indigo-50/50' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-[11px] font-bold ${day.isToday ? 'text-blue-600' : 'text-slate-700'}`}>{day.dayNum}</span>
                          {day.entry && day.entry.isWorkDay && <span className="w-2 h-2 rounded-full bg-blue-500"></span>}
                        </div>

                        {day.entry && day.entry.isWorkDay && (
                          <div className="text-[9px] leading-tight font-semibold text-blue-800 bg-white/90 px-1 py-0.5 rounded-md border border-blue-100 truncate mt-0.5">
                            <span>{day.entry.startTime}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Alarm & Sound Configuration */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Configuración de Alarma</h3>

              {/* Notification Status */}
              <div
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-50 border-emerald-200'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-50 border-rose-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm ${
                      notificationPermission === 'granted'
                        ? 'bg-emerald-100 text-emerald-700'
                        : notificationPermission === 'denied'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    <i
                      className={
                        notificationPermission === 'granted'
                          ? 'fa-solid fa-bell'
                          : notificationPermission === 'denied'
                          ? 'fa-solid fa-bell-slash'
                          : 'fa-solid fa-bell-concierge'
                      }
                    ></i>
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        notificationPermission === 'granted'
                          ? 'text-emerald-800'
                          : notificationPermission === 'denied'
                          ? 'text-rose-800'
                          : 'text-amber-800'
                      }`}
                    >
                      {notificationPermission === 'granted'
                        ? 'Notificaciones Activas'
                        : notificationPermission === 'denied'
                        ? 'Notificaciones Bloqueadas'
                        : 'Permiso Pendiente'}
                    </h4>
                    <p
                      className={`text-[11px] ${
                        notificationPermission === 'granted'
                          ? 'text-emerald-600'
                          : notificationPermission === 'denied'
                          ? 'text-rose-600'
                          : 'text-amber-600'
                      }`}
                    >
                      {notificationPermission === 'granted'
                        ? 'Recibirás notificaciones de alarma'
                        : notificationPermission === 'denied'
                        ? 'Debes habilitarlas en ajustes del navegador'
                        : 'Haz clic para habilitar notificaciones'}
                    </p>
                  </div>
                </div>

                {notificationPermission !== 'granted' ? (
                  <button
                    onClick={requestNotificationPermission}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                      notificationPermission === 'denied'
                        ? 'bg-rose-200 hover:bg-rose-300 text-rose-800'
                        : 'bg-amber-200 hover:bg-amber-300 text-amber-800'
                    }`}
                  >
                    <i className="fa-solid fa-unlock mr-1"></i>
                    <span>{notificationPermission === 'denied' ? 'Revisar' : 'Habilitar'}</span>
                  </button>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-check text-sm"></i>
                  </div>
                )}
              </div>

              {/* Alarm Sound Selector */}
              <div className="space-y-2">
                <label className="text-[11px] text-slate-500 font-medium block">Tono de Alarma:</label>
                <div className="space-y-1.5">
                  {alarmSoundOptions.map((snd) => (
                    <div
                      key={snd.id}
                      onClick={() => {
                        const updated = { ...schedule, alarmSound: snd.id };
                        setSchedule(updated);
                        syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab, scheduleSettings: updated } });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-xl border transition cursor-pointer ${
                        schedule.alarmSound === snd.id ? 'border-blue-400 bg-blue-50/80 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${
                          schedule.alarmSound === snd.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        <i className={snd.icon}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xs font-bold ${schedule.alarmSound === snd.id ? 'text-blue-800' : 'text-slate-700'}`}>{snd.name}</h4>
                        <p className={`text-[10px] ${schedule.alarmSound === snd.id ? 'text-blue-500' : 'text-slate-400'}`}>{snd.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewAlarmSound(snd.id, schedule.alarmVolume);
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition shrink-0 ${
                          schedule.alarmSound === snd.id ? 'bg-blue-200 hover:bg-blue-300 text-blue-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                        }`}
                        title="Probar sonido"
                      >
                        <i className="fa-solid fa-play"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {isAlarmPlaying && (
                  <button
                    onClick={() => {
                      stopAlarmSound();
                      setIsAlarmPlaying(false);
                    }}
                    className="w-full bg-rose-100 hover:bg-rose-200 text-rose-700 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-rose-200 animate-pulse mt-2"
                  >
                    <i className="fa-solid fa-stop"></i>
                    <span>Detener Sonido</span>
                  </button>
                )}
              </div>

              {/* Volume Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-500 font-medium">Volumen de alarma:</label>
                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{schedule.alarmVolume}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <i className="fa-solid fa-volume-low text-slate-400 text-xs"></i>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={schedule.alarmVolume}
                    onChange={(e) => {
                      const updated = { ...schedule, alarmVolume: Number(e.target.value) };
                      setSchedule(updated);
                      syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab, scheduleSettings: updated } });
                    }}
                    className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <i className="fa-solid fa-volume-high text-slate-600 text-xs"></i>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AJUSTES */}
        {activeTab === 'settings' && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-800">Ajustes</h2>
              <p className="text-xs text-slate-500">Administra modo vacaciones, módulos, usuario y respaldos</p>
            </div>

            {/* USER CREDENTIALS EDIT CARD */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-user-gear"></i>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Configuración de Cuenta</h3>
                  <p className="text-[11px] text-slate-400">Modifica tu usuario y contraseña de acceso</p>
                </div>
              </div>

              {accountStatus.error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>{accountStatus.error}</span>
                </div>
              )}

              {accountStatus.success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2.5 rounded-2xl text-xs flex items-center gap-2">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>{accountStatus.success}</span>
                </div>
              )}

              <form onSubmit={handleUpdateAccount} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nombre de Usuario</label>
                  <input
                    type="text"
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                    required
                    placeholder="Nuevo nombre de usuario"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    required
                    placeholder="Escribe la nueva contraseña"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={accountStatus.loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-1.5"
                  >
                    {accountStatus.loading ? (
                      <span>Guardando...</span>
                    ) : (
                      <>
                        <i className="fa-solid fa-floppy-disk text-xs"></i>
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold px-4 py-2.5 rounded-2xl text-xs transition border border-rose-200 flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-right-from-bracket text-xs"></i>
                    <span>Salir</span>
                  </button>
                </div>
              </form>
            </div>

            {/* MODO VACACIONES */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl grad-amber flex items-center justify-center text-sm">
                  <i className="fa-solid fa-plane"></i>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Modo Viaje / Vacaciones</h4>
                  <p className="text-[11px] text-slate-400">
                    {vacationMode ? 'Activo: Recordatorios pausados' : 'Desactivado: Días de trabajo normal'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  const newMode = !vacationMode;
                  setVacationMode(newMode);
                  syncToDatabase({ settings: { darkMode, vacationMode: newMode, scheduleMode, activeTab, scheduleSettings: schedule } });
                  triggerHaptic();
                  showToastMsg(
                    newMode ? 'Modo Vacaciones Activo 🏖️' : 'Modo Vacaciones Desactivado 💼',
                    newMode ? 'Se han pausado los avisos de trabajo.' : 'Se han reanudado tus horarios habituales.'
                  );
                }}
                className={`w-10 h-6 rounded-full p-0.5 transition duration-200 flex items-center shrink-0 ${
                  vacationMode ? 'bg-amber-500' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow-md transition duration-200 ${
                    vacationMode ? 'translate-x-4' : 'translate-x-0'
                  }`}
                ></div>
              </button>
            </div>

            {/* VISIBLE CUSTOM MODULES MANAGER */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Módulos Visibles</h3>
                <button
                  onClick={() => {
                    setIsEditingCustomModule(false);
                    setFormCustomModule({
                      id: `mod_${Date.now()}`,
                      title: '',
                      subtitle: '',
                      icon: 'fa-solid fa-dumbbell',
                      colorClass: 'grad-rose',
                      enabled: true,
                      selectedOption: '',
                      options: [
                        { id: `opt_${Date.now()}_1`, name: 'Opción 1', icon: 'fa-solid fa-check', enabled: true },
                        { id: `opt_${Date.now()}_2`, name: 'Opción 2', icon: 'fa-solid fa-check', enabled: true },
                      ],
                    });
                    setShowCustomModuleModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition"
                >
                  <i className="fa-solid fa-plus text-xs"></i>
                  <span>Agregar Módulo</span>
                </button>
              </div>

              {customModules.map((mod, index) => (
                <div key={mod.id} className={`flex items-center justify-between pt-3 ${index !== 0 ? 'border-t border-slate-100' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm ${mod.colorClass || 'grad-sky'}`}>
                      <i className={mod.icon || 'fa-solid fa-cube'}></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{mod.title}</h4>
                      <p className="text-[11px] text-slate-400">{mod.subtitle || 'Módulo de lista'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditingCustomModule(true);
                        setFormCustomModule({ ...mod });
                        setShowCustomModuleModal(true);
                      }}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition"
                      title="Editar"
                    >
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button
                      onClick={() => deleteCustomModule(mod.id)}
                      className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center text-xs transition"
                      title="Eliminar"
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                    <button
                      onClick={() => {
                        const updated = customModules.map((m) => (m.id === mod.id ? { ...m, enabled: !m.enabled } : m));
                        setCustomModules(updated);
                        syncToDatabase({ customModules: updated });
                      }}
                      className={`w-10 h-6 rounded-full p-0.5 transition duration-200 flex items-center shrink-0 ${
                        mod.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full shadow-md transition duration-200 ${
                          mod.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      ></div>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* COPIA DE SEGURIDAD */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Copia de Seguridad</h3>
              <p className="text-[11px] text-slate-400">Exporta o importa tus listas, horarios y preferencias en un archivo.</p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={exportData}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
                >
                  <i className="fa-solid fa-download text-blue-600"></i>
                  <span>Exportar Copia</span>
                </button>
                <button
                  onClick={() => importFileInputRef.current?.click()}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-slate-200"
                >
                  <i className="fa-solid fa-upload text-blue-600"></i>
                  <span>Importar Copia</span>
                </button>
                <input ref={importFileInputRef} type="file" onChange={importData} className="hidden" accept=".json" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL AGREGAR / EDITAR OBJETO */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">{isEditingItem ? 'Editar Objeto' : 'Nuevo Objeto'}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Nombre del Objeto</label>
                <input
                  type="text"
                  value={formItem.name}
                  onChange={(e) => setFormItem({ ...formItem, name: e.target.value })}
                  placeholder="Ej: Sartén antiadherente, Salero..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Categoría</label>
                <select
                  value={formItem.category}
                  onChange={(e) => setFormItem({ ...formItem, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {getAllCategories().map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Icono</label>
                <div className="grid grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 max-h-32 overflow-y-auto">
                  {iconList.map((iconOpt) => (
                    <button
                      key={iconOpt}
                      type="button"
                      onClick={() => setFormItem({ ...formItem, icon: iconOpt })}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition ${
                        formItem.icon === iconOpt ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <i className={iconOpt}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Color / Identidad de Degradado</label>
                <div className="grid grid-cols-4 gap-2">
                  {gradientPresets.map((grad) => (
                    <button
                      key={grad.class}
                      type="button"
                      onClick={() => setFormItem({ ...formItem, gradientClass: grad.class })}
                      className={`p-2 rounded-xl text-center text-[10px] font-bold shadow-sm transition ${grad.class} ${
                        formItem.gradientClass === grad.class ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                      }`}
                    >
                      <span>{grad.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm ${formItem.gradientClass}`}>
                <i className={formItem.icon}></i>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">{formItem.name || 'Vista previa'}</p>
                <p className="text-[10px] text-slate-400">{getCategoryLabel(formItem.category)}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowItemModal(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-2xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveItem}
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MÓDULO PERSONALIZADO */}
      {showCustomModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-800">
                {isEditingCustomModule ? 'Editar Módulo' : 'Nuevo Módulo Personalizado'}
              </h3>
              <button onClick={() => setShowCustomModuleModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Título del Módulo</label>
                <input
                  type="text"
                  value={formCustomModule.title}
                  onChange={(e) => setFormCustomModule({ ...formCustomModule, title: e.target.value })}
                  placeholder="Ej: Gimnasio y Deporte"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Subtítulo / Pregunta</label>
                <input
                  type="text"
                  value={formCustomModule.subtitle}
                  onChange={(e) => setFormCustomModule({ ...formCustomModule, subtitle: e.target.value })}
                  placeholder="Ej: ¿Vas al gym saliendo del trabajo?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Icono</label>
                <div className="grid grid-cols-6 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 max-h-28 overflow-y-auto">
                  {customModuleIcons.map((iconOpt) => (
                    <button
                      key={iconOpt}
                      type="button"
                      onClick={() => setFormCustomModule({ ...formCustomModule, icon: iconOpt })}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition ${
                        formCustomModule.icon === iconOpt ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <i className={iconOpt}></i>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Color de Fondo</label>
                <div className="grid grid-cols-4 gap-2">
                  {gradientPresets.map((grad) => (
                    <button
                      key={grad.class}
                      type="button"
                      onClick={() => setFormCustomModule({ ...formCustomModule, colorClass: grad.class })}
                      className={`p-2 rounded-xl text-center text-[10px] font-bold shadow-sm transition ${grad.class} ${
                        formCustomModule.colorClass === grad.class ? 'ring-2 ring-blue-600 ring-offset-2' : ''
                      }`}
                    >
                      <span>{grad.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="block text-slate-600 font-medium">Opciones y Categorías</label>
                    <p className="text-[10px] text-slate-400">Usa el check para habilitar u ocultar la opción</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newOpt = {
                        id: `opt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        name: 'Nueva Opción',
                        icon: 'fa-solid fa-check',
                        enabled: true,
                      };
                      setFormCustomModule({
                        ...formCustomModule,
                        options: [...formCustomModule.options, newOpt],
                      });
                    }}
                    className="text-blue-600 hover:underline font-bold text-[11px] flex items-center gap-1 shrink-0"
                  >
                    <i className="fa-solid fa-plus text-[10px]"></i> Opción
                  </button>
                </div>

                <div className="space-y-2">
                  {formCustomModule.options.map((opt, idx) => (
                    <div key={opt.id || idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const opts = [...formCustomModule.options];
                          opts[idx].enabled = opts[idx].enabled === false ? true : false;
                          setFormCustomModule({ ...formCustomModule, options: opts });
                        }}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition ${
                          opt.enabled !== false ? 'bg-emerald-500 text-white shadow-xs' : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => {
                          const opts = [...formCustomModule.options];
                          opts[idx].name = e.target.value;
                          setFormCustomModule({ ...formCustomModule, options: opts });
                        }}
                        placeholder="Nombre opción"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                      />
                      {formCustomModule.options.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const opts = formCustomModule.options.filter((_, i) => i !== idx);
                            setFormCustomModule({ ...formCustomModule, options: opts });
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center text-xs"
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCustomModuleModal(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-2xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveCustomModule}
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition"
              >
                Guardar Módulo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE DÍA EN CALENDARIO */}
      {showCalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl space-y-4 border border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">{calModalTitle}</h3>
              <button onClick={() => setShowCalModal(false)} className="text-slate-400 hover:text-slate-600">
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-700">¿Se trabaja este día?</span>
                <input
                  type="checkbox"
                  checked={calDayForm.isWorkDay}
                  onChange={(e) => setCalDayForm({ ...calDayForm, isWorkDay: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded-lg accent-blue-600"
                />
              </div>

              {calDayForm.isWorkDay && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nombre / Tipo de Turno</label>
                    <input
                      type="text"
                      value={calDayForm.shiftName}
                      onChange={(e) => setCalDayForm({ ...calDayForm, shiftName: e.target.value })}
                      placeholder="Ej: Turno Especial, Guardia..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Hora Entrada</label>
                      <input
                        type="time"
                        value={calDayForm.startTime}
                        onChange={(e) => setCalDayForm({ ...calDayForm, startTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">Hora Salida</label>
                      <input
                        type="time"
                        value={calDayForm.endTime}
                        onChange={(e) => setCalDayForm({ ...calDayForm, endTime: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCalModal(false)}
                className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-2xl text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={saveCalDayEntry}
                className="w-1/2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-2xl text-xs shadow-md shadow-blue-500/20 transition"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY MODAL DE ALARMA SONANDO */}
      {showAlarmModal && activeAlarmData && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center space-y-4 border border-blue-200">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mx-auto animate-bounce">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{activeAlarmData.title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeAlarmData.message}</p>
            </div>
            <button
              onClick={() => {
                stopAlarmSound();
                setIsAlarmPlaying(false);
                setShowAlarmModal(false);
                setActiveAlarmData(null);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-blue-500/30 transition"
            >
              Apagar Alarma
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="glass-header border-t border-slate-200/80 px-6 py-2.5 flex justify-around items-center z-10 shrink-0">
        <button
          onClick={() => {
            setActiveTab('home');
            syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab: 'home', scheduleSettings: schedule } });
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'home' ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-house-circle-check text-lg"></i>
          <span className="text-[10px]">Mi Mochila</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('items');
            syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab: 'items', scheduleSettings: schedule } });
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'items' ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-boxes-packing text-lg"></i>
          <span className="text-[10px]">Mis Cosas</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('schedule');
            syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab: 'schedule', scheduleSettings: schedule } });
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'schedule' ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-calendar-days text-lg"></i>
          <span className="text-[10px]">Horarios</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            syncToDatabase({ settings: { darkMode, vacationMode, scheduleMode, activeTab: 'settings', scheduleSettings: schedule } });
          }}
          className={`flex flex-col items-center gap-1 transition ${
            activeTab === 'settings' ? 'text-blue-600 font-semibold' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <i className="fa-solid fa-gear text-lg"></i>
          <span className="text-[10px]">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}
