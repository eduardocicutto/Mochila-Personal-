# WorkPacker - Next.js App

WorkPacker es una aplicación web progresiva y moderna para organizar los objetos y recordatorios esenciales de tu mochila de trabajo según tus días de trabajo, turnos, cocina/comida y herramientas.

---

## 🚀 Características
- **Next.js 14 (App Router)** con TypeScript y Tailwind CSS.
- **Autenticación segura (Login)** con sesión en cookies.
  - Usuario inicial por defecto: **`educicutto`**
  - Contraseña inicial por defecto: **`123456`**
  - Formulario dentro de la pestaña **Ajustes** para cambiar nombre de usuario y clave.
- **Base de Datos Dual (Local y Neon Postgres en Vercel)**:
  - En local funciona por defecto con **SQLite** sin necesidad de instalaciones complejas.
  - En producción (Vercel) o servidor remoto se conecta a **Neon Postgres** a través de la variable `DATABASE_URL`.
- **Organización Inteligente**:
  - Lista de chequeo interactiva con filtros inteligentes por preguntas (Cocina, Herramientas Moto/Electrónica, Gym, etc.).
  - Gestor de catálogo de objetos con creador de categorías.
  - Turnos semanales y calendario mensual de días de trabajo.
  - Generador de tonos de alarma mediante **Web Audio API** (Clásica, Suave, Urgente, Campana, Digital) con selector de volumen y vibración.
  - Copia de seguridad en JSON (Exportar / Importar).

---

## 🛠️ Instalación y Ejecución en Local

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/eduardocicutto/Mochila-Personal-.git
cd Mochila-Personal-
npm install
```

### 2. Configurar Base de Datos Local
El proyecto viene preconfigurado con SQLite local (`file:./dev.db`).

Para sincronizar las tablas localmente:
```bash
npx prisma db push
```

### 3. Iniciar el Servidor de Desarrollo
```bash
npm run dev
```
Abre tu navegador en `http://localhost:3000`.

---

## 🐘 Conectar a Neon Postgres (Vercel)

Si deseas conectar la app a una base de datos en la nube **Neon Postgres**:

1. Obtén tu URL de conexión en [Neon.tech](https://neon.tech) o en la pestaña **Storage / Postgres** de Vercel.
2. Agrega la variable de entorno `DATABASE_URL` en tu proyecto de Vercel:
   ```env
   DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-host.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```
3. Si deseas crear las tablas directamente mediante SQL sin CLI de Prisma, puedes ejecutar el script autónomo `schema.sql` directamente en el **SQL Editor de Neon**:
   - Copia el contenido de `schema.sql`.
   - Pégalo en la consola de Neon y presiona **Run**.
4. ¡Listo! Al desplegar en Vercel, la aplicación conectará automáticamente con tu BD de Neon.
