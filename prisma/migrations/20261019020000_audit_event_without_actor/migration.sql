-- Corrige audit_event: cuando el evento no tiene usuario (p. ej. un ingreso fallido con un correo inexistente)
-- la función fallaba y el evento no se registraba.
CREATE OR REPLACE FUNCTION audit_event(
  p_action text, p_table text, p_record_id text, p_label text, p_detail jsonb,
  p_actor_id int, p_actor_role text, p_request_id text, p_ip text, p_user_agent text, p_route text
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u_name text; u_email text; new_seq bigint;
BEGIN
  IF p_actor_id IS NOT NULL THEN
    SELECT nombre, email INTO u_name, u_email FROM "User" WHERE id = p_actor_id;
  END IF;
  INSERT INTO audit_log (
    source, action, table_name, record_id, record_label, actor_id, actor_name, actor_email, actor_role,
    request_id, ip, user_agent, route, db_user, txid, detail, prev_hash, hash
  ) VALUES (
    'api', p_action, p_table, p_record_id, p_label, p_actor_id, u_name, u_email, p_actor_role,
    p_request_id, p_ip, p_user_agent, p_route, session_user::text, txid_current(), p_detail, '', ''
  ) RETURNING seq INTO new_seq;
  RETURN new_seq;
END $$;
