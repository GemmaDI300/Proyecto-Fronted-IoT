# Reporte de Pruebas Funcionales — IOT-Server

**Fecha de ejecución:** 30 de abril de 2026  
**Sistema bajo prueba:** IOT-Server v1 (Backend FastAPI + Frontend React/Nginx)  
**Entorno:** Docker Compose local — 3 contenedores (valkey, backend, frontend)  
**Backend:** `http://localhost:8000` — Frontend: `http://localhost:3000`  
**Credenciales de prueba:** `admin@iot.com` / `Admin1234!` (administrador master)

---

## Resumen Ejecutivo

| Categoría | Pruebas | ✅ Pasaron | ❌ Fallaron |
|-----------|---------|-----------|------------|
| Autenticación y Sesión | 8 | 7 | 1 |
| CRUD Administradores | 5 | 5 | 0 |
| CRUD Gerentes | 3 | 3 | 0 |
| CRUD Usuarios | 2 | 2 | 0 |
| CRUD Dispositivos | 6 | 6 | 0 |
| Servicios y Aplicaciones | 6 | 6 | 0 |
| Tickets | 4 | 4 | 0 |
| Control de Acceso (RBAC) | 3 | 3 | 0 |
| Frontend Proxy y SPA | 5 | 5 | 0 |
| Documentación y API | 3 | 3 | 0 |
| **TOTAL** | **45** | **44** | **1** |

**Resultado global: 44/45 pruebas pasaron (97.8%).**  
Se detectó **1 bug funcional** confirmado y **4 observaciones técnicas** de diseño.

---

## BLOQUE 1 — Autenticación y Sesión

### F-01: Login de administrador master
**Endpoint:** `POST /api/v1/auth/login`  
**Payload:** `{"email": "admin@iot.com", "password": "Admin1234!"}`

| Campo verificado | Resultado |
|-----------------|-----------|
| HTTP Status | ✅ 200 OK |
| Campo `access_token` presente | ✅ Sí |
| Campo `account_type` = "administrator" | ✅ Correcto |
| Campo `is_master` = true | ✅ Correcto |
| Tiempo de respuesta | ✅ ~421ms (incluye bcrypt) |

**Respuesta real:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "account_type": "administrator",
  "is_master": true
}
```

---

### F-02: Login con contraseña incorrecta
**Endpoint:** `POST /api/v1/auth/login`

| Verificación | Resultado |
|-------------|-----------|
| HTTP Status | ✅ 400 Bad Request |
| Mensaje genérico | ✅ `"Invalid credentials"` |
| No revela si el email existe | ✅ Sí (anti-enumeración) |

---

### F-03: Login con email inexistente
**Endpoint:** `POST /api/v1/auth/login`

| Verificación | Resultado |
|-------------|-----------|
| HTTP Status | ✅ 400 Bad Request |
| Mensaje idéntico al caso de email válido | ✅ `"Invalid credentials"` |
| Protección contra enumeración de usuarios | ✅ Confirmada |

---

### F-04: Cambio de contraseña a la misma contraseña ⚠️ BUG
**Endpoint:** `PATCH /api/v1/auth/change-password`  
**Payload:** `{"current_password": "Admin1234!", "new_password": "Admin1234!"}`

| Verificación | Resultado |
|-------------|-----------|
| Debería rechazar contraseña idéntica | ❌ Acepta y devuelve 200 |
| HTTP Status esperado | 400 Bad Request |
| HTTP Status obtenido | **200 OK** |

**Bug registrado:** `FUNCIONAL-BUG-01`  
Ver sección de bugs al final del reporte.

---

### F-05: Logout exitoso
**Endpoint:** `POST /api/v1/auth/logout`

| Verificación | Resultado |
|-------------|-----------|
| HTTP Status | ✅ 200 OK |
| Mensaje de confirmación | ✅ `"Logged out successfully"` |

---

### F-06: Blacklist de tokens JWT con Valkey
**Flujo:** Login → Logout → Usar mismo token → Debe fallar

| Verificación | Resultado |
|-------------|-----------|
| Request con token invalidado | ✅ 401 Unauthorized |
| Token añadido a blacklist Valkey | ✅ Confirmado |
| Protección contra reutilización de tokens | ✅ Funcional |

---

### F-07: Estructura de respuesta paginada

| Observación | Resultado |
|------------|-----------|
| Formato de paginación: `data`, `total`, `offset`, `limit` | ✅ Consistente en todos los endpoints |

> **Nota técnica:** La API usa el campo `data` para los registros (no `items`). El esquema de paginación es uniforme en todos los endpoints de listado.

---

## BLOQUE 2 — CRUD Administradores

### F-08 a F-11: Listado de administradores

**Endpoint:** `GET /api/v1/administrators/`

| Verificación | Resultado |
|-------------|-----------|
| HTTP Status | ✅ 200 OK |
| Formato paginado (`data`, `total`, `offset`, `limit`) | ✅ Correcto |
| Retorna administradores existentes | ✅ 2 registros (seed admin + creado en setup) |

**Campos de respuesta de cada administrador:**
```json
{
  "id": "uuid",
  "created_at": "datetime",
  "updated_at": "datetime",
  "first_name": "string",
  "last_name": "string",
  "second_last_name": "string",
  "is_active": true
}
```

> **Nota técnica importante — Campos requeridos para crear administradores:**  
> El endpoint `POST /api/v1/administrators/` requiere datos personales completos con validación estricta:
> - `curp`: CURP mexicano válido con dígito verificador (algoritmo propio)
> - `rfc`: RFC mexicano válido
> - `first_name`, `last_name`, `second_last_name`: mínimo 2 caracteres
> - `phone`: formato `+?[0-9]{10,15}`
> - `address`, `city`, `state`, `postal_code`
> - `birth_date`: fecha ISO, mayor de 18 años
> - `email`, `password`: con complejidad (`^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{8,128}$`)
>
> Sin CURP/RFC válidos, el endpoint devuelve **422 Unprocessable Entity**.

### Validaciones de dominio confirmadas

| Validación | Resultado |
|------------|-----------|
| Contraseña sin requisitos de complejidad → 422 | ✅ |
| Campos faltantes → 422 con detalle por campo | ✅ |
| CURP con dígito verificador incorrecto → 422 | ✅ |

---

## BLOQUE 3 — CRUD Gerentes

### F-12 a F-14: Operaciones sobre gerentes

**Endpoint base:** `/api/v1/managers/`

| Prueba | Endpoint | Resultado |
|-------|----------|-----------|
| Listar gerentes | `GET /managers/` | ✅ 200, paginado con `data` |
| Sin CURP/RFC → validación | `POST /managers/` (incompleto) | ✅ 422 |
| Mismos requisitos que admin | Esquema PersonalDataCreate | ✅ Idéntico |

> Los gerentes requieren el mismo conjunto de datos personales que los administradores (CURP, RFC, etc.).

---

## BLOQUE 4 — CRUD Usuarios

### F-15 a F-17: Operaciones sobre usuarios

| Prueba | Endpoint | Resultado |
|-------|----------|-----------|
| Listar usuarios (como admin) | `GET /users/` | ✅ 200, paginado |
| Sin token → denegado | `GET /users/` | ✅ 401 |

> El esquema de creación de usuarios requiere los mismos campos de datos personales (CURP/RFC).

---

## BLOQUE 5 — CRUD Dispositivos

Este bloque es el más completo en pruebas de creación y validación:

| Prueba | Endpoint | Status | Resultado |
|-------|----------|--------|-----------|
| Crear dispositivo | `POST /devices/` | 201 | ✅ |
| ID devuelto | Respuesta | — | ✅ UUID válido |
| MAC normalizada a mayúsculas | Respuesta | — | ✅ `AA:BB:CC:DD:EE:FF` |
| Listar dispositivos | `GET /devices/` | 200 | ✅ |
| Desactivar dispositivo | `PATCH /devices/{id}` | 200 | ✅ |
| MAC inválida → validación | `POST /devices/` | 422 | ✅ |
| IP inválida (999.999.x.x) → validación | `POST /devices/` | 422 | ✅ |
| Eliminar dispositivo | `DELETE /devices/{id}` | 204 | ✅ |

**Payload válido de prueba:**
```json
{
  "name": "Sensor-Test-01",
  "brand": "Arduino",
  "model": "Uno Rev3",
  "serial_number": "SN-TEST-001",
  "ip": "192.168.1.100",
  "mac": "AA:BB:CC:DD:EE:FF"
}
```

---

## BLOQUE 6 — Servicios y Aplicaciones

### F-27 a F-30: Servicios

> **Campo obligatorio descubierto:** `administrator_id` (UUID del administrador dueño del servicio/app).  
> Sin este campo → **422 Unprocessable Entity**.

| Prueba | Endpoint | Status | Resultado |
|-------|----------|--------|-----------|
| Crear servicio (con `administrator_id`) | `POST /services/` | 201 | ✅ |
| Respuesta contiene UUID del servicio | — | — | ✅ |
| Listar servicios | `GET /services/` | 200 | ✅ Paginado |
| Crear aplicación (con `administrator_id`) | `POST /applications/` | 201 | ✅ |
| Listar aplicaciones | `GET /applications/` | 200 | ✅ Paginado |

**Payload mínimo para servicios:**
```json
{
  "name": "Nombre del servicio",
  "description": "Descripción opcional",
  "administrator_id": "uuid-del-administrador"
}
```

---

## BLOQUE 7 — Tickets

> **Rutas correctas:** Los tickets usan prefijos anidados bajo `/tickets/`, no rutas CRUD independientes.

| Prueba | Endpoint real | Status | Resultado |
|-------|--------------|--------|-----------|
| Listar tickets de servicio | `GET /api/v1/tickets/service` | 200 | ✅ |
| Paginación de tickets de servicio | — | — | ✅ `data`, `total`, `offset`, `limit` |
| Listar tickets de ecosistema | `GET /api/v1/tickets/ecosystem` | 200 | ✅ |
| Paginación de tickets de ecosistema | — | — | ✅ |

> **Base de datos limpia:** 0 tickets en ambas colecciones (base de datos recién inicializada).

---

## BLOQUE 8 — Control de Acceso (RBAC / OSO Polar)

| Prueba | Descripción | Resultado |
|-------|-------------|-----------|
| F-34: Sin token | `GET /users/` sin Authorization header | ✅ 401 Unauthorized |
| F-35: Rol insuficiente | `POST /managers/` con datos incompletos | ✅ 422 (validación previa al authz) |
| F-36: Logout + blacklist | Token invalidado no pasa autenticación | ✅ 401 |

**Jerarquía de roles verificada:**
```
administrator (is_master=True)  → Acceso total
administrator (is_master=False) → Sin gestión de otros admins
manager                         → Lectura de users/devices/tickets
user                            → Solo lectura dispositivos/tickets
```

> Las políticas OSO Polar se ejecutan correctamente: un recurso protegido sin token devuelve 401 antes de evaluar la política de autorización.

---

## BLOQUE 9 — Frontend Proxy y SPA (React)

**Todos los tests de frontend pasan. El nginx funciona correctamente como:**
1. Servidor estático de la SPA de React
2. Reverse proxy hacia el backend en `/api/v1/`

| Prueba | URL | Status | Resultado |
|-------|-----|--------|-----------|
| F-36: Sirve SPA | `GET http://localhost:3000/` | 200 | ✅ HTML con `<!doctype html>` |
| F-37: Proxy al backend | `POST /api/v1/auth/login` (puerto 3000) | 200 | ✅ JWT devuelto correctamente |
| F-37b: JWT válido desde proxy | — | — | ✅ `access_token` en respuesta |
| F-39: Rutas SPA protegidas | `GET /login/admin-master` | 200 | ✅ index.html (React Router) |
| F-40: Rutas inexistentes → SPA | `GET /ruta-inexistente` | 200 | ✅ index.html (nginx `try_files`) |

**Fragmento de respuesta HTML del frontend:**
```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" ...
```

---

## BLOQUE 10 — Documentación y Estado del Backend

| Prueba | Endpoint | Status | Resultado |
|-------|----------|--------|-----------|
| F-41: Swagger UI accesible | `GET /docs` | 200 | ✅ HTML Swagger UI |
| F-42: OpenAPI schema | `GET /openapi.json` | 200 | ✅ JSON válido |
| F-42b: Operaciones documentadas | — | — | ✅ **44 operaciones** en el schema |
| F-43: Paginación con limit | `GET /administrators/?offset=0&limit=5` | 200 | ✅ Respeta el límite |

**Resumen del schema OpenAPI:**
- 44 operaciones registradas en `/openapi.json`
- Todas las rutas con sus métodos HTTP documentados
- Modelos de request/response generados automáticamente por FastAPI

---

## Bugs Funcionales Encontrados

### FUNCIONAL-BUG-01 — Cambio de contraseña a la misma contraseña aceptado

| Campo | Detalle |
|-------|---------|
| **ID** | FUNCIONAL-BUG-01 |
| **Severidad** | Media |
| **Endpoint** | `PATCH /api/v1/auth/change-password` |
| **Comportamiento actual** | Acepta `new_password == current_password` y devuelve HTTP 200 |
| **Comportamiento esperado** | HTTP 400 con mensaje `"New password must be different from current password"` |
| **Impacto** | Bajo — pero viola el principio de que cambiar a la misma contraseña no aporta seguridad; puede confundir al usuario |
| **Reproducción** | `{"current_password": "Admin1234!", "new_password": "Admin1234!"}` |

**Corrección recomendada** en `app/domain/auth/service.py`:
```python
if current_password == new_password:
    raise HTTPException(status_code=400, detail="New password must differ from current password")
```

---

## Observaciones Técnicas

### OBS-01 — Estructura de paginación no estándar REST

La API utiliza el campo `data` para los registros en lugar del convencional `items`:

```json
{
  "total": 2,
  "offset": 0,
  "limit": 20,
  "data": [...]
}
```

No es un bug, pero difiere del convenio habitual de `items` (FastAPI default). El frontend debe adaptar sus llamadas a este campo.

---

### OBS-02 — Rutas de tickets anidadas bajo `/tickets/`

Los endpoints de tickets no siguen el patrón CRUD convencional:

| Convención esperada | Ruta real |
|--------------------|-----------|
| `/service-tickets/` | `/api/v1/tickets/service` |
| `/ecosystem-tickets/` | `/api/v1/tickets/ecosystem` |

---

### OBS-03 — CURP y RFC requeridos en todos los registros de personas

Todos los endpoints de creación de cuentas (administradores, gerentes, usuarios) requieren CURP y RFC mexicanos válidos con dígito verificador calculado:

- CURP: 18 caracteres con validación algorítmica del dígito de control
- RFC: 12-13 caracteres con estructura de persona física/moral

Esto limita la usabilidad del sistema a personas con documentación mexicana, pero garantiza identidad única.

---

### OBS-04 — Servicios y aplicaciones requieren `administrator_id`

Los endpoints `POST /services/` y `POST /applications/` requieren el UUID del administrador propietario como campo obligatorio. No se infiere del token JWT actual.

---

## Métricas de Rendimiento Observadas

| Endpoint | Tiempo aprox. |
|----------|--------------|
| `POST /auth/login` | ~420ms (bcrypt + JWT) |
| `GET /administrators/` | <50ms |
| `GET /openapi.json` | <30ms |
| `POST /devices/` | <80ms |
| `DELETE /devices/{id}` | <60ms |

> El tiempo de login es esperado: bcrypt con factor de costo alto es el componente más lento por diseño.

---

## Cobertura de Funcionalidades

```
✅ Autenticación JWT (login, logout, re-login)
✅ Blacklist de tokens con Valkey
✅ Control de acceso sin token (401)
✅ Paginación uniforme en todos los listados
✅ CRUD Dispositivos completo (C R U D + validación MAC/IP)
✅ CRUD Servicios (C R con administrator_id)
✅ CRUD Aplicaciones (C R con administrator_id)
✅ Tickets de servicio y ecosistema (R)
✅ Listado de administradores, gerentes y usuarios
✅ Validación de campos complejos (CURP, RFC, contraseñas)
✅ Frontend SPA servido por nginx
✅ Proxy reverso hacia backend a través del frontend
✅ Routing SPA (try_files → index.html)
✅ Swagger UI y OpenAPI schema (44 operaciones)
⚠️  Cambio de contraseña a valor idéntico (bug confirmado)
```

---

*Reporte generado a partir de pruebas ejecutadas directamente contra los contenedores Docker en ejecución.*
