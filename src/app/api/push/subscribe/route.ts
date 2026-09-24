import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { subscription, timezone } = await request.json();
    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 });
    }

    // An endpoint belongs to one device; if another user logged in there before, it moves to this user
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId: sessionUser.id, p256dh, auth },
      create: { userId: sessionUser.id, endpoint, p256dh, auth },
    });

    if (typeof timezone === 'string' && timezone) {
      await prisma.userSettings.upsert({
        where: { userId: sessionUser.id },
        update: { timezone },
        create: { userId: sessionUser.id, timezone },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Push subscribe error:', err);
    return NextResponse.json(
      { error: `Error al registrar el dispositivo: ${err?.message || 'desconocido'}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { endpoint } = await request.json();
    if (endpoint) {
      await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: sessionUser.id } });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    return NextResponse.json({ error: 'Error al quitar el dispositivo' }, { status: 500 });
  }
}
