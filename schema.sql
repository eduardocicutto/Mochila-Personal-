-- =========================================================
-- WORKPACKER DATABASE SCHEMA (PostgreSQL / Neon Database)
-- =========================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Preferencias de Usuario
CREATE TABLE IF NOT EXISTS user_settings (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    dark_mode BOOLEAN DEFAULT FALSE,
    vacation_mode BOOLEAN DEFAULT FALSE,
    schedule_mode VARCHAR(20) DEFAULT 'weekly',
    active_tab VARCHAR(20) DEFAULT 'home',
    schedule_settings TEXT DEFAULT '{}',
    timezone VARCHAR(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires'
);

-- 3. Tabla de Catálogo de Objetos
CREATE TABLE IF NOT EXISTS catalog_items (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(100) NOT NULL,
    gradient_class VARCHAR(100) NOT NULL,
    packed BOOLEAN DEFAULT FALSE
);

-- 4. Tabla de Módulos Personalizados
CREATE TABLE IF NOT EXISTS custom_modules (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    icon VARCHAR(100) NOT NULL,
    color_class VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    selected_option VARCHAR(100),
    options TEXT DEFAULT '[]'
);

-- 5. Tabla de Turnos Semanales Guardados
CREATE TABLE IF NOT EXISTS saved_schedules (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    work_days TEXT DEFAULT '[]',
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    color_class VARCHAR(100) NOT NULL,
    active BOOLEAN DEFAULT TRUE
);

-- 6. Tabla de Entradas de Calendario
CREATE TABLE IF NOT EXISTS calendar_entries (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) REFERENCES users(id) ON DELETE CASCADE,
    date_str VARCHAR(10) NOT NULL,
    is_work_day BOOLEAN DEFAULT TRUE,
    shift_name VARCHAR(255),
    start_time VARCHAR(10),
    end_time VARCHAR(10),
    CONSTRAINT unique_user_date UNIQUE(user_id, date_str)
);

-- 7-9. Recordatorios, dispositivos push y registro de avisos enviados
-- Recordatorios: avisar `days_before` días antes de cada día laboral, a la hora `time` (HH:MM)
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    days_before INTEGER NOT NULL DEFAULT 1,
    time VARCHAR(5) NOT NULL DEFAULT '21:00',
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders(user_id);

-- Dispositivos suscriptos a notificaciones push (una fila por navegador/teléfono)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- Avisos ya enviados (evita mandar dos veces el mismo recordatorio)
CREATE TABLE IF NOT EXISTS notification_logs (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL UNIQUE,
    sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS notification_logs_user_id_idx ON notification_logs(user_id);

-- =========================================================
-- USUARIOS INICIALES Y CONFIGURACIÓN PRETERMINADA
-- 1) Usuario: educicutto | Clave: 123456 | Rol: user
-- 2) Usuario Master: master | Clave: 1234 | Rol: master
-- NOTA: Las contraseñas se almacenan hasheadas con bcrypt
-- en el seed automático de la aplicación (db.ts).
-- Los valores de abajo son de referencia con texto plano.
-- =========================================================

-- Insertar Usuario Personal educicutto
INSERT INTO users (id, username, password, role)
VALUES ('usr_educicutto', 'educicutto', '$2a$10$placeholder_hash_educicutto', 'user')
ON CONFLICT (username) DO NOTHING;

-- Insertar Usuario Administrador Master
INSERT INTO users (id, username, password, role)
VALUES ('usr_master', 'master', '$2a$10$placeholder_hash_master', 'master')
ON CONFLICT (username) DO NOTHING;

-- Configuración por defecto para educicutto
INSERT INTO user_settings (id, user_id, dark_mode, vacation_mode, schedule_mode, active_tab, schedule_settings)
VALUES ('stg_educicutto', 'usr_educicutto', FALSE, FALSE, 'weekly', 'home', '{"notifyDayBefore":true,"nightNotifyTimes":["21:00"],"notifySameDay":true,"morningNotifyTimes":["07:00"],"startTime":"08:00","endTime":"17:00","alarmSound":"classic","alarmVolume":80,"alarmVibrate":true}')
ON CONFLICT (id) DO NOTHING;

-- Catálogo inicial para educicutto
INSERT INTO catalog_items (id, user_id, name, category, icon, gradient_class, packed) VALUES
('item_1', 'usr_educicutto', 'Llaves de la oficina y casa', 'essential', 'fa-solid fa-key', 'grad-sky', true),
('item_2', 'usr_educicutto', 'Credencial de trabajo', 'essential', 'fa-solid fa-id-card', 'grad-lavender', true),
('item_3', 'usr_educicutto', 'Cargador de celular y laptop', 'essential', 'fa-solid fa-charging-station', 'grad-teal', false),
('item_4', 'usr_educicutto', 'Botella con agua helada', 'essential', 'fa-solid fa-bottle-water', 'grad-mint', false),
('item_5', 'usr_educicutto', 'Sartén antiadherente pequeña', 'cook', 'fa-solid fa-kitchen-set', 'grad-peach', false),
('item_6', 'usr_educicutto', 'Salero y especiero', 'cook', 'fa-solid fa-bottle-droplet', 'grad-amber', false),
('item_7', 'usr_educicutto', 'Espátula y aceite de cocina', 'cook', 'fa-solid fa-fire-burner', 'grad-rose', false),
('item_8', 'usr_educicutto', 'Ingredientes frescos (Comida cruda)', 'cook', 'fa-solid fa-apple-whole', 'grad-mint', false),
('item_9', 'usr_educicutto', 'Tupperware con la comida lista', 'tupperware', 'fa-solid fa-box-archive', 'grad-sky', false),
('item_10', 'usr_educicutto', 'Juego de cubiertos y servilleta', 'tupperware', 'fa-solid fa-spoon', 'grad-lavender', false),
('item_11', 'usr_educicutto', 'Juego de llaves y desarmadores (Moto)', 'tools_moto', 'fa-solid fa-screwdriver-wrench', 'grad-teal', false),
('item_12', 'usr_educicutto', 'Lubricante de cadena / Manómetro', 'tools_moto', 'fa-solid fa-oil-can', 'grad-amber', false),
('item_13', 'usr_educicutto', 'Multímetro, cautín y estaño (Electrónica)', 'tools_elec', 'fa-solid fa-microchip', 'grad-lavender', false),
('item_14', 'usr_educicutto', 'Cinta aislante y conectores', 'tools_elec', 'fa-solid fa-plug', 'grad-sky', false),
('item_15', 'usr_educicutto', 'Mochila del Gym y Toalla', 'gym_yes', 'fa-solid fa-dumbbell', 'grad-rose', false)
ON CONFLICT (id) DO NOTHING;

-- Módulos predeterminados para educicutto
INSERT INTO custom_modules (id, user_id, title, subtitle, icon, color_class, enabled, selected_option, options) VALUES
('mod_cook_edu', 'usr_educicutto', 'Sección Cocina / Vianda', 'Pregunta si vas a cocinar o llevar comida', 'fa-solid fa-utensils', 'grad-amber', true, 'cook', '[{"id":"cook","name":"Sí, cocino","icon":"fa-solid fa-fire-burner","enabled":true},{"id":"tupperware","name":"Llevo vianda","icon":"fa-solid fa-box-archive","enabled":true},{"id":"none","name":"Compro allá","icon":"fa-solid fa-shop","enabled":true}]'),
('mod_tools_edu', 'usr_educicutto', 'Sección Herramientas', 'Pregunta si llevas cosas para moto o electrónica', 'fa-solid fa-screwdriver-wrench', 'grad-teal', true, 'none', '[{"id":"none","name":"Hoy no","icon":"fa-solid fa-ban","enabled":true},{"id":"moto","name":"Para Moto","icon":"fa-solid fa-motorcycle","enabled":true},{"id":"electronics","name":"Electrónica","icon":"fa-solid fa-microchip","enabled":true}]'),
('mod_gym_edu', 'usr_educicutto', '¿Vas al Gimnasio hoy?', 'Lleva tu ropa deportiva y accesorios', 'fa-solid fa-dumbbell', 'grad-rose', true, 'gym_no', '[{"id":"gym_no","name":"Hoy no","icon":"fa-solid fa-ban","enabled":true},{"id":"gym_yes","name":"Sí, al Gym","icon":"fa-solid fa-dumbbell","enabled":true}]')
ON CONFLICT (id) DO NOTHING;

-- Turno guardado por defecto para educicutto
INSERT INTO saved_schedules (id, user_id, name, work_days, start_time, end_time, color_class, active) VALUES
('sch_edu_1', 'usr_educicutto', 'Turno Regular (L-V)', '[1,2,3,4,5]', '08:00', '17:00', 'grad-sky', true)
ON CONFLICT (id) DO NOTHING;
