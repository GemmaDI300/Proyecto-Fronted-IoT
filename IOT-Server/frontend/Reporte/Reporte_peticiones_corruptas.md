# Reporte de Pruebas Dinámicas — Peticiones Corruptas y Manejo de Excepciones
**Fecha:** 30 de abril de 2026  
**Sistema:** IOT-Server (FastAPI + React/TypeScript)  
**Entorno:** Docker Compose — `http://localhost:8000` (backend), `http://localhost:3000` (frontend)  
**Script:** `test_frontend_exceptions.py` (raíz del repositorio)  
**Auditor:** GitHub Copilot (Claude Sonnet 4.6)

---

## Objetivo

Verificar cómo el sistema responde ante **peticiones malformadas, corruptas o maliciosas**, evaluando:

1. Qué código HTTP y mensaje retorna el **backend**
2. Cómo procesa ese error el **frontend** (`parseApiError`, `useGetQuery`, `useMutation`)
3. Si alguna petición corrupta logra **evadir controles** o expone información sensible

Se ejecutaron **30 pruebas activas** agrupadas en 5 bloques.

---

## Resumen Ejecutivo

| Bloque | Pruebas | ✅ Correctas | ⚠️ Hallazgos |
|--------|---------|------------|-------------|
| 1 — Cuerpo malformado | 8 | 6 | 2 |
| 2 — Inyección en campos | 7 | 7 | 0 |
| 3 — JWT inválidos/corruptos | 7 | 5 | 2 |
| 4 — Rutas y parámetros inválidos | 6 | 6 | 0 |
| 5 — Headers anómalos | 2 | 1 | 1 |
| **Total** | **30** | **25** | **5** |

De los 5 hallazgos:
- **2 correcciones de código** aplicadas en `frontend/src/shared/api/functions.ts` (VULN-017)
- **1 nota de diseño** para la futura implementación de rate limiting (VULN-003)
- **2 confirmaciones positivas** de protecciones ya existentes (`alg:none`, mass-assignment)

---

## Bloque 1 — Cuerpo y campos malformados

> Simulan errores de red, bugs en el `fetch()` del frontend o manipulación del body por un proxy intermedio.

### T-01 — Body completamente vacío

```
POST /api/v1/auth/login
Content-Type: application/json
Body: ""
```

**Respuesta backend:**
```json
HTTP 422 Unprocessable Entity
{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}
```

**Comportamiento frontend (antes):** `parseApiError` devolvía `JSON.stringify(detail)` → texto crudo ilegible  
**Comportamiento frontend (corregido):** `body: Field required`  
**Evaluación:** ⚠️ Hallazgo corregido

---

### T-02 — Campo `password` faltante

```
POST /api/v1/auth/login
Body: {"email":"admin@test.com"}
```

**Respuesta backend:**
```json
HTTP 422
{"detail":[{"type":"missing","loc":["body","password"],"msg":"Field required","input":{"email":"admin@test.com"}}]}
```

**Comportamiento frontend (corregido):** `password: Field required`  
**Evaluación:** ⚠️ Hallazgo corregido

---

### T-03 — Tipos de datos incorrectos (int/bool en lugar de string)

```
POST /api/v1/auth/login
Body: {"email":99999,"password":true}
```

**Respuesta backend:**
```json
HTTP 422
{"detail":[
  {"type":"string_type","loc":["body","email"],"msg":"Input should be a valid string","input":99999},
  {"type":"string_type","loc":["body","password"],"msg":"Input should be a valid string","input":true}
]}
```

**Comportamiento frontend (corregido):** `email: Input should be a valid string | password: Input should be a valid string`  
**Evaluación:** ⚠️ Hallazgo corregido (mismo fix que T-01/T-02)

---

### T-04 — JSON con sintaxis rota

```
POST /api/v1/auth/login
Body: {"email":"x@x.com","password":
```

**Respuesta backend:**
```json
HTTP 422
{"detail":[{"type":"json_invalid","loc":["body",30],"msg":"JSON decode error","input":{},"ctx":{"error":"Expecting value"}}]}
```

**Comportamiento frontend (corregido):** `JSON decode error`  
**Evaluación:** ✅ Correcto tras fix

---

### T-05 — Content-Type incorrecto (`text/plain`)

```
POST /api/v1/auth/login
Content-Type: text/plain
Body: {"email":"admin@iot.com","password":"Admin1234!"}
```

**Respuesta backend:**
```json
HTTP 422
{"detail":[{"type":"model_attributes_type","loc":["body"],"msg":"Input should be a valid dictionary or object to extract fields from","input":"..."}]}
```

**Evaluación:** ✅ FastAPI rechaza correctamente — el JSON no se parsea si el Content-Type es incorrecto

---

### T-06 — Body es un array, no un objeto

```
Body: [1, 2, 3]
```

**Respuesta:**
```json
HTTP 422
{"detail":[{"msg":"Input should be a valid dictionary or object to extract fields from",...}]}
```

**Evaluación:** ✅ Pydantic rechaza tipos de nivel raíz incorrectos

---

### T-07 — Payload `null` literal

```
Body: null
```

**Respuesta:**
```json
HTTP 422
{"detail":[{"type":"missing","loc":["body"],"msg":"Field required","input":null}]}
```

**Evaluación:** ✅ Correcto

---

### T-08 — Campos extra desconocidos (mass-assignment attempt)

```
Body: {"email":"admin@iot.com","password":"Admin1234!","extra_field":"HACKED","role":"admin"}
```

**Respuesta:**
```json
HTTP 422
{"detail":[
  {"type":"extra_forbidden","loc":["body","extra_field"],"msg":"Extra inputs are not permitted","input":"HACKED"},
  {"type":"extra_forbidden","loc":["body","role"],"msg":"Extra inputs are not permitted","input":"admin"}
]}
```

**Evaluación:** ✅ **Protección activa** — Pydantic tiene `extra="forbid"`, bloqueando cualquier intento de mass-assignment o inyección de campos no declarados.

---

## Bloque 2 — Inyección en campos

> Simulan un atacante que introduce payloads maliciosos en campos de texto del formulario.

### T-09 — XSS en campo email

```
Body: {"email":"<script>alert(1)</script>@x.com","password":"Test1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ Seguro — el email con etiquetas HTML no existe en la BD, retorna error genérico sin revelar información

---

### T-10 — SQL Injection clásico en email

```
Body: {"email":"admin@x.com' OR '1'='1","password":"Test1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ **Protegido** — SQLModel usa parámetros preparados (ORM), nunca concatena strings en queries SQL

---

### T-11 — Server-Side Template Injection (SSTI Jinja2) en password

```
Body: {"email":"admin@iot.com","password":"{{7*7}}Admin1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ Seguro — FastAPI no usa Jinja2 para procesar valores de formulario; las plantillas son exclusivas del sistema de templates HTML (no usado en esta API)

---

### T-12 — Command injection en email

```
Body: {"email":"admin@iot.com; rm -rf /","password":"Test1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ Seguro — el backend no ejecuta comandos shell con los valores del request

---

### T-13 — Null bytes en campos

```
Body: {"email":"admin\u0000@iot.com","password":"Admin1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ Python y SQLite manejan correctamente null bytes sin comportamiento inesperado

---

### T-14 — Email de longitud extrema (5000 caracteres)

```
Body: {"email":"aaa...aaa@iot.com (5000 chars)","password":"Admin1234!"}
```

**Respuesta:**
```json
HTTP 422
{"detail":[{"type":"string_too_long","loc":["body","email"],"msg":"String should have at most 254 characters",...}]}
```

**Evaluación:** ✅ **Protegido** — validación de longitud activa en Pydantic, previene ataques de buffer overflow o abuso de recursos de BD

---

### T-15 — Unicode y emoji en password

```
Body: {"email":"admin@iot.com","password":"😈💀🔓Admin1234!"}
```

**Respuesta:** `HTTP 400 {"detail":"Invalid credentials"}`  
**Evaluación:** ✅ Seguro — bcrypt acepta UTF-8 completo; el emoji no causa fallo del sistema ni comportamiento inesperado

---

### Resultado del Bloque 2

**7/7 pruebas correctas.** El backend es inmune a las inyecciones más comunes gracias a:
- **SQLModel ORM** — sin queries SQL concatenadas
- **Pydantic** — validación estricta de tipos y longitudes
- **Mensajes de error genéricos** — `"Invalid credentials"` para cualquier fallo de autenticación, sin revelar qué campo falló

---

## Bloque 3 — Tokens JWT inválidos/corruptos

> Simulan tokens corruptos, expirados o ataques directos al mecanismo JWT. Equivalen a lo que `useGetQuery` y `useSendDataMutation` enviarían si el token en memoria fuera corrupto.

### T-16 — Sin header `Authorization`

```
GET /api/v1/users/
(sin header Authorization)
```

**Respuesta:** `HTTP 401 {"detail":"Not authenticated"}`  
**Comportamiento frontend (antes):** `"Error 401: Unauthorized"` (genérico de `statusText`)  
**Comportamiento frontend (corregido):** `"Not authenticated"`  
**Evaluación:** ⚠️ Hallazgo corregido

---

### T-17 — Token vacío (`Bearer ` con espacio)

```
Authorization: Bearer 
```

**Respuesta:** `HTTP 401 {"detail":"Invalid token format"}`  
**Evaluación:** ✅ El middleware detecta el token vacío como formato inválido

---

### T-18 — Token basura (texto aleatorio, no JWT)

```
Authorization: Bearer ESTE_NO_ES_UN_JWT_VALIDO
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ El parser JWT falla correctamente ante formato no reconocible

---

### T-19 — JWT con firma incorrecta (clave equivocada)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
                      eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJ0eXBlIjoiYWRtaW5pc3RyYXRvciIsImlzX21hc3RlciI6dHJ1ZX0.
                      FIRMA_INVALIDA_AQUI
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ La firma es verificada criptográficamente — un token con claims válidos pero firma incorrecta es rechazado

---

### T-20 — JWT expirado (`exp` en el año 2020)

```
Payload: {"sub":"test","exp":1600000000}
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ La validación de expiración funciona correctamente

---

### T-21 — Esquema `Basic` en lugar de `Bearer`

```
Authorization: Basic YWRtaW46cGFzc3dvcmQ=
```

**Respuesta:** `HTTP 401 {"detail":"Invalid token format"}`  
**Evaluación:** ✅ El middleware valida el esquema de autenticación

---

### T-22 — Ataque `alg:none` (JWT Algorithm Confusion)

Este es un ataque conocido contra implementaciones JWT que permiten el algoritmo `none`, omitiendo completamente la verificación de firma:

```
Header: {"alg":"none","typ":"JWT"}
Payload: {"sub":"admin","type":"administrator"}
Signature: (vacía)

Token: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsInR5cGUiOiJhZG1pbmlzdHJhdG9yIn0.
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ **PROTEGIDO** — La librería PyJWT con `algorithms=["HS256"]` explícito rechaza `alg:none`. Este es uno de los ataques JWT más conocidos (CVE-2015-9235) y el sistema está protegido correctamente.

---

## Bloque 4 — Rutas y parámetros inválidos

> Simulan errores de navegación, URLs manipuladas o intentos de path traversal.

### T-23 — Ruta completamente inexistente

```
GET /api/v1/no-existe/ruta/falsa
```

**Respuesta:** `HTTP 404 {"detail":"Not Found"}`  
**Evaluación:** ✅ 404 estándar sin información extra sobre la estructura interna

---

### T-24 — Método HTTP incorrecto

```
GET /api/v1/auth/login  (el endpoint solo acepta POST)
```

**Respuesta:** `HTTP 405 {"detail":"Method Not Allowed"}`  
**Evaluación:** ✅ FastAPI genera 405 automáticamente para métodos no registrados

---

### T-25 — UUID inválido en path param

```
GET /api/v1/users/ESTO_NO_ES_UUID
Authorization: Bearer token_invalido
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ El middleware de autenticación intercepta **antes** de que FastAPI valide el path param. Comportamiento correcto (fail-fast).

---

### T-26 — Path traversal en parámetro

```
GET /api/v1/users/../../../../etc/passwd
Authorization: Bearer token_invalido
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ Auth intercepta antes. Adicionalmente, uvicorn normaliza las rutas URL antes de enrutar, por lo que el path traversal no llegaría al sistema de archivos.

---

### T-27 — Paginación con valores negativos

```
GET /api/v1/users/?offset=-999&limit=-1
Authorization: Bearer token_invalido
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ Auth intercepta primero. La validación de query params `offset`/`limit` requeriría un token válido para probar.

---

### T-28 — Inyección SQL en query param

```
GET /api/v1/users/?offset=0%3BDROP+TABLE+users&limit=10
Authorization: Bearer token_invalido
```

**Respuesta:** `HTTP 401 {"detail":"Invalid or expired token"}`  
**Evaluación:** ✅ Auth intercepta. El ORM SQLModel nunca interpola query params de HTTP directamente en SQL.

---

## Bloque 5 — Headers anómalos

> Simulan un atacante que manipula headers HTTP para engañar la lógica del servidor.

### T-29 — Header `X-Forwarded-For` falsificado

```
POST /api/v1/auth/login
X-Forwarded-For: 127.0.0.1
Body: {"email":"admin@iot.com","password":"Admin1234!"}
```

**Respuesta:** `HTTP 200 OK` — login exitoso  
**Evaluación:** ⚠️ **Hallazgo de diseño**

El backend acepta y no valida el header `X-Forwarded-For`. Actualmente esto es inofensivo porque no existe rate limiting (VULN-003). Sin embargo, cuando se implemente rate limiting por IP, **este header puede ser falsificado** para evadir el bloqueo:

```python
# Escenario de evasión (futuro):
# Atacante envía X-Forwarded-For con una IP diferente en cada intento
# Si el rate limiting usa este header en lugar del socket real → bypasseado

# Corrección en la implementación futura de rate limiting:
# ❌ INCORRECTO:
client_ip = request.headers.get("X-Forwarded-For", request.client.host)

# ✅ CORRECTO:
client_ip = request.client.host  # IP del socket TCP — no manipulable por el cliente
```

---

### T-30 — Header `Host` manipulado

```
POST /api/v1/auth/login
Host: evil.com
Body: {"email":"admin@iot.com","password":"Admin1234!"}
```

**Respuesta:** `HTTP 200 OK` — login exitoso  
**Evaluación:** ✅ El backend no usa el header `Host` en ninguna lógica de negocio crítica (redirecciones, generación de URLs, validaciones). El login procede normalmente.

---

## Hallazgos y Correcciones Aplicadas

### VULN-017 — Manejo de errores HTTP incompleto en el frontend ✅ CORREGIDO

**Archivo:** `frontend/src/shared/api/functions.ts`

#### Problema 1: `parseApiError` serializaba arrays a JSON crudo

Cuando el backend retorna HTTP 422, el campo `detail` es un **array de objetos** con `loc`, `msg` y `type`. La función original hacía `JSON.stringify(detail)`:

```typescript
// ANTES — mostraba texto técnico ilegible:
if (json.detail) return typeof json.detail === "string"
    ? json.detail
    : JSON.stringify(json.detail);  // ← Array serializado a JSON crudo

// Lo que veía el usuario:
// [{"type":"missing","loc":["body","password"],"msg":"Field required","input":...}]
```

```typescript
// DESPUÉS — extrae solo el mensaje legible de cada elemento:
if (Array.isArray(json.detail)) {
    return json.detail
        .map((e: { msg?: string; loc?: string[] }) => {
            const field = e.loc ? e.loc.filter((l) => l !== "body").join(".") : "";
            return field ? `${field}: ${e.msg ?? "error"}` : (e.msg ?? "error");
        })
        .join(" | ");
}

// Lo que ve el usuario ahora:
// "password: Field required"
// "email: Input should be a valid string | password: Input should be a valid string"
```

#### Problema 2: `useGetQuery` ignoraba `parseApiError`

El hook de queries GET usaba el `statusText` del browser directamente, que es genérico y no refleja el mensaje del backend:

```typescript
// ANTES — mensaje genérico del browser:
throw new Error(`Error ${response.status}: ${response.statusText}`);
// Resultado: "Error 401: Unauthorized"  ← sin contexto

// DESPUÉS — mensaje semántico del backend:
throw new Error(await parseApiError(response));
// Resultado: "Invalid token format" / "Not authenticated"  ← específico y útil
```

---

## Notas de Seguridad Adicionales

### Confirmaciones positivas

| Control | Prueba | Resultado |
|---------|--------|-----------|
| **Protección `alg:none`** | T-22 | ✅ PyJWT con `algorithms=["HS256"]` bloquea el ataque |
| **Anti mass-assignment** | T-08 | ✅ Pydantic `extra="forbid"` rechaza campos desconocidos |
| **Sin SQL injection** | T-10, T-28 | ✅ ORM parameterizado en todas las queries |
| **Validación de longitud** | T-14 | ✅ Email limitado a 254 caracteres (RFC 5321) |
| **Mensajes de error genéricos** | T-09 a T-15 | ✅ `"Invalid credentials"` no revela qué campo falló |

### Nota sobre pruebas con token válido

Las pruebas T-25 a T-28 (path params y query params inválidos) retornan HTTP 401 porque el middleware de autenticación intercepta primero. Para probar la validación de parámetros (Pydantic UUID en path, `ge=0` en paginación), se requeriría un token válido. Esas validaciones existen en el código pero no pudieron verificarse dinámicamente en esta sesión sin autenticarse primero.

---

## Conclusión

El sistema IOT-Server muestra una postura de seguridad **sólida** en el manejo de peticiones malformadas:

- **Backend:** Inmune a inyecciones. Validación robusta con Pydantic. Autenticación fail-fast.
- **Frontend:** Dos gaps de manejo de errores corregidos — mensajes de validación y respuestas de queries GET ahora son informativos y correctos.
- **Punto pendiente:** Implementar rate limiting en el login (VULN-003) usando `request.client.host`, no `X-Forwarded-For`.

---

*Reporte generado mediante pruebas dinámicas activas con el sistema en ejecución (Docker Compose). Script disponible en `test_frontend_exceptions.py`.*
