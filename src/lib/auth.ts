import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { prisma, seedInitialUser } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-workpacker-key-2026'
);

const COOKIE_NAME = 'workpacker_session';

export interface UserPayload {
  id: string;
  username: string;
}

export async function createSessionToken(payload: UserPayload): Promise<string> {
  return await new SignJWT({ id: payload.id, username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      username: payload.username as string,
    };
  } catch (err) {
    return null;
  }
}

export async function getAuthenticatedUser(): Promise<UserPayload | null> {
  // Asegurarse de que exista el usuario inicial 'educicutto'
  await seedInitialUser();

  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;
  return await verifySessionToken(token);
}

export function setSessionCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 días
    path: '/',
  });
}

export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}
