import { NextResponse } from 'next/server';
import { getAuthenticatedUser, createSessionToken, setSessionCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { newUsername, newPassword } = await request.json();

    if (!newUsername || !newPassword) {
      return NextResponse.json({ error: 'El nombre de usuario y la contraseña son requeridos' }, { status: 400 });
    }

    const usernameTrimmed = newUsername.trim();
    if (usernameTrimmed.length < 3) {
      return NextResponse.json({ error: 'El nombre de usuario debe tener al menos 3 caracteres' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 4 caracteres' }, { status: 400 });
    }

    // Verificar si el nuevo username ya existe (si cambió el username)
    if (usernameTrimmed !== sessionUser.username) {
      const existing = await prisma.user.findUnique({
        where: { username: usernameTrimmed },
      });
      if (existing) {
        return NextResponse.json({ error: 'El nombre de usuario ya está en uso' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        username: usernameTrimmed,
        password: newPassword,
      },
    });

    // Actualizar cookie de sesión con el nuevo username
    const token = await createSessionToken({ id: updatedUser.id, username: updatedUser.username });
    setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: updatedUser.id, username: updatedUser.username },
      message: 'Credenciales actualizadas correctamente',
    });
  } catch (err) {
    console.error('Error updating credentials:', err);
    return NextResponse.json({ error: 'Error al actualizar credenciales' }, { status: 500 });
  }
}
