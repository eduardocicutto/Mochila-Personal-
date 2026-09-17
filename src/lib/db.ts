import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Asegura que el usuario inicial de prueba 'educicutto' exista en la BD.
 */
export async function seedInitialUser() {
  try {
    const existing = await prisma.user.findUnique({
      where: { username: 'educicutto' },
    });

    if (!existing) {
      const newUser = await prisma.user.create({
        data: {
          username: 'educicutto',
          password: '123456', // Contraseña inicial requerida por el usuario
        },
      });

      // Crear preferencias iniciales
      await prisma.userSettings.create({
        data: {
          userId: newUser.id,
          darkMode: false,
          vacationMode: false,
          scheduleMode: 'weekly',
          activeTab: 'home',
          scheduleSettings: JSON.stringify({
            notifyDayBefore: true,
            nightNotifyTimes: ['21:00'],
            notifySameDay: true,
            morningNotifyTimes: ['07:00'],
            startTime: '08:00',
            endTime: '17:00',
            alarmSound: 'classic',
            alarmVolume: 80,
            alarmVibrate: true,
          }),
        },
      });

      // Crear catálogo de objetos iniciales
      const defaultItems = [
        { name: 'Llaves de la oficina y casa', category: 'essential', icon: 'fa-solid fa-key', gradientClass: 'grad-sky', packed: true },
        { name: 'Credencial de trabajo', category: 'essential', icon: 'fa-solid fa-id-card', gradientClass: 'grad-lavender', packed: true },
        { name: 'Cargador de celular y laptop', category: 'essential', icon: 'fa-solid fa-charging-station', gradientClass: 'grad-teal', packed: false },
        { name: 'Botella con agua helada', category: 'essential', icon: 'fa-solid fa-bottle-water', gradientClass: 'grad-mint', packed: false },
        { name: 'Sartén antiadherente pequeña', category: 'cook', icon: 'fa-solid fa-kitchen-set', gradientClass: 'grad-peach', packed: false },
        { name: 'Salero y especiero', category: 'cook', icon: 'fa-solid fa-bottle-droplet', gradientClass: 'grad-amber', packed: false },
        { name: 'Espátula y aceite de cocina', category: 'cook', icon: 'fa-solid fa-fire-burner', gradientClass: 'grad-rose', packed: false },
        { name: 'Ingredientes frescos (Comida cruda)', category: 'cook', icon: 'fa-solid fa-apple-whole', gradientClass: 'grad-mint', packed: false },
        { name: 'Tupperware con la comida lista', category: 'tupperware', icon: 'fa-solid fa-box-archive', gradientClass: 'grad-sky', packed: false },
        { name: 'Juego de cubiertos y servilleta', category: 'tupperware', icon: 'fa-solid fa-spoon', gradientClass: 'grad-lavender', packed: false },
        { name: 'Juego de llaves y desarmadores (Moto)', category: 'tools_moto', icon: 'fa-solid fa-screwdriver-wrench', gradientClass: 'grad-teal', packed: false },
        { name: 'Lubricante de cadena / Manómetro', category: 'tools_moto', icon: 'fa-solid fa-oil-can', gradientClass: 'grad-amber', packed: false },
        { name: 'Multímetro, cautín y estaño (Electrónica)', category: 'tools_elec', icon: 'fa-solid fa-microchip', gradientClass: 'grad-lavender', packed: false },
        { name: 'Cinta aislante y conectores', category: 'tools_elec', icon: 'fa-solid fa-plug', gradientClass: 'grad-sky', packed: false },
        { name: 'Mochila del Gym y Toalla', category: 'gym_yes', icon: 'fa-solid fa-dumbbell', gradientClass: 'grad-rose', packed: false },
      ];

      for (const item of defaultItems) {
        await prisma.catalogItem.create({
          data: {
            userId: newUser.id,
            ...item,
          },
        });
      }

      // Crear módulos personalizados por defecto
      const defaultModules = [
        {
          id: 'mod_cooking',
          title: 'Sección Cocina / Vianda',
          subtitle: 'Pregunta si vas a cocinar o llevar comida',
          icon: 'fa-solid fa-utensils',
          colorClass: 'grad-amber',
          enabled: true,
          selectedOption: 'cook',
          options: JSON.stringify([
            { id: 'cook', name: 'Sí, cocino', icon: 'fa-solid fa-fire-burner', enabled: true },
            { id: 'tupperware', name: 'Llevo vianda', icon: 'fa-solid fa-box-archive', enabled: true },
            { id: 'none', name: 'Compro allá', icon: 'fa-solid fa-shop', enabled: true },
          ]),
        },
        {
          id: 'mod_tools',
          title: 'Sección Herramientas',
          subtitle: 'Pregunta si llevas cosas para moto o electrónica',
          icon: 'fa-solid fa-screwdriver-wrench',
          colorClass: 'grad-teal',
          enabled: true,
          selectedOption: 'none',
          options: JSON.stringify([
            { id: 'none', name: 'Hoy no', icon: 'fa-solid fa-ban', enabled: true },
            { id: 'moto', name: 'Para Moto', icon: 'fa-solid fa-motorcycle', enabled: true },
            { id: 'electronics', name: 'Electrónica', icon: 'fa-solid fa-microchip', enabled: true },
          ]),
        },
        {
          id: 'mod_gym',
          title: '¿Vas al Gimnasio hoy?',
          subtitle: 'Lleva tu ropa deportiva y accesorios',
          icon: 'fa-solid fa-dumbbell',
          colorClass: 'grad-rose',
          enabled: true,
          selectedOption: 'gym_no',
          options: JSON.stringify([
            { id: 'gym_no', name: 'Hoy no', icon: 'fa-solid fa-ban', enabled: true },
            { id: 'gym_yes', name: 'Sí, al Gym', icon: 'fa-solid fa-dumbbell', enabled: true },
          ]),
        },
      ];

      for (const mod of defaultModules) {
        await prisma.customModule.create({
          data: {
            userId: newUser.id,
            ...mod,
          },
        });
      }

      // Turno guardado por defecto
      await prisma.savedSchedule.create({
        data: {
          userId: newUser.id,
          name: 'Turno Regular (L-V)',
          workDays: JSON.stringify([1, 2, 3, 4, 5]),
          startTime: '08:00',
          endTime: '17:00',
          colorClass: 'grad-sky',
          active: true,
        },
      });
    }
  } catch (err) {
    console.error('Error seeding initial user:', err);
  }
}
