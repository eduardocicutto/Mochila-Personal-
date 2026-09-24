import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { isPushConfigured, sendPushToUser } from '@/lib/push';

export async function POST() {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!isPushConfigured()) {
      return NextResponse.json({ error: 'Notificaciones push no configuradas en el servidor' }, { status: 503 });
    }

    const delivered = await sendPushToUser(sessionUser.id, {
      title: '🔔 WorkPacker - Prueba',
      body: 'Así te van a llegar los recordatorios, aunque la app esté cerrada.',
      tag: 'workpacker-test',
    });

    if (delivered === 0) {
      return NextResponse.json({ error: 'No hay dispositivos registrados para este usuario' }, { status: 404 });
    }
    return NextResponse.json({ success: true, delivered });
  } catch (err) {
    console.error('Push test error:', err);
    return NextResponse.json({ error: 'Error al enviar la notificación de prueba' }, { status: 500 });
  }
}
