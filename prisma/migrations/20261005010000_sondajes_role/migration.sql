-- Rol que solo accede al módulo de Sondajes.
ALTER TYPE "ExploRole" ADD VALUE IF NOT EXISTS 'SONDAJES';
