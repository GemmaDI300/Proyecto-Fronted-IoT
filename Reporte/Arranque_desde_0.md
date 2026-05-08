# Guía de Arranque desde Cero — IOT-Server

**Sistema:** IOT-Server (FastAPI + React/TypeScript + Docker Compose)  
**Última actualización:** 5 de mayo de 2026

---

## Descripción general

El sistema está compuesto por tres servicios Docker:

| Contenedor    | Puerto | Descripción                          |
|---------------|--------|--------------------------------------|
| `iot-valkey`  | 6379   | Caché de sesiones (Redis-compatible) |
| `iot-backend` | 8000   | API REST FastAPI + SQLite            |
| `iot-frontend`| 3000   | React + Nginx (reverse proxy)        |

El frontend incluye un **Reto Criptográfico (RC / puzzle)** que verifica la autenticidad del backend antes de mostrar la aplicación. Para configurarlo se necesitan tres valores que solo existen después de registrar una `Application` en el backend. Por eso el proceso se divide en **dos fases**.

---

## Requisitos previos

- **Docker Desktop** instalado y en ejecución
- **Python 3** disponible en terminal (solo para calcular un hash en el Paso 6)
- Repositorio clonado localmente
- Archivo `IOT-Server/.env.docker` presente (ya incluido en el repo)

---

## FASE 1 — Primer arranque (sin verificación RC)

En esta fase el frontend arranca sin los valores RC. El componente `BackendGate` detecta las variables vacías y **omite la verificación**, permitiendo el acceso. Esto es intencional para poder crear la Application.

---

### Paso 1 — Levantar los contenedores

Desde la carpeta `IOT-Server/`:

```powershell
cd IOT-Server
docker compose up -d
```

Al arrancar, el backend ejecuta automáticamente:
1. Creación de todas las tablas de la base de datos (`iot.db`)
2. Seed del administrador master inicial

Verificar que los tres servicios estén sanos:

```powershell
docker compose ps
```

Los tres contenedores deben aparecer como `healthy` o `running`. Si alguno aparece como `starting`, espera unos segundos y vuelve a ejecutar el comando.

---

### Paso 2 — Crear la Application (elige una opción)

Necesitas crear una `Application` en el backend para obtener las credenciales RC. Hay dos formas de hacerlo — elige la que prefieras:

| | Opción A — Frontend (recomendada) | Opción B — Swagger |
|---|---|---|
| **Interfaz** | Visual, con botones de copia | API REST manual |
| **Requiere** | Navegador en `localhost:3000` | Navegador en `localhost:8000/docs` |
| **Ventaja** | Copia las credenciales directamente al portapapeles | Control total de los parámetros |

---

#### Opción A — Configuración inicial desde el frontend

1. Abrir el navegador en:
   ```
   http://localhost:3000
   ```
2. Iniciar sesión con las credenciales del admin master:
   - **Email:** `admin@iot.com`
   - **Password:** `Admin1234!`
3. El menú lateral solo mostrará la sección **Aplicaciones** (modo setup activo).
4. Aparecerá una alerta azul pidiendo que crees tu primera Application. Hacer clic en **Nuevo**.
5. Rellenar el formulario:
   - **Nombre:** `Frontend IoT` (o el nombre que prefieras)
   - **Descripción:** (opcional)
   - El campo `administrator_id` se rellena automáticamente con tu cuenta
6. Confirmar. La Application se crea y aparece un **panel amarillo** con las credenciales listas para copiar:
   - Botón de copia para `VITE_APP_APPLICATION_ID`
   - Botón de copia para `VITE_APP_API_KEY`
   - Comando para obtener `VITE_APP_SERVER_KEY` desde terminal

> ⚠️ **IMPORTANTE**: El `api_key` solo se muestra en este panel mientras estás en modo setup. Si cierras sesión o reconstruyes el frontend sin copiarlo, no podrás recuperarlo — deberás crear una nueva Application.

Continúa en el **Paso 3 — Calcular el server_key**.

---

#### Opción B — Configuración desde Swagger

**Paso B.1 — Abrir Swagger**

```
http://localhost:8000/docs
```

**Paso B.2 — Autenticarse en Swagger**

1. Buscar el endpoint **`POST /api/v1/auth/login`**
2. Hacer clic en **Try it out** y ejecutar con:
```json
{
  "email": "admin@iot.com",
  "password": "Admin1234!"
}
```
3. Copiar el valor del campo `access_token` de la respuesta
4. Hacer clic en el botón **Authorize** (🔒) en la parte superior derecha
5. Pegar `Bearer <access_token>` en el campo y confirmar

**Paso B.3 — Obtener el UUID del administrador**

1. Buscar el endpoint **`GET /api/v1/administrators/`**
2. Hacer clic en **Try it out** y ejecutar sin parámetros
3. Copiar el campo `id` del administrador master:
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ...
}
```

**Paso B.4 — Crear la Application**

1. Buscar el endpoint **`POST /api/v1/applications`**
2. Hacer clic en **Try it out** y ejecutar con:
```json
{
  "name": "Frontend IoT",
  "description": "Aplicación web del frontend",
  "administrator_id": "<UUID copiado en el Paso B.3>"
}
```
3. La respuesta tendrá esta estructura:
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "Frontend IoT",
  "api_key": "aaaa1111bbbb2222....(64 caracteres hexadecimales)...",
  "is_active": true,
  ...
}
```

> ⚠️ **IMPORTANTE**: Guarda `id` y `api_key` en este momento.  
> El `api_key` **no se puede recuperar** después — si se pierde, hay que crear una nueva Application.

Anota los dos valores:

| Variable                  | Valor a guardar              |
|---------------------------|------------------------------|
| `VITE_APP_APPLICATION_ID` | Campo `id` del response      |
| `VITE_APP_API_KEY`        | Campo `api_key` del response |

---

### Paso 3 — Calcular el server_key

El `server_key` no lo devuelve el backend. Se deriva de la `SECRET_KEY` del backend con esta fórmula:

```
server_key = SHA-256(SECRET_KEY + "|puzzle_v1")
```

La `SECRET_KEY` actual está en `IOT-Server/.env.docker`:

```
SECRET_KEY=542ec75cc3c11285d3134f3aee7d6bcf27292fc97090ec93c99030312ca21e10
```

Calcular con Python en la terminal:

```powershell
python -c "import hashlib; sk='542ec75cc3c11285d3134f3aee7d6bcf27292fc97090ec93c99030312ca21e10'; print(hashlib.sha256((sk+'|puzzle_v1').encode()).hexdigest())"
```

El resultado (64 caracteres hex) es el valor de `VITE_APP_SERVER_KEY`.

> ℹ️ Si cambias `SECRET_KEY` en `.env.docker`, debes recalcular este valor.

---

## FASE 2 — Segundo arranque (con verificación RC activa)

Con los tres valores obtenidos, se configura el frontend para ejecutar el puzzle RC en cada carga.

---

### Paso 4 — Editar docker-compose.yml

Abrir el archivo `IOT-Server/docker-compose.yml` y reemplazar los valores en la sección `frontend > build > args`:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.test
      args:
        VITE_API_BASE_URL: /api/v1/
        VITE_APP_APPLICATION_ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← id del Paso 2
        VITE_APP_API_KEY: "aaaa1111bbbb2222....(64 chars hex)..."         # ← api_key del Paso 2
        VITE_APP_SERVER_KEY: "resultado del Paso 3"                        # ← SHA-256 calculado
```

---

### Paso 5 — Reconstruir el frontend e iniciar

```powershell
docker compose build frontend
docker compose up -d
```

> Solo se reconstruye el frontend. El backend y Valkey no necesitan reconstruirse.

---

### Verificación final

Abrir en el navegador:

```
http://localhost:3000
```

El `BackendGate` ejecutará el puzzle RC antes de mostrar la aplicación. Si el backend responde correctamente, la app carga con normalidad. Si las claves son incorrectas o el backend no puede validar, la app mostrará un error de verificación y bloqueará el acceso.

---

## Reinicio limpio (volver a empezar desde cero)

Si necesitas destruir todos los datos y repetir el proceso completo:

```powershell
docker compose down -v --remove-orphans
```

Esto elimina contenedores, redes y volúmenes (base de datos SQLite y caché Valkey). Después repite desde el **Paso 1**.

Además, recuerda vaciar las variables RC en `docker-compose.yml` (dejarlas como cadenas vacías `""`) antes de volver a levantar, de lo contrario el frontend intentará el puzzle con credenciales inexistentes y bloqueará el acceso.

> ℹ️ No se borra ningún archivo del proyecto. Solo se eliminan los datos en tiempo de ejecución.

---

## Resumen visual del flujo

```
FASE 1 — Sin RC
───────────────────────────────────────────────────────────
  Paso 1: docker compose up -d
       ↓
  Paso 2 (elige una):
    Opción A → localhost:3000 → login → Aplicaciones → Nuevo
               panel amarillo con botones de copia ✅
    Opción B → localhost:8000/docs → login → GET /administrators
               → POST /applications → copiar id + api_key
       ↓
  Paso 3: python SHA-256(SECRET_KEY + "|puzzle_v1") → server_key

FASE 2 — Con RC
───────────────────────────────────────────────────────────
  Paso 4: Editar docker-compose.yml → pegar los 3 valores VITE_APP_*
       ↓
  Paso 5: docker compose build frontend
       ↓
  docker compose up -d
       ↓
  http://localhost:3000 → BackendGate verifica puzzle RC ✅
```

---

## Tabla de variables de configuración

| Variable                  | Origen                                     | Dónde se configura                    |
|---------------------------|--------------------------------------------|---------------------------------------|
| `VITE_API_BASE_URL`       | Fijo: `/api/v1/`                           | `docker-compose.yml` → build args     |
| `VITE_APP_APPLICATION_ID` | Campo `id` de `POST /applications`         | `docker-compose.yml` → build args     |
| `VITE_APP_API_KEY`        | Campo `api_key` de `POST /applications`    | `docker-compose.yml` → build args     |
| `VITE_APP_SERVER_KEY`     | `SHA-256(SECRET_KEY + "\|puzzle_v1")`      | `docker-compose.yml` → build args     |
| `SECRET_KEY`              | Valor libre (token hex de 32 bytes)        | `IOT-Server/.env.docker`              |

---

## Comportamiento del BackendGate según configuración

| Estado de `VITE_APP_*`                  | Comportamiento                                         |
|-----------------------------------------|--------------------------------------------------------|
| Las tres variables configuradas         | Ejecuta puzzle RC — bloquea si el backend no valida    |
| Alguna variable vacía o no configurada  | Omite verificación RC — permite acceso (modo desarrollo) |

---

## Archivos relevantes

| Archivo                                                  | Descripción                                                        |
|----------------------------------------------------------|--------------------------------------------------------------------|
| `docker-compose.yml`                                     | Orquestación de servicios — aquí van los build args del frontend  |
| `.env.docker`                                            | Variables del backend (SECRET_KEY, JWT, Valkey)                    |
| `seed_admin.py`                                          | Script que crea el admin master (se ejecuta automáticamente)       |
| `docker_entrypoint.py`                                   | Entrypoint del backend: crea tablas + seed + inicia servidor       |
| `frontend/Dockerfile.test`                               | Dockerfile del frontend (acepta build args VITE_*)                 |
| `frontend/src/shared/components/BackendGate.tsx`         | Componente que ejecuta el puzzle RC al arrancar                    |
| `frontend/src/shared/services/backendVerification.ts`    | Lógica del puzzle AES-256-CBC + HMAC-SHA256                        |
| `frontend/src/shared/api/requestSigning.ts`              | Firma de solicitudes con api_key                                   |
