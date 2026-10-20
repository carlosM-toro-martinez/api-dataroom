// Prueba del cálculo de interceptos con casos conocidos. npx tsx scripts/intercepts-selftest.ts
import { computeIntercepts, type AssayedInterval } from "../src/modules/miningExploration/intercepts.js";
let ok = 0, bad = 0;
const check = (label: string, cond: unknown, detail = "") => { cond ? ok++ : bad++; console.log(`${cond ? "OK " : "XX "} ${label} ${detail}`); };
const iv = (from: number, to: number, au: number | null): AssayedInterval => ({ from, to, au, cu: au === null ? null : 0.1, ag: au === null ? null : 1 });
const P = { element: "au" as const, cutoff: 0.5, minWidth: 1, maxDilution: 2 };

let r = computeIntercepts([iv(0, 1, 0.1), iv(1, 2, 2), iv(2, 3, 4), iv(3, 4, 0.1)], P);
check("un tramo de 2 m con 2 y 4 g/t → 3 g/t ponderado", r.length === 1 && r[0]!.fromDepth === 1 && r[0]!.toDepth === 3 && r[0]!.width === 2 && r[0]!.au === 3, JSON.stringify(r));
r = computeIntercepts([iv(0, 1, 2), iv(1, 2, 0.1), iv(2, 3, 2)], P);
check("1 m de dilución interna se incluye (promedio 1.367)", r.length === 1 && r[0]!.width === 3 && r[0]!.au === 1.367, JSON.stringify(r));
r = computeIntercepts([iv(0, 1, 2), iv(1, 4, 0.1), iv(4, 5, 2)], P);
check("3 m de dilución (> máximo) separa dos tramos de 1 m", r.length === 2 && r.every((x) => x.width === 1), JSON.stringify(r));
r = computeIntercepts([iv(0, 0.5, 3)], P);
check("tramo menor al ancho mínimo se descarta", r.length === 0);
r = computeIntercepts([iv(0, 1, 2), iv(5, 6, 2)], { ...P, minWidth: 0.5 });
check("tramos no contiguos no se unen", r.length === 2);
r = computeIntercepts([iv(0, 1, 2), iv(1, 2, null), iv(2, 3, 2)], P);
check("un intervalo sin ensayo cuenta como sin ley dentro de la dilución", r.length === 1 && r[0]!.au === 1.333, JSON.stringify(r));
r = computeIntercepts([iv(0, 1, 0.4), iv(1, 2, 0.3)], P);
check("nada sobre el corte → sin interceptos", r.length === 0);
r = computeIntercepts([iv(2, 3, 2), iv(0, 1, 2), iv(1, 2, 2)], P);
check("acepta intervalos desordenados", r.length === 1 && r[0]!.width === 3);
console.log(`\n${ok} OK / ${bad} fallos`);
process.exit(bad ? 1 : 0);
