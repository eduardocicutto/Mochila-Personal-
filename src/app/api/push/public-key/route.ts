import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/push';

export const dynamic = 'force-dynamic';

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: 'Notificaciones push no configuradas en el servidor' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
