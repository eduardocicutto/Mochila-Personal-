import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WorkPacker - Recordatorio para el Trabajo',
  description: 'Organiza las cosas esenciales de tu mochila para el trabajo, turnos y horarios.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="text-slate-800 min-h-screen flex justify-center items-center p-0 md:p-4 bg-[#f4f6fb]">
        {children}
      </body>
    </html>
  );
}
