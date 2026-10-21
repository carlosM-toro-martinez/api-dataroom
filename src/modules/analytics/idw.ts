// Estimación espacial por distancia inversa (IDW). Es más simple que el kriging: no necesita variograma,
// por eso sirve como primera aproximación; un geólogo debe validar el resultado antes de usarlo para decidir.

export type Point = { id: string; code: string; east: number; north: number; value: number };
export type Cell = { east: number; north: number; estimate: number; distance: number };
export type Suggestion = { east: number; north: number; estimate: number; distance: number; score: number };

export type IdwResult = {
  points: number;
  step: number;
  radius: number;
  bounds: { minEast: number; maxEast: number; minNorth: number; maxNorth: number };
  cells: Cell[];
  suggestions: Suggestion[];
  // Validación cruzada (se quita cada muestra y se estima con las demás).
  validation: { n: number; rmse: number; meanError: number; correlation: number | null };
  stats: { min: number; max: number; mean: number; p75: number };
};

const POWER = 2;
const NEIGHBORS = 8;
const MAX_GRID = 60;

const dist = (a: { east: number; north: number }, b: { east: number; north: number }) => Math.hypot(a.east - b.east, a.north - b.north);

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return (sorted[lo] ?? 0) + ((sorted[hi] ?? 0) - (sorted[lo] ?? 0)) * (pos - lo);
}

// Estima en (east, north) con los `k` vecinos más cercanos dentro del radio. `skip` excluye una muestra (validación cruzada).
function estimateAt(points: Point[], east: number, north: number, radius: number, skip?: string) {
  const near: Array<{ d: number; value: number }> = [];
  let nearest = Infinity;
  for (const p of points) {
    if (p.id === skip) continue;
    const d = Math.hypot(p.east - east, p.north - north);
    if (d < nearest) nearest = d;
    if (d <= radius) near.push({ d, value: p.value });
  }
  if (!near.length) return { estimate: null as number | null, nearest };
  near.sort((a, b) => a.d - b.d);
  const used = near.slice(0, NEIGHBORS);
  if (used[0] && used[0].d < 1e-9) return { estimate: used[0].value, nearest: 0 };
  let num = 0;
  let den = 0;
  for (const n of used) {
    const w = 1 / Math.pow(n.d, POWER);
    num += w * n.value;
    den += w;
  }
  return { estimate: num / den, nearest };
}

export function idw(points: Point[]): IdwResult | null {
  if (points.length < 5) return null;

  const east = points.map((p) => p.east);
  const north = points.map((p) => p.north);
  const bounds = { minEast: Math.min(...east), maxEast: Math.max(...east), minNorth: Math.min(...north), maxNorth: Math.max(...north) };
  const width = Math.max(bounds.maxEast - bounds.minEast, 1);
  const height = Math.max(bounds.maxNorth - bounds.minNorth, 1);

  // Distancia típica entre muestras vecinas: define hasta dónde se confía en la estimación.
  const nearestDistances = points
    .map((p) => {
      let best = Infinity;
      for (const q of points) if (q !== p) best = Math.min(best, dist(p, q));
      return best;
    })
    .filter((d) => Number.isFinite(d) && d > 0)
    .sort((a, b) => a - b);
  const medianNn = quantile(nearestDistances, 0.5) || Math.max(width, height) / 10;
  const radius = medianNn * 3;

  const step = Math.max(Math.max(width, height) / MAX_GRID, medianNn / 2, 0.5);
  const margin = radius / 2;
  const cells: Cell[] = [];
  for (let e = bounds.minEast - margin; e <= bounds.maxEast + margin; e += step) {
    for (let n = bounds.minNorth - margin; n <= bounds.maxNorth + margin; n += step) {
      const { estimate, nearest } = estimateAt(points, e, n, radius);
      if (estimate != null) cells.push({ east: e, north: n, estimate, distance: nearest });
    }
  }

  const sortedValues = points.map((p) => p.value).sort((a, b) => a - b);
  const stats = {
    min: sortedValues[0] ?? 0,
    max: sortedValues[sortedValues.length - 1] ?? 0,
    mean: points.reduce((sum, p) => sum + p.value, 0) / points.length,
    p75: quantile(sortedValues, 0.75),
  };

  // Puntos sugeridos: buena ley estimada y lejos de la muestra más cercana, separados entre sí.
  const maxDistance = Math.max(...cells.map((c) => c.distance), 1);
  const span = Math.max(stats.max - stats.min, 1e-9);
  const candidates = cells
    .filter((c) => c.estimate >= stats.p75 && c.distance >= medianNn)
    .map((c) => ({ ...c, score: ((c.estimate - stats.min) / span) * 0.6 + (c.distance / maxDistance) * 0.4 }))
    .sort((a, b) => b.score - a.score);
  const suggestions: Suggestion[] = [];
  for (const c of candidates) {
    if (suggestions.length >= 8) break;
    if (suggestions.every((s) => dist(s, c) >= radius)) suggestions.push(c);
  }

  // Validación cruzada.
  const errors: number[] = [];
  const predicted: number[] = [];
  const actual: number[] = [];
  for (const p of points) {
    const { estimate } = estimateAt(points, p.east, p.north, radius, p.id);
    if (estimate == null) continue;
    errors.push(estimate - p.value);
    predicted.push(estimate);
    actual.push(p.value);
  }
  const n = errors.length;
  const rmse = n ? Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / n) : 0;
  const meanError = n ? errors.reduce((sum, e) => sum + e, 0) / n : 0;
  let correlation: number | null = null;
  if (n >= 3) {
    const mp = predicted.reduce((a, b) => a + b, 0) / n;
    const ma = actual.reduce((a, b) => a + b, 0) / n;
    let cov = 0;
    let vp = 0;
    let va = 0;
    for (let i = 0; i < n; i++) {
      const dp = (predicted[i] ?? 0) - mp;
      const da = (actual[i] ?? 0) - ma;
      cov += dp * da;
      vp += dp * dp;
      va += da * da;
    }
    correlation = vp > 0 && va > 0 ? cov / Math.sqrt(vp * va) : null;
  }

  return { points: points.length, step, radius, bounds, cells, suggestions, validation: { n, rmse, meanError, correlation }, stats };
}
