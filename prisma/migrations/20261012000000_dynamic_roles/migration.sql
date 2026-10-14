-- Roles dinámicos con permisos por módulo. User.role pasa de enum a texto con FK a Role.key,
-- así los valores existentes ("ADMIN", "GEOLOGO", ...) se conservan tal cual.

CREATE TABLE "Role" (
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("key")
);

-- Permisos equivalentes al comportamiento que tenía cada rol antes de este cambio.
INSERT INTO "Role" ("key", "name", "description", "isSystem", "permissions", "updatedAt") VALUES
('ADMIN', 'Administrador', 'Acceso total al sistema.', true,
 '{"dataRoom":["create","read","update","delete"],"exploracion":["create","read","update","delete"],"produccion":["create","read","update","delete"],"despachos":["create","read","update","delete"],"sondajes":["create","read","update","delete"],"elementos":["create","read","update","delete"],"solicitudes":["create","read","update","delete"],"usuarios":["create","read","update","delete"]}',
 CURRENT_TIMESTAMP),
('GEOLOGOADMIN', 'Geólogo administrador', 'Gestiona el Data Room, muestras, despachos y sondajes.', true,
 '{"dataRoom":["create","read","update","delete"],"exploracion":["create","read","update","delete"],"produccion":["create","read","update","delete"],"despachos":["create","read","update","delete"],"sondajes":["create","read","update","delete"]}',
 CURRENT_TIMESTAMP),
('GEOLOGO', 'Geólogo', 'Registra muestras, despachos y sondajes; consulta el Data Room.', true,
 '{"dataRoom":["read"],"exploracion":["create","read","update","delete"],"produccion":["create","read","update","delete"],"despachos":["create","read","update","delete"],"sondajes":["create","read","update","delete"]}',
 CURRENT_TIMESTAMP),
('VISITANTE', 'Visitante Data Room', 'Acceso externo temporal, de solo lectura, al Data Room.', true,
 '{"dataRoom":["read"]}',
 CURRENT_TIMESTAMP),
('SONDAJES', 'Sondajes', 'Solo el módulo de Sondajes.', true,
 '{"sondajes":["create","read","update","delete"]}',
 CURRENT_TIMESTAMP);

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE TEXT USING "role"::text;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'GEOLOGO';

ALTER TABLE "User" ADD CONSTRAINT "User_role_fkey" FOREIGN KEY ("role") REFERENCES "Role"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "ExploRole";
