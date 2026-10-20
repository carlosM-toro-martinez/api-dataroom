-- Los tokens de sesión se renuevan en cada ingreso: ese cambio no es un dato de negocio y ya queda cubierto por
-- los eventos LOGIN / LOGOUT. Si un UPDATE solo toca estas columnas técnicas, no se registra como cambio de fila.
CREATE OR REPLACE FUNCTION audit_row_change() RETURNS trigger
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
    IF changed IS NULL THEN RETURN NULL; END IF;
    -- Solo columnas técnicas de sesión del usuario (renovación de token, último ingreso de visitante).
    IF TG_TABLE_NAME = 'User'
       AND changed <@ ARRAY['refreshToken', 'refreshTokenExpiry', 'visitorLastLoginAt'] THEN
      RETURN NULL;
    END IF;
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
