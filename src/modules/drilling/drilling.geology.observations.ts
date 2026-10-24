import { prisma } from "../../config/prisma.js";
import { photos } from "./drilling.geology.service.js";

// Revisión de la información geológica ya cargada: dice qué está incompleto o no cuadra, sin corregir nada.
// Cada observación explica el problema en palabras simples y señala dónde corregirlo.

export type ObservationSeverity = "error" | "warning" | "info";
export type ObservationCategory = "Reportes" | "Logueo" | "Fotos" | "Pozo";

export type Observation = {
  id: string;
  severity: ObservationSeverity;
  category: ObservationCategory;
  hole: string;
  holeId: string;
  title: string;
  detail: string;
  suggestion: string;
  evidence: Array<{ label: string; value: string }>;
  target: { tab: "reports" | "log" | "photos"; reportId?: string; photoIds?: string[] };
};

const EPS = 0.005;
const m = (value: number) => `${String(+value.toFixed(2)).replace(".", ",")} m`;
const day = (date: Date) => `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${date.getUTCFullYear()}`;
const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const range = (from: number, to: number) => `${m(from)} a ${m(to)}`;
const list = (items: string[], max = 12) => (items.length > max ? `${items.slice(0, max).join(", ")} y ${items.length - max} más` : items.join(", "));

type Span = [number, number];

// Une tramos que se tocan o se superponen.
function union(spans: Span[]): Span[] {
  const sorted = spans.filter(([a, b]) => b - a > EPS).sort((x, y) => x[0] - y[0]);
  const out: Span[] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + EPS) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

// Partes de [from, to] que no cubre ningún tramo de `covered`.
function uncovered(from: number, to: number, covered: Span[]): Span[] {
  const gaps: Span[] = [];
  let cursor = from;
  for (const [a, b] of union(covered)) {
    if (b <= cursor + EPS) continue;
    if (a >= to - EPS) break;
    if (a > cursor + EPS) gaps.push([cursor, Math.min(a, to)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to - EPS) gaps.push([cursor, to]);
  return gaps;
}

const parseMeters = (text?: string | null) => {
  const match = String(text ?? "").replace(",", ".").match(/[0-9]+(?:\.[0-9]+)?/);
  return match ? Number(match[0]) : null;
};

export const geologyObservations = {
  async review(holeId?: string) {
    const holes = await prisma.drillingHole.findMany({
      where: {
        ...(holeId ? { id: holeId } : {}),
        OR: [{ geologyReports: { some: {} } }, { logIntervals: { some: {} } }, { photos: { some: {} } }],
      },
      orderBy: { code: "asc" },
      include: {
        geologyReports: { orderBy: { date: "asc" } },
        logIntervals: { orderBy: [{ fromDepth: "asc" }, { toDepth: "asc" }] },
        photos: { orderBy: { sequence: "asc" } },
        coreBoxes: true,
      },
    });
    const integrity = await photos.integrity(holeId);
    const lostFiles = new Map<string, string[]>();
    for (const item of integrity.missing) lostFiles.set(item.holeId, [...(lostFiles.get(item.holeId) ?? []), item.code]);

    const items: Observation[] = [];
    const stats: Array<Record<string, unknown>> = [];

    for (const hole of holes) {
      const base = { hole: hole.code, holeId: hole.id };
      const add = (o: Omit<Observation, "hole" | "holeId">) => items.push({ ...base, ...o });
      const reports = hole.geologyReports;
      const log = hole.logIntervals;
      const pics = hole.photos;
      const reportById = new Map(reports.map((r) => [r.id, r]));
      const logSpans: Span[] = log.map((r) => [r.fromDepth, r.toDepth]);

      // ── Reportes ────────────────────────────────────────────────────────
      reports.forEach((report, index) => {
        const label = day(report.date);
        if (report.toDepth < report.fromDepth - EPS) {
          add({
            id: `${hole.code}:rep-inv:${report.id}`, severity: "error", category: "Reportes",
            title: `Reporte del ${label}: la profundidad final es menor que la inicial`,
            detail: `El reporte dice que se perforó de ${m(report.fromDepth)} a ${m(report.toDepth)}, que va hacia atrás.`,
            suggestion: "Corrige las profundidades 'Desde' y 'Hasta' del reporte.",
            evidence: [{ label: "Desde", value: m(report.fromDepth) }, { label: "Hasta", value: m(report.toDepth) }],
            target: { tab: "reports", reportId: report.id },
          });
        }
        const prev = reports[index - 1];
        if (prev) {
          const prevLabel = day(prev.date);
          const repeated = Math.abs(report.fromDepth - prev.fromDepth) < EPS && Math.abs(report.toDepth - prev.toDepth) < EPS && report.toDepth - report.fromDepth > EPS;
          const jump = report.fromDepth - prev.toDepth;
          if (repeated) {
            add({
              id: `${hole.code}:rep-dup:${report.id}`, severity: "warning", category: "Reportes",
              title: `Los reportes del ${prevLabel} y del ${label} dicen lo mismo: ${range(report.fromDepth, report.toDepth)}`,
              detail: "Dos días seguidos informan exactamente el mismo tramo perforado. Uno de los dos probablemente tiene mal las profundidades (o es una copia del anterior).",
              suggestion: "Revisa cuál es el tramo real de cada día y corrige 'Desde' / 'Hasta'.",
              evidence: [{ label: prevLabel, value: range(prev.fromDepth, prev.toDepth) }, { label: label, value: range(report.fromDepth, report.toDepth) }],
              target: { tab: "reports", reportId: report.id },
            });
          } else if (Math.abs(jump) > EPS && !(Math.abs(prev.toDepth - prev.fromDepth) < EPS && Math.abs(jump) < EPS)) {
            add({
              id: `${hole.code}:rep-gap:${report.id}`, severity: "warning", category: "Reportes",
              title: jump > 0
                ? `Faltan ${m(jump)} entre el reporte del ${prevLabel} y el del ${label}`
                : `El reporte del ${label} repite ${m(-jump)} que ya figuraban en el del ${prevLabel}`,
              detail: jump > 0
                ? `El día ${prevLabel} se llegó hasta ${m(prev.toDepth)}, pero el ${label} empieza en ${m(report.fromDepth)}. Nadie reportó los metros intermedios (${range(prev.toDepth, report.fromDepth)}).`
                : `El día ${prevLabel} terminó en ${m(prev.toDepth)} y el ${label} empieza en ${m(report.fromDepth)}: esos metros quedan contados dos veces.`,
              suggestion: jump > 0
                ? "Si falta un reporte de un día intermedio, créalo. Si el error está en 'Desde', corrígelo."
                : "Lo normal es que el 'Desde' de un día sea el 'Hasta' del día anterior. Corrige el que esté mal.",
              evidence: [{ label: prevLabel, value: range(prev.fromDepth, prev.toDepth) }, { label: label, value: range(report.fromDepth, report.toDepth) }],
              target: { tab: "reports", reportId: report.id },
            });
          }
          const days = Math.round((report.date.getTime() - prev.date.getTime()) / 86_400_000);
          if (days > 1) {
            const missing = Array.from({ length: days - 1 }, (_, k) => day(new Date(prev.date.getTime() + (k + 1) * 86_400_000)));
            add({
              id: `${hole.code}:rep-days:${report.id}`, severity: "info", category: "Reportes",
              title: `No hay reporte ${missing.length === 1 ? "del" : "de los días"} ${list(missing, 6)}`,
              detail: `Entre el reporte del ${prevLabel} y el del ${label} no hay reportes diarios. Puede ser que no se haya trabajado esos días o que falte cargarlos.`,
              suggestion: "Si hubo trabajo, crea los reportes que faltan. Si el pozo estuvo parado, no hace falta hacer nada.",
              evidence: [{ label: "Días sin reporte", value: missing.join(", ") }],
              target: { tab: "reports", reportId: report.id },
            });
          }
        }
        // El logueo debe cubrir lo que el reporte dice que se perforó.
        if (report.toDepth - report.fromDepth > EPS) {
          const gaps = uncovered(report.fromDepth, report.toDepth, logSpans);
          if (gaps.length) {
            add({
              id: `${hole.code}:rep-log:${report.id}`, severity: "warning", category: "Reportes",
              title: `Reporte del ${label}: ${m(gaps.reduce((s, [a, b]) => s + b - a, 0))} sin logueo`,
              detail: `El reporte indica ${range(report.fromDepth, report.toDepth)}, pero el logueo no tiene tramos en ${gaps.map(([a, b]) => range(a, b)).join("; ")}.`,
              suggestion: "Carga el logueo de esos metros, o corrige las profundidades del reporte si estaban mal.",
              evidence: gaps.map(([a, b]) => ({ label: "Sin logueo", value: range(a, b) })),
              target: { tab: "log" },
            });
          }
        }
        if (!pics.some((p) => p.reportId === report.id)) {
          const sameDay = pics.filter((p) => !p.reportId && p.takenAt && dayKey(p.takenAt) === dayKey(report.date));
          add({
            id: `${hole.code}:rep-nophoto:${report.id}`, severity: "info", category: "Reportes",
            title: `Reporte del ${label} sin fotos asociadas`,
            detail: sameDay.length
              ? `Este reporte no tiene fotos, pero hay ${sameDay.length} foto(s) tomadas ese mismo día que no están asociadas a ningún reporte: ${list(sameDay.map((p) => p.code), 8)}.`
              : "Este reporte no tiene ninguna foto asociada.",
            suggestion: sameDay.length ? "Asocia esas fotos a este reporte desde la pestaña Fotos (editar foto → Reporte)." : "Si ese día se tomaron fotos, súbelas y asócialas al reporte.",
            evidence: sameDay.map((p) => ({ label: p.code, value: p.kind })),
            target: sameDay.length ? { tab: "photos", photoIds: sameDay.map((p) => p.id) } : { tab: "reports", reportId: report.id },
          });
        }
        if (!report.geologySummary?.trim()) {
          add({
            id: `${hole.code}:rep-summary:${report.id}`, severity: "info", category: "Reportes",
            title: `Reporte del ${label} sin resumen geológico`,
            detail: "El reporte no tiene el texto del resumen geológico.", suggestion: "Completa el resumen geológico del día.",
            evidence: [], target: { tab: "reports", reportId: report.id },
          });
        }
      });

      // ── Logueo ──────────────────────────────────────────────────────────
      const sortedLog = [...log];
      if (sortedLog.length) {
        const first = sortedLog[0]!;
        if (first.fromDepth > EPS) {
          add({
            id: `${hole.code}:log-start`, severity: "warning", category: "Logueo",
            title: `El logueo empieza en ${m(first.fromDepth)}, no en 0`,
            detail: `No hay logueo entre 0 y ${m(first.fromDepth)}. Puede ser material de relleno sin loguear, o que falten esos tramos.`,
            suggestion: "Si ese tramo existe, agrégalo (por ejemplo como relleno 'ob'). Si no se logueó a propósito, déjalo.",
            evidence: [{ label: "Primer tramo", value: range(first.fromDepth, first.toDepth) }], target: { tab: "log" },
          });
        }
        const gaps: Span[] = [];
        const overlaps: Array<[Span, Span]> = [];
        const invalid: string[] = [];
        let reach = sortedLog[0]!.toDepth;
        let reachSpan: Span = [sortedLog[0]!.fromDepth, sortedLog[0]!.toDepth];
        for (const [i, row] of sortedLog.entries()) {
          if (row.toDepth <= row.fromDepth + EPS) invalid.push(range(row.fromDepth, row.toDepth));
          if (i === 0) continue;
          if (row.fromDepth > reach + EPS) gaps.push([reach, row.fromDepth]);
          else if (row.fromDepth < reach - EPS) overlaps.push([reachSpan, [row.fromDepth, row.toDepth]]);
          if (row.toDepth > reach) { reach = row.toDepth; reachSpan = [row.fromDepth, row.toDepth]; }
        }
        if (invalid.length) {
          add({
            id: `${hole.code}:log-invalid`, severity: "error", category: "Logueo",
            title: `${invalid.length} tramo(s) del logueo con profundidades inválidas`,
            detail: "Hay tramos cuyo 'Hasta' no es mayor que el 'Desde'.", suggestion: "Corrige esos tramos en la pestaña Logueo.",
            evidence: invalid.slice(0, 20).map((v) => ({ label: "Tramo", value: v })), target: { tab: "log" },
          });
        }
        if (gaps.length) {
          add({
            id: `${hole.code}:log-gaps`, severity: "warning", category: "Logueo",
            title: `${gaps.length} hueco(s) en el logueo (${m(gaps.reduce((s, [a, b]) => s + b - a, 0))} sin loguear)`,
            detail: "Entre un tramo y el siguiente quedan metros sin ninguna descripción.", suggestion: "Agrega los tramos que faltan en la pestaña Logueo.",
            evidence: gaps.slice(0, 20).map(([a, b]) => ({ label: "Sin logueo", value: range(a, b) })), target: { tab: "log" },
          });
        }
        if (overlaps.length) {
          add({
            id: `${hole.code}:log-overlaps`, severity: "warning", category: "Logueo",
            title: `${overlaps.length} tramo(s) del logueo se superponen`,
            detail: "Dos tramos describen los mismos metros, así que ese pedazo del pozo queda descrito dos veces.", suggestion: "Ajusta el 'Desde' / 'Hasta' de uno de los dos tramos.",
            evidence: overlaps.slice(0, 20).map(([a, b]) => ({ label: "Se superponen", value: `${range(a[0], a[1])}  con  ${range(b[0], b[1])}` })), target: { tab: "log" },
          });
        }
        const noLith = sortedLog.filter((r) => !r.lithology?.trim());
        if (noLith.length) {
          add({
            id: `${hole.code}:log-lith`, severity: "warning", category: "Logueo",
            title: `${noLith.length} tramo(s) del logueo sin litología`,
            detail: "Estos tramos no tienen el código de la roca (Lith_Code).", suggestion: "Completa la litología en la pestaña Logueo.",
            evidence: noLith.slice(0, 20).map((r) => ({ label: "Tramo", value: range(r.fromDepth, r.toDepth) })), target: { tab: "log" },
          });
        }
        const logTo = Math.max(...sortedLog.map((r) => r.toDepth));
        const last = reports[reports.length - 1];
        if (last && Math.abs(last.toDepth - logTo) > EPS) {
          const behind = last.toDepth > logTo;
          add({
            id: `${hole.code}:log-vs-report`, severity: behind ? "warning" : "info", category: "Logueo",
            title: behind ? `Se reportó hasta ${m(last.toDepth)} pero el logueo llega solo a ${m(logTo)}` : `El logueo llega a ${m(logTo)}, más allá de lo reportado (${m(last.toDepth)})`,
            detail: behind
              ? `El último reporte (${day(last.date)}) dice que se perforó hasta ${m(last.toDepth)}. Faltan ${m(last.toDepth - logTo)} por loguear.`
              : `El logueo tiene tramos hasta ${m(logTo)} pero el último reporte (${day(last.date)}) solo llega a ${m(last.toDepth)}. Puede faltar el reporte de esos metros.`,
            suggestion: behind ? "Termina el logueo de esos metros." : "Crea el reporte del día en que se perforaron esos metros.",
            evidence: [{ label: "Último reporte", value: `${day(last.date)} · hasta ${m(last.toDepth)}` }, { label: "Logueo", value: `hasta ${m(logTo)}` }], target: { tab: behind ? "log" : "reports" },
          });
        }
      }

      // ── Fotos ───────────────────────────────────────────────────────────
      const lost = lostFiles.get(hole.id) ?? [];
      if (lost.length) {
        add({
          id: `${hole.code}:photo-files`, severity: "error", category: "Fotos",
          title: `${lost.length} foto(s) registradas sin su archivo en el servidor`,
          detail: "El registro existe (código, fecha, reporte) pero la imagen no está guardada, así que no se puede ver.",
          suggestion: "Usa 'Restaurar imágenes perdidas' con los Excel o las fotos originales.",
          evidence: [{ label: "Códigos", value: list(lost, 20) }], target: { tab: "photos" },
        });
      }
      const unlinked = pics.filter((p) => !p.reportId);
      if (unlinked.length) {
        const byDay = new Map<string, typeof unlinked>();
        for (const p of unlinked) byDay.set(p.takenAt ? dayKey(p.takenAt) : "sin fecha", [...(byDay.get(p.takenAt ? dayKey(p.takenAt) : "sin fecha") ?? []), p]);
        const withReport = unlinked.filter((p) => p.takenAt && reports.some((r) => dayKey(r.date) === dayKey(p.takenAt!))).length;
        add({
          id: `${hole.code}:photo-noreport`, severity: "warning", category: "Fotos",
          title: `${unlinked.length} foto(s) sin reporte asociado`,
          detail: `Estas fotos no pertenecen a ningún reporte diario, por eso aparecen en "Sin reporte asociado". ${withReport === unlinked.length ? "Para todas existe un reporte del mismo día." : `Para ${withReport} existe un reporte del mismo día.`}`,
          suggestion: "Edita cada foto y elige su reporte (la fecha de la foto te dice cuál es).",
          evidence: [...byDay.entries()].sort().map(([d, ps]) => ({ label: d === "sin fecha" ? d : day(new Date(d)), value: `${ps.length} foto(s): ${list(ps.map((p) => p.code), 5)}` })),
          target: { tab: "photos", photoIds: unlinked.map((p) => p.id) },
        });
      }
      const mismatched = pics.filter((p) => p.reportId && p.takenAt && reportById.get(p.reportId) && dayKey(reportById.get(p.reportId)!.date) !== dayKey(p.takenAt));
      if (mismatched.length) {
        add({
          id: `${hole.code}:photo-date`, severity: "info", category: "Fotos",
          title: `${mismatched.length} foto(s) con fecha distinta a la de su reporte`,
          detail: "La fecha en que se tomó la foto no coincide con el día del reporte al que está asociada.", suggestion: "Revisa si la foto está en el reporte correcto.",
          evidence: mismatched.slice(0, 15).map((p) => ({ label: p.code, value: `foto ${day(p.takenAt!)} · reporte ${day(reportById.get(p.reportId!)!.date)}` })),
          target: { tab: "photos", photoIds: mismatched.map((p) => p.id) },
        });
      }

      // Qué tramos tienen foto de caja: solo se puede saber si la foto dice los metros o las cajas.
      const coreBoxPics = pics.filter((p) => p.kind === "CORE_BOX");
      const withDepth = coreBoxPics.filter((p) => p.fromDepth != null && p.toDepth != null);
      const withBoxes = coreBoxPics.filter((p) => p.boxFrom != null);
      const loggedMeters = union(logSpans).reduce((s, [a, b]) => s + b - a, 0);
      let coveredMeters: number | null = null;
      if (coreBoxPics.length && withDepth.length === 0 && withBoxes.length === 0) {
        add({
          id: `${hole.code}:photo-nometa`, severity: "warning", category: "Fotos",
          title: `No se puede saber qué tramos tienen foto de caja: ${coreBoxPics.length} fotos sin metros ni número de caja`,
          detail: "Las fotos de cajas de testigo no dicen qué metros muestran ni qué cajas son. Sin ese dato el sistema no puede decir si algún tramo perforado se quedó sin su bandeja fotografiada. No lo puede deducir mirando la imagen.",
          suggestion: "En cada foto de caja completa 'Caja desde/hasta' o 'Metros desde/hasta' (editar foto). Con eso esta revisión marcará los tramos sin foto.",
          evidence: [{ label: "Fotos de caja", value: String(coreBoxPics.length) }, { label: "Metros logueados", value: m(loggedMeters) }],
          target: { tab: "photos", photoIds: coreBoxPics.map((p) => p.id) },
        });
      } else if (coreBoxPics.length) {
        if (withDepth.length) {
          const photoSpans: Span[] = withDepth.map((p) => [p.fromDepth!, p.toDepth!]);
          const from = log.length ? Math.min(...log.map((r) => r.fromDepth)) : 0;
          const to = log.length ? Math.max(...log.map((r) => r.toDepth)) : 0;
          const gaps = uncovered(from, to, photoSpans);
          coveredMeters = union(photoSpans).reduce((s, [a, b]) => s + b - a, 0);
          if (gaps.length) {
            add({
              id: `${hole.code}:photo-coverage`, severity: "warning", category: "Fotos",
              title: `${gaps.length} tramo(s) perforados sin foto de caja (${m(gaps.reduce((s, [a, b]) => s + b - a, 0))})`,
              detail: `Las fotos de caja con metros registrados no cubren: ${gaps.slice(0, 8).map(([a, b]) => range(a, b)).join("; ")}.`,
              suggestion: "Sube la foto de esas cajas o, si ya existe, completa sus metros.", evidence: gaps.slice(0, 20).map(([a, b]) => ({ label: "Sin foto", value: range(a, b) })), target: { tab: "photos" },
            });
          }
          const partial = coreBoxPics.length - withDepth.length;
          if (partial > 0) {
            add({
              id: `${hole.code}:photo-partial`, severity: "info", category: "Fotos",
              title: `${partial} foto(s) de caja sin metros`, detail: "No se pueden contar en la cobertura porque no tienen metros desde/hasta.",
              suggestion: "Completa sus metros.", evidence: [], target: { tab: "photos", photoIds: coreBoxPics.filter((p) => p.fromDepth == null).map((p) => p.id) },
            });
          }
        }
        const numbers = new Set<number>();
        for (const p of withBoxes) for (let n = p.boxFrom!; n <= (p.boxTo ?? p.boxFrom!); n += 1) numbers.add(n);
        if (numbers.size) {
          const sorted = [...numbers].sort((a, b) => a - b);
          const missingBoxes: number[] = [];
          for (let n = sorted[0]!; n <= sorted[sorted.length - 1]!; n += 1) if (!numbers.has(n)) missingBoxes.push(n);
          if (missingBoxes.length) {
            add({
              id: `${hole.code}:photo-boxes`, severity: "warning", category: "Fotos",
              title: `Faltan fotos de ${missingBoxes.length} caja(s): ${list(missingBoxes.map(String), 10)}`,
              detail: `Hay fotos de las cajas ${sorted[0]} a ${sorted[sorted.length - 1]}, pero no de las intermedias.`, suggestion: "Sube la foto de las cajas que faltan.",
              evidence: [{ label: "Cajas sin foto", value: list(missingBoxes.map(String), 40) }], target: { tab: "photos" },
            });
          }
        }
        const noPhotoBoxes = hole.coreBoxes.filter((b) => !withBoxes.some((p) => p.boxFrom! <= b.boxNumber && (p.boxTo ?? p.boxFrom!) >= b.boxNumber));
        if (noPhotoBoxes.length) {
          add({
            id: `${hole.code}:photo-registered-boxes`, severity: "warning", category: "Fotos",
            title: `${noPhotoBoxes.length} caja(s) registradas sin foto`, detail: "Estas cajas existen en el registro de cajas pero ninguna foto las menciona.", suggestion: "Sube su foto o indica la caja en la foto correspondiente.",
            evidence: noPhotoBoxes.slice(0, 20).map((b) => ({ label: `Caja ${b.boxNumber}`, value: range(b.fromDepth, b.toDepth) })), target: { tab: "photos" },
          });
        }
      }

      // ── Pozo ────────────────────────────────────────────────────────────
      const last = reports[reports.length - 1];
      if (last && hole.status === "COMPLETED" && /progreso/i.test(last.endStatus ?? "")) {
        add({
          id: `${hole.code}:hole-status`, severity: "warning", category: "Pozo",
          title: "El pozo figura como completado pero el último reporte dice «En Progreso»",
          detail: `El estado del pozo es "completado", mientras que el último reporte (${day(last.date)}) lo deja en "${last.endStatus}".`,
          suggestion: "Revisa cuál es el estado real: corrige el reporte o el estado del pozo.", evidence: [{ label: "Estado del pozo", value: "Completado" }, { label: "Último reporte", value: String(last.endStatus) }], target: { tab: "reports", reportId: last.id },
        });
      }
      const planned = hole.plannedDepth ?? parseMeters(last?.programmedDepth);
      if (last && planned != null && last.toDepth > planned + EPS) {
        add({
          id: `${hole.code}:hole-deeper`, severity: "info", category: "Pozo",
          title: `Se perforó ${m(last.toDepth)}, más de lo programado (${m(planned)})`,
          detail: `El último reporte llega a ${m(last.toDepth)} y la profundidad programada es ${m(planned)}.`, suggestion: "Si se amplió el pozo, actualiza la profundidad programada. Si no, revisa el reporte.",
          evidence: [], target: { tab: "reports", reportId: last.id },
        });
      }
      if (reports.length && reports.every((r) => r.executedEast == null && r.executedNorth == null) && hole.east == null) {
        add({
          id: `${hole.code}:hole-coords`, severity: "info", category: "Pozo",
          title: "Sin coordenadas ejecutadas", detail: "Ni los reportes ni el pozo tienen las coordenadas reales de la boca del pozo, solo las planificadas.", suggestion: "Completa las coordenadas ejecutadas en el reporte (sección 1).",
          evidence: [], target: { tab: "reports", reportId: reports[0]!.id },
        });
      }

      stats.push({
        hole: hole.code, holeId: hole.id, reports: reports.length, logIntervals: log.length, loggedMeters: +loggedMeters.toFixed(2),
        photos: pics.length, coreBoxPhotos: coreBoxPics.length, photosWithMeters: withDepth.length, photosWithBoxes: withBoxes.length, photosWithoutReport: unlinked.length,
        photoCoveredMeters: coveredMeters == null ? null : +coveredMeters.toFixed(2),
      });
    }

    const order = { error: 0, warning: 1, info: 2 } as const;
    items.sort((a, b) => order[a.severity] - order[b.severity] || a.hole.localeCompare(b.hole) || a.category.localeCompare(b.category));
    const count = (s: ObservationSeverity) => items.filter((i) => i.severity === s).length;
    return { generatedAt: new Date().toISOString(), summary: { error: count("error"), warning: count("warning"), info: count("info"), total: items.length }, holes: stats, items };
  },
};
