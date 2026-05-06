# Arranque desde Cero — Sistema IoT

**Fecha:** 5 de mayo de 2026  
**Propósito:** Guía completa y verificada para levantar el sistema IoT desde un estado limpio (sin contenedores, sin volúmenes, sin imágenes).

---

## Requisitos previos

| Herramienta | Versión mínima | Verificar con |
|---|---|---|
| Docker Desktop | 4.x o superior | `docker --version` |
| Docker Compose | v2 (plugin integrado) | `docker compose version` |
| Git | cualquiera | `git --version` |
| Acceso a internet | — | Para descargar imágenes base la primera vez |

---

## Fase 1 — Construcción e inicio básico (sin Application)

En esta fase se construyen las imágenes y se levanta el sistema con el administrador semilla. **No se puede usar la firma de peticiones todavía** porque aún no existe una `Application` con sus credenciales.

### Paso 1 — Limpiar estado anterior (si lo hubiera)

Antes de arrancar, asegurarse de que no queden restos de una instalación previa:

```powershell
# Posicionarse en la carpeta del proyecto
cd "...\IOT-Server"

# Detener y eliminar contenedores + volúmenes (bases de datos incluidas)
docker compose down --volumes --remove-orphans

# Opcional: borrar imágenes antiguas para forzar rebuild limpio
docker rmi iot-server-backend iot-server-frontend
```

> Si es la primera vez, este paso puede ignorarse.

### Paso 2 — Construir las imágenes Docker

```powershell
docker compose build
```

**¿Qué hace?**
- Construye `iot-server-backend` desde `Dockerfile` (Python 3.12-slim + uv)
- Construye `iot-server-frontend` desde `Dockerfile.test` (Node 20 para compilar React → Nginx 1.25 para servir)
- Las imágenes base (`python:3.12-slim`, `node:20-alpine`, `nginx:1.25-alpine`) se descargan de Docker Hub si no están en caché local

**Tiempo estimado:** 2–5 minutos (primera vez); 30 segundos con caché.

**Resultado esperado:**
```
✔ Image iot-server-backend  Built
✔ Image iot-server-frontend Built
```

### Paso 3 — Iniciar los contenedores

```powershell
docker compose up -d
```

**¿Qué hace?**
- Levanta `iot-valkey` (Valkey/Redis para sesiones) — primer en iniciar
- Levanta `iot-backend` (FastAPI + SQLite) — espera a que valkey esté healthy
- Levanta `iot-frontend` (Nginx + React SPA) — espera a que backend esté healthy
- Crea los volúmenes `sqlite_data` y `valkey_data` automáticamente
- Ejecuta `docker_entrypoint.py` que crea todas las tablas SQLite y siembra el admin

**Resultado esperado:**
```
✔ Container iot-valkey    Started
✔ Container iot-backend   Started
✔ Container iot-frontend  Started
```

### Paso 4 — Verificar que todo está healthy

```powershell
docker compose ps
```

Esperar hasta que los tres contenedores muestren `healthy` o `running`:

| Contenedor | Puerto | Estado esperado |
|---|---|---|
| `iot-valkey` | 6379 | `Up (healthy)` |
| `iot-backend` | 8000 | `Up (healthy)` |
| `iot-frontend` | 3000 | `Up` |

```powershell
# También se puede verificar en el navegador:
# Backend (Swagger): http://localhost:8000/docs
# Frontend:          http://localhost:3000
```

### Paso 5 — Credenciales iniciales (administrador semilla)

Una vez que el backend está healthy, el sistema tiene exactamente un usuario:

| Campo | Valor |
|---|---|
| Email | `admin@iot.com` |
| Contraseña | `Admin1234!` |
| Tipo | Administrador Master |

Iniciar sesión en `http://localhost:3000/login/admin-master`.

---

## Fase 2 — Crear la Application y configurar credenciales

La firma criptográfica de peticiones (PG/TAG) requiere las credenciales de una `Application` registrada en el sistema. Esta fase solo se realiza **una vez por entorno**.

### Paso 6 — Crear una nueva Application

1. Ingresar al panel con el administrador semilla
2. Ir a la sección **Aplicaciones** en el menú lateral
3. Crear una nueva aplicación con los datos del entorno (nombre libre, p. ej. `"IoT Frontend Dev"`)
4. El backend genera automáticamente un `api_key` y un `server_key`
5. Copiar los tres valores:
   - `id` — UUID de la aplicación
   - `api_key` — clave de autenticación
   - `server_key` — clave de firma del servidor

### Paso 7 — Configurar las variables de entorno del frontend

Editar `IOT-Server/docker-compose.yml`, sección `frontend → build → args`:

```yaml
args:
  VITE_API_BASE_URL: /api/v1/
  VITE_APP_APPLICATION_ID: "<id copiado del paso 6>"
  VITE_APP_API_KEY: "<api_key copiado del paso 6>"
  VITE_APP_SERVER_KEY: "<server_key copiado del paso 6>"
```

### Paso 8 — Reconstruir solo el frontend

```powershell
docker compose build frontend
docker compose up -d frontend
```

El backend y valkey **no necesitan reiniciarse**. Solo se recompila el frontend con las nuevas variables.

---

## Estado del sistema tras completar ambas fases

| Componente | URL | Estado |
|---|---|---|
| Frontend (React + Nginx) | http://localhost:3000 | ✅ Operativo |
| Backend (FastAPI) | http://localhost:8000 | ✅ Operativo |
| Documentación API | http://localhost:8000/docs | ✅ Operativo |
| Cache de sesiones (Valkey) | localhost:6379 | ✅ Operativo |
| Base de datos SQLite | Volumen `sqlite_data` | ✅ Persistente |

---

## Comandos de mantenimiento

| Propósito | Comando |
|---|---|
| Ver logs del backend | `docker compose logs -f backend` |
| Ver logs del frontend | `docker compose logs -f frontend` |
| Reiniciar un servicio | `docker compose restart backend` |
| Detener sin borrar datos | `docker compose stop` |
| Detener y borrar TODO (BD incluida) | `docker compose down --volumes` |
| Reconstruir imágenes | `docker compose build` |

---

## Registro de ejecución — 5 de mayo de 2026

### Comandos ejecutados

```powershell
# Paso 1: Limpiar estado anterior (sistema ya limpio)
docker compose down --volumes --remove-orphans
docker rmi iot-server-backend iot-server-frontend

# Paso 2: Construir imágenes
docker compose build

# Nota: el build del frontend falló inicialmente por error TypeScript en
# requestSigning.ts (Uint8Array no asignable a BufferSource en tsc estricto).
# Se corrigió usando .buffer as ArrayBuffer en las 5 llamadas a Web Crypto API.
# Segundo intento exitoso con:
docker compose build frontend

# Paso 3: Iniciar contenedores
docker compose up -d
```

---

## Fase 2 — Configuración RC (5 de mayo de 2026)

Con el sistema en modo configuración inicial (variables RC vacías), se creó la primera
Application desde la UI y se configuraron las credenciales en `docker-compose.yml`.

### Paso 1 — Crear la Application en la UI

1. Abrir **http://localhost:3000/login/admin-master**
2. Iniciar sesión: `admin@iot.com` / `Admin1234!`
3. El sidebar muestra solo **Aplicaciones** (setup mode)
4. Clic en **Nuevo** → completar solo el campo **Nombre** (p. ej. `"IoT Frontend"`)
5. Confirmar creación

### Paso 2 — Obtener las credenciales RC

Con los contenedores en ejecución, ejecutar en terminal:

```powershell
# id y api_key — directamente desde la base de datos SQLite
docker exec iot-backend python3 -c "import sqlite3; c=sqlite3.connect('/app/data/iot.db'); print(c.execute('SELECT id, name, api_key FROM application').fetchall())"

# server_key — derivado del SECRET_KEY del backend
docker exec iot-backend python3 -c "import hashlib,os; print(hashlib.sha256((os.environ['SECRET_KEY']+'|puzzle_v1').encode()).hexdigest())"
```

> **Alternativa visual:** en setup mode, si ya existe una Application, la página
> **Aplicaciones** muestra automáticamente un panel amarillo con los valores
> `VITE_APP_APPLICATION_ID` y `VITE_APP_API_KEY` copiables, y el comando para
> obtener `VITE_APP_SERVER_KEY`.

### Paso 3 — Configurar docker-compose.yml

Editar el bloque `args` del servicio `frontend` en `docker-compose.yml`:

```yaml
args:
  VITE_API_BASE_URL: /api/v1/
  VITE_APP_APPLICATION_ID: "<id obtenido>"
  VITE_APP_API_KEY: "<api_key obtenida>"
  VITE_APP_SERVER_KEY: "<server_key calculado>"
```

### Paso 4 — Reconstruir y reiniciar el frontend

```powershell
# Solo reconstruir el frontend (backend y valkey no cambian)
docker compose build frontend

# Reiniciar el contenedor con la nueva imagen
docker compose up -d frontend
```

### Paso 5 — Verificar

Abrir **http://localhost:3000** — el frontend mostrará "Verificando autenticidad del
servidor..." durante ~1 segundo y luego cargará el login. Si el puzzle falla, aparece
una pantalla de error con botón para reintentar.

### Resultado obtenido

```
[+] Running 3/3
 ✔ Container iot-valkey   Healthy
 ✔ Container iot-backend  Healthy
 ✔ Container iot-frontend Started
```

| Servicio | URL | Estado |
|---|---|---|
| Frontend (React + Nginx) | http://localhost:3000 | ✅ RC verificado |
| Backend (FastAPI) | http://localhost:8000 | ✅ Operativo |
| Documentación API | http://localhost:8000/docs | ✅ Operativo |

### Resultado del build

| Imagen | Estado | Tiempo |
|---|---|---|
| `iot-server-backend` | ✅ Built | ~18 s (desde caché parcial) |
| `iot-server-frontend` | ✅ Built | ~29 s (1698 módulos transformados) |

### Estado de contenedores tras `docker compose up -d`

| Contenedor | Imagen | Estado | Puerto |
|---|---|---|---|
| `iot-valkey` | `valkey/valkey:8-alpine` | ✅ Up (healthy) | 6379 |
| `iot-backend` | `iot-server-backend` | ✅ Up (healthy) | 8000 |
| `iot-frontend` | `iot-server-frontend` | ✅ Up | 3000 |

### Corrección aplicada durante el arranque

**Archivo:** `src/shared/api/requestSigning.ts`  
**Problema:** TypeScript (modo estricto dentro de Docker, `node:20-alpine`) no acepta `Uint8Array<ArrayBufferLike>` donde `crypto.subtle` espera `BufferSource` (que requiere `ArrayBuffer` concreto, no `ArrayBufferLike`).  
**Solución:** Cast explícito `.buffer as ArrayBuffer` en las 5 invocaciones a Web Crypto API:
- `crypto.subtle.digest` — argumento `data`
- `crypto.subtle.importKey` (kEnc) — argumento `keyMaterial`
- `crypto.subtle.importKey` (kHMAC) — argumento `keyMaterial`
- `crypto.subtle.encrypt` — argumentos `iv` y `data`
- `crypto.subtle.sign` — argumento `data`

---

## ⏳ Pendiente — Fase 2

**El sistema está listo.** Puedes ahora:

1. Abrir **http://localhost:3000/login/admin-master**
2. Iniciar sesión con `admin@iot.com` / `Admin1234!`
3. Ir a **Aplicaciones → Crear nueva aplicación**
4. Copiar `id`, `api_key` y `server_key`
5. Avisar para configurar las variables en `docker-compose.yml` y reconstruir el frontend

---

## Modo configuración inicial (setup mode)

Mientras las variables RC están vacías, el frontend arranca en **modo configuración inicial**. Este modo restringe la UI para evitar que se use el sistema sin haber verificado la autenticidad del backend.

### Comportamiento en setup mode

| Elemento UI | Comportamiento |
|---|---|
| Sidebar | Solo muestra el ítem **Aplicaciones** |
| Banner | Advertencia amarilla: *"Modo configuración inicial — Crea una Application para activar el sistema completo"* |
| Rutas | Cualquier ruta (`/`, `/usuarios`, etc.) redirige automáticamente a `/aplicaciones` |
| Demás módulos | Inaccesibles hasta completar la Fase 2 |

### Qué hacer en el formulario de nueva Application

Al crear la Application en la página de Aplicaciones, verás estos campos:

| Campo | Qué poner | ¿Obligatorio? |
|---|---|---|
| **Nombre** | Nombre descriptivo, p. ej. `"IoT Frontend Dev"` | ✅ Sí |
| **URL** | `http://localhost:3000` (URL donde corre el frontend) | ❌ Opcional |
| **Puerto** | `3000` | ❌ Opcional |
| **Versión** | Libre, p. ej. `"1.0"` | ❌ Opcional |
| **Descripción** | Libre | ❌ Opcional |

> URL y Puerto son campos informativos — no afectan el `api_key` ni el `server_key` generados. Puedes dejarlos en blanco sin ningún impacto funcional.

### Valores a copiar tras crear la Application

El backend genera automáticamente tres valores que **solo se muestran una vez**. Copiarlos inmediatamente antes de cerrar o navegar:

| Valor | Dónde aparece | Para qué se usa |
|---|---|---|
| `id` | Columna ID de la tabla | `VITE_APP_APPLICATION_ID` |
| `api_key` | Columna api_key (truncada, ver con tooltip) | `VITE_APP_API_KEY` |
| `server_key` | Columna server_key (si aplica) | `VITE_APP_SERVER_KEY` |

> **Nota:** Si no se copiaron en el momento, será necesario eliminar la Application y crear una nueva.


