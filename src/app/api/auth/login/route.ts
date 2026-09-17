import { NextResponse } from 'next/server';
import { prisma, seedInitialUser } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await seedInitialUser();

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = await createSessionToken({ id: user.id, username: user.username });
    setSessionCookie(token);

    return NextResponse.json({ success: true, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Error interno en el servidor' }, { status: 500 });
  }
}
