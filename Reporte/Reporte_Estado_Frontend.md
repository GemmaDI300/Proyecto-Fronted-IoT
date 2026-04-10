# Reporte de Estado del Frontend — IoT Server

**Fecha:** 7 de abril de 2026  
**Proyecto:** IoT Server — Panel de administración  
**Stack:** React 18 + TypeScript + Vite + MUI + TanStack Query  
**Backend:** FastAPI + SQLModel + SQLite + JWT (HS256)

---

## 1. Resumen Ejecutivo

El frontend cubre las operaciones CRUD para las 4 entidades principales (Administradores, Gerentes, Usuarios, Dispositivos) y la autenticación JWT. Todas estas funcionalidades están **operativas y probadas** contra el backend en entorno Docker. Sin embargo, el sistema de **Servicios, Roles, Permisos, Aplicaciones y Tickets** —cuyas tablas existen en la base de datos— **no tiene endpoints en el backend ni interfaz en el frontend**.

---

## 2. Funcionalidades Operativas (✅)

### 2.1 Autenticación y Autorización

| Funcionalidad | Estado | Detalles |
|---|---|---|
| Login con email/contraseña | ✅ Funciona | `POST /api/v1/auth/login` → JWT token |
| Persistencia de sesión | ✅ Funciona | Token almacenado en `sessionStorage`, validación de expiración al cargar |
| Protección de rutas | ✅ Funciona | `ProtectedRoute` verifica `accountType` e `isMaster` |
| Cierre de sesión | ✅ Funciona | Limpia `sessionStorage` y redirige a login |
| Roles diferenciados | ✅ Funciona | Admin Master / Admin Normal / Gerente / Usuario |

**Flujo de autenticación:**
```
Frontend                          Backend
   │                                │
   ├─ POST /auth/login ───────────►│ Valida credenciales
   │  {email, password}             │ Genera JWT (HS256, 60 min)
   │                                │
   │◄── {access_token, type, ──────┤
   │     is_master}                  │
   │                                │
   ├─ Decodifica JWT (sub, type) ──►│
   │  Almacena en sessionStorage    │
   │                                │
   ├─ GET /entities/ ──────────────►│ Middleware valida token
   │  Authorization: Bearer {token} │ Extrae cuenta de la BD
   │                                │ Verifica is_active
```

### 2.2 CRUD de Administradores

| Operación | Endpoint | Método | Auth Requerida | Estado |
|---|---|---|---|---|
| Listar | `/api/v1/administrators/` | GET | Admin Master | ✅ |
| Crear | `/api/v1/administrators/` | POST | Admin Master | ✅ |
| Editar | `/api/v1/administrators/{id}` | PATCH | Admin Master | ✅ |
| Eliminar | `/api/v1/administrators/{id}` | DELETE | Admin Master | ✅ |

- Prevención de auto-eliminación implementada (compara `selfId` del JWT).
- Solo visible para usuarios con `isMaster === true`.

### 2.3 CRUD de Gerentes

| Operación | Endpoint | Método | Auth Requerida | Estado |
|---|---|---|---|---|
| Listar | `/api/v1/managers/` | GET | Cualquier autenticado | ✅ |
| Crear | `/api/v1/managers/` | POST | Cualquier autenticado* | ✅ |
| Editar | `/api/v1/managers/{id}` | PATCH | Cualquier autenticado* | ✅ |
| Eliminar | `/api/v1/managers/{id}` | DELETE | Cualquier autenticado* | ✅ |

> **\*Nota de seguridad:** El backend no tiene guards de autorización en el controlador de gerentes. El frontend restringe la UI solo a administradores (`canModify = accountType === "administrator"`), pero la API es accesible para cualquier usuario autenticado.

### 2.4 CRUD de Usuarios

| Operación | Endpoint | Método | Auth Requerida | Estado |
|---|---|---|---|---|
| Listar | `/api/v1/users/` | GET | Admin o Gerente | ✅ |
| Crear | `/api/v1/users/` | POST | Administrador | ✅ |
| Editar | `/api/v1/users/{id}` | PATCH | Administrador | ✅ |
| Eliminar | `/api/v1/users/{id}` | DELETE | Administrador | ✅ |

### 2.5 CRUD de Dispositivos

| Operación | Endpoint | Método | Auth Requerida | Estado |
|---|---|---|---|---|
| Listar | `/api/v1/devices/` | GET | Cualquier autenticado | ✅ |
| Crear | `/api/v1/devices/` | POST | Cualquier autenticado* | ✅ |
| Editar | `/api/v1/devices/{id}` | PATCH | Cualquier autenticado* | ✅ |
| Eliminar | `/api/v1/devices/{id}` | DELETE | Cualquier autenticado* | ✅ |

> **\*Nota de seguridad:** El backend no tiene guards de autorización en el controlador de dispositivos. El frontend restringe la UI de modificación solo a administradores.

### 2.6 Dashboard

| Funcionalidad | Estado |
|---|---|
| Conteo de dispositivos | ✅ Datos en vivo desde API |
| Conteo de usuarios | ✅ (visible para admin/gerente) |
| Conteo de administradores | ✅ (visible solo para admin master) |
| Conteo de gerentes | ✅ (visible solo para admin) |
| Actividad reciente | ✅ Muestra últimas 15 actividades de todas las entidades |
| Acciones rápidas | ✅ Enlaces a gestión de cada entidad |

### 2.7 Validación de Formularios

| Campo | Validación Frontend (Yup) | Validación Backend (Pydantic) | Coinciden |
|---|---|---|---|
| `first_name` | 2-60 chars, solo letras | 2-60 chars, solo letras | ✅ |
| `last_name` | 2-60 chars, solo letras | 2-60 chars, solo letras | ✅ |
| `phone` | Regex `^\+?[0-9]{10,15}$` | Regex `^\+?[0-9]{10,15}$` | ✅ |
| `postal_code` | Regex `^[0-9]{5}$` | Regex `^[0-9]{5}$` | ✅ |
| `email` | 6-254 chars, email válido | 6-254 chars, email válido | ✅ |
| `password_hash` | 8-128 chars | 8-128 chars | ✅ |
| `curp` | 18 chars alfanuméricos, uppercase | 18 chars alfanuméricos, uppercase | ✅ |
| `rfc` | 12-13 chars alfanuméricos, uppercase | 12-13 chars alfanuméricos, uppercase | ✅ |
| `birth_date` | No en futuro | No en futuro | ✅ |
| `ip` (devices) | Regex IPv4 | Sin validación específica | ⚠️ |
| `mac` (devices) | Regex MAC address | Sin validación específica | ⚠️ |

### 2.8 Manejo de Errores

| Tipo de Error | Comportamiento |
|---|---|
| Error de validación Formik | ✅ Se muestran errores inline (borde rojo + texto de ayuda) |
| Error 400 del backend | ✅ Se muestra `response.detail` en Alert |
| Error 500 UNIQUE constraint | ✅ Se parsea y muestra "Ya existe un registro con ese {campo}" |
| Error 401 (token inválido) | ✅ Redirige a login |
| Error 403 (sin permisos) | ⚠️ Error genérico, sin redirección |
| Error de red | ✅ Se muestra mensaje de error genérico |

---

## 3. Funcionalidades NO Implementadas (❌)

### 3.1 Módulo de Servicios

**Estado:** Las tablas existen en la BD pero **no hay endpoints en el backend ni UI en el frontend**.

```
┌─────────────────────────────────────────────┐
│  Modelo de datos (existe en model.py)       │
│                                             │
│  Service ─────┬── ManagerService (M:M)      │
│  (owned_by    │── DeviceService  (M:M)      │
│   admin)      │── ApplicationService (M:M)  │
│               │── Role[]                    │
│               └── ServiceTicket[]           │
│                                             │
│  Endpoints necesarios:                      │
│  • CRUD /api/v1/services/                   │
│  • POST /api/v1/services/{id}/managers/     │
│  • POST /api/v1/services/{id}/devices/      │
│  • CRUD /api/v1/services/{id}/roles/        │
│                                             │
│  UI necesaria:                              │
│  • Página de gestión de servicios           │
│  • Asignación de gerentes a servicios       │
│  • Asignación de dispositivos a servicios   │
│  • Asignación de roles a usuarios           │
└─────────────────────────────────────────────┘
```

### 3.2 Módulo de Roles y Permisos

**Estado:** Modelos definidos (`Role`, `RolePermission`, `UserRole`) pero sin endpoints ni UI.

| Lo que falta | Descripción |
|---|---|
| CRUD de roles | Crear/editar/eliminar roles dentro de un servicio |
| Permisos por rol | Asignar permisos (read, write, delete, administer) |
| Asignación usuario-rol | Vincular usuarios a roles específicos |

### 3.3 Módulo de Aplicaciones

**Estado:** Modelo `Application` y `ApplicationService` definidos pero sin API ni UI.

### 3.4 Módulo de Tickets

**Estado:** Los modelos ORM están completos en `model.py`, pero **no existen endpoints, servicios, repositorios ni schemas** en el backend (`app/domain/` no tiene carpeta `ticket/`). Tampoco hay rutas registradas en `main.py`. **No es posible crear, listar ni visualizar tickets desde el frontend.**

#### Modelos definidos en la BD

| Modelo | Campos | Relaciones |
|---|---|---|
| `ServiceTicket` | `title`, `description`, `priority` (enum), `status_id`, `user_role_id`, `service_id` | → `UserRole`, `TicketStatus`, `Service` |
| `EcosystemTicket` | `title`, `description`, `priority` (enum), `status_id`, `manager_service_id` | → `ManagerService`, `TicketStatus` |
| `TicketStatus` | `name` (unique), `description` | ← `ServiceTicket[]`, `EcosystemTicket[]` |
| `Priority` (enum) | `low`, `medium`, `high`, `critical` | — |

#### Endpoints que faltan en el backend

| Endpoint necesario | Método | Propósito |
|---|---|---|
| `/api/v1/ticket-statuses/` | GET, POST | CRUD de catálogo de estados (Abierto, En progreso, Cerrado, etc.) |
| `/api/v1/services/{id}/tickets/` | GET, POST | Listar y crear tickets de servicio |
| `/api/v1/services/{id}/tickets/{ticket_id}` | GET, PATCH, DELETE | Detalle, actualización y eliminación de ticket |
| `/api/v1/ecosystem-tickets/` | GET, POST | Listar y crear tickets de ecosistema (nivel gerente) |
| `/api/v1/ecosystem-tickets/{ticket_id}` | GET, PATCH, DELETE | Detalle, actualización y eliminación |

#### Archivos que faltan en el backend

```
app/domain/ticket/           ← No existe
├── controller.py            ← Registrar rutas en main.py
├── service.py               ← Lógica de negocio
├── repository.py            ← Consultas a BD
└── schemas.py               ← Pydantic: TicketCreate, TicketUpdate, TicketResponse
```

#### Dependencias bloqueantes

Los tickets **no pueden funcionar de forma aislada** porque dependen de módulos que tampoco tienen API:

```
ServiceTicket
  └─ user_role_id → UserRole (❌ sin endpoint)
       ├─ user_id → User (✅ existe)
       └─ role_id → Role (❌ sin endpoint)
            └─ service_id → Service (❌ sin endpoint)

EcosystemTicket
  └─ manager_service_id → ManagerService (❌ sin endpoint)
       ├─ manager_id → Manager (✅ existe)
       └─ service_id → Service (❌ sin endpoint)
```

**Orden de implementación requerido en backend:**
1. Servicios (`/services/`) — prerequisito de todo
2. Roles y permisos (`/services/{id}/roles/`)
3. Asignación gerente↔servicio (`ManagerService`)
4. Asignación usuario↔rol (`UserRole`)
5. **Tickets** (`ServiceTicket` y `EcosystemTicket`) — solo después de los 4 anteriores

#### ¿Se pueden visualizar tickets en el frontend actualmente?

**No.** No existe ninguna página, componente ni ruta en el frontend para tickets. Tampoco hay endpoints en el backend para consultarlos. Incluso si se crearan los endpoints de tickets, no funcionarían hasta que existan primero los endpoints de Services, Roles, UserRole y ManagerService, ya que los tickets requieren esas referencias como llaves foráneas obligatorias.

### 3.5 Cambio de Contraseña

| Aspecto | Estado |
|---|---|
| Endpoint backend | ✅ `PATCH /api/v1/auth/change-password` existe y funciona |
| UI en frontend | ❌ No existe página ni botón de cambio de contraseña |

### 3.6 Barra de Búsqueda

El `SidebarLayout` tiene un campo de búsqueda visual pero **no tiene funcionalidad implementada**.

---

## 4. Problemas Conocidos del Backend

Estos problemas fueron identificados durante el desarrollo del frontend y requieren corrección por el equipo de backend.

### 4.1 Error 500 en violaciones UNIQUE

**Problema:** Cuando se intenta crear un registro con email, RFC o CURP duplicado, el backend retorna un **Error 500 con HTML** en lugar de un **Error 400/409 con JSON**.

**Ejemplo de error:**
```
HTTP 500
Content-Type: text/html
Body: "UNIQUE constraint failed: sensitive_data.rfc"
```

**Comportamiento esperado:**
```json
HTTP 409
Content-Type: application/json
{
  "detail": "Ya existe un registro con ese RFC"
}
```

**Workaround implementado:** El frontend parsea el HTML del 500 y extrae el nombre del campo para mostrar un mensaje legible.

### 4.2 Falta de Guards de Autorización

| Controlador | Guard Actual | Guard Esperado |
|---|---|---|
| `managers/` (POST, PATCH, DELETE) | Sin guard (solo token) | `require_admin` |
| `devices/` (POST, PATCH, DELETE) | Sin guard (solo token) | `require_admin` |

**Riesgo:** Un usuario autenticado como "user" o "manager" podría ejecutar operaciones de escritura en gerentes y dispositivos mediante llamadas directas a la API, aunque el frontend no expone estos botones.

### 4.3 Redirect 307 en POST sin Trailing Slash

**Problema:** FastAPI retorna `307 Temporary Redirect` cuando se hace POST a `/administrators` en lugar de `/administrators/`. El navegador no puede seguir redirects en POST con `fetch()`.

**Workaround implementado:** El frontend siempre agrega `/` al final del endpoint en operaciones POST.

---

## 5. Arquitectura de Despliegue (Docker)

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                 │
│                                                 │
│  ┌──────────────┐     ┌──────────────────────┐  │
│  │  iot-frontend │     │    iot-backend        │  │
│  │  nginx:1.25   │     │    python:3.12-slim   │  │
│  │  puerto: 3000 │────►│    puerto: 8000       │  │
│  │               │     │                      │  │
│  │  /api/* ──────┼────►│  FastAPI + uvicorn    │  │
│  │  /* ──────────┼──►  │                      │  │
│  │  (SPA React)  │     │  SQLite: /app/data/   │  │
│  └──────────────┘     └──────────────────────┘  │
│                                                 │
│  Volume: sqlite_data → /app/data                │
│  Seed: admin@iot.com / Admin1234!               │
└─────────────────────────────────────────────────┘
```

**Healthcheck:** El backend verifica su estado accediendo a `/docs` cada 30 segundos. El frontend espera a que el backend esté healthy antes de iniciar.

---

## 6. Mapa de Endpoints — Frontend vs Backend

### Endpoints Utilizados por el Frontend

| Endpoint | GET | POST | PATCH | DELETE | UI |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | — | ✅ | — | — | Login pages |
| `/api/v1/auth/change-password` | — | — | ❌ Sin UI | — | — |
| `/api/v1/administrators/` | ✅ | ✅ | ✅ | ✅ | Administradores |
| `/api/v1/managers/` | ✅ | ✅ | ✅ | ✅ | Gerentes |
| `/api/v1/users/` | ✅ | ✅ | ✅ | ✅ | Usuarios |
| `/api/v1/devices/` | ✅ | ✅ | ✅ | ✅ | Dispositivos |

### Endpoints que Faltan en el Backend

| Endpoint | Propósito | Modelo BD |
|---|---|---|
| `/api/v1/services/` | CRUD de servicios | `Service` ✅ |
| `/api/v1/services/{id}/managers/` | Asignar gerentes | `ManagerService` ✅ |
| `/api/v1/services/{id}/devices/` | Vincular dispositivos | `DeviceService` ✅ |
| `/api/v1/services/{id}/roles/` | Gestión de roles | `Role`, `RolePermission` ✅ |
| `/api/v1/users/{id}/roles/` | Asignar roles a usuarios | `UserRole` ✅ |
| `/api/v1/services/{id}/tickets/` | Tickets de servicio | `ServiceTicket` ✅ |
| `/api/v1/ecosystem-tickets/` | Tickets de ecosistema | `EcosystemTicket` ✅ |
| `/api/v1/applications/` | Gestión de aplicaciones | `Application` ✅ |

---

## 7. Rutas del Frontend

| Ruta | Componente | Acceso |
|---|---|---|
| `/login/admin-master` | LoginAdminMaster | Público |
| `/login/admin-normal` | LoginAdminNormal | Público |
| `/login/gerente` | LoginGerente | Público |
| `/login/usuario/monitoreo-ambiental` | LoginUsuarioMonitoreoAmbiental | Público |
| `/login/usuario/control-industrial` | LoginUsuarioControlIndustrial | Público |
| `/` | Dashboard | Cualquier autenticado |
| `/administradores` | Administradores | Admin Master |
| `/gerentes` | Gerentes | Administrador |
| `/usuarios` | Usuarios | Administrador |
| `/dispositivos` | Dispositivos | Cualquier autenticado |

---

## 8. Qué Hace Falta para Completar el Proyecto

### Para el equipo de Backend:

1. **Implementar endpoints de Servicios** — CRUD completo con guards de autorización
2. **Implementar asignación Manager↔Servicio** — endpoint para vincular gerentes a servicios
3. **Implementar asignación Device↔Servicio** — endpoint para vincular dispositivos
4. **Implementar gestión de Roles/Permisos** — CRUD de roles con permisos granulares
5. **Implementar asignación User↔Rol** — endpoint para asignar usuarios a roles
6. **Corregir Error 500 por UNIQUE constraint** — Retornar HTTP 409 con JSON en lugar de 500 con HTML
7. **Agregar guards de autorización** — `require_admin` en controladores de managers y devices
8. **Implementar endpoints de Tickets** — ServiceTicket y EcosystemTicket

### Para el equipo de Frontend (cuando el backend esté listo):

1. **Página de gestión de Servicios** — Listar, crear, editar y eliminar servicios
2. **UI de asignación Gerente↔Servicio** — Selección múltiple de gerentes por servicio
3. **UI de asignación Dispositivo↔Servicio** — Vincular dispositivos a servicios
4. **UI de Roles y Permisos** — Crear roles con checkboxes de permisos (read, write, delete, administer)
5. **UI de asignación Usuario↔Rol** — Asignar usuarios a roles dentro de servicios
6. **Página de cambio de contraseña** — Formulario con contraseña actual + nueva
7. **Sistema de Tickets** — UI para crear y gestionar tickets de servicio
8. **Funcionalidad de búsqueda** — Implementar filtrado en la barra de búsqueda del sidebar

---

## 9. Datos de Prueba

**Credenciales de acceso inicial:**
- **Email:** `admin@iot.com`
- **Contraseña:** `Admin1234!`
- **Tipo:** Administrador Master

**URL de acceso:**
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Documentación API: `http://localhost:8000/docs`
