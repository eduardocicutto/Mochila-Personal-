-- =========================================================
-- Migración: recordatorios editables + notificaciones push
-- Ejecutar una vez en el SQL Editor de Neon (es seguro repetirla).
-- =========================================================

-- Zona horaria del usuario, para calcular la hora de los avisos en el servidor
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';

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
