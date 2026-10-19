# Respaldo y restauración (RNF-13)

## Qué es y qué cubre

Cada domingo a las 06:17 UTC (01:17 en Colombia) GitHub Actions copia la base de datos de Supabase, la **cifra** y la guarda **30 días** como un archivo privado dentro del propio GitHub. Se respalda el esquema `public`: perfiles, grupos, libros, diccionario personal, progreso y respuestas escritas. **No** se respaldan los archivos de Storage (imágenes de páginas): se regeneran reprocesando el libro. Tampoco se respaldan las cuentas de acceso (`auth`): quien se registra de nuevo recibe un id distinto, así que un respaldo sirve para recuperar datos y tablas, no para «volver atrás» una cuenta borrada.

El respaldo no funciona hasta que hagas la **Parte A** (una sola vez, ~15 minutos). La **Parte B** es para cuando quieras probarlo, y la **Parte C** para el día que lo necesites de verdad.

---

## Parte A — Dejarlo funcionando (una sola vez)

### A1. Conseguir la cadena de conexión de Supabase

Esta cadena es la «dirección y llave» para que GitHub lea tu base de datos. **Es secreta**: no la pegues en el chat, en el repositorio ni en ningún archivo.

1. Entra a <https://supabase.com/dashboard> y abre el proyecto **My Deutsch Project**.
2. Arriba, en la barra del proyecto, pulsa el botón **Connect**.
3. En la ventana, entra a la pestaña **Connection string** (o «Direct / ORMs» según tu versión) y en **Method** elige **Session pooler**. _Importante:_ no uses «Direct connection», porque GitHub no tiene IPv6 y fallaría.
4. Copia la cadena. Se ve así:
   `postgresql://postgres.rgzguilhkilaizamvyuq:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres`
5. Reemplaza `[YOUR-PASSWORD]` (con los corchetes) por la **contraseña de la base de datos**.
   - Si no la recuerdas: **Project Settings → Database → Reset database password**. Ponle una contraseña **sin símbolos raros** (solo letras y números, 20 o más caracteres): así no hay que codificarla en la cadena. Guárdala en tu gestor de contraseñas.
   - Ojo: esa es la contraseña de la base de datos, **no** la de tu cuenta de Supabase ni la de tu correo.
   - Si cambias la contraseña de la base, la app sigue funcionando (usa otras llaves), pero revisa que no tengas otra herramienta que la use.
6. Deja la cadena final copiada (no la guardes en un archivo del proyecto).

### A2. Inventar la frase de cifrado

1. Inventa una frase larga, por ejemplo cuatro o cinco palabras al azar con números: `tren-azul-42-lluvia-cedro`. Mínimo 20 caracteres y **sin espacios** (usa guiones), para que los comandos de abajo funcionen tal cual.
2. **Guárdala ya** en tu gestor de contraseñas (o en un lugar seguro fuera del computador). **Si la pierdes, ningún respaldo se puede abrir y no hay forma de recuperarla.**

### A3. Crear los dos secretos en GitHub

1. Abre el repositorio: <https://github.com/Ally2403/My-Deutsch>.
2. **Settings** (pestaña de arriba a la derecha) → en el menú izquierdo **Secrets and variables** → **Actions**.
3. Pulsa **New repository secret** y crea el primero:
   - **Name:** `SUPABASE_DB_URL` (exactamente así, en mayúsculas)
   - **Secret:** pega la cadena del paso A1
   - **Add secret**
4. Pulsa otra vez **New repository secret** y crea el segundo:
   - **Name:** `BACKUP_PASSPHRASE`
   - **Secret:** tu frase del paso A2
   - **Add secret**
5. Comprueba que en la lista aparezcan los dos nombres (GitHub nunca vuelve a mostrar su valor; si te equivocas, edítalos con el lápiz y pega de nuevo).

### A4. Hacer la primera ejecución a mano

1. En el repositorio entra a la pestaña **Actions**.
2. En la lista de la izquierda pulsa **respaldo**.
3. A la derecha pulsa **Run workflow** → **Run workflow** (botón verde).
4. Espera 1–2 minutos y recarga la página: debe aparecer una ejecución con un **check verde**.
5. Si sale en **rojo**, ábrela y mira el paso que falló:
   - «Process completed with exit code 1» en _pg_dump cifrado_ con `Network is unreachable` → usaste la conexión directa; repite A1 con **Session pooler**.
   - `password authentication failed` → la contraseña de la cadena está mal; repite A1 (paso 5).
   - `test -n` falla de inmediato → falta uno de los dos secretos o su nombre está mal escrito (A3).
6. Abre la ejecución en verde y baja hasta **Artifacts**: debe haber uno llamado `respaldo-AAAAMMDD`. Eso confirma que el respaldo existe. Desde ahora corre solo cada domingo.

> Avisa en el chat cuando la ejecución salga en verde y lo marco como verificado (RNF-13 criterio 1).

---

## Parte B — Probar que el respaldo se puede restaurar (recomendado una vez)

Necesitas tener **Docker Desktop** abierto (el ícono de la ballena en la barra de tareas, sin errores) y un terminal PowerShell en la carpeta del proyecto.

1. En GitHub → **Actions → respaldo →** abre la última ejecución verde → **Artifacts** → descarga `respaldo-AAAAMMDD` (baja un `.zip`).
2. Descomprime el `.zip`: dentro hay un archivo `respaldo-AAAAMMDD.dump.gpg`. Cópialo a la carpeta del proyecto `C:\Users\Allison Ruiz\Desktop\AppAleman`. **No lo subas a git** (los `.gpg` y `.dump` están ignorados, pero no los muevas a otras carpetas del repositorio).
3. En PowerShell, dentro de la carpeta del proyecto, escribe tu frase en una variable (se borra al cerrar el terminal):

   ```powershell
   $env:BACKUP_PASSPHRASE = "tu frase aquí"
   ```

4. Averigua cuántas palabras hay hoy en el diccionario de todos: Supabase → **SQL Editor** → ejecuta `select count(*) from public.user_words;` y anota el número (por ejemplo `312`).
5. Ejecuta la restauración de prueba, cambiando la fecha del archivo y el número esperado:

   ```powershell
   docker run --rm -v "${PWD}:/w" -e BACKUP_PASSPHRASE postgres:17 bash -c "apt-get update -qq >/dev/null && apt-get install -y -qq gnupg >/dev/null && su postgres -c 'initdb -D /tmp/pg >/dev/null && pg_ctl -D /tmp/pg -w start >/dev/null' && PGUSER=postgres PGHOST=/var/run/postgresql bash /w/scripts/restaurar-respaldo.sh /w/respaldo-AAAAMMDD.dump.gpg 312"
   ```

   La primera vez baja la imagen de Postgres (unos 400 MB) y tarda unos minutos.

6. Resultado esperado: la línea `user_words restauradas: 312`. Si el número no coincide con el que pusiste, dice `ERROR: se esperaban 312 filas`. (Si hubo consultas entre el respaldo y tu conteo, la diferencia pequeña es normal; compara con el conteo del día del respaldo.)
7. Limpia: `Remove-Item respaldo-*.dump.gpg` y `Remove-Item Env:BACKUP_PASSPHRASE`.

Esto usa una base **temporal dentro de Docker**: no toca Supabase ni tu computador.

---

## Parte C — Restaurar de verdad tras un desastre

Hazlo con calma y, si puedes, con ayuda: **restaurar sobrescribe datos**.

1. Descarga y descomprime el respaldo más reciente (pasos 1–2 de la Parte B).
2. Descífralo con Docker (genera `respaldo.dump` en la carpeta actual):

   ```powershell
   $env:BACKUP_PASSPHRASE = "tu frase aquí"
   docker run --rm -v "${PWD}:/w" -e BACKUP_PASSPHRASE postgres:17 bash -c 'apt-get update -qq >/dev/null && apt-get install -y -qq gnupg >/dev/null && gpg --batch --yes --pinentry-mode loopback --passphrase $BACKUP_PASSPHRASE --decrypt --output /w/respaldo.dump /w/respaldo-AAAAMMDD.dump.gpg'
   ```

3. Si el proyecto de Supabase sigue existiendo y solo perdiste filas: abre una consulta en el **SQL Editor**, copia primero lo que quieras conservar y, para restaurar tablas puntuales, pídeme que prepare el comando de `pg_restore` con `--table=` hacia una base vacía; **no restaures encima de una base con datos sin revisarlo antes**.
4. Si hay que crear un proyecto nuevo de Supabase: aplica primero las migraciones de `supabase/migrations/` (en orden) y luego `pg_restore --no-owner --data-only --disable-triggers -d "<cadena del Session pooler del proyecto nuevo>" respaldo.dump`. Las cuentas de acceso no están en el respaldo (ver arriba): cada persona tendrá que volver a registrarse.
5. Después revisa las políticas de seguridad con `supabase/tests/rls.test.sql` y borra `respaldo.dump` del computador.

## Si algo cambia

- **Cambiaste la contraseña de la base de datos:** actualiza el secreto `SUPABASE_DB_URL` (A3) o el respaldo del domingo fallará.
- **El respaldo falla un domingo:** GitHub te manda un correo de «workflow failed»; abre Actions → respaldo y sigue la lista del paso A4.
- **Quieres respaldar ahora mismo:** Actions → respaldo → Run workflow.
