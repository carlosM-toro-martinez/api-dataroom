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

const CATEGORY_LOCK_KEYS: Record<SampleCategory, number> = {
  EXPLORATION: 440001,
  PRODUCTION: 440002
};

export function sampleCodeFor(category: SampleCategory, sequentialNumber: number) {
  const prefix = category === "PRODUCTION" ? "M" : "EX";
  return `${prefix}-${String(sequentialNumber).padStart(4, "0")}`;
}

export async function allocateGlobalSampleCode(tx: Tx, category: SampleCategory) {
  await lockCategory(tx, category);

  const [interiorMax, surfaceMax] = await Promise.all([
    tx.interiorSample.aggregate({ where: { category }, _max: { sequentialNumber: true } }),
    tx.surfaceSample.aggregate({ where: { category }, _max: { sequentialNumber: true } })
  ]);
  const sequentialNumber = Math.max(
    interiorMax._max.sequentialNumber ?? 0,
    surfaceMax._max.sequentialNumber ?? 0
  ) + 1;

  return {
    sequentialNumber,
    code: sampleCodeFor(category, sequentialNumber)
  };
}

export async function compactGlobalSampleCodesAfterDelete(
  tx: Tx,
  category: SampleCategory,
  deletedSequentialNumber: number,
  userId?: number
) {
  await lockCategory(tx, category);
  const rows = await getGlobalSampleRows(tx, category);
  const laterRows = rows.filter((row) => row.sequentialNumber > deletedSequentialNumber);
  await temporarilyRenameRows(tx, laterRows);

  for (const row of laterRows) {
    const nextSequentialNumber = row.sequentialNumber - 1;
    await updateSampleCode(tx, row, nextSequentialNumber, userId);
  }

  return laterRows.map((row) => ({
    ...row,
    previousCode: row.code,
    previousSequentialNumber: row.sequentialNumber,
    nextSequentialNumber: row.sequentialNumber - 1,
    nextCode: sampleCodeFor(category, row.sequentialNumber - 1)
  }));
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
          const categoryRows = beforeRows
            .filter((row) => row.category === category)
            .sort(compareSampleRowsForRenumbering);
          const planned = categoryRows.flatMap((row, index) => {
            const nextSequentialNumber = index + 1;
            const nextCode = sampleCodeFor(category, nextSequentialNumber);
            if (row.sequentialNumber === nextSequentialNumber && row.code === nextCode) return [];
            return [{
              ...row,
              previousCode: row.code,
              previousSequentialNumber: row.sequentialNumber,
              nextCode,
              nextSequentialNumber
            }];
          });

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
