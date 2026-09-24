-- =========================================================
-- Migración: user_settings.user_id único (un solo registro de ajustes por usuario)
-- Prisma lo necesita para guardar ajustes con upsert; sin esto falla con
-- "there is no unique or exclusion constraint matching the ON CONFLICT specification".
-- Ya aplicada en Neon el 2026-09-24.
-- =========================================================

-- 1. Ver si hay usuarios con ajustes repetidos
SELECT user_id, COUNT(*) FROM user_settings GROUP BY user_id HAVING COUNT(*) > 1;

-- 2. Solo si el paso 1 devolvió filas: dejar un registro por usuario
-- DELETE FROM user_settings a USING user_settings b WHERE a.user_id = b.user_id AND a.id < b.id;

-- 3. Agregar la restricción
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);
