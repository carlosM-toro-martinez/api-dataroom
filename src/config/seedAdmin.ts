import bcrypt from "bcrypt";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

export async function seedAdmin() {
  const nombre = process.env.ADMIN_NAME;
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!nombre || !email || !password) {
    logger.warn("Variables ADMIN_NAME, ADMIN_EMAIL o ADMIN_PASSWORD no definidas — omitiendo seed de admin");
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    logger.info({ email }, "Usuario admin ya existe, omitiendo seed");
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: { nombre, email, password: hashedPassword, role: "ADMIN" },
    select: { id: true, nombre: true, email: true, role: true },
  });

  logger.info({ userId: admin.id, email: admin.email }, "Usuario admin creado automáticamente");
}
