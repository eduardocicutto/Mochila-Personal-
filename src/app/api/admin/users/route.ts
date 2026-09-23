import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma, seedInitialUser } from '@/lib/db';

// Middleware / Check to ensure only 'master' role can access
async function checkMasterAuth() {
  await seedInitialUser();
  const sessionUser = await getAuthenticatedUser();
  if (!sessionUser || sessionUser.role !== 'master') {
    return null;
  }
  return sessionUser;
}

export async function GET() {
  try {
    const master = await checkMasterAuth();
    if (!master) {
      return NextResponse.json({ error: 'Acceso denegado. Solo para el usuario master.' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            catalogItems: true,
            customModules: true,
            savedSchedules: true,
          },
        },
      },
    });

    // Get per-user packed item percentages
    const userPackedStats: Record<string, { packed: number; total: number }> = {};
    for (const u of users) {
      const total = u._count.catalogItems;
      if (total > 0) {
        const packed = await prisma.catalogItem.count({
          where: { userId: u.id, packed: true },
        });
        userPackedStats[u.id] = { packed, total };
      } else {
        userPackedStats[u.id] = { packed: 0, total: 0 };
      }
    }

    const totalCatalogItems = await prisma.catalogItem.count();
    const totalCustomModules = await prisma.customModule.count();
    const totalSavedSchedules = await prisma.savedSchedule.count();
    const totalCalendarEntries = await prisma.calendarEntry.count();

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: users.length,
        totalCatalogItems,
        totalCustomModules,
        totalSavedSchedules,
        totalCalendarEntries,
      },
      users: users.map((u) => ({
        id: u.id,
        username: u.username,
        role: u.role,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        itemCount: u._count.catalogItems,
        moduleCount: u._count.customModules,
        scheduleCount: u._count.savedSchedules,
        packedStats: userPackedStats[u.id] || { packed: 0, total: 0 },
      })),
    });
  } catch (err: any) {
    console.error('Admin GET error:', err);
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const master = await checkMasterAuth();
    if (!master) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });

    if (existing) {
      return NextResponse.json({ error: 'El nombre de usuario ya existe' }, { status: 400 });
    }

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: trimmedUsername,
        password: hashedPassword,
        role: 'user',
      },
    });

    // Inicializar preferencias básicas
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

    return NextResponse.json({
      success: true,
      message: `Usuario ${newUser.username} creado exitosamente`,
      user: { id: newUser.id, username: newUser.username },
    });
  } catch (err: any) {
    console.error('Admin POST error:', err);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const master = await checkMasterAuth();
    if (!master) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { userId, newPassword } = await request.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'ID de usuario y nueva contraseña requeridos' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Hash new password with bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      success: true,
      message: `Contraseña de ${targetUser.username} actualizada correctamente`,
    });
  } catch (err: any) {
    console.error('Admin PUT error:', err);
    return NextResponse.json({ error: 'Error al cambiar contraseña' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const master = await checkMasterAuth();
    if (!master) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role === 'master') {
      return NextResponse.json({ error: 'No se puede eliminar al usuario master' }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: `Usuario ${targetUser.username} eliminado correctamente`,
    });
  } catch (err: any) {
    console.error('Admin DELETE error:', err);
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 });
  }
}
