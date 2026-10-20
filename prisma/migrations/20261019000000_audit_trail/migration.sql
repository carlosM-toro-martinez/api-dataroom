-- ─────────────────────────────────────────────────────────────────────────────
-- Bitácora de auditoría de TODO el sistema.
--
--  · Cada INSERT / UPDATE / DELETE / TRUNCATE de cualquier tabla queda registrado por la propia base de datos
--    (triggers), así que no depende de que el código de la API se acuerde de registrarlo y también captura
--    cambios hechos a mano con SQL.
--  · La API le dice a la base quién hizo el cambio (usuario, IP, ruta) con variables de sesión «app.*».
--  · La bitácora es de solo agregado (no se puede editar ni borrar) y está encadenada con hashes SHA-256:
--    si alguien altera o elimina un registro, la verificación de la cadena lo detecta.
--  · Las contraseñas, tokens y claves se guardan como [REDACTADO] (se registra que cambiaron, no su valor).
-- ─────────────────────────────────────────────────────────────────────────────

-- Cabecera de la cadena (una sola fila): último número y último hash.
CREATE TABLE "audit_chain_head" (
    "id" INTEGER NOT NULL,
    "last_seq" BIGINT NOT NULL,
    "last_hash" TEXT NOT NULL,
    CONSTRAINT "audit_chain_head_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_chain_head_single_row" CHECK ("id" = 1)
);
INSERT INTO "audit_chain_head" ("id", "last_seq", "last_hash") VALUES (1, 0, 'GENESIS');

CREATE TABLE "audit_log" (
    "seq" BIGINT NOT NULL,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
    "source" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT,
    "record_label" TEXT,
    "actor_id" INTEGER,
    "actor_name" TEXT,
    "actor_email" TEXT,
    "actor_role" TEXT,
    "request_id" TEXT,
    "ip" TEXT,
    "user_agent" TEXT,
    "route" TEXT,
    "db_user" TEXT,
    "txid" BIGINT,
    "changed_fields" TEXT[],
    "old_data" JSONB,
    "new_data" JSONB,
    "detail" JSONB,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("seq")
);

CREATE INDEX "audit_log_at_idx" ON "audit_log"("at");
CREATE INDEX "audit_log_table_name_record_id_idx" ON "audit_log"("table_name", "record_id");
CREATE INDEX "audit_log_actor_id_at_idx" ON "audit_log"("actor_id", "at");
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- ── Hash de un registro (se usa al escribir y al verificar) ──────────────────
CREATE FUNCTION audit_compute_hash(a audit_log, prev text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(
    sha256(convert_to(concat_ws('|',
      a.seq::text,
      to_char(a.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US'),
      a.source, a.action, a.table_name,
      coalesce(a.record_id, ''),
      coalesce(a.actor_id::text, ''),
      coalesce(a.old_data::text, ''),
      coalesce(a.new_data::text, ''),
      coalesce(a.detail::text, ''),
      prev
    ), 'UTF8')),
    'hex')
$$;

-- ── Sellado: número consecutivo, hora de la base y encadenado ────────────────
CREATE FUNCTION audit_seal() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE h audit_chain_head%ROWTYPE;
BEGIN
  SELECT * INTO h FROM audit_chain_head WHERE id = 1 FOR UPDATE;
  NEW.seq := h.last_seq + 1;
  NEW.at := clock_timestamp();
  NEW.prev_hash := h.last_hash;
  NEW.hash := audit_compute_hash(NEW, h.last_hash);
  UPDATE audit_chain_head SET last_seq = NEW.seq, last_hash = NEW.hash WHERE id = 1;
  RETURN NEW;
END $$;

CREATE TRIGGER audit_log_seal BEFORE INSERT ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_seal();

-- ── La bitácora no se edita ni se borra ──────────────────────────────────────
CREATE FUNCTION audit_block_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La bitácora de auditoría es de solo agregado: no se permite % en %', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END $$;

CREATE TRIGGER audit_log_immutable BEFORE UPDATE OR DELETE ON "audit_log"
  FOR EACH ROW EXECUTE FUNCTION audit_block_changes();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON "audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_block_changes();
CREATE TRIGGER audit_head_no_delete BEFORE DELETE ON "audit_chain_head"
  FOR EACH ROW EXECUTE FUNCTION audit_block_changes();
CREATE TRIGGER audit_head_no_truncate BEFORE TRUNCATE ON "audit_chain_head"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_block_changes();

-- ── Oculta contraseñas, tokens y claves ──────────────────────────────────────
CREATE FUNCTION audit_redact(j jsonb) RETURNS jsonb LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(jsonb_object_agg(
    key,
    CASE WHEN key = ANY (ARRAY['password', 'refreshToken', 'resetToken', 'visitorTemporaryPassword', 'visitorDeviceIdHash'])
              AND value <> 'null'::jsonb
         THEN '"[REDACTADO]"'::jsonb
         ELSE value END
  ), '{}'::jsonb)
  FROM jsonb_each(j)
$$;

-- ── Trigger de fila: registra cada cambio de cualquier tabla ─────────────────
-- Los argumentos del trigger son los nombres de las columnas de la llave primaria.
CREATE FUNCTION audit_row_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  old_j jsonb;
  new_j jsonb;
  base_j jsonb;
  changed text[];
  rid text;
  lbl text;
  o_out jsonb;
  n_out jsonb;
  src text;
  a_id int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_j := to_jsonb(NEW); base_j := new_j;
  ELSIF TG_OP = 'DELETE' THEN
    old_j := to_jsonb(OLD); base_j := old_j;
  ELSE
    old_j := to_jsonb(OLD); new_j := to_jsonb(NEW); base_j := new_j;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(n.key ORDER BY n.key) INTO changed
    FROM jsonb_each(new_j) AS n
    WHERE n.key <> 'updatedAt' AND (old_j -> n.key) IS DISTINCT FROM n.value;
    -- Un UPDATE que no cambió nada (solo la fecha de modificación) no es un cambio.
    IF changed IS NULL THEN RETURN NULL; END IF;
    SELECT jsonb_object_agg(o.key, o.value) INTO o_out FROM jsonb_each(old_j) AS o WHERE o.key = ANY (changed);
    SELECT jsonb_object_agg(n.key, n.value) INTO n_out FROM jsonb_each(new_j) AS n WHERE n.key = ANY (changed);
    o_out := audit_redact(o_out);
    n_out := audit_redact(n_out);
  ELSIF TG_OP = 'INSERT' THEN
    n_out := audit_redact(new_j);
  ELSE
    o_out := audit_redact(old_j);
  END IF;

  IF TG_NARGS > 0 THEN
    SELECT string_agg(coalesce(base_j ->> TG_ARGV[g], ''), '|' ORDER BY g) INTO rid FROM generate_series(0, TG_NARGS - 1) AS g;
  END IF;

  lbl := coalesce(base_j ->> 'code', base_j ->> 'name', base_j ->> 'nombre', base_j ->> 'email',
                  base_j ->> 'title', base_j ->> 'fileName', base_j ->> 'reportNumber', base_j ->> 'fullName');

  src := coalesce(nullif(current_setting('app.source', true), ''), 'database');
  a_id := nullif(current_setting('app.actor_id', true), '')::int;

  INSERT INTO audit_log (
    source, action, table_name, record_id, record_label,
    actor_id, actor_name, actor_email, actor_role,
    request_id, ip, user_agent, route, db_user, txid,
    changed_fields, old_data, new_data, prev_hash, hash
  ) VALUES (
    src, TG_OP, TG_TABLE_NAME, rid, lbl,
    a_id,
    nullif(current_setting('app.actor_name', true), ''),
    nullif(current_setting('app.actor_email', true), ''),
    nullif(current_setting('app.actor_role', true), ''),
    nullif(current_setting('app.request_id', true), ''),
    nullif(current_setting('app.ip', true), ''),
    nullif(current_setting('app.user_agent', true), ''),
    nullif(current_setting('app.route', true), ''),
    session_user::text, txid_current(),
    changed, o_out, n_out, '', ''
  );
  RETURN NULL;
END $$;

CREATE FUNCTION audit_truncate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO audit_log (source, action, table_name, actor_id, actor_name, actor_email, actor_role,
                         request_id, ip, user_agent, route, db_user, txid, prev_hash, hash)
  VALUES (
    coalesce(nullif(current_setting('app.source', true), ''), 'database'), 'TRUNCATE', TG_TABLE_NAME,
    nullif(current_setting('app.actor_id', true), '')::int,
    nullif(current_setting('app.actor_name', true), ''),
    nullif(current_setting('app.actor_email', true), ''),
    nullif(current_setting('app.actor_role', true), ''),
    nullif(current_setting('app.request_id', true), ''),
    nullif(current_setting('app.ip', true), ''),
    nullif(current_setting('app.user_agent', true), ''),
    nullif(current_setting('app.route', true), ''),
    session_user::text, txid_current(), '', ''
  );
  RETURN NULL;
END $$;

-- ── Eventos que no son un cambio de fila (ingresos, intentos fallidos, accesos denegados…) ──
CREATE FUNCTION audit_event(
  p_action text, p_table text, p_record_id text, p_label text, p_detail jsonb,
  p_actor_id int, p_actor_role text, p_request_id text, p_ip text, p_user_agent text, p_route text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u record; new_seq bigint;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    SELECT nombre, email INTO u FROM "User" WHERE id = p_actor_id;
  END IF;
  INSERT INTO audit_log (
    source, action, table_name, record_id, record_label, actor_id, actor_name, actor_email, actor_role,
    request_id, ip, user_agent, route, db_user, txid, detail, prev_hash, hash
  ) VALUES (
    'api', p_action, p_table, p_record_id, p_label, p_actor_id, u.nombre, u.email, p_actor_role,
    p_request_id, p_ip, p_user_agent, p_route, session_user::text, txid_current(), p_detail, '', ''
  ) RETURNING seq INTO new_seq;
  RETURN new_seq;
END $$;

-- ── Verificación de la cadena ────────────────────────────────────────────────
CREATE FUNCTION audit_verify() RETURNS TABLE (ok boolean, checked bigint, broken_seq bigint, reason text)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  r audit_log%ROWTYPE;
  prev text := 'GENESIS';
  prev_seq bigint := 0;
  n bigint := 0;
  h audit_chain_head%ROWTYPE;
BEGIN
  FOR r IN SELECT * FROM audit_log ORDER BY seq LOOP
    n := n + 1;
    IF r.seq <> prev_seq + 1 THEN
      RETURN QUERY SELECT false, n, r.seq, 'Faltan registros antes de este número.'::text; RETURN;
    END IF;
    IF r.prev_hash <> prev THEN
      RETURN QUERY SELECT false, n, r.seq, 'El enlace con el registro anterior no coincide.'::text; RETURN;
    END IF;
    IF r.hash <> audit_compute_hash(r, prev) THEN
      RETURN QUERY SELECT false, n, r.seq, 'El contenido de este registro fue modificado.'::text; RETURN;
    END IF;
    prev := r.hash;
    prev_seq := r.seq;
  END LOOP;
  SELECT * INTO h FROM audit_chain_head WHERE id = 1;
  IF h.last_seq <> prev_seq OR h.last_hash <> prev THEN
    RETURN QUERY SELECT false, n, h.last_seq, 'Se eliminaron registros al final de la bitácora.'::text; RETURN;
  END IF;
  RETURN QUERY SELECT true, n, NULL::bigint, NULL::text;
END $$;

-- ── Conecta la auditoría a TODAS las tablas (también a las que se creen después: la API lo repite al iniciar) ──
CREATE FUNCTION audit_attach_all() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE t record; args text; n int := 0;
BEGIN
  FOR t IN
    SELECT c.oid, c.relname
    FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relkind = 'r'
      AND c.relname NOT IN ('_prisma_migrations', 'audit_log', 'audit_chain_head')
    ORDER BY c.relname
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = t.oid AND tgname = 'audit_row_change') THEN
      SELECT string_agg(quote_literal(a.attname), ', ' ORDER BY array_position(i.indkey::int2[], a.attnum)) INTO args
      FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY (i.indkey)
      WHERE i.indrelid = t.oid AND i.indisprimary;
      EXECUTE format(
        'CREATE TRIGGER audit_row_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION audit_row_change(%s)',
        t.relname, coalesce(args, ''));
      EXECUTE format(
        'CREATE TRIGGER audit_truncate AFTER TRUNCATE ON public.%I FOR EACH STATEMENT EXECUTE FUNCTION audit_truncate()',
        t.relname);
      n := n + 1;
    END IF;
  END LOOP;
  RETURN n;
END $$;

-- Conecta todas las tablas actuales y deja constancia del estado inicial (cuántas filas tenía cada tabla).
DO $$
DECLARE t record; counts jsonb := '{}'::jsonb; c bigint; attached int;
BEGIN
  attached := audit_attach_all();
  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public' AND c.relkind = 'r' AND c.relname NOT IN ('_prisma_migrations', 'audit_log', 'audit_chain_head')
    ORDER BY c.relname
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t.relname) INTO c;
    counts := counts || jsonb_build_object(t.relname, c);
  END LOOP;
  INSERT INTO audit_log (source, action, table_name, detail, prev_hash, hash)
  VALUES ('system', 'AUDIT_ENABLED', 'audit_log',
          jsonb_build_object('tablas_auditadas', attached, 'filas_al_activar', counts), '', '');
END $$;
