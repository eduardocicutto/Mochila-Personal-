'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [username, setUsername] = useState('educicutto');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch (err) {
      setError('Error de conexión con el servidor');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md h-[100vh] md:h-[840px] bg-slate-50 md:rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-center p-6 relative border border-slate-200/80">
      
      {/* Background Glow */}
      <div className="absolute top-10 -left-10 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm mx-auto space-y-6 relative z-10">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white text-2xl mx-auto shadow-lg shadow-blue-500/25">
            <i className="fa-solid fa-briefcase"></i>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">WorkPacker</h1>
          <p className="text-xs text-slate-500 font-medium">
            Ingresa a tu mochila digital de trabajo
          </p>
        </div>

        {/* Demo Credentials Card */}
        <div className="bg-blue-50/80 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-900 flex items-start gap-2.5 shadow-sm">
          <i className="fa-solid fa-circle-info text-blue-600 text-sm mt-0.5"></i>
          <div>
            <p className="font-semibold text-blue-800">Acceso por defecto:</p>
            <p className="mt-0.5 text-blue-700 font-mono">
              Usuario: <strong className="font-bold">educicutto</strong> | Clave: <strong className="font-bold">123456</strong>
            </p>
            <p className="text-[10px] text-blue-600 mt-1 opacity-90">
              * Puedes cambiar tu usuario y clave dentro de la app en Ajustes.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs flex items-center gap-2 animate-shake">
            <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Usuario
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 text-xs">
                <i className="fa-solid fa-user"></i>
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Nombre de usuario"
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-400 text-xs">
                <i className="fa-solid fa-lock"></i>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Contraseña"
                className="w-full bg-white border border-slate-200 rounded-2xl pl-9 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <i className="fa-solid fa-arrow-right text-xs"></i>
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400">
          WorkPacker Next.js App &bull; Sincronizado con Neon & Local DB
        </p>
      </div>
    </div>
  );
}
