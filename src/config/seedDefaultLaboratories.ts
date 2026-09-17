import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

const DEFAULT_LABORATORIES = [
  { name: "LIPEÑA", abbreviation: "LIP" },
  { name: "CHILCOBIJA", abbreviation: "CHI" },
  { name: "POTOSI", abbreviation: "POT" },
  { name: "SPECTRO LAB", abbreviation: "SPL" },
  { name: "CASTRO", abbreviation: "CAS" },
] as const;

export async function seedDefaultLaboratories() {
  for (const lab of DEFAULT_LABORATORIES) {
    const existingInterior = await prisma.interiorLaboratory.findFirst({
      where: { abbreviation: lab.abbreviation },
    });
    if (!existingInterior) {
      const created = await prisma.interiorLaboratory.create({
        data: { name: lab.name, abbreviation: lab.abbreviation },
      });
      logger.info({ labId: created.id, name: created.name }, "InteriorLaboratory sembrado automáticamente");
    }

    const existingSurface = await prisma.surfaceLaboratory.findFirst({
      where: { abbreviation: lab.abbreviation },
    });
    if (!existingSurface) {
      const created = await prisma.surfaceLaboratory.create({
        data: { name: lab.name, abbreviation: lab.abbreviation },
      });
      logger.info({ labId: created.id, name: created.name }, "SurfaceLaboratory sembrado automáticamente");
    }
  }
}
