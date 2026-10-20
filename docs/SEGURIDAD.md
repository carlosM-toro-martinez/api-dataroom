# Seguridad de la API — guía de cambios y de rotación de la clave de la base de datos

## Qué cambió

| Tema | Antes | Ahora |
|---|---|---|
| Clave de la base de datos | Escrita en `docker-compose.yml` (queda para siempre en el historial de Git) | Se lee de `POSTGRES_PASSWORD` en el `.env` del servidor. Si falta, `docker compose` **se detiene antes de tocar nada**. |
| Token de recuperación de contraseña | Se imprimía en el log del servidor | Ya no se escribe en ningún log |
| CORS | Aceptaba cualquier sitio web | Solo `marte.encuentrass.lat`, `minmartesrl.com`, `www.minmartesrl.com`, `exploracion.marte.encuentrass.lat` y los de la variable `CORS_ORIGINS` |
| «Olvidé mi contraseña» | Decía «Usuario no encontrado» si el correo no existía | Responde siempre lo mismo; el intento queda en la bitácora de auditoría |

## Variables nuevas del `.env` del servidor

```
POSTGRES_PASSWORD=<la clave de la base de datos>
CORS_ORIGINS=            # opcional: otros sitios permitidos, separados por coma
```

## Cómo cambiar la clave de la base de datos SIN perder acceso

La clave vieja (`Explora_2026!`) ya está en el historial de Git, así que **hay que cambiarla**, pero se hace en dos pasos
independientes. Después de cada paso todo sigue funcionando; si algo falla, se vuelve al paso anterior.

### Paso 1 — Sacar la clave del repositorio (no cambia nada para los usuarios)
1. En el servidor, en el `.env` de `api-exploracion`, agrega la **clave actual** tal cual:
   `POSTGRES_PASSWORD=Explora_2026!`
2. Despliega el nuevo `docker-compose.yml`. La base y la API siguen conectándose con la misma clave de siempre.
3. Comprueba que la web funciona (entrar, abrir Sondajes).

> Si el despliegue dice «Falta POSTGRES_PASSWORD», no se cambió nada: agrega la variable y vuelve a desplegar.

### Paso 2 — Poner una clave nueva y fuerte
1. **Antes de empezar, haz una copia de seguridad**:
   `docker exec <contenedor-postgres> pg_dump -U explora_user -d exploracion_db -Fc > respaldo_antes_de_cambiar_clave.dump`
2. Genera la clave nueva (solo letras y números, para que sirva dentro de la dirección de conexión):
   `openssl rand -hex 24`
3. Cámbiala **dentro de la base** (con el contenedor corriendo y la clave vieja todavía vigente):
   `docker exec -it <contenedor-postgres> psql -U explora_user -d exploracion_db -c "ALTER USER explora_user WITH PASSWORD 'LA_CLAVE_NUEVA';"`
4. Cambia `POSTGRES_PASSWORD` en el `.env` por la nueva y reinicia **solo la API**:
   `docker compose up -d api-explora`
5. Comprueba que entra y que Sondajes carga.

**Si algo sale mal en el paso 2:** la base sigue viva. Vuelve a poner la clave vieja con el mismo comando
`ALTER USER explora_user WITH PASSWORD 'Explora_2026!';`, deja la vieja en el `.env` y reinicia la API.
La base de datos nunca se borra en este procedimiento (los datos están en el volumen `postgres_explora_data`).

Nota: `POSTGRES_PASSWORD` solo se usa para crear la base la primera vez; por eso el cambio se hace con `ALTER USER`.

## Además conviene (no urgente)
- Cambiar también `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `ADMIN_PASSWORD` y `SMTP_PASS` si alguna vez estuvieron en un lugar compartido.
- No publicar el puerto 5432 de la base hacia internet.
- Guardar copias de seguridad de la base fuera del servidor (la bitácora de auditoría viaja en la copia).
