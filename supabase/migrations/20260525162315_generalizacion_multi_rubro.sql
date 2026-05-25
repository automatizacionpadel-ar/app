-- ═══════════════════════════════════════════════════════════════════
-- Generalización multi-rubro: médico/paciente → negocio/cliente
-- ═══════════════════════════════════════════════════════════════════

-- 1. RENOMBRAR TABLAS
ALTER TABLE medicos              RENAME TO negocios;
ALTER TABLE pacientes            RENAME TO clientes;
ALTER TABLE medico_agente_config RENAME TO negocio_agente_config;
ALTER TABLE medico_faqs          RENAME TO negocio_faqs;

-- 2. RENOMBRAR COLUMNAS EN negocios
ALTER TABLE negocios RENAME COLUMN nombre_completo TO nombre;
ALTER TABLE negocios RENAME COLUMN especialidad    TO rubro;

-- 3. AGREGAR CAMPO habilitar_recetas (desactivado por defecto)
ALTER TABLE negocios ADD COLUMN habilitar_recetas BOOLEAN NOT NULL DEFAULT false;

-- 4. RENOMBRAR medico_id → negocio_id EN TABLAS RELACIONADAS
ALTER TABLE negocio_agente_config RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE negocio_faqs          RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE clientes              RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE citas                 RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE push_subscriptions    RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE recetas               RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE suscripciones         RENAME COLUMN medico_id TO negocio_id;
ALTER TABLE chat_sessions         RENAME COLUMN medico_id TO negocio_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'mensajes_promo' AND column_name = 'medico_id') THEN
    ALTER TABLE mensajes_promo RENAME COLUMN medico_id TO negocio_id;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notificaciones_log' AND column_name = 'medico_id') THEN
    ALTER TABLE notificaciones_log RENAME COLUMN medico_id TO negocio_id;
  END IF;
END$$;

-- 5. RENOMBRAR paciente_id → cliente_id EN TABLAS RELACIONADAS
ALTER TABLE citas              RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE push_subscriptions RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE recetas            RENAME COLUMN paciente_id TO cliente_id;
ALTER TABLE chat_sessions      RENAME COLUMN paciente_id TO cliente_id;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'notificaciones_log' AND column_name = 'paciente_id') THEN
    ALTER TABLE notificaciones_log RENAME COLUMN paciente_id TO cliente_id;
  END IF;
END$$;

-- 6. RENOMBRAR COLUMNAS EN citas
ALTER TABLE citas RENAME COLUMN motivo_consulta TO motivo;
ALTER TABLE citas RENAME COLUMN notas_medico    TO notas;

-- 7. ACTUALIZAR ROL EN usuarios
UPDATE usuarios SET rol = 'negocio' WHERE rol = 'medico';
