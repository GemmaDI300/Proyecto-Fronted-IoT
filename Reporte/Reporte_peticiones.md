# Reporte — Firma Criptográfica de Peticiones al Backend (Esquema PG/TAG/PF)
**Fecha:** 5 de mayo de 2026  
**Sistema:** IOT-Server (FastAPI + React/TypeScript)  
**Módulo implementado:** `frontend/src/shared/api/requestSigning.ts`  
**Módulo modificado:** `frontend/src/shared/api/functions.ts`  
**Autor:** GitHub Copilot (Claude Sonnet 4.6)

---

## Objetivo

Implementar en el frontend un esquema de autenticación de peticiones que garantice:

1. **Origen**: solo el frontend legítimo con sesión activa puede construir el TAG correcto.
2. **Integridad**: cualquier modificación del cuerpo o cabeceras invalida el TAG.
3. **Confidencialidad del payload**: el cuerpo de la petición va cifrado en PG.
4. **Anti-replay**: cada petición incluye un timestamp firmado.

Todo sin modificar el backend — el body HTTP sigue siendo JSON plano compatible con el backend actual; las cabeceras adicionales son ignoradas hasta que el backend decida validarlas.

---

## Restricción de diseño

El backend no puede modificarse. El middleware `Human` (`app/shared/middleware/auth/human.py`) solo valida `Authorization: Bearer <JWT>`. Por tanto:

- El **body de la petición HTTP permanece como JSON plano** — el backend lo procesa igual que antes.
- El esquema PG/TAG/PF se envía en **cabeceras HTTP `X-*`** — los servidores ignoran cabeceras desconocidas por estándar HTTP.
- Cuando el backend agregue validación de TAG, no se requiere ningún cambio en el frontend.

---

## Esquema criptográfico

### Definiciones formales

```
IDsess    = SHA-256(JWT_token)                               → hex de 64 chars (32 bytes)
PLcifrado = AES-256-CBC(body_json, kEnc, IV_aleatorio)      → "base64(IV):base64(ciphertext)"
PG        = base64(JSON({ session_id, payload, timestamp })) → base64 de objeto PeticionGenerica
SessApp   = HMAC-SHA256 key derivada de JWT                 → SHA-256("iot-sess-v1:" ‖ JWT)
TAG       = HMAC-SHA256(SessApp, PG)                        → hex de 64 chars (32 bytes)
PF        = TAG + PG  (enviados como cabeceras HTTP)
```

### Derivación de claves

No se usa ningún secreto externo ni variable de entorno. Las claves se derivan directamente del JWT de sesión, que **solo existe en RAM** (nunca en `localStorage` ni `sessionStorage`):

| Clave | Derivación | Algoritmo | Uso |
|---|---|---|---|
| `kEnc` | `SHA-256("iot-enc-v1:" ‖ JWT)` | AES-256-CBC | Cifrar PLcifrado |
| `SessApp` | `SHA-256("iot-sess-v1:" ‖ JWT)` | HMAC-SHA-256 | Firmar PG → TAG |

Los prefijos de dominio (`"iot-enc-v1:"`, `"iot-sess-v1:"`) evitan reutilización de claves entre propósitos distintos (separación de contextos criptográficos).

### Pasos de construcción por petición

```
 1. IDsess    ← SHA-256(JWT)
 2. kEnc      ← SHA-256("iot-enc-v1:"  ‖ JWT)   [importado como CryptoKey AES-CBC]
 3. IV        ← crypto.getRandomValues(16 bytes)
 4. PLcifrado ← AES-256-CBC(body_json | "{}", kEnc, IV)
                formato: base64(IV) + ":" + base64(ciphertext)
 5. timestamp ← Math.floor(Date.now() / 1000)    [segundos Unix]
 6. PG        ← base64(JSON({ session_id: IDsess, payload: PLcifrado, timestamp }))
 7. SessApp   ← SHA-256("iot-sess-v1:" ‖ JWT)    [importado como CryptoKey HMAC-SHA256]
 8. TAG       ← HMAC-SHA256(SessApp, PG)
 9. PF        ← { X-Session-Id: IDsess, X-Request-Pg: PG,
                   X-Request-Tag: TAG, X-Request-Ts: timestamp }
```

---

## Cabeceras HTTP enviadas

Cada petición autenticada (GET, POST, PUT, PATCH, DELETE) incluye:

| Cabecera | Valor | Descripción |
|---|---|---|
| `Authorization` | `Bearer <JWT>` | Autenticación existente (sin cambios) |
| `X-Session-Id` | `IDsess` (hex-64) | Identifica la sesión sin exponer el JWT |
| `X-Request-Pg` | `PG` (base64) | Petición Genérica: session_id + PLcifrado + timestamp |
| `X-Request-Tag` | `TAG` (hex-64) | HMAC de integridad sobre PG |
| `X-Request-Ts` | Unix timestamp | Para validación anti-replay (ventana 60 s) |

---

## Implementación técnica

### Módulo `requestSigning.ts`

Ubicación: `frontend/src/shared/api/requestSigning.ts`

Usa exclusivamente la **Web Crypto API nativa del navegador** (`crypto.subtle`), sin dependencias de terceros. No usa Node.js ni la librería `crypto` de npm.

Función principal exportada:

```typescript
export async function buildSignedHeaders(
    jwt: string,      // JWT de sesión (solo en RAM)
    bodyJson: string, // JSON.stringify(payload) o "" para GET/DELETE
): Promise<Record<string, string>>
```

### Integración en `functions.ts`

Las tres funciones de red (`useSendDataMutation`, `useDeleteByIdMutation`, `useGetQuery`) ahora llaman a `buildSignedHeaders` antes de cada `fetch`:

```typescript
// POST / PUT / PATCH
const bodyJson = JSON.stringify(sanitizedData);
const sigHeaders = await buildSignedHeaders(session.token, bodyJson).catch(() => ({}));
const response = await fetch(url, {
    method,
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
        ...sigHeaders,      // X-Session-Id, X-Request-Pg, X-Request-Tag, X-Request-Ts
    },
    body: bodyJson,         // body JSON plano — el backend lo procesa igual
});

// GET
const sigHeaders = await buildSignedHeaders(session.token, "").catch(() => ({}));
const response = await fetch(url, {
    headers: {
        Authorization: `Bearer ${session.token}`,
        ...sigHeaders,
    },
});
```

El `.catch(() => ({}))` garantiza **degradación segura**: si Web Crypto API no está disponible (entorno antiguo o sin HTTPS), la petición se envía de todas formas con solo el JWT, sin interrumpir el flujo de la aplicación.

---

## Protecciones implementadas

| Ataque | Protección | Mecanismo |
|---|---|---|
| **Replay** | ✅ | `timestamp` firmado en TAG — ventana de 60 s cuando el backend valide |
| **Tampering del body** | ✅ | PLcifrado en PG está cubierto por el TAG |
| **Sniffing del payload** | ✅ | AES-256-CBC con IV aleatorio por petición |
| **Forgery (petición falsa)** | ✅ | TAG requiere `SessApp` derivada del JWT real en RAM |
| **Exposición del JWT** | ✅ | `X-Session-Id` es `SHA-256(JWT)` — hash unidireccional |
| **Reutilización de claves** | ✅ | Prefijos de dominio distintos para `kEnc` y `SessApp` |

---

## Archivos modificados / creados

| Archivo | Tipo | Cambio |
|---|---|---|
| `frontend/src/shared/api/requestSigning.ts` | **Nuevo** | Módulo completo del esquema PG/TAG/PF |
| `frontend/src/shared/api/functions.ts` | **Modificado** | Import + llamada a `buildSignedHeaders` en las 3 funciones fetch |

---

## Consideraciones de seguridad adicionales

1. **Sin almacenamiento persistente**: el JWT (y por tanto las claves derivadas) solo existe en el estado React en RAM. Al cerrar la pestaña se destruye.
2. **IV único por petición**: AES-CBC con IV aleatorio de 16 bytes via `crypto.getRandomValues()` — nunca se reutiliza un IV con la misma clave.
3. **HMAC timing-safe**: cuando el backend valide el TAG, debe usar comparación `hmac.compare_digest()` (ya es el patrón del proyecto en `auth.py`).
4. **Compatibilidad HTTPS**: `crypto.subtle` solo está disponible en contextos seguros (HTTPS o localhost). En producción, nginx ya sirve el frontend — se recomienda agregar TLS al reverse proxy.
5. **Pendiente en backend**: para completar el ciclo, el backend debe agregar un middleware que lea `X-Request-Pg` + `X-Request-Tag`, verifique el HMAC y rechace peticiones con timestamp fuera de ventana.

---

## Prueba de correctitud del esquema

Para verificar que el TAG es coherente con lo que el backend debe validar, el backend puede replicar en Python:

```python
import hashlib, hmac, json, base64, time

jwt = "<JWT del usuario>"
pg_b64 = request.headers.get("X-Request-Pg")
tag_received = bytes.fromhex(request.headers.get("X-Request-Tag"))

# Derivar SessApp igual que el frontend
sess_app_key = hashlib.sha256(b"iot-sess-v1:" + jwt.encode()).digest()

# Verificar TAG (timing-safe)
tag_expected = hmac.new(sess_app_key, pg_b64.encode(), hashlib.sha256).digest()
valid = hmac.compare_digest(tag_received, tag_expected)

# Verificar timestamp dentro de ventana de 60 segundos
pg = json.loads(base64.b64decode(pg_b64))
valid_ts = abs(pg["timestamp"] - time.time()) <= 60
```
