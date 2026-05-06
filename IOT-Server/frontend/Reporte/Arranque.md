# Guía de Arranque desde Cero — IOT-Server
**Fecha:** 5 de mayo de 2026  
**Sistema:** IOT-Server (FastAPI + React/TypeScript + Docker Compose)  
**Autor:** GitHub Copilot (Claude Sonnet 4.6)

---

## Contexto

El frontend implementa un **Reto Criptográfico (RC / puzzle)** que verifica la autenticidad del backend antes de mostrar la aplicación (`BackendGate`). Para que esto funcione, el frontend necesita tres valores que solo existen una vez que el backend está corriendo y se ha registrado una `Application`.

Por eso el proceso de arranque completo se divide en **dos fases**.

---

## Requisitos previos

- Docker Desktop instalado y corriendo
- Repositorio clonado localmente
- Acceso a terminal en la raíz del proyecto (`IOT-Server/`)

---

## FASE 1 — Primer arranque (sin autenticación RC)

En esta fase el frontend arranca sin los valores RC. El componente `BackendGate` detecta las variables vacías y **omite la verificación**, permitiendo el acceso normalmente. Esto es intencional para poder registrar la Application.

### Paso 1 — Levantar los contenedores

```powershell
cd "IOT-Server"
docker compose up -d
```

Docker levantará tres servicios:
| Contenedor | Puerto | Descripción |
|---|---|---|
| `iot-valkey` | 6379 | Caché de sesiones (Redis-compatible) |
| `iot-backend` | 8000 | API FastAPI |
| `iot-frontend` | 3000 | React + Nginx |

Al arrancar, el backend ejecuta automáticamente:
1. Creación de todas las tablas de la base de datos
2. Seed del administrador master inicial

Credenciales del admin master creadas automáticamente:
```
Email:    admin@iot.com
Password: Admin1234!
```

Verificar que todo esté sano:
```powershell
docker compose ps
```
Los tres contenedores deben aparecer como `healthy` o `running`.

---

### Paso 2 — Abrir Swagger

```
http://localhost:8000/docs
```

---

### Paso 3 — Autenticarse en Swagger

1. Buscar el endpoint **`POST /api/v1/auth/login`**
2. Ejecutar con:
```json
{
  "email": "admin@iot.com",
  "password": "Admin1234!"
}
```
3. Copiar el valor de `access_token` de la respuesta
4. Pulsar el botón **Authorize** (🔒) en la parte superior derecha de Swagger
5. Escribir `Bearer <access_token>` y confirmar

---

### Paso 4 — Obtener el UUID del administrador

1. Buscar el endpoint **`GET /api/v1/administrators/`**
2. Ejecutar — la respuesta incluirá el admin master
3. Copiar el campo `id` del administrador (formato UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

### Paso 5 — Crear la Application del frontend

1. Buscar el endpoint **`POST /api/v1/applications`**
2. Ejecutar con:
```json
{
  "name": "Frontend IoT",
  "description": "Aplicación web del frontend",
  "administrator_id": "<UUID copiado en el paso 4>"
}
```
3. La respuesta tendrá esta estructura:
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "name": "Frontend IoT",
  "api_key": "a3f9b2c1d4e5f6...(64 caracteres hexadecimales)...",
  "is_active": true,
  ...
}
```

> ⚠️ **IMPORTANTE**: Guarda `id` y `api_key` en este momento.  
> El `api_key` **no se puede recuperar** después — si se pierde, hay que crear una nueva Application.

Valores a guardar:
- `id` → será `VITE_APP_APPLICATION_ID`
- `api_key` → será `VITE_APP_API_KEY`

---

### Paso 6 — Calcular el server_key

El `server_key` no lo retorna el backend directamente. Se deriva de la `SECRET_KEY` del backend con la fórmula:

```
server_key = SHA-256(SECRET_KEY + "|puzzle_v1")
```

La `SECRET_KEY` está definida en `IOT-Server/.env.docker`:
```
SECRET_KEY=542ec75cc3c11285d3134f3aee7d6bcf27292fc97090ec93c99030312ca21e10
```

Calcular el `server_key` con Python:
```powershell
python -c "
import hashlib
sk = '542ec75cc3c11285d3134f3aee7d6bcf27292fc97090ec93c99030312ca21e10'
print(hashlib.sha256((sk + '|puzzle_v1').encode()).hexdigest())
"
```

El resultado hexadecimal de 64 caracteres es `VITE_APP_SERVER_KEY`.

> ℹ️ Si cambias `SECRET_KEY` en `.env.docker`, debes recalcular `server_key`.

---

## FASE 2 — Segundo arranque (con autenticación RC activa)

Con los tres valores obtenidos en la Fase 1, se configura el frontend para que el `BackendGate` realice la verificación completa en cada arranque.

### Paso 7 — Editar docker-compose.yml

Abrir `IOT-Server/docker-compose.yml` y actualizar la sección `frontend` con los tres valores:

```yaml
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.test
      args:
        VITE_API_BASE_URL: /api/v1/
        VITE_APP_APPLICATION_ID: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← id del Paso 5
        VITE_APP_API_KEY: "a3f9b2c1d4e5f6...(64 chars)..."               # ← api_key del Paso 5
        VITE_APP_SERVER_KEY: "resultado del Paso 6"                        # ← SHA-256 calculado
```

---

### Paso 8 — Reconstruir el frontend e iniciar

```powershell
docker compose build frontend
docker compose up -d
```

Desde este momento, al abrir `http://localhost:3000`, el `BackendGate` ejecutará el puzzle RC antes de mostrar la aplicación. Si el backend no puede validarlo (servidor impostado, claves incorrectas), la app mostrará un error de verificación y **bloqueará el acceso**.

---

## Resumen del flujo completo

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 1 — Sin RC                                                │
│                                                                  │
│  docker compose up -d                                            │
│       ↓                                                          │
│  Swagger → Login admin@iot.com / Admin1234!                      │
│       ↓                                                          │
│  GET /administrators/ → copiar UUID del admin                    │
│       ↓                                                          │
│  POST /applications → guardar id + api_key                       │
│       ↓                                                          │
│  python SHA-256(SECRET_KEY + "|puzzle_v1") → server_key          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  FASE 2 — Con RC                                                │
│                                                                  │
│  Editar docker-compose.yml → agregar VITE_APP_* como build args │
│       ↓                                                          │
│  docker compose build frontend                                   │
│       ↓                                                          │
│  docker compose up -d                                            │
│       ↓                                                          │
│  http://localhost:3000 → BackendGate verifica puzzle RC ✅       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tabla de variables de configuración

| Variable | Origen | Dónde se configura |
|---|---|---|
| `VITE_API_BASE_URL` | Fijo: `/api/v1/` | `docker-compose.yml` → build args |
| `VITE_APP_APPLICATION_ID` | Campo `id` del `POST /applications` | `docker-compose.yml` → build args |
| `VITE_APP_API_KEY` | Campo `api_key` del `POST /applications` | `docker-compose.yml` → build args |
| `VITE_APP_SERVER_KEY` | `SHA-256(SECRET_KEY + "\|puzzle_v1")` | `docker-compose.yml` → build args |

---

## Comportamiento según configuración de variables

| Estado de VITE_APP_* | Comportamiento del BackendGate |
|---|---|
| Las tres variables configuradas | Ejecuta puzzle RC — bloquea si el backend no valida |
| Alguna variable vacía o ausente | Omite verificación RC — permite acceso (modo desarrollo) |

---

## Reinicio limpio (borrar todo y empezar de cero)

Si necesitas destruir todos los datos y volver al estado inicial:

```powershell
docker compose down
docker volume rm iot-server_sqlite_data iot-server_valkey_data
docker compose up -d
```

Después de esto debes repetir el proceso desde el **Paso 1** para registrar una nueva Application y obtener nuevos valores RC.

---

## Archivos relevantes

| Archivo | Descripción |
|---|---|
| `docker-compose.yml` | Orquestación de servicios — aquí van los build args del frontend |
| `.env.docker` | Variables del backend (SECRET_KEY, JWT, Valkey) |
| `frontend/.env.example` | Plantilla de variables del frontend para desarrollo local |
| `seed_admin.py` | Script que crea el admin master (se ejecuta automáticamente) |
| `docker_entrypoint.py` | Entrypoint del backend: crea tablas + seed + servidor |
| `frontend/src/shared/components/BackendGate.tsx` | Componente que ejecuta el puzzle RC al arrancar |
| `frontend/src/shared/services/backendVerification.ts` | Lógica del puzzle AES-256-CBC + HMAC-SHA256 |
