import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma, seedInitialUser } from '@/lib/db';
import { createSessionToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await seedInitialUser();

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Usuario y contraseña requeridos' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Compare with bcrypt hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Update last login timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      id: user.id,
      username: user.username,
      role: user.role,
    });
    setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err: any) {
    console.error('Login error details:', err);
    return NextResponse.json(
      { error: err?.message ? `Error de Base de Datos: ${err.message}` : 'Error interno en el servidor' },
      { status: 500 }
    );
  }
}
