-- =========================================================
-- WORKPACKER DATABASE SCHEMA (PostgreSQL / Neon Database)
-- =========================================================

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
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
    schedule_settings TEXT DEFAULT '{}'
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

-- =========================================================
-- USUARIO INICIAL DE PRUEBA
-- Usuario: educicutto | Clave: 123456
-- =========================================================
INSERT INTO users (id, username, password)
VALUES ('usr_educicutto', 'educicutto', '123456')
ON CONFLICT (username) DO NOTHING;
