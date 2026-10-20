// Cálculo de «Significant Intercepts» a partir de los ensayos (Assay) de cada intervalo.
// Un intercepto es un tramo continuo del sondaje cuya ley compuesta (promedio ponderado por largo) supera el corte,
// pudiendo incluir algo de material de baja ley (dilución interna) hasta un máximo.

export type InterceptElement = "au" | "cu" | "ag";

export type AssayedInterval = {
  from: number;
  to: number;
  // Promedio de los ensayos del intervalo. null = el intervalo no tiene ensayo (se trata como material sin ley).
  au: number | null;
  cu: number | null;
  ag: number | null;
};

export type InterceptParams = {
  element: InterceptElement;
  cutoff: number; // ley mínima del elemento (Au g/t, Cu %, Ag g/t)
  minWidth: number; // largo mínimo del intercepto (m)
  maxDilution: number; // máximo de metros consecutivos bajo el corte permitidos dentro del tramo
};

export type ComputedIntercept = {
  fromDepth: number;
  toDepth: number;
  width: number;
  au: number | null;
  cu: number | null;
  ag: number | null;
  intervals: number;
};

const round = (value: number, digits = 3) => Math.round(value * 10 ** digits) / 10 ** digits;
const CONTIGUOUS_TOLERANCE = 0.011;

type Piece = AssayedInterval & { width: number };

function composite(pieces: Piece[]) {
  const width = pieces.reduce((sum, p) => sum + p.width, 0);
  const weighted = (key: InterceptElement) => {
    const assayed = pieces.filter((p) => p[key] !== null);
    if (!assayed.length) return null;
    // Los tramos sin ensayo cuentan como 0 en el promedio (no se inventa ley donde no se midió).
    return pieces.reduce((sum, p) => sum + (p[key] ?? 0) * p.width, 0) / width;
  };
  return { width, au: weighted("au"), cu: weighted("cu"), ag: weighted("ag") };
}

export function computeIntercepts(intervals: AssayedInterval[], params: InterceptParams): ComputedIntercept[] {
  const sorted = [...intervals].filter((i) => i.to > i.from).sort((a, b) => a.from - b.from || a.to - b.to);
  const result: ComputedIntercept[] = [];
  let run: Piece[] = [];
  let waste: Piece[] = [];

  const grade = (piece: { au: number | null; cu: number | null; ag: number | null }) => piece[params.element] ?? -1;
  const gradeOf = (pieces: Piece[]) => composite(pieces)[params.element] ?? -1;

  const close = () => {
    const first = run[0];
    const last = run[run.length - 1];
    if (first && last) {
      const c = composite(run);
      if (c.width + 1e-9 >= params.minWidth) {
        result.push({
          fromDepth: round(first.from),
          toDepth: round(last.to),
          width: round(c.width),
          au: c.au === null ? null : round(c.au),
          cu: c.cu === null ? null : round(c.cu),
          ag: c.ag === null ? null : round(c.ag),
          intervals: run.length,
        });
      }
    }
    run = [];
    waste = [];
  };

  let previousTo: number | null = null;
  for (const interval of sorted) {
    const piece: Piece = { ...interval, width: interval.to - interval.from };
    const contiguous = previousTo !== null && Math.abs(interval.from - previousTo) <= CONTIGUOUS_TOLERANCE;
    if (!contiguous) close();
    previousTo = interval.to;

    if (grade(piece) >= params.cutoff) {
      if (!run.length) {
        run = [piece];
      } else if (waste.reduce((s, w) => s + w.width, 0) <= params.maxDilution + 1e-9 && gradeOf([...run, ...waste, piece]) >= params.cutoff) {
        run = [...run, ...waste, piece];
        waste = [];
      } else {
        close();
        run = [piece];
      }
      waste = [];
    } else if (run.length) {
      const wasteWidth = waste.reduce((s, w) => s + w.width, 0) + piece.width;
      if (wasteWidth <= params.maxDilution + 1e-9) waste = [...waste, piece];
      else close();
    }
  }
  close();
  return result;
}
