-- Módulo "Análisis de muestras" (tablero de leyes, cobertura, laboratorios y estimación espacial).
-- Por ahora solo lo ven el Administrador, el Geólogo administrador y la Superintendencia; se puede cambiar desde Roles y permisos.
UPDATE "Role"
SET "permissions" = jsonb_set("permissions", '{analisisMuestras}', '["read"]'::jsonb, true),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" IN ('ADMIN', 'GEOLOGOADMIN')
   OR "key" ILIKE 'SUPERINTENDENTE%'
   OR "name" ILIKE 'superintendente%';
