-- Módulo "Análisis de mis muestras": el mismo tablero de análisis, limitado a las muestras que registró cada persona.
-- Por defecto lo ve el rol Geólogo; se puede cambiar desde Roles y permisos.
UPDATE "Role"
SET "permissions" = jsonb_set("permissions", '{misAnalisisMuestras}', '["read"]'::jsonb, true),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'GEOLOGO';
