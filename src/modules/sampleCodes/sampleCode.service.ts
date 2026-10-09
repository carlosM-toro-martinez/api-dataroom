import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma.js";

type SampleCategory = "EXPLORATION" | "PRODUCTION";
type SampleModule = "interior" | "surface";
type Tx = Prisma.TransactionClient;

type SampleCodeRow = {
  id: string;
  module: SampleModule;
  category: SampleCategory;
  code: string;
  sequentialNumber: number;
  name: string | null;
  createdAt: Date;
};

type SampleCodeChange = SampleCodeRow & {
  previousCode: string;
  previousSequentialNumber: number;
  nextCode: string;
  nextSequentialNumber: number;
};

type LooseSampleCodeChange = Partial<SampleCodeChange> & {
  module?: SampleModule | string;
  currentCode?: string;
  previousCode?: string;
  nextCode?: string;
  name?: string | null;
};

const CATEGORY_LOCK_KEYS: Record<SampleCategory, number> = {
  EXPLORATION: 440001,
  PRODUCTION: 440002
};

export function sampleCodeFor(category: SampleCategory, sequentialNumber: number) {
  const prefix = category === "PRODUCTION" ? "M" : "EX";
  return `${prefix}-${String(sequentialNumber).padStart(4, "0")}`;
}

// Codes are printed on talons and remission notes, so a number is never reused or shifted:
// deleting a sample leaves a gap. The Postgres sequence also survives deleting the last sample.
const CATEGORY_SEQUENCES: Record<SampleCategory, string> = {
  EXPLORATION: "sample_code_exploration_seq",
  PRODUCTION: "sample_code_production_seq"
};

async function nextSequentialNumber(tx: Tx, category: SampleCategory) {
  const rows = await tx.$queryRaw<Array<{ n: bigint }>>`SELECT nextval(${CATEGORY_SEQUENCES[category]}::regclass) AS n`;
  return Number(rows[0]!.n);
}

export async function allocateGlobalSampleCode(tx: Tx, category: SampleCategory) {
  const sequentialNumber = await nextSequentialNumber(tx, category);
  return {
    sequentialNumber,
    code: sampleCodeFor(category, sequentialNumber)
  };
}

export const sampleCodeService = {
  async getDuplicateSampleCodes() {
    const rows = await getGlobalSampleRows(prisma);
    return buildDuplicateReport(rows);
  },

  async repairSampleCodes(userId?: number) {
    return prisma.$transaction(
      async (tx) => {
        const beforeRows = await getGlobalSampleRows(tx);
        const duplicateReport = buildDuplicateReport(beforeRows);
        const changes: SampleCodeChange[] = [];

        for (const category of ["EXPLORATION", "PRODUCTION"] as const) {
          await lockCategory(tx, category);
          const duplicateRows = duplicateReport.duplicates.flatMap((group) =>
            group.samples
              .filter((row) => row.category === category)
              .sort(compareSampleRowsForRenumbering)
              .slice(1)
          );
          const planned: SampleCodeChange[] = [];
          for (const row of duplicateRows) {
            const assignedNumber = await nextSequentialNumber(tx, category);
            planned.push({
              ...row,
              previousCode: row.code,
              previousSequentialNumber: row.sequentialNumber,
              nextCode: sampleCodeFor(category, assignedNumber),
              nextSequentialNumber: assignedNumber
            });
          }

          await temporarilyRenameRows(tx, planned);
          for (const change of planned) {
            await updateSampleCode(tx, change, change.nextSequentialNumber, userId);
          }
          changes.push(...planned);
        }

        return {
          duplicatesBefore: duplicateReport,
          corrected: changes,
          correctedCount: changes.length
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  },

  async revertSampleCodeRepair(changes: LooseSampleCodeChange[], userId?: number) {
    return prisma.$transaction(
      async (tx) => {
        const normalizedChanges = await normalizeRevertChanges(tx, changes);
        for (const category of ["EXPLORATION", "PRODUCTION"] as const) {
          await lockCategory(tx, category);
          const categoryChanges = normalizedChanges.filter((change) => change.category === category);
          await temporarilyRenameRows(tx, categoryChanges);
          for (const change of categoryChanges) {
            const data = {
              sequentialNumber: change.previousSequentialNumber,
              code: change.previousCode,
              ...(userId !== undefined ? { updatedById: userId } : {})
            };
            if (change.module === "interior") {
              await tx.interiorSample.update({ where: { id: change.id }, data });
            } else {
              await tx.surfaceSample.update({ where: { id: change.id }, data });
            }
          }
        }

        return {
          reverted: normalizedChanges,
          revertedCount: normalizedChanges.length,
          duplicatesAfter: buildDuplicateReport(await getGlobalSampleRows(tx))
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  }
};

async function lockCategory(tx: Tx, category: SampleCategory) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${CATEGORY_LOCK_KEYS[category]})`;
}

async function getGlobalSampleRows(client: Tx | typeof prisma, category?: SampleCategory) {
  const where = category ? { category } : {};
  const [interior, surface] = await Promise.all([
    client.interiorSample.findMany({
      where,
      select: { id: true, category: true, code: true, sequentialNumber: true, name: true, createdAt: true }
    }),
    client.surfaceSample.findMany({
      where,
      select: { id: true, category: true, code: true, sequentialNumber: true, name: true, createdAt: true }
    })
  ]);

  return [
    ...interior.map((row) => ({ ...row, module: "interior" as const })),
    ...surface.map((row) => ({ ...row, module: "surface" as const }))
  ];
}

function buildDuplicateReport(rows: SampleCodeRow[]) {
  const byCode = new Map<string, SampleCodeRow[]>();
  for (const row of rows) {
    const items = byCode.get(row.code) ?? [];
    items.push(row);
    byCode.set(row.code, items);
  }

  const duplicates = [...byCode.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([code, items]) => ({
      code,
      count: items.length,
      samples: items.sort(compareSampleRowsForRenumbering)
    }))
    .sort((a, b) => compareCode(a.code, b.code));

  return {
    duplicateCount: duplicates.length,
    affectedSampleCount: duplicates.reduce((total, group) => total + group.count, 0),
    duplicates
  };
}

async function temporarilyRenameRows(tx: Tx, rows: Array<Pick<SampleCodeRow, "id" | "module">>) {
  const suffix = Date.now();
  for (const row of rows) {
    const code = `REN-${suffix}-${row.id.slice(0, 8)}`;
    if (row.module === "interior") {
      await tx.interiorSample.update({ where: { id: row.id }, data: { code } });
    } else {
      await tx.surfaceSample.update({ where: { id: row.id }, data: { code } });
    }
  }
}

async function updateSampleCode(tx: Tx, row: Pick<SampleCodeRow, "id" | "module" | "category">, sequentialNumber: number, userId?: number) {
  const data = {
    sequentialNumber,
    code: sampleCodeFor(row.category, sequentialNumber),
    ...(userId !== undefined ? { updatedById: userId } : {})
  };
  if (row.module === "interior") {
    await tx.interiorSample.update({ where: { id: row.id }, data });
  } else {
    await tx.surfaceSample.update({ where: { id: row.id }, data });
  }
}

function compareSampleRowsForRenumbering(a: SampleCodeRow, b: SampleCodeRow) {
  const byNumber = a.sequentialNumber - b.sequentialNumber;
  if (byNumber !== 0) return byNumber;
  const byDate = a.createdAt.getTime() - b.createdAt.getTime();
  if (byDate !== 0) return byDate;
  return `${a.module}:${a.id}`.localeCompare(`${b.module}:${b.id}`);
}

function compareCode(a: string, b: string) {
  return codeNumber(a) - codeNumber(b) || a.localeCompare(b);
}

function codeNumber(code: string) {
  const match = code.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

async function normalizeRevertChanges(tx: Tx, changes: LooseSampleCodeChange[]) {
  const normalized: SampleCodeChange[] = [];

  for (const change of changes) {
    const module = normalizeModule(change.module);
    const previousCode = change.previousCode?.trim();
    const currentCode = (change.nextCode ?? change.currentCode ?? change.code)?.trim();
    const previousSequentialNumber = change.previousSequentialNumber ?? codeNumber(previousCode ?? "");

    if (!module || !previousCode || !currentCode || !Number.isFinite(previousSequentialNumber)) {
      continue;
    }

    if (change.id && change.category) {
      normalized.push({
        ...(change as SampleCodeRow),
        module,
        previousCode,
        previousSequentialNumber,
        nextCode: currentCode,
        nextSequentialNumber: change.nextSequentialNumber ?? codeNumber(currentCode)
      });
      continue;
    }

    const row = await findCurrentSampleByVisibleChange(tx, module, currentCode, change.name);
    if (!row) continue;

    normalized.push({
      ...row,
      previousCode,
      previousSequentialNumber,
      nextCode: currentCode,
      nextSequentialNumber: row.sequentialNumber
    });
  }

  return normalized;
}

async function findCurrentSampleByVisibleChange(
  tx: Tx,
  module: SampleModule,
  currentCode: string,
  name?: string | null
) {
  const where = {
    code: currentCode,
    ...(name ? { name } : {})
  };

  if (module === "interior") {
    const row = await tx.interiorSample.findFirst({
      where,
      select: { id: true, category: true, code: true, sequentialNumber: true, name: true, createdAt: true }
    });
    return row ? { ...row, module } : null;
  }

  const row = await tx.surfaceSample.findFirst({
    where,
    select: { id: true, category: true, code: true, sequentialNumber: true, name: true, createdAt: true }
  });
  return row ? { ...row, module } : null;
}

function normalizeModule(module: LooseSampleCodeChange["module"]): SampleModule | null {
  if (module === "interior" || module === "surface") return module;
  const normalized = String(module ?? "").trim().toLowerCase();
  if (normalized.includes("interior")) return "interior";
  if (normalized.includes("superficie") || normalized.includes("surface")) return "surface";
  return null;
}
