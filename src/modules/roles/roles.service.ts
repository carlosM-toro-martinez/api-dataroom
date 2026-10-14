import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";
import { HttpError } from "../../errors/http.error.js";
import {
  ADMIN_ROLE,
  FULL_PERMISSIONS,
  normalizePermissions,
  type PermissionAction,
  type PermissionMap,
  type PermissionModule,
} from "./permissions.catalog.js";
import type { CreateRoleDTO, UpdateRoleDTO } from "./roles.schema.js";

// Los permisos se consultan en cada request; se cachean en memoria y se invalidan al editar un rol.
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { permissions: PermissionMap; expiresAt: number }>();

export async function getRolePermissions(roleKey: string): Promise<PermissionMap> {
  if (roleKey === ADMIN_ROLE) return FULL_PERMISSIONS;
  const cached = cache.get(roleKey);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;

  const role = await prisma.role.findUnique({ where: { key: roleKey }, select: { permissions: true } });
  const permissions = normalizePermissions(role?.permissions);
  cache.set(roleKey, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
  return permissions;
}

export async function hasAnyPermission(roleKey: string, modules: PermissionModule[], action: PermissionAction) {
  const permissions = await getRolePermissions(roleKey);
  return modules.some((module) => permissions[module]?.includes(action));
}

function withUserCount<T extends { _count: { users: number }; permissions: unknown }>(role: T) {
  const { _count, ...rest } = role;
  return { ...rest, permissions: normalizePermissions(role.permissions), userCount: _count.users };
}

export const rolesService = {
  async list() {
    const roles = await prisma.role.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      include: { _count: { select: { users: true } } },
    });
    return roles.map(withUserCount);
  },

  async create(data: CreateRoleDTO) {
    try {
      const role = await prisma.role.create({
        data: {
          key: data.key,
          name: data.name,
          description: data.description ?? null,
          permissions: normalizePermissions(data.permissions) as Prisma.InputJsonValue,
        },
        include: { _count: { select: { users: true } } },
      });
      return withUserCount(role);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(`Ya existe un rol con la clave ${data.key}`, 409);
      }
      throw error;
    }
  },

  async update(key: string, data: UpdateRoleDTO) {
    const role = await prisma.role.findUnique({ where: { key } });
    if (!role) throw new HttpError("Rol no encontrado", 404);
    if (key === ADMIN_ROLE && data.permissions !== undefined) {
      throw new HttpError("Los permisos del Administrador no se pueden modificar", 400);
    }

    const updated = await prisma.role.update({
      where: { key },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.permissions !== undefined
          ? { permissions: normalizePermissions(data.permissions) as Prisma.InputJsonValue }
          : {}),
      },
      include: { _count: { select: { users: true } } },
    });
    cache.delete(key);
    return withUserCount(updated);
  },

  async remove(key: string) {
    const role = await prisma.role.findUnique({ where: { key }, include: { _count: { select: { users: true } } } });
    if (!role) throw new HttpError("Rol no encontrado", 404);
    if (role.isSystem) throw new HttpError("Los roles del sistema no se pueden eliminar", 400);
    if (role._count.users > 0) {
      throw new HttpError(`No se puede eliminar: ${role._count.users} usuario(s) tienen este rol`, 409);
    }
    await prisma.role.delete({ where: { key } });
    cache.delete(key);
    return { key };
  },

  async assertAssignable(roleKey: string, requesterRole?: string) {
    const exists = await prisma.role.findUnique({ where: { key: roleKey }, select: { key: true } });
    if (!exists) throw new HttpError(`El rol ${roleKey} no existe`, 400);
    if (roleKey === ADMIN_ROLE && requesterRole !== ADMIN_ROLE) {
      throw new HttpError("Solo un Administrador puede asignar el rol Administrador", 403);
    }
  },
};
