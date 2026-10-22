// Kriging ordinario con variograma esférico ajustado automáticamente a las muestras del nivel.
// A diferencia del IDW, tiene en cuenta cómo se parecen las muestras según su distancia (el variograma)
// y entrega además qué tan incierta es cada estimación (desviación del kriging).
import { dist, estimateSurface, geometry, neighborsOf, type EstimationResult, type Estimator, type Point, type Variogram } from "./idw.js";

const KRIGING_NEIGHBORS = 12;
const MIN_NEIGHBORS = 3;
const LAG_BINS = 12;

const spherical = (h: number, nugget: number, sill: number, range: number) => {
  if (h <= 0) return 0;
  if (h >= range) return sill;
  const r = h / range;
  return nugget + (sill - nugget) * (1.5 * r - 0.5 * r * r * r);
};

// Variograma experimental: semivarianza media de los pares de muestras agrupados por distancia.
function experimental(points: Point[], maxLag: number) {
  const width = maxLag / LAG_BINS;
  const sums = Array.from({ length: LAG_BINS }, () => ({ h: 0, g: 0, n: 0 }));
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      const h = dist(a, b);
      if (h <= 0 || h >= maxLag) continue;
      const bin = sums[Math.min(Math.floor(h / width), LAG_BINS - 1)]!;
      bin.h += h;
      bin.g += 0.5 * (a.value - b.value) ** 2;
      bin.n += 1;
    }
  }
  return sums.filter((b) => b.n >= 3).map((b) => ({ h: b.h / b.n, gamma: b.g / b.n, n: b.n }));
}

// Busca la pepita, la meseta y el alcance que mejor calzan con el variograma experimental (más peso a los lags con más pares y más cerca).
function fitVariogram(points: Point[]): Variogram {
  const mean = points.reduce((s, p) => s + p.value, 0) / points.length;
  const variance = points.reduce((s, p) => s + (p.value - mean) ** 2, 0) / Math.max(points.length - 1, 1) || 1e-9;
  const { bounds } = geometry(points);
  const maxLag = Math.max(Math.hypot(bounds.maxEast - bounds.minEast, bounds.maxNorth - bounds.minNorth) / 2, 1);
  const bins = experimental(points, maxLag);

  let best = { nugget: 0, sill: variance, range: maxLag, sse: Infinity };
  if (bins.length >= 3) {
    for (let r = 1; r <= 20; r++) {
      const range = (maxLag * r) / 12;
      for (const sillFactor of [0.7, 0.85, 1, 1.15, 1.3, 1.6]) {
        for (let k = 0; k <= 10; k++) {
          const sill = variance * sillFactor;
          const nugget = sill * (k / 12);
          let sse = 0;
          for (const b of bins) {
            const w = b.n / (b.h * b.h);
            sse += w * (b.gamma - spherical(b.h, nugget, sill, range)) ** 2;
          }
          if (sse < best.sse) best = { nugget, sill, range, sse };
        }
      }
    }
  } else {
    // Pocas parejas: modelo prudente (algo de pepita, alcance medio) en vez de uno ajustado a casi nada.
    best = { nugget: variance * 0.3, sill: variance, range: maxLag, sse: Infinity };
  }

  // Calce: cuánto del variograma experimental explica el modelo (1 = perfecto).
  let fit: number | null = null;
  if (bins.length >= 3) {
    const totalW = bins.reduce((s, b) => s + b.n / (b.h * b.h), 0);
    const meanGamma = bins.reduce((s, b) => s + (b.n / (b.h * b.h)) * b.gamma, 0) / totalW;
    const sst = bins.reduce((s, b) => s + (b.n / (b.h * b.h)) * (b.gamma - meanGamma) ** 2, 0);
    fit = sst > 0 ? Math.max(0, Math.min(1, 1 - best.sse / sst)) : null;
  }

  return { model: "spherical", nugget: best.nugget, sill: best.sill, range: best.range, bins, fit };
}

// Resuelve A·x = b (eliminación gaussiana con pivoteo). Devuelve null si el sistema no tiene solución estable.
function solve(a: number[][], b: number[]) {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row]![col]!) > Math.abs(a[pivot]![col]!)) pivot = row;
    if (Math.abs(a[pivot]![col]!) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot]!, a[col]!];
    [b[col], b[pivot]] = [b[pivot]!, b[col]!];
    for (let row = col + 1; row < n; row++) {
      const f = a[row]![col]! / a[col]![col]!;
      if (f === 0) continue;
      for (let k = col; k < n; k++) a[row]![k]! -= f * a[col]![k]!;
      b[row]! -= f * b[col]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let s = b[row]!;
    for (let k = row + 1; k < n; k++) s -= a[row]![k]! * x[k]!;
    x[row] = s / a[row]![row]!;
  }
  return x;
}

function krigingEstimator(points: Point[], vg: Variogram, radius: number): Estimator {
  const gamma = (h: number) => spherical(h, vg.nugget, vg.sill, vg.range);
  // Una pizca de regularización evita que dos muestras casi en el mismo punto vuelvan inestable el sistema.
  const ridge = vg.sill * 1e-8;
  return (east, north, skip) => {
    const { used, nearest } = neighborsOf(points, east, north, radius, KRIGING_NEIGHBORS, skip);
    if (used.length < MIN_NEIGHBORS) return { estimate: null, nearest };
    if (used[0] && used[0].d < 1e-9) return { estimate: used[0].p.value, nearest: 0, stdev: 0 };
    const n = used.length;
    const a = Array.from({ length: n + 1 }, () => new Array<number>(n + 1).fill(0));
    const b = new Array<number>(n + 1).fill(1);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) a[i]![j] = i === j ? ridge : gamma(dist(used[i]!.p, used[j]!.p));
      a[i]![n] = 1;
      a[n]![i] = 1;
      b[i] = gamma(used[i]!.d);
    }
    a[n]![n] = 0;
    const rhs = [...b];
    const x = solve(a, b);
    if (!x) return { estimate: null, nearest };
    let estimate = 0;
    let variance = x[n]!;
    for (let i = 0; i < n; i++) {
      estimate += x[i]! * used[i]!.p.value;
      variance += x[i]! * rhs[i]!;
    }
    if (!Number.isFinite(estimate)) return { estimate: null, nearest };
    return { estimate, nearest, stdev: Math.sqrt(Math.max(variance, 0)) };
  };
}

export function kriging(points: Point[]): EstimationResult | null {
  if (points.length < 8) return null;
  const variogram = fitVariogram(points);
  return estimateSurface(points, "kriging", (radius) => krigingEstimator(points, variogram, radius), { variogram });
}
