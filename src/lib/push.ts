import webpush from 'web-push';
import { prisma } from './db';

let configured = false;

// Keys pasted into the Vercel dashboard sometimes keep quotes or trailing spaces
function cleanEnv(value: string | undefined): string {
  return (value || '').trim().replace(/^["']|["']$/g, '').trim();
}

export function getVapidPublicKey(): string {
  return cleanEnv(process.env.VAPID_PUBLIC_KEY);
}

export function isPushConfigured(): boolean {
  return !!(getVapidPublicKey() && cleanEnv(process.env.VAPID_PRIVATE_KEY));
}

function ensureConfigured() {
  if (configured) return;
  if (!isPushConfigured()) {
    throw new Error('Faltan las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY');
  }
  webpush.setVapidDetails(
    cleanEnv(process.env.VAPID_SUBJECT) || 'mailto:admin@workpacker.app',
    getVapidPublicKey(),
    cleanEnv(process.env.VAPID_PRIVATE_KEY)
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}

/** Envía la notificación a todos los dispositivos del usuario. Devuelve cuántos la recibieron. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  ensureConfigured();
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let delivered = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60, urgency: 'high' }
      );
      delivered++;
    } catch (err: any) {
      // 404/410: the browser dropped this subscription, so forget it
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      } else {
        console.error('Push send error:', err?.statusCode, err?.body || err?.message);
      }
    }
  }

  return delivered;
}
