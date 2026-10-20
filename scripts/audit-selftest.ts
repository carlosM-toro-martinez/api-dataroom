// Prueba de punta a punta de la bitácora de auditoría. Necesita la API corriendo (API_URL, por defecto
// http://localhost:3999/api) y un administrador (AUDIT_TEST_EMAIL / AUDIT_TEST_PASSWORD, o ADMIN_EMAIL / ADMIN_PASSWORD). Deja la bitácora con registros
// de prueba (es de solo agregado) pero no deja datos de prueba en las demás tablas.
//   npx tsx scripts/audit-selftest.ts
import "dotenv/config";
import { basePrisma, prisma } from "../src/config/prisma.js";

const API = process.env.API_URL ?? "http://localhost:3999/api";
const EMAIL = process.env.AUDIT_TEST_EMAIL ?? process.env.ADMIN_EMAIL ?? "";
const PASSWORD = process.env.AUDIT_TEST_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "";

(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) { return Number(this); };

let ok = 0;
let bad = 0;
const check = (label: string, condition: unknown, detail = "") => {
  condition ? ok++ : bad++;
  console.log(`${condition ? "OK " : "XX "} ${label} ${detail}`);
};

const call = async (method: string, path: string, token?: string, body?: unknown) => {
  const response = await fetch(API + path, {
    method,
    headers: { "content-type": "application/json", "user-agent": "audit-selftest", "x-forwarded-for": "203.0.113.7", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: (await response.json().catch(() => null)) as any };
};

const rowsFor = (table: string, id: string) =>
  basePrisma.$queryRawUnsafe<any[]>(`SELECT * FROM audit_log WHERE table_name = $1 AND record_id = $2 ORDER BY seq`, table, id);

async function main() {
  const before = await basePrisma.$queryRawUnsafe<any[]>(`SELECT last_seq FROM audit_chain_head WHERE id = 1`);
  const startSeq = Number(before[0].last_seq);

  // ── Ingreso
  const bad1 = await call("POST", "/auth/login", undefined, { email: EMAIL, password: "clave-equivocada" });
  check("login con clave mala: 401", bad1.status === 401);
  const failed = await basePrisma.$queryRawUnsafe<any[]>(`SELECT * FROM audit_log WHERE action = 'LOGIN_FAILED' ORDER BY seq DESC LIMIT 1`);
  check("queda LOGIN_FAILED con IP y motivo", failed[0]?.ip === "203.0.113.7" && failed[0]?.detail?.motivo === "contraseña incorrecta", JSON.stringify(failed[0]?.detail));
  const login = await call("POST", "/auth/login", undefined, { email: EMAIL, password: PASSWORD });
  const token = login.data?.data?.accessToken as string;
  const adminId = login.data?.data?.user?.id as number;
  check("login correcto", Boolean(token));
  const loginRow = await basePrisma.$queryRawUnsafe<any[]>(`SELECT * FROM audit_log WHERE action = 'LOGIN' ORDER BY seq DESC LIMIT 1`);
  check("queda LOGIN con el usuario", loginRow[0]?.actor_id === adminId && loginRow[0]?.actor_email === EMAIL);
  const noise = await basePrisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM audit_log WHERE table_name = 'User' AND action = 'UPDATE' AND seq > (SELECT seq FROM audit_log WHERE action = 'LOGIN' ORDER BY seq DESC LIMIT 1)`);
  check("la renovación del token de sesión no genera ruido en la bitácora", noise.length === 0);

  // ── Crear / editar / borrar por la API (Sondajes)
  const created = await call("POST", "/drilling/contractors", token, { name: "PRUEBA AUDITORIA" });
  const contractorId = created.data?.data?.id as string;
  check("crear contratista", created.status === 201 && contractorId);
  let history = await rowsFor("DrillingContractor", contractorId);
  check("INSERT registrado con quién, ruta e IP", history[0]?.action === "INSERT" && history[0].actor_id === adminId && history[0].route === "POST /api/drilling/contractors" && history[0].ip === "203.0.113.7" && history[0].source === "api" && history[0].record_label === "PRUEBA AUDITORIA", JSON.stringify({ a: history[0]?.actor_id, r: history[0]?.route, s: history[0]?.source }));
  await call("PATCH", `/drilling/contractors/${contractorId}`, token, { description: "texto nuevo" });
  history = await rowsFor("DrillingContractor", contractorId);
  const upd = history.find((row) => row.action === "UPDATE");
  check("UPDATE guarda solo lo que cambió (antes y después)", upd && upd.changed_fields.join() === "description" && upd.new_data.description === "texto nuevo" && upd.old_data.description == null && !("name" in upd.new_data), JSON.stringify(upd?.new_data));
  await call("PATCH", `/drilling/contractors/${contractorId}`, token, { description: "texto nuevo" });
  check("un UPDATE que no cambia nada no genera ruido", (await rowsFor("DrillingContractor", contractorId)).filter((row) => row.action === "UPDATE").length === 1);
  await call("DELETE", `/drilling/contractors/${contractorId}`, token);
  history = await rowsFor("DrillingContractor", contractorId);
  const del = history.find((row) => row.action === "DELETE");
  check("DELETE conserva el registro borrado completo y quién lo borró", del && del.old_data.name === "PRUEBA AUDITORIA" && del.actor_id === adminId && del.record_label === "PRUEBA AUDITORIA");

  // ── Flujos reales de Sondajes: pozo, parte diario, logueo (createMany en transacción), personal
  const campaigns = await call("GET", "/drilling/campaigns?limit=1", token);
  const campaignId = (campaigns.data?.data?.data ?? campaigns.data?.data)?.[0]?.id as string;
  const hole = await call("POST", "/drilling/holes", token, { campaignId, code: "ZZ-AUDIT-TEST" });
  const holeId = hole.data?.data?.id as string;
  check("crear pozo de prueba", hole.status === 201 && holeId, JSON.stringify(hole.data).slice(0, 80));
  const report = await call("POST", `/drilling/holes/${holeId}/shift-reports`, token, { date: "2026-10-01T00:00:00.000Z", shift: "DAY", fromDepth: 0, toDepth: 10 });
  const reportId = report.data?.data?.id as string;
  check("crear parte diario", report.status === 201 && reportId);
  const holeRows = await rowsFor("DrillingHole", holeId);
  check("el cambio de estado automático del pozo también quedó a nombre del usuario", holeRows.some((r) => r.action === "UPDATE" && r.changed_fields.includes("status") && r.actor_id === adminId));
  const logPut = await call("PUT", `/drilling/holes/${holeId}/geology-log`, token, { rows: [{ fromDepth: 0, toDepth: 1, lithology: "ob" }, { fromDepth: 1, toDepth: 2, lithology: "ct" }] });
  check("reemplazar logueo (borrar + crear en una transacción)", logPut.status === 200, JSON.stringify(logPut.data).slice(0, 80));
  const logRows = await basePrisma.$queryRawUnsafe<any[]>(`SELECT action, actor_id FROM audit_log WHERE table_name = 'DrillingLogInterval' AND request_id = (SELECT request_id FROM audit_log WHERE table_name = 'DrillingLogInterval' ORDER BY seq DESC LIMIT 1)`);
  check("el logueo creó 2 filas auditadas", logRows.filter((r) => r.action === "INSERT").length === 2 && logRows.every((r) => r.actor_id === adminId));
  await call("PUT", `/drilling/holes/${holeId}/geology-log`, token, { rows: [] });
  const person = await call("POST", "/drilling/personnel", token, { name: "PERSONA AUDITORIA", role: "operator", shift: "DAY" });
  const personId = person.data?.data?.id as string;
  await call("DELETE", `/drilling/personnel/${personId}`, token);
  check("personal creado y eliminado queda auditado", (await rowsFor("DrillingPersonnel", personId)).map((r) => r.action).join() === "INSERT,DELETE");
  await call("DELETE", `/drilling/shift-reports/${reportId}`, token);
  const imported = await call("POST", "/drilling/holes/import", token, { campaignId, holes: [{ code: "ZZ-AUDIT-I1" }, { code: "ZZ-AUDIT-I2" }] });
  check("importar pozos (createMany)", imported.status === 201, JSON.stringify(imported.data).slice(0, 80));
  const importedHoles = await basePrisma.$queryRawUnsafe<any[]>(`SELECT id FROM "DrillingHole" WHERE code LIKE 'ZZ-AUDIT-%'`);
  for (const row of importedHoles) await call("DELETE", `/drilling/holes/${row.id}`, token);
  const gone = await basePrisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM "DrillingHole" WHERE code LIKE 'ZZ-AUDIT-%'`);
  check("los pozos de prueba se borraron (y los borrados quedaron auditados)", gone.length === 0 && (await rowsFor("DrillingHole", holeId)).some((r) => r.action === "DELETE" && r.actor_id === adminId));

  // ── Otro módulo: roles (usuarios y permisos) y usuarios con clave
  const roleKey = "ROL_PRUEBA_AUDIT";
  await call("POST", "/roles", token, { key: roleKey, name: "Rol de prueba", description: "x", permissions: { sondajes: ["read"] } });
  await call("PATCH", `/roles/${roleKey}`, token, { permissions: { sondajes: ["read", "create"] } });
  const roleRows = await rowsFor("Role", roleKey);
  check("cambios de permisos de un rol quedan auditados", roleRows.some((r) => r.action === "INSERT") && roleRows.some((r) => r.action === "UPDATE" && JSON.stringify(r.new_data).includes("create")), String(roleRows.length));
  const reg = await call("POST", "/auth/register", token, { nombre: "Usuario Prueba Auditoria", email: "auditoria.prueba@test.local", password: "Prueba2026!", role: roleKey });
  const newUserId = String(reg.data?.data?.id ?? reg.data?.id);
  const userRows = await rowsFor("User", newUserId);
  check("alta de usuario auditada y sin la contraseña", userRows[0]?.action === "INSERT" && userRows[0].new_data.password === "[REDACTADO]" && !JSON.stringify(userRows[0]).includes("Prueba2026"), JSON.stringify(userRows[0]?.new_data?.password));

  // ── Permisos: un usuario sin permiso no puede ver la bitácora y el intento queda registrado
  const login2 = await call("POST", "/auth/login", undefined, { email: "auditoria.prueba@test.local", password: "Prueba2026!" });
  const token2 = login2.data?.data?.accessToken as string;
  const denied = await call("GET", "/audit", token2);
  check("usuario no administrador: 403 en /audit", denied.status === 403);
  await new Promise((resolve) => setTimeout(resolve, 400)); // el registro del intento se escribe sin bloquear la respuesta
  const deniedRow = await basePrisma.$queryRawUnsafe<any[]>(`SELECT * FROM audit_log WHERE action = 'ACCESS_DENIED' ORDER BY seq DESC LIMIT 1`);
  check("el acceso denegado queda registrado", deniedRow[0]?.actor_email === "auditoria.prueba@test.local" && deniedRow[0]?.table_name === "auditoria");
  const adminList = await call("GET", "/audit?limit=5&table=Role", token);
  check("administrador consulta la bitácora con filtros", adminList.status === 200 && adminList.data?.data?.data?.length > 0 && adminList.data.data.data.every((r: any) => r.table_name === "Role"));
  const detail = await call("GET", `/audit/${roleRows[0].seq}`, token);
  check("detalle de un registro", detail.status === 200 && detail.data?.data?.new_data?.key === roleKey);

  // ── Cambios hechos fuera de la API (SQL directo): también quedan, con otro origen
  await basePrisma.$executeRawUnsafe(`UPDATE "Role" SET description = 'cambio manual' WHERE key = '${roleKey}'`);
  const manual = (await rowsFor("Role", roleKey)).filter((r) => r.action === "UPDATE").pop();
  check("cambio por SQL directo queda con origen «database» y sin usuario", manual?.source === "database" && manual?.actor_id == null && manual?.db_user);

  // ── Transacciones: todo o nada, también para la bitácora
  const marker = "ATOMICIDAD-" + Date.now();
  await prisma.$transaction(async (tx) => {
    await tx.drillingContractor.create({ data: { name: marker } });
    throw new Error("rollback a propósito");
  }).catch(() => undefined);
  const leaked = await basePrisma.$queryRawUnsafe<any[]>(`SELECT 1 FROM audit_log WHERE record_label = $1`, marker);
  check("si la transacción se revierte, la bitácora también", leaked.length === 0);
  const commitMarker = "COMMIT-" + Date.now();
  await prisma.$transaction(async (tx) => {
    await tx.drillingContractor.create({ data: { name: commitMarker } });
    await tx.drillingContractor.deleteMany({ where: { name: commitMarker } });
  });
  const committed = await basePrisma.$queryRawUnsafe<any[]>(`SELECT action, source, actor_id FROM audit_log WHERE record_label = $1 ORDER BY seq`, commitMarker);
  check("transacción confirmada: INSERT + DELETE auditados (origen sistema)", committed.map((r) => r.action).join() === "INSERT,DELETE" && committed[0].source === "system");

  // ── Concurrencia: 25 escrituras a la vez, sin interbloqueos y con numeración continua
  const names = Array.from({ length: 25 }, (_, i) => `CONC-${Date.now()}-${i}`);
  const results = await Promise.allSettled(names.map((name) => prisma.drillingContractor.create({ data: { name } })));
  check("25 escrituras simultáneas sin errores", results.every((r) => r.status === "fulfilled"), results.filter((r) => r.status === "rejected").map((r: any) => r.reason?.message).slice(0, 1).join());
  await prisma.drillingContractor.deleteMany({ where: { name: { in: names } } });

  // ── La bitácora no se puede alterar
  for (const [label, sql] of [
    ["UPDATE", `UPDATE audit_log SET action = 'X' WHERE seq = ${startSeq + 1}`],
    ["DELETE", `DELETE FROM audit_log WHERE seq = ${startSeq + 1}`],
    ["TRUNCATE", `TRUNCATE audit_log`],
  ] as const) {
    const error = await basePrisma.$executeRawUnsafe(sql).then(() => null, (e) => e);
    check(`${label} sobre la bitácora es rechazado`, error && /solo agregado/.test(String(error.message)), String(error?.message ?? "").slice(0, 60));
  }

  // ── Integridad de la cadena
  const verify = await call("GET", "/audit/verify", token);
  check("la cadena de hashes está íntegra", verify.data?.data?.ok === true, JSON.stringify(verify.data?.data));
  const target = (await rowsFor("Role", roleKey))[0];
  const tamper = await basePrisma
    .$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`ALTER TABLE audit_log DISABLE TRIGGER audit_log_immutable`);
      await tx.$executeRawUnsafe(`UPDATE audit_log SET actor_id = 999 , new_data = '{"alterado":true}'::jsonb WHERE seq = ${target.seq}`);
      const result = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM audit_verify()`);
      throw Object.assign(new Error("rollback"), { result });
    })
    .catch((e) => e.result);
  check("si alguien altera un registro, la verificación lo detecta y dice cuál", tamper?.[0]?.ok === false && Number(tamper[0].broken_seq) === Number(target.seq), JSON.stringify(tamper?.[0], (_, v) => (typeof v === "bigint" ? Number(v) : v)));
  const gap = await basePrisma
    .$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`ALTER TABLE audit_log DISABLE TRIGGER audit_log_immutable`);
      await tx.$executeRawUnsafe(`DELETE FROM audit_log WHERE seq = ${target.seq}`);
      const result = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM audit_verify()`);
      throw Object.assign(new Error("rollback"), { result });
    })
    .catch((e) => e.result);
  check("si alguien borra un registro, la verificación lo detecta", gap?.[0]?.ok === false);
  const after = await call("GET", "/audit/verify", token);
  check("tras las pruebas de manipulación (revertidas) la cadena sigue íntegra", after.data?.data?.ok === true);

  // ── Limpieza de los datos de prueba (la bitácora conserva todo)
  await basePrisma.$executeRawUnsafe(`DELETE FROM "User" WHERE email = 'auditoria.prueba@test.local'`);
  await basePrisma.$executeRawUnsafe(`DELETE FROM "Role" WHERE key = '${roleKey}'`);
  const finalVerify = await call("GET", "/audit/verify", token);
  check("cadena íntegra al final", finalVerify.data?.data?.ok === true, `${finalVerify.data?.data?.checked} registros`);

  console.log(`\n${ok} OK / ${bad} fallos`);
  await basePrisma.$disconnect();
  process.exit(bad ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await basePrisma.$disconnect();
  process.exit(1);
});
