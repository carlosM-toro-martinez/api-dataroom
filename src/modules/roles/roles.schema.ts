import { z } from "zod";
import { MODULE_KEYS, PERMISSION_ACTIONS } from "./permissions.catalog.js";

const permissionsSchema = z
  .record(z.string(), z.array(z.enum(PERMISSION_ACTIONS)))
  .refine((value) => Object.keys(value).every((key) => (MODULE_KEYS as string[]).includes(key)), {
    message: "Módulo de permisos desconocido",
  });

export const roleKeySchema = z.object({
  key: z.string().min(1).max(40),
});

export const createRoleSchema = z
  .object({
    key: z
      .string()
      .trim()
      .min(2)
      .max(40)
      .transform((value) => value.toUpperCase().replace(/\s+/g, "_"))
      .refine((value) => /^[A-Z0-9_]+$/.test(value), { message: "Solo letras, números y guion bajo" }),
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(300).nullable().optional(),
    permissions: permissionsSchema.default({}),
  })
  .strict();

export const updateRoleSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().trim().max(300).nullable().optional(),
    permissions: permissionsSchema.optional(),
  })
  .strict();

export type CreateRoleDTO = z.infer<typeof createRoleSchema>;
export type UpdateRoleDTO = z.infer<typeof updateRoleSchema>;
