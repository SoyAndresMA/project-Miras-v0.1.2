-- Migración para la refactorización de items
-- Esta migración convierte la tabla genérica 'mitems' en tablas específicas por tipo

BEGIN TRANSACTION;

-- 1. Crear tablas temporales para preservar datos
CREATE TEMPORARY TABLE temp_items AS
SELECT m.*, c.*
FROM mitems m
LEFT JOIN caspar_clips c ON c.item_id = m.id
WHERE m.type = 'casparMClip';

-- 2. Crear nueva tabla de posiciones
CREATE TABLE item_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  position_row INTEGER NOT NULL,
  position_column INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES mevents(id) ON DELETE CASCADE
);

-- 3. Migrar clips de CasparCG
INSERT INTO caspar_clips (
  id,
  event_id,
  name,
  file_path,
  channel,
  layer,
  loop,
  auto_start,
  transition_type,
  transition_duration
)
SELECT 
  m.id,
  m.event_id,
  COALESCE(c.name, 'Untitled Clip'),
  c.file_path,
  c.channel,
  c.layer,
  COALESCE(c.loop, 0),
  COALESCE(c.auto_start, 0),
  c.transition_type,
  c.transition_duration
FROM temp_items m
WHERE m.type = 'casparMClip';

-- 4. Migrar posiciones
INSERT INTO item_positions (
  event_id,
  item_type,
  item_id,
  position_row,
  position_column
)
SELECT 
  m.event_id,
  CASE m.type
    WHEN 'casparMClip' THEN 'casparClip'
    WHEN 'casparMCam' THEN 'casparCamera'
    WHEN 'casparMMic' THEN 'casparMicrophone'
    WHEN 'casparMGraph' THEN 'casparGraphic'
    WHEN 'obsMClip' THEN 'obsClip'
    WHEN 'obsMCam' THEN 'obsCamera'
    WHEN 'obsMGraph' THEN 'obsGraphic'
    WHEN 'obsMMic' THEN 'obsMicrophone'
  END,
  m.id,
  m.position_row,
  m.position_column
FROM mitems m;

-- 5. Eliminar tablas antiguas y referencias
DROP TABLE IF EXISTS caspar_clips;
DROP TABLE IF EXISTS mitems;

-- 6. Crear nuevos índices
CREATE INDEX idx_item_positions_event_id ON item_positions(event_id);
CREATE INDEX idx_item_positions_type ON item_positions(item_type);
CREATE INDEX idx_caspar_clips_event_id ON caspar_clips(event_id);

COMMIT;

-- Verificación post-migración
SELECT COUNT(*) as position_count FROM item_positions;
SELECT COUNT(*) as clip_count FROM caspar_clips;
