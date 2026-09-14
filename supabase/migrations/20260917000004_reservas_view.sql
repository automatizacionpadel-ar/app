-- Generalización reservas: vista alias para que citas = reservas
-- Permite que código futuro use 'reservas' sin renombrar tabla (evita breaking)

CREATE OR REPLACE VIEW reservas AS
SELECT
  id,
  negocio_id,
  cliente_id,
  fecha_inicio,
  fecha_fin,
  estado,
  motivo,
  notas,
  created_at,
  updated_at
FROM citas;

-- Comentario para documentación
COMMENT ON VIEW reservas IS 'Vista alias de citas para generalizar a cualquier rubro (reservas/turnos). Usar esta vista en código nuevo.';
