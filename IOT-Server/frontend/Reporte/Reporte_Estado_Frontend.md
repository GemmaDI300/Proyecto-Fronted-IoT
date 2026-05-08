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

---

## 10. Mejoras de Diseño — Anti-AI Slop (Abril 2026)

Se aplicó un conjunto de cambios estéticos para eliminar los patrones visuales genéricos propios de las herramientas de IA generativa ("AI slop"). Los cambios siguieron los principios de la guía **Anthropic Frontend Design Skill**.

### 10.1 Cambio de Tipografía

| Antes | Después | Razón |
|---|---|---|
| `'Inter', 'Segoe UI', 'Roboto'` | `'Space Grotesk'` (textos) | Inter y Roboto son las fuentes más usadas por LLMs; Space Grotesk tiene personalidad geométrica propia |
| — | `'JetBrains Mono'` (números/código) | Diferenciación visual en métricas y valores del dashboard |

**Implementación:** Google Fonts en `index.html` con `display=swap` + `rel="preconnect"` para rendimiento. `main.tsx` actualizado con `fontFamily` en todas las variantes `h1`–`h6`.

### 10.2 Nueva Paleta de Colores

| Elemento | Antes | Después | Razón |
|---|---|---|---|
| Primary | `#2563eb` (azul SaaS genérico) | `#06b6d4` (teal Tailwind) | Evita el azul corporativo omnipresente en dashboards generados por IA |
| Secondary | `#0891b2` | `#0f172a` (slate oscuro) | Crea contraste real en lugar de variaciones del mismo tono |
| Texto primario | `#1e293b` | `#0f172a` | Mayor contraste (>7:1 sobre fondo blanco, supera WCAG AAA) |
| Gradientes sidebar | `#2563eb → #7c3aed` | `#06b6d4 → #0f172a` | Coherente con nueva identidad |

### 10.3 Corrección de Hover con transform

| Archivo | Antes | Después | Razón |
|---|---|---|---|
| `LoginSelector.tsx` | `transform: translateY(-4px)` | `boxShadow + borderColor` | `translateY` en hover es el patrón más común de UI genérica de IA |
| `LoginUsuarioServices.tsx` | `transform: translateY(-4px)` | `boxShadow + borderColor` | Ídem |
| `Dashboard.tsx` (QuickAction) | `transform: translateY(-2px)` | `boxShadow + borderColor` | Ídem |
| `SidebarLayout.tsx` | `all 0.2s` | `box-shadow 0.2s, border-color 0.2s` | Transiciones específicas, no catch-all |

### 10.4 cursor: pointer en Elementos Interactivos

Se agregó `cursor: "pointer"` explícito en:
- `LoginBase.tsx` — botón de submit
- `LoginSelector.tsx` — tarjetas de rol
- `LoginUsuarioServices.tsx` — tarjetas de servicio
- `Gestion.tsx` — botones Editar y Eliminar de la DataGrid

### 10.5 Animaciones de Entrada Escalonadas

Se agregó `@keyframes fadeSlideUp` en `index.html`:
```css
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

Aplicado con `animationDelay` escalonado en:
- `LoginBase.tsx` — tarjeta del formulario (delay: 0ms)
- `LoginSelector.tsx` — header + 4 tarjetas de rol (delay: 0, 80, 160, 240ms)
- `LoginUsuarioServices.tsx` — 2 tarjetas de servicio (delay: 0, 100ms)
- `Dashboard.tsx` — 4 StatCards (delay: 0, 80, 160, 240ms)

### 10.6 Decoración Geométrica Diagonal en Login

`LoginBase.tsx` ahora tiene un pseudo-elemento `::after` con forma orgánica (`border-radius: "40% 60% 60% 40% / 40% 40% 60% 60%"`) rotado 20°, creando asimetría visual en la esquina inferior-izquierda de todos los formularios de login. Esto rompe la composición centrada estándar sin alterar la funcionalidad.

### 10.7 Grilla Asimétrica en StatCards

| Antes | Después |
|---|---|
| 4 columnas uniformes `md={3}` | 3 columnas asimétricas `md={4}` |

Las tarjetas de Dispositivos IoT (la más relevante) tiene el mismo ancho que las demás pero el cambio de grid permite layouts más naturales en distintas resoluciones, evitando la uniformidad de los dashboards generados automáticamente.

### 10.8 Archivos Modificados

| Archivo | Cambios |
|---|---|
| `index.html` | Google Fonts (Space Grotesk + JetBrains Mono) + `@keyframes fadeSlideUp` |
| `src/main.tsx` | Nueva paleta (#06b6d4 + #0f172a) + fontFamily Space Grotesk |
| `src/components/LoginBase.tsx` | Decoración geométrica `::after`, animación, cursor:pointer |
| `src/pages/LoginSelector.tsx` | Hover sin translateY, stagger animation, cursor:pointer |
| `src/pages/LoginUsuarioServices.tsx` | Hover sin translateY, stagger animation, cursor:pointer |
| `src/components/SidebarLayout.tsx` | Gradientes y colores activos actualizados a nueva paleta |
| `src/pages/Dashboard.tsx` | StatCards asimétricos, animaciones escalonadas, hover QuickAction sin translateY |
| `src/components/Gestion.tsx` | cursor:pointer en botones Editar/Eliminar |

---

## 11. Actualización — Sincronización con Upstream (13 de abril de 2026)

**Motivo:** El repositorio upstream `Coquita01/IOT-Server` recibió 20+ commits nuevos entre el 7 y el 13 de abril de 2026, introduciendo módulos completos de autorización RBAC (OSO), servicios, aplicaciones, tickets y gestión de sesiones con Valkey. Se sincronizó el fork `GemmaDI300/IOT-Server` y se implementaron todas las actualizaciones correspondientes en el frontend. **El backend no fue modificado.**

---

### 11.1 Cambios en el Backend (solo lectura, sin modificaciones)

#### Nuevos módulos incorporados al upstream

| Módulo | Ruta | Descripción |
|---|---|---|
| Autorización OSO | `app/shared/authorization/` | Motor de políticas RBAC basado en Open Policy Agent (Oso). Archivo `policies.polar` define todos los permisos por rol. |
| Sesiones Valkey | `app/shared/session/` | Gestión de sesiones con Redis/Valkey. El backend ahora puede invalidar tokens por servidor. |
| Servicios | `app/domain/service/` | CRUD completo. Un servicio pertenece a un administrador. |
| Aplicaciones | `app/domain/application/` | CRUD completo con generación automática de `api_key`. |
| Tickets de Servicio | `app/domain/tickets/` | `ServiceTicket` y `EcosystemTicket` con guards OSO. |

#### Cambio de nombre de campo crítico

| Entidad | Campo anterior | Campo nuevo | Impacto |
|---|---|---|---|
| `PersonalDataCreate` | `password_hash` | `password` | Breaking change — todos los formularios de creación de entidades fallaban |

#### Validaciones Pydantic nuevas en Dispositivos

| Campo | Validación nueva |
|---|---|
| `ip` | `ipaddress.ip_address()` — rechaza IPs malformadas |
| `mac` | Regex `^([0-9A-Fa-f]{2}[:\-]){5}([0-9A-Fa-f]{2})$` — normaliza a mayúsculas |

---

### 11.2 Nueva Matriz de Permisos OSO

Con la incorporación del motor de autorización OSO, los permisos ahora son aplicados por el backend de forma centralizada. El frontend refleja estos permisos en la UI:

| Recurso | Admin Master | Admin Normal | Gerente | Usuario |
|---|---|---|---|---|
| Administradores | CRUD | solo lectura | — | — |
| Gerentes | CRUD | CRUD | solo lectura | — |
| Usuarios | CRUD | CRUD | crear + editar (sin borrar) | editar propio |
| Dispositivos | CRUD | CRUD | **CRUD** | solo lectura |
| Aplicaciones | CRUD | CRUD | solo lectura | — |
| Servicios | CRUD | CRUD | solo lectura | — |
| Tickets | CRUD | crear + editar | crear + editar | crear + editar |

> **Sin rol puede eliminar tickets** — el Polar policy no define `delete` sobre tickets para ningún rol.

---

### 11.3 Nuevos Endpoints Implementados en el Frontend

#### Servicios

| Endpoint | Método | Descripción | UI |
|---|---|---|---|
| `/api/v1/services/` | GET | Listar servicios | `Servicios.tsx` |
| `/api/v1/services/` | POST | Crear servicio | Formulario en `Servicios.tsx` |
| `/api/v1/services/{id}` | PATCH | Editar servicio | Diálogo editar |
| `/api/v1/services/{id}` | DELETE | Eliminar servicio | Botón eliminar (solo admin) |

**Payload de creación:**
```json
{
  "name": "string (requerido)",
  "description": "string | null",
  "administrator_id": "UUID (requerido, pre-rellenado con sesión)"
}
```

#### Aplicaciones

| Endpoint | Método | Descripción | UI |
|---|---|---|---|
| `/api/v1/applications/` | GET | Listar aplicaciones | `Aplicaciones.tsx` |
| `/api/v1/applications/` | POST | Crear aplicación | Formulario en `Aplicaciones.tsx` |
| `/api/v1/applications/{id}` | PATCH | Editar aplicación | Diálogo editar |
| `/api/v1/applications/{id}` | DELETE | Eliminar aplicación | Botón eliminar (solo admin) |

**Payload de creación:**
```json
{
  "name": "string (requerido)",
  "version": "string | null",
  "url": "string | null",
  "port": "integer | null",
  "description": "string | null",
  "administrator_id": "UUID (requerido, pre-rellenado con sesión)"
}
```

**Nota:** El campo `api_key` es generado automáticamente por el backend y se muestra en la tabla como texto truncado con tooltip para ver el valor completo. No se incluye en formularios de creación/edición.

#### Tickets de Servicio

| Endpoint | Método | Descripción | UI |
|---|---|---|---|
| `/api/v1/tickets/service/` | GET | Listar tickets de servicio | `Tickets.tsx` (pestaña 1) |
| `/api/v1/tickets/service/` | POST | Crear ticket de servicio | Formulario en pestaña 1 |
| `/api/v1/tickets/service/{id}` | PATCH | Editar ticket | Diálogo editar |

**Payload de creación:**
```json
{
  "title": "string (requerido)",
  "description": "string | null",
  "user_role_id": "UUID (requerido)",
  "status_id": "integer (requerido)",
  "service_id": "UUID (requerido)",
  "priority": "low | medium | high | critical"
}
```

#### Tickets de Ecosistema

| Endpoint | Método | Descripción | UI |
|---|---|---|---|
| `/api/v1/tickets/ecosystem/` | GET | Listar tickets de ecosistema | `Tickets.tsx` (pestaña 2) |
| `/api/v1/tickets/ecosystem/` | POST | Crear ticket de ecosistema | Formulario en pestaña 2 |
| `/api/v1/tickets/ecosystem/{id}` | PATCH | Editar ticket | Diálogo editar |

**Payload de creación:**
```json
{
  "title": "string (requerido)",
  "description": "string | null",
  "manager_service_id": "UUID (requerido)",
  "status_id": "integer (requerido)",
  "priority": "low | medium | high | critical"
}
```

---

### 11.4 Archivos Modificados en el Frontend

#### Archivos existentes actualizados

| Archivo | Cambio | Razón |
|---|---|---|
| `src/shared/api/types.ts` | Renombrado `password_hash` → `password` en `PersonalDataCreate`/`PersonalDataUpdate`. Agregados: `ServiceCreate/Update/Response`, `ApplicationCreate/Update/Response`, `TicketPriority`, `ServiceTicketCreate/Update/Response`, `EcosystemTicketCreate/Update/Response` | Sincronizar tipos con nuevos schemas del backend |
| `src/shared/api/schemas/validation.ts` | Renombrado `password_hash` → `password`. Agregados: `generateServiceSchema`, `generateApplicationSchema`, `generateServiceTicketSchema`, `generateEcosystemTicketSchema` | Validación Yup para los nuevos formularios |
| `src/components/EditarDialog.tsx` | Nuevas etiquetas de campo (`description`, `administrator_id`, `version`, `url`, `port`, `api_key`, `title`, `user_role_id`, `status_id`, `service_id`, `priority`, `manager_service_id`). Prop `defaultValues?: Partial<T>` para pre-rellenar campos en creación. POST payload omite strings vacíos para que el backend use sus valores por defecto. | Soporte de nuevas entidades |
| `src/components/Gestion.tsx` | Prop `defaultValues?: Partial<T>` propagada a `EditarDialog` | Necesario para pre-rellenar `administrator_id` en Servicios y Aplicaciones |
| `src/pages/Dispositivos.tsx` | `canModify` ahora incluye gerentes: `accountType === "administrator" \|\| accountType === "manager"` | Refleja permiso CRUD de dispositivos para gerentes en OSO |
| `src/pages/Usuarios.tsx` | Separado en `canModifyAdmin` y `canModifyManager`. Gerentes pueden crear y editar usuarios pero no eliminarlos. | Refleja política OSO: gerentes tienen `read + write` sobre usuarios |
| `src/main.tsx` | Importados `Servicios`, `Aplicaciones`, `Tickets` y nuevos íconos MUI. Agregados navItems para Servicios, Aplicaciones y Tickets. Agregadas rutas `/servicios`, `/aplicaciones`, `/tickets`. Corregida ruta `/usuarios` removiendo `requiredType="administrator"` para que gerentes puedan acceder. | Registrar nuevas páginas en el router y sidebar |

#### Archivos nuevos creados

| Archivo | Descripción |
|---|---|
| `src/pages/Servicios.tsx` | Página de gestión de servicios. Administradores tienen CRUD completo. Gerentes ven la tabla en modo solo lectura. El campo `administrator_id` se pre-rellena con el UUID del usuario en sesión. |
| `src/pages/Aplicaciones.tsx` | Página de gestión de aplicaciones. Igual que Servicios en permisos. El campo `api_key` generado por el backend se muestra con `Tooltip` truncado en la tabla. |
| `src/pages/Tickets.tsx` | Página de tickets con dos pestañas: **Tickets de Servicio** y **Tickets de Ecosistema**. Todos los roles autenticados pueden crear y editar. Ningún rol puede eliminar tickets. La prioridad se muestra con chips de color (`low`=azul, `medium`=amarillo, `high`=naranja, `critical`=rojo). |

---

### 11.5 Mapa de Endpoints Actualizado

#### Endpoints activos en el frontend tras la actualización

| Endpoint | GET | POST | PATCH | DELETE | UI |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | — | ✅ | — | — | Login pages |
| `/api/v1/auth/change-password` | — | — | ❌ Sin UI | — | — |
| `/api/v1/administrators/` | ✅ | ✅ | ✅ | ✅ | Administradores |
| `/api/v1/managers/` | ✅ | ✅ | ✅ | ✅ | Gerentes |
| `/api/v1/users/` | ✅ | ✅ | ✅ | ✅ | Usuarios |
| `/api/v1/devices/` | ✅ | ✅ | ✅ | ✅ | Dispositivos |
| `/api/v1/services/` | ✅ | ✅ | ✅ | ✅ | Servicios |
| `/api/v1/applications/` | ✅ | ✅ | ✅ | ✅ | Aplicaciones |
| `/api/v1/tickets/service/` | ✅ | ✅ | ✅ | — | Tickets (pestaña 1) |
| `/api/v1/tickets/ecosystem/` | ✅ | ✅ | ✅ | — | Tickets (pestaña 2) |

#### Endpoints del backend sin UI (pendientes)

| Endpoint | Propósito |
|---|---|
| `/api/v1/applications/auth` | Autenticación de aplicaciones externas mediante api_key |
| `/api/v1/auth/change-password` | Cambio de contraseña del usuario en sesión |

---

### 11.6 Rutas del Frontend Actualizadas

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
| `/usuarios` | Usuarios | **Administrador y Gerente** *(antes solo Administrador)* |
| `/dispositivos` | Dispositivos | Cualquier autenticado |
| `/servicios` | Servicios | **Administrador y Gerente** *(nuevo)* |
| `/aplicaciones` | Aplicaciones | **Administrador y Gerente** *(nuevo)* |
| `/tickets` | Tickets | **Cualquier autenticado** *(nuevo)* |

---

### 11.7 Estado Global Tras la Actualización

| Módulo | Estado anterior (7 abr) | Estado actual (13 abr) |
|---|---|---|
| Autenticación | ✅ Funciona | ✅ Sin cambios |
| Administradores | ✅ Funciona | ✅ Sin cambios |
| Gerentes | ✅ Funciona | ✅ Sin cambios |
| Usuarios | ✅ Funciona | ✅ Gerentes ahora pueden crear/editar |
| Dispositivos | ✅ Funciona | ✅ Gerentes ahora tienen CRUD |
| Servicios | ❌ No existía backend | ✅ Implementado |
| Aplicaciones | ❌ No existía backend | ✅ Implementado |
| Tickets | ❌ No existía backend | ✅ Implementado |
| Cambio de contraseña | ❌ Sin UI | ❌ Pendiente |
| Búsqueda en sidebar | ❌ Sin funcionalidad | ❌ Pendiente |
| Autenticación por api_key (`/applications/auth`) | — | ❌ Sin UI (endpoint solo para apps externas) |

---

### 11.8 Análisis de Funcionalidad Real — Servicios y Tickets

#### Servicios y Aplicaciones

Los endpoints `/api/v1/services/` y `/api/v1/applications/` están registrados en `main.py` y son completamente funcionales. Un administrador normal puede crear, editar y eliminar servicios y aplicaciones. Los gerentes los ven en modo solo lectura. **Sin bloqueos.**

#### Tickets — Estado detallado

Los endpoints `/api/v1/tickets/service/` y `/api/v1/tickets/ecosystem/` existen y la UI está construida, pero **crear tickets nuevos es prácticamente imposible** porque los campos de clave foránea requeridos no tienen endpoints propios en el backend:

| Campo requerido al crear | Tipo | Endpoint que lo expone | Estado |
|---|---|---|---|
| `service_id` | UUID | `/api/v1/services/` | ✅ Disponible |
| `status_id` | int | Sin endpoint de `TicketStatus` | ❌ No implementado |
| `user_role_id` | UUID (ServiceTicket) | Sin endpoint de `UserRole` | ❌ No implementado |
| `manager_service_id` | UUID (EcosystemTicket) | Sin endpoint de `ManagerService` | ❌ No implementado |

**Listar y editar** tickets existentes sí funciona (título, descripción, prioridad, `status_id` numérico manual). Crear tickets nuevos requiere escribir UUIDs sin ningún selector porque no hay API que los exponga.

#### Tabla resumen de operatividad

| Módulo | Listar | Crear | Editar | Eliminar |
|---|---|---|---|---|
| Servicios | ✅ | ✅ | ✅ | ✅ Admin |
| Aplicaciones | ✅ | ✅ | ✅ | ✅ Admin |
| Tickets (registros existentes) | ✅ | ❌ FKs sin API | ✅ Parcial | ❌ OSO no lo permite* |

> \* La política OSO nunca concede la acción `delete` sobre `Ticket` a ningún rol excepto Admin Master. El comportamiento `canDelete={false}` en la UI es correcto para todos los roles comunes.

#### Dependencias bloqueantes para tickets

Para que la creación de tickets funcione completamente, el backend necesita implementar:

1. **`/api/v1/ticket-statuses/`** — Catálogo de estados (`Abierto`, `En progreso`, `Cerrado`, etc.) para obtener `status_id`
2. **`/api/v1/user-roles/`** — Asignaciones usuario↔rol dentro de un servicio para obtener `user_role_id` (requerido por `ServiceTicket`)
3. **`/api/v1/manager-services/`** — Vinculaciones gerente↔servicio para obtener `manager_service_id` (requerido por `EcosystemTicket`)

---

## 12. Actualización — Mejoras UX y Rastreo de Actividad (13 de abril de 2026, segunda fase)

**Motivo:** Segunda iteración de mejoras solicitadas para el sprint: vista de detalle de entidades al hacer clic en una fila, rastreo frontend de acciones CRUD, reorganización del Dashboard con paneles separados de creación y gestión, selección de administrador por nombre en Servicios, y mejoras en el formulario de Tickets con listas desplegables.

---

### 12.1 Nuevo sistema de rastreo de actividad (ActivityContext)

Se creó el archivo `src/shared/activity/activityContext.tsx` con un **React Context** (`ActivityContext`) que registra cada acción CRUD ejecutada por el usuario en la sesión activa.

**Funcionamiento:**

| Aspecto | Detalle |
|---|---|
| Almacenamiento | `localStorage` bajo la clave `"iot_activity_log"` (máx. 50 eventos) |
| Estructura de un evento | `{ id, action: "created"\|"edited"\|"deleted", entityType, entityName, timestamp }` |
| Persistencia | Sobrevive recargas de página; se mantiene hasta que el usuario lo limpie |
| Provider | `<ActivityProvider>` envuelve toda la app en `main.tsx` |
| Hook de consumo | `useActivity()` retorna `{ events, addEvent, clearEvents }` |

Cualquier componente que llama a `addEvent("created", "Usuario", "Juan Pérez")` registra un evento que aparece inmediatamente en el feed del Dashboard.

---

### 12.2 Dialog de vista detalle genérico (DetalleDialog)

Se creó `src/components/DetalleDialog.tsx`, un diálogo de solo lectura que muestra todos los campos de cualquier entidad cuando el usuario hace clic en el botón **"Ver"** de una fila.

**Comportamiento por tipo de campo:**

| Campo | Renderizado |
|---|---|
| `is_active` | `Chip` verde/rojo (Activo / Inactivo) |
| `priority` | Etiqueta en español (Baja / Media / Alta / Crítica) |
| Fechas (ISO 8601) | `toLocaleString()` en español |
| `password` / `password_hash` | Oculto — nunca se muestra |
| UUID / strings | Texto plano |
| Números | Texto plano |

El componente es genérico (`DetalleDialog<T extends Record<string, unknown>>`); no requiere configuración por entidad.

---

### 12.3 Extensión de EditarDialog — FieldConfig

Se exportó la interfaz `FieldConfig` desde `EditarDialog.tsx`:

```typescript
export interface FieldConfig {
    type?: "text" | "password" | "date" | "number" | "select";
    hidden?: boolean;
    options?: { value: string | number; label: string }[];
    helperText?: string;
}
```

La prop `fieldsConfig?: Partial<Record<string, FieldConfig>>` permite a cada página pasar configuración por campo sin modificar el componente genérico. El diálogo ahora renderiza un `Select` de MUI cuando `type === "select"`, evitando que el usuario escriba UUIDs o valores enum manualmente.

---

### 12.4 Extensión de Gestion.tsx — detalle, actividad y fieldsConfig

El componente `Gestion<T>` recibió tres nuevas props:

| Prop | Tipo | Comportamiento |
|---|---|---|
| `showDetail` | `boolean` | Agrega botón **"Ver"** (ícono `InfoOutlined`) en la columna de acciones que abre `DetalleDialog` |
| `entityTypeLabel` | `string` | Nombre legible de la entidad used en los eventos de actividad (ej. `"Servicio"`) |
| `fieldsConfig` | `Partial<Record<string, FieldConfig>>` | Se pasa a ambas instancias de `EditarDialog` (crear y editar) |

Las callbacks internas se separaron:

- `handleCreateSuccess(row)` → llama `addEvent("created", entityTypeLabel, nombre)` tras crear
- `handleEditSuccess(row)` → llama `addEvent("edited", ...)` tras editar
- `handleConfirmDelete()` → llama `addEvent("deleted", ...)` antes de eliminar

---

### 12.5 Reorganización del Dashboard

La sección de **"Acciones rápidas"** fue reemplazada por dos paneles independientes:

#### Panel "Crear nuevo"

| Opción | Roles que la ven |
|---|---|
| Nuevo Usuario | Todos |
| Nuevo Dispositivo | Todos |
| Nuevo Ticket | Todos |
| Nuevo Servicio | Solo Administrador |
| Nueva Aplicación | Solo Administrador |
| Nuevo Gerente | Solo Administrador |

#### Panel "Gestionar"

| Opción | Roles que la ven |
|---|---|
| Usuarios | Todos |
| Dispositivos | Todos |
| Tickets | Todos |
| Servicios | Administrador y Gerente |
| Aplicaciones | Administrador y Gerente |
| Gerentes | Solo Administrador |
| Administradores | Solo Admin Master |

#### Feed de actividad

El feed ya no depende de los datos del backend. Ahora consume `activityEvents` del `ActivityContext` y muestra las acciones CRUD recientes con codificación de color:

| Acción | Color del ícono |
|---|---|
| `created` | Verde (`success.main`) |
| `edited` | Azul (`info.main`) |
| `deleted` | Rojo (`error.main`) |

El feed persiste entre navegaciones gracias al `localStorage` del contexto.

---

### 12.6 Mejoras en Servicios.tsx

**Antes:** El campo `administrator_id` era un input de texto libre donde el usuario debía pegar un UUID.

**Después:** Al abrir el formulario de crear/editar, se hace una llamada a `/api/v1/administrators/` y se construye una lista de opciones `{ value: UUID, label: "Nombre Apellido" }`. El campo se convierte en un `Select` de MUI con los nombres completos.

**Columna en tabla:** La columna `administrator_id` usa `valueFormatter` para mostrar el nombre completo del administrador en lugar del UUID.

---

### 12.7 Mejoras en Tickets.tsx

| Campo | Antes | Después |
|---|---|---|
| `priority` | Input texto libre | `Select` con opciones: Baja / Media / Alta / Crítica |
| `status_id` | Input numérico | `Select` con opciones: Abierto (1) / En progreso (2) / Resuelto (3) / Cerrado (4) |
| `service_id` | Input texto UUID | `Select` cargado desde `/api/v1/services/` con nombre del servicio |
| `user_role_id` | Input texto | Input con `helperText` indicando que se requiere UUID de UserRole |
| `manager_service_id` | Input texto | Input con `helperText` indicando que se requiere UUID de ManagerService |

Ambas pestañas (Service Tickets y Ecosystem Tickets) cuentan además con `showDetail={true}` para ver el detalle de cada ticket.

> **Nota:** Los campos `user_role_id` y `manager_service_id` permanecen como texto libre porque el backend no tiene endpoints `/api/v1/user-roles/` ni `/api/v1/manager-services/` que permitan resolverlos por nombre.

---

### 12.8 Archivos modificados en esta fase

#### Archivos nuevos

| Archivo | Descripción |
|---|---|
| `src/shared/activity/activityContext.tsx` | React Context con localStorage para rastreo de acciones CRUD |
| `src/components/DetalleDialog.tsx` | Diálogo genérico de solo lectura para cualquier entidad |

#### Archivos existentes actualizados

| Archivo | Cambio |
|---|---|
| `src/components/EditarDialog.tsx` | Agregada interfaz exportada `FieldConfig`; soporte de `type: "select"` con `Select` de MUI; prop `fieldsConfig` |
| `src/components/Gestion.tsx` | Nuevas props: `showDetail`, `entityTypeLabel`, `fieldsConfig`; callbacks separadas con rastreo de actividad; botón "Ver" con `DetalleDialog` |
| `src/pages/Dashboard.tsx` | Panel "Crear nuevo" + panel "Gestionar" reemplazando acciones rápidas únicas; feed de actividad consumido desde `ActivityContext` |
| `src/pages/Usuarios.tsx` | Agregado `showDetail={true}` y `entityTypeLabel="Usuario"` |
| `src/pages/Servicios.tsx` | Campo `administrator_id` como `Select` con nombres desde API; `valueFormatter` en columna para mostrar nombre |
| `src/pages/Tickets.tsx` | `priority`, `status_id` y `service_id` como `Select`; `showDetail={true}` en ambas pestañas |
| `src/main.tsx` | Agregado `ActivityProvider` envolviendo `AuthProvider` |

---

### 12.9 Estado de funcionalidades tras esta fase

| Funcionalidad | Estado |
|---|---|
| Ver detalle de cualquier entidad | ✅ Implementado (botón "Ver" en todas las tablas con `showDetail`) |
| Rastreo de actividad CRUD en Dashboard | ✅ Implementado (ActivityContext + localStorage) |
| Dashboard con paneles separados crear/gestionar | ✅ Implementado |
| Admin por nombre en Servicios | ✅ Implementado (Select cargado desde API) |
| Tickets con selects para priority/status/service | ✅ Implementado |
| user_role_id / manager_service_id por nombre | ❌ Pendiente backend (no hay endpoints de UserRole/ManagerService) |

---

## 13. Actualización — Mejoras de edición de estado y vistas de detalle (13 de abril de 2026, tercera fase)

**Motivo:** Correcciones de usabilidad solicitadas: permitir modificar el estado (`is_active`) de usuarios, dispositivos y servicios desde el formulario de edición; agregar vista de detalle a la tabla de administradores; y aclarar el funcionamiento del módulo de Aplicaciones.

---

### 13.1 Modificación del estado de usuarios

**Antes:** El campo `is_active` no aparecía en el formulario de edición de usuarios. Para activar/desactivar un usuario era necesario hacerlo directamente en la base de datos.

**Después:** El formulario de **Editar** en la página de Usuarios incluye ahora un campo desplegable **"Estado"** con las opciones:
- **Activo** → envía `is_active: true` al backend (`PATCH /api/v1/users/{id}`)
- **Inactivo** → envía `is_active: false`

El campo solo aparece en el formulario de edición, no en el de creación (los nuevos usuarios siempre inician como activos).

**Cambios técnicos:**
- `generatePersonalDataSchema(false)` — esquema de edición ahora incluye `is_active: Yup.boolean().optional()`
- `Usuarios.tsx` — `fieldsConfig` con `{ is_active: { type: "boolean", options: STATUS_OPTIONS } }`
- `EditarDialog.tsx` — nuevo tipo `"boolean"` en `FieldConfig` que renderiza un `Select` con conversión interna de cadena a booleano (`"true"` → `true`, `"false"` → `false`)

---

### 13.2 Modificación del estado de dispositivos

Misma mejora aplicada a la página de Dispositivos IoT.

**Antes:** El campo `is_active` no estaba expuesto en el formulario de edición.

**Después:** El formulario de **Editar** en Dispositivos incluye el Select **Activo / Inactivo** para `is_active`.

**Cambios técnicos:**
- `generateDeviceSchema(false)` — esquema de edición incluye `is_active: Yup.boolean().optional()`
- `Dispositivos.tsx` — `fieldsConfig` con `{ is_active: { type: "boolean", options: STATUS_OPTIONS } }`
- Además se agregaron `showDetail={true}` y `entityTypeLabel="Dispositivo"` para habilitar la vista de detalle en dispositivos

---

### 13.3 Vista de detalle en Administradores

**Antes:** La tabla de Administradores no tenía botón "Ver" — el componente `Gestion` se usaba sin `showDetail`.

**Después:** Se agregó `showDetail={true}` y `entityTypeLabel="Administrador"` a `Administradores.tsx`. El botón **"Ver"** ahora aparece en cada fila y abre el `DetalleDialog` con la información completa del administrador (nombre, apellidos, teléfono, dirección, ciudad, estado, CURP, RFC, email, estado, fechas de creación y actualización). Los campos `password` y `password_hash` nunca se muestran.

---

### 13.4 Modificación del estado de servicios

El formulario de edición de Servicios ya incluía el Select de administrador. Se extendió `fieldsConfig` para incluir también:

```typescript
is_active: { type: "boolean", options: STATUS_OPTIONS }
```

Esto permite activar o desactivar un servicio desde el formulario de edición sin necesidad de acceso directo a la base de datos.

**Cambios técnicos:**
- `generateServiceSchema(false)` — esquema de edición incluye `is_active: Yup.boolean().optional()`
- `Servicios.tsx` — `fieldsConfig` extendido con `is_active`

---

### 13.5 Asignación de múltiples usuarios a un servicio

**Estado:** ❌ **No implementable con el backend actual.**

El modelo de datos sí soporta esta relación mediante la tabla `UserRole` (usuario → rol → servicio), pero el backend no expone los endpoints necesarios:

| Endpoint requerido | Método | Estado backend |
|---|---|---|
| `/api/v1/user-roles/` | GET, POST | ❌ No implementado |
| `/api/v1/services/{id}/users/` | GET | ❌ No implementado |
| `/api/v1/manager-services/` | GET, POST | ❌ No implementado |

Mientras estos endpoints no existan, la asignación de usuarios a servicios no puede implementarse en el frontend.

---

### 13.6 Qué hacen las Aplicaciones y cómo funcionan

Las **Aplicaciones** representan sistemas externos que se integran con la plataforma IoT (dashboards industriales, sistemas SCADA, aplicaciones móviles, servicios de terceros, etc.).

#### Campos del modelo

| Campo | Propósito |
|---|---|
| `name` | Nombre identificador de la app (ej. "Dashboard de Planta Norte") |
| `version` | Versión semántica (ej. `"2.1.0"`) — opcional |
| `url` | URL donde corre la app externa — opcional |
| `port` | Puerto de la app externa — opcional |
| `description` | Descripción libre del propósito — opcional |
| `administrator_id` | UUID del administrador responsable |
| `api_key` | **Generada automáticamente por el backend** — credencial de autenticación de la app |
| `is_active` | Estado de la integración (activa/inactiva) |

#### Flujo de autenticación de una aplicación externa

```
App externa                              Backend IoT
    │                                        │
    │  POST /api/v1/applications/auth        │
    │  { "api_key": "abc123..." }  ─────────►│ Valida api_key en BD
    │                                        │ Verifica is_active
    │◄─── { "access_token": "eyJ..." } ─────│ Devuelve JWT de app
    │                                        │
    │  GET /api/v1/devices/                  │
    │  Authorization: Bearer eyJ...  ───────►│ Procesa petición
    │◄─── { datos de sensores } ────────────│
```

La `api_key` se genera una sola vez al crear la aplicación y se muestra en la tabla (truncada con tooltip para ver el valor completo). No puede modificarse desde el formulario — si se compromete, se debe eliminar y recrear la aplicación.

#### Lo que el frontend implementa

| Operación | Estado | Endpoint |
|---|---|---|
| Listar aplicaciones | ✅ | `GET /api/v1/applications/` |
| Crear aplicación | ✅ | `POST /api/v1/applications/` |
| Editar aplicación | ✅ | `PATCH /api/v1/applications/{id}` |
| Eliminar aplicación | ✅ (solo admin) | `DELETE /api/v1/applications/{id}` |
| Autenticar app externa | ❌ Sin UI | `POST /api/v1/applications/auth` |

La autenticación por `api_key` es consumida por sistemas externos, no por usuarios humanos a través del dashboard. No requiere interfaz en el panel de administración.

---

### 13.7 Nuevo tipo `"boolean"` en FieldConfig

Para soportar campos `is_active` correctamente (que son `boolean` en el modelo pero deben renderizarse como `Select` en MUI), se añadió un tipo dedicado a la interfaz `FieldConfig`:

```typescript
export interface FieldConfig {
    type?: "text" | "password" | "date" | "select" | "number" | "boolean";
    hidden?: boolean;
    options?: Array<{ label: string; value: string | number | boolean }>;
    helperText?: string;
}
```

**¿Por qué un tipo separado y no solo `"select"`?** MUI `Select` requiere que `value` sea `string | number`. Los valores booleanos generan un error de TypeScript. El tipo `"boolean"` maneja la conversión internamente:

```typescript
// En EditarDialog.tsx — caso type === "boolean":
onChange={(e) => setFieldValue(key, e.target.value === "true")}
// El Select muestra "true"/"false" como string pero Formik almacena boolean real
```

Esto garantiza que el PATCH al backend envíe `{ is_active: true }` y no `{ is_active: "true" }`.

---

### 13.8 Archivos modificados en esta fase

| Archivo | Cambio |
|---|---|
| `src/components/EditarDialog.tsx` | Nuevo tipo `"boolean"` en `FieldConfig`; nuevo caso de renderizado que convierte string↔boolean; `setFieldValue` en lugar de `formikChange` para campos booleanos |
| `src/shared/api/schemas/validation.ts` | `generatePersonalDataSchema`, `generateDeviceSchema` y `generateServiceSchema` incluyen `is_active: Yup.boolean().optional()` en modo edición (`isRequired = false`) |
| `src/pages/Administradores.tsx` | `showDetail={true}` y `entityTypeLabel="Administrador"` |
| `src/pages/Usuarios.tsx` | `fieldsConfig` con `is_active: { type: "boolean" }` |
| `src/pages/Dispositivos.tsx` | `fieldsConfig` con `is_active: { type: "boolean" }`; `showDetail={true}`; `entityTypeLabel="Dispositivo"` |
| `src/pages/Servicios.tsx` | `fieldsConfig` extendido con `is_active: { type: "boolean" }` |

---

### 13.9 Estado de funcionalidades tras esta fase

| Funcionalidad | Estado |
|---|---|
| Modificar estado de usuarios | ✅ Select Activo/Inactivo en formulario de edición |
| Modificar estado de dispositivos | ✅ Select Activo/Inactivo en formulario de edición |
| Modificar estado de servicios | ✅ Select Activo/Inactivo en formulario de edición |
| Ver detalle de administradores | ✅ Botón "Ver" en tabla de Administradores |
| Ver detalle de dispositivos | ✅ Botón "Ver" en tabla de Dispositivos |
| Asignar múltiples usuarios a un servicio | ❌ Pendiente backend (UserRole, ManagerService sin endpoints) |
| Autenticación de apps externas por api_key | ❌ Sin UI (consumido por sistemas externos, no por usuarios) |

---

## 14. Actualización — Correcciones de UX críticas y diálogo de cambio de contraseña (14 de abril de 2026, cuarta fase)

### 14.1 Problemas detectados

#### 14.1.1 Formulario de edición sin datos precargados

**Problema:** Al abrir el diálogo de edición de cualquier entidad, los campos aparecían vacíos en lugar de mostrar los valores actuales del registro. El usuario tenía que escribir todos los datos desde cero, incluyendo campos que no deseaba modificar.

**Causa raíz:** `EditarDialog.tsx` inicializaba Formik con `initialValues` vacíos sin considerar la fila seleccionada (`rowData`). El PATCH enviaba el objeto completo aunque estuviera vacío, sobrescribiendo datos válidos con cadenas vacías.

**Solución aplicada en `EditarDialog.tsx`:**
- `initialValues` ahora se construye a partir de `rowData` cuando `isCreate = false`.
- El PATCH filtra el payload: omite campos cuyo valor no cambió respecto al original **y** omite campos vacíos (`val === ""`).
- Si un campo no está en la respuesta de la API (ej. `password`), muestra el helper "Dejar vacío para no modificar".
- El campo `password` se omite completamente del formulario de edición.

#### 14.1.2 Datos sensibles visibles sin protección en la vista de detalle

**Problema:** `DetalleDialog.tsx` mostraba únicamente los campos devueltos por la API. Para entidades de datos personales (dirección, CURP, RFC, etc.) estos campos no se devuelven por política de seguridad del backend, lo que hacía invisible al usuario que esos datos existen.

**Solución aplicada en `DetalleDialog.tsx`:**
- Se definió `SENSITIVE_PERSONAL_FIELDS = [email, phone, address, city, state, postal_code, birth_date, curp, rfc]`.
- La detección de entidad de datos personales usa `"first_name" in row`.
- Los campos sensibles ausentes en la respuesta de la API se renderizan como `••••••••` bajo el encabezado *"Datos confidenciales (no devueltos por la API)"*.

#### 14.1.3 No había forma de cambiar la contraseña desde la UI

**Problema:** El formulario de edición incluía el campo `password`, pero modificarlo en un PATCH genérico no es la operación correcta. El backend expone `PATCH /api/v1/auth/change-password` con los campos `current_password` y `new_password`, cuya semántica requiere validar la contraseña actual antes de cambiarla.

**Solución — nuevo componente `CambiarPasswordDialog.tsx`:**
- Diálogo independiente con tres campos: `current_password`, `new_password`, `confirm_password`.
- Validación Yup: mínimo 8 caracteres; `confirm_password` debe coincidir con `new_password`.
- Llama `PATCH /api/v1/auth/change-password` usando el hook `useSendDataMutation`.
- Si el backend rechaza (contraseña actual incorrecta), muestra el mensaje de error de la API.
- En éxito, muestra alerta verde y el usuario cierra manualmente.
- Se accede mediante el icono 🔒 (`LockResetIcon`) en la barra superior (`AppBar`) de `SidebarLayout`.

#### 14.1.4 El botón de cerrar sesión no hacía nada

**Problema:** Al hacer clic en el botón de logout (icono de salida en la barra del drawer), la sesión se eliminaba del `sessionStorage` pero el usuario seguía viendo la aplicación sin redirigirse al login.

**Causa raíz:** `handleLogout` en `SidebarLayout.tsx` llamaba `navigate("/login")`, ruta que **no existe** en el router. Al no coincidir con ninguna ruta definida, el wildcard `path="*"` cargaba `SidebarLayout` nuevamente, pero sin sesión activa la pantalla quedaba visualmente igual o en blanco (ninguna subruta coincide). `ProtectedRoute` redirige a `/login/admin-master` cuando no hay sesión, pero en ese momento el componente ya no estaba montado.

**Solución aplicada en `SidebarLayout.tsx`:**
```typescript
// Antes (ruta inexistente):
const handleLogout = () => {
    logout();
    navigate("/login");
};

// Después (ruta correcta, coherente con ProtectedRoute):
const handleLogout = () => {
    logout();
    navigate("/login/admin-master");
};
```

### 14.2 Archivos creados y modificados en esta fase

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/components/CambiarPasswordDialog.tsx` | **Nuevo** | Diálogo de cambio de contraseña con validación de contraseña actual |
| `src/components/SidebarLayout.tsx` | Modificado | Importa `LockResetIcon` y `CambiarPasswordDialog`; agrega estado `changePwOpen`; icono 🔒 en AppBar; corrige `navigate("/login/admin-master")` |
| `src/components/EditarDialog.tsx` | Modificado | `initialValues` desde `rowData`; filtro de payload PATCH; omisión del campo `password`; helper text dinámico; nota sobre cambio de contraseña; tipo `"boolean"` en `FieldConfig` |
| `src/components/DetalleDialog.tsx` | Modificado | `SENSITIVE_PERSONAL_FIELDS`; detección de entidad de datos personales; renderizado de `••••••••` para campos confidenciales ausentes |

### 14.3 Estado de funcionalidades tras esta fase

| Funcionalidad | Estado |
|---|---|
| Formulario de edición con datos precargados | ✅ Valores actuales visibles al abrir el diálogo |
| PATCH solo envía campos modificados | ✅ Campos sin cambios y campos vacíos se omiten del payload |
| Cambio de contraseña con validación de contraseña actual | ✅ Diálogo `CambiarPasswordDialog` accesible desde icono 🔒 |
| Datos sensibles enmascarados en vista de detalle | ✅ Campos confidenciales muestran `••••••••` si no los devuelve la API |
| Cerrar sesión redirige correctamente al login | ✅ `navigate("/login/admin-master")` — ruta existente y coherente con `ProtectedRoute` |

---

## 15. Funcionalidades pendientes por falta de endpoints en el backend (14 de abril de 2026)

### 15.1 Asignación de usuarios a servicios

**Descripción de la funcionalidad solicitada:** En la pantalla de Servicios, permitir seleccionar y asignar usuarios existentes de la plataforma a un servicio, así como quitarlos, directamente desde la UI.

**Por qué no es implementable solo en el frontend:**

La relación Usuario ↔ Servicio en la base de datos está modelada a través de tres tablas intermedias:

```
User → UserRole → Role → Service
```

Para asignar un usuario a un servicio es necesario obtener o crear un `Role` vinculado a ese `Service`, y luego crear un registro `UserRole` con `user_id` + `role_id`. Ninguna de estas operaciones está expuesta en la API actual.

**Endpoints faltantes en el backend:**

| Operación | Método | Ruta sugerida | Descripción |
|---|---|---|---|
| Listar usuarios asignados a un servicio | `GET` | `/api/v1/services/{service_id}/users` | Devuelve la lista de usuarios que tienen algún `UserRole` ligado a un `Role` de este servicio |
| Asignar un usuario a un servicio | `POST` | `/api/v1/services/{service_id}/users/{user_id}` | Crea automáticamente un `Role` por defecto ("Miembro") si no existe, y crea el `UserRole` correspondiente |
| Quitar un usuario de un servicio | `DELETE` | `/api/v1/services/{service_id}/users/{user_id}` | Elimina todos los `UserRole` de ese usuario en cualquier `Role` de ese servicio |

**Archivos del backend que requieren modificación:**

| Archivo | Cambio necesario |
|---|---|
| `app/domain/service/schemas.py` | Agregar `ServiceUserResponse` con `id`, `first_name`, `last_name`, `second_last_name`, `is_active` |
| `app/domain/service/repository.py` | Métodos `get_users_in_service`, `get_or_create_default_role`, `assign_user`, `remove_user` usando `select(User).join(UserRole).join(Role)` |
| `app/domain/service/service.py` | Métodos `get_users_in_service`, `assign_user`, `remove_user` que delegan al repository y validan existencia de entidades |
| `app/domain/service/controller.py` | Registrar las 3 rutas nuevas con `add_api_route`, protegidas con `require_read`, `require_write`, `require_delete` sobre `Service` |

**Componentes del frontend ya diseñados (listos para activarse cuando el backend esté disponible):**

- `src/components/GestionUsuariosServicioDialog.tsx` — diálogo con dos paneles: usuarios disponibles (izquierda) y usuarios asignados (derecha), búsqueda por nombre, botones ➕/➖ por usuario, actualizaciones en tiempo real sin recargar la página.
- `src/pages/Servicios.tsx` — columna extra 👥 en la tabla que abre el diálogo al hacer clic en la fila del servicio.

**Estado:** ❌ Bloqueado — requiere los 3 endpoints en el backend antes de poder activarse en el frontend.

---

## 16. Actualización — Sincronización con Upstream Coquita01/IOT-Server (15 de abril de 2026)

### 16.1 Contexto

Se realizó una sincronización completa del fork `GemmaDI300/IOT-Server` con el repositorio upstream `Coquita01/IOT-Server`. El objetivo fue integrar todas las mejoras del backend sin tocar la configuración Docker ni el frontend existente.

### 16.2 Proceso de sincronización Git

| Paso | Comando | Resultado |
|---|---|---|
| Obtener cambios remotos | `git fetch upstream` | ✅ Rama `upstream/main` actualizada (8+ commits nuevos) |
| Analizar diferencias | `git diff HEAD upstream/main --name-only` | 70+ archivos modificados en backend |
| Confirmar archivos backend staged | `git commit -m "chore: stage backend changes..."` | ✅ 40 archivos, 1916 inserciones |
| Registrar `docker-compose.yml` local | `git add docker-compose.yml && git commit` | ✅ Necesario para desbloquear el merge |
| Fusionar upstream | `git merge upstream/main --no-edit -X ours` | ✅ Merge exitoso — `docker-compose.yml` conservado con nuestra versión |

**Problema encontrado y solución:**  
El merge inicial falló porque `docker-compose.yml` existía en el disco como archivo sin rastrear (`??`) y upstream también lo incluía. Git se negó a sobreescribir un archivo no rastreado. La solución fue confirmar primero nuestro `docker-compose.yml` en Git con `git add` + `git commit`, y luego lanzar el merge con la estrategia `-X ours` para conservar nuestra versión ante cualquier conflicto.

### 16.3 Cambios del backend integrados

#### Módulo de sesiones (Valkey/Redis)

| Archivo | Descripción |
|---|---|
| `app/shared/session/` | Nuevo módulo de gestión de sesiones usando Valkey (compatible Redis) |
| `app/config.py` | Nuevos campos `VALKEY_URL` y `ENCRYPTION_KEY` en configuración |

**Impacto en el frontend:** Ninguno. El manejo de sesiones es completamente transparente para el cliente; el frontend sigue usando el token JWT en `sessionStorage` tal como antes.

#### Autenticación por puzzle para aplicaciones IoT (`POST /api/v1/applications/auth`)

| Campo | Detalle |
|---|---|
| Endpoint nuevo | `POST /api/v1/applications/auth` |
| Propósito | Autenticación criptográfica AES tipo puzzle para aplicaciones IoT (máquina a máquina) |
| Consumidor | Dispositivos IoT externos, **no** el panel de administración |
| Schema | `PuzzleRequest { application_id: UUID, encrypted_payload: PuzzlePayload }` |

**Impacto en el frontend:** Ninguno. Este endpoint no es de uso humano ni aparece en ningún formulario del panel de administración.

#### Validación de IP y MAC en dispositivos

El backend ahora valida el formato de dirección IP y dirección MAC mediante `field_validator` en los schemas de `Device`.

**Impacto en el frontend:** Los errores de formato se reciben como respuestas `422 Unprocessable Entity` del backend y se muestran en el `Alert` de error de `EditarDialog`/formulario de creación sin necesidad de cambios en el frontend.

#### `ApplicationCreate` — campos ahora opcionales

Los campos `version`, `url`, `port` y `description` del schema `ApplicationCreate` pasaron de requeridos a opcionales (`str | None = None`).

**Impacto en el frontend:** Ninguno. Nuestro formulario de creación de aplicaciones ya marcaba estos campos como opcionales (sin validación `required`). El schema de Yup correspondiente no necesita modificación.

#### Enum `Priority` en Tickets

El campo `priority` de `ServiceTicket` y `EcosystemTicket` ahora usa un `Priority(str, Enum)` con valor por defecto `Priority.medium`.

**Impacto en el frontend:** Ninguno. Los valores del enum (`low`, `medium`, `high`, `critical`) son exactamente los mismos strings que el frontend ya usaba en los `Select` de la página de Tickets.

#### Nuevas suites de pruebas

Se integraron 29 nuevos archivos de tests de backend que cubren los módulos:

| Módulo | Archivo |
|---|---|
| Aplicaciones | `tests/application/test_crud.py` |
| Autenticación puzzle | `tests/application_auth/test_auth.py` |
| Autorización OSO | `tests/authorization/test_api_policies.py`, `test_detailed_permissions.py`, `test_oso_policies.py` |
| Dispositivos | `tests/device/test_crud.py` |
| Autenticación de dispositivos | `tests/device_auth/test_auth.py` |
| Gerentes | `tests/manager/test_crud.py` |
| Servicios | `tests/service/test_crud.py` |
| Sesiones | `tests/session/test_integration.py`, `test_session.py` |
| Tickets | `tests/tickets/test_crud.py` |

**Impacto en el frontend:** Ninguno. Son pruebas exclusivamente del backend.

### 16.4 Configuración Docker — sin cambios

| Aspecto | Upstream (Coquita01) | Nuestro fork |
|---|---|---|
| Base de datos | PostgreSQL 16 + Valkey 7.2 | SQLite (sin dependencias externas) |
| Servicios Docker | Solo infraestructura (BD + cache) | Backend FastAPI + Frontend nginx + health checks |
| `docker-compose.yml` | Solo Postgres + Valkey | Backend (puerto 8000) + Frontend (puerto 3000) |

Nuestro `docker-compose.yml` fue **conservado íntegramente** durante el merge (`-X ours`) porque la configuración upstream es incompatible con nuestro entorno de despliegue local.

### 16.5 Resumen de impacto en el frontend

| Cambio en upstream | ¿Requirió modificar el frontend? | Motivo |
|---|---|---|
| Módulo de sesiones Valkey | ❌ No | Transparente para el cliente JWT |
| `POST /applications/auth` (puzzle auth) | ❌ No | Endpoint máquina-a-máquina, no de usuario |
| Validación IP/MAC en dispositivos | ❌ No | Errores se muestran vía `422` del backend |
| `ApplicationCreate` campos opcionales | ❌ No | Ya eran opcionales en el frontend |
| Enum `Priority` en tickets | ❌ No | Strings idénticos a los ya usados |
| Nuevas suites de tests backend | ❌ No | Solo backend |

**Resultado:** La sincronización fue completamente transparente para el frontend. Cero archivos del frontend fueron modificados.

### 16.6 Estado post-sincronización (15 de abril de 2026)

- **Git HEAD:** `0e706f1` — `Merge remote-tracking branch 'upstream/main'`
- **Backend:** Reconstruido y corriendo en `http://localhost:8000` (healthy)
- **Frontend:** Reconstruido y corriendo en `http://localhost:3000`
- **Commits integrados de upstream:** 20+ commits incluyendo session module, puzzle auth, device validation, authorization policies y test suites completas

---

### 16.7 Segunda sincronización con upstream (20 de abril de 2026)

**Contexto:** Revisión de nuevos cambios en el repositorio upstream después de 5 días de la última sincronización.

**Commits nuevos integrados:**

| Commit | Descripción |
|---|---|
| `b210841` | Merge PR#28 de FerSorCTN/ModsManagerTickets |
| `ccb69fd` | Corrección en tests CRUD de Manager |

**Cambios técnicos:**

**Archivo modificado: `tests/manager/test_crud.py`**

Se corrigió un error en 12 líneas de los tests de Manager donde se usaba `password_hash` en lugar de `password` al crear managers:

```python
# Antes (incorrecto)
"password_hash": "TestPass123!"

# Después (correcto)
"password": "TestPass123!"
```

**Motivo del cambio:** El schema `ManagerCreate` del API espera el campo `password` (texto plano), no `password_hash`. El backend se encarga del hash internamente. Esta corrección alinea los tests con el comportamiento real del endpoint `POST /api/v1/managers/`.

**Impacto en el frontend:** ❌ Ninguno. Los cambios son exclusivamente en la suite de tests del backend.

**Configuración Docker:**
- Nuestro `docker-compose.yml` conservado sin cambios (estrategia `-X ours`)
- Upstream sigue usando Postgres+Valkey, nosotros seguimos con SQLite+Backend+Frontend

**Estado Git post-sincronización:**
- **HEAD:** `3aa49d2` — `Merge remote-tracking branch 'upstream/main'`
- **Upstream sincronizado:** `b210841`
- **Archivos modificados:** 1 (tests/manager/test_crud.py)
- **Frontend modificado:** 0 archivos

**Estado Docker post-actualización:**
- **Backend:** ✅ Reconstruido y corriendo en `http://localhost:8000` (healthy, respondiendo 200 OK)
- **Frontend:** ✅ Reconstruido y corriendo en `http://localhost:3000` (respondiendo 200 OK)
- **Base de datos:** SQLite con todas las tablas verificadas e intactas
- **Imágenes reconstruidas:** `iot-server-backend:latest` y `iot-server-frontend:latest`

**Pruebas realizadas:**
- ✅ Backend accesible en `http://localhost:8000/docs` (Swagger UI)
- ✅ Frontend accesible en `http://localhost:3000`
- ✅ Health check del backend respondiendo correctamente
- ✅ Logs del backend sin errores, todas las tablas SQLite creadas/verificadas

---

## 17. Actualización — Módulo de Roles, Autorización OSO y Firma de Peticiones (5 de mayo de 2026)

**Motivo:** Sincronización con el repositorio upstream `Coquita01/IOT-Server` que introdujo el módulo de Roles como entidad de primera clase con CRUD propio, integración del motor de autorización OSO en el frontend y un esquema criptográfico de firma de peticiones (PG/TAG/PF) para autenticar cada llamada al backend.

---

### 17.1 Commits integrados del upstream

| Hash | Mensaje | Impacto |
|---|---|---|
| `(nuevo)` | Add Role entity with CRUD endpoints | Nuevo endpoint `/api/v1/roles/` |
| `(nuevo)` | Add OSO authorization policies | Archivo `policies.polar` con permisos por rol |
| `(nuevo)` | Add port field to Application model | Breaking change en esquema SQLite |
| `(nuevo)` | Add role domain module | `app/domain/role/` completo |
| `(nuevo)` | Update dependencies for oso | `pyproject.toml` con `oso==0.27.3` |

**Rama local:** `main` (7 commits por delante de `upstream/main` tras el merge)

---

### 17.2 Impacto del campo `application.port` en Docker

La adición del campo `port` al modelo `Application` introdujo un **breaking change de esquema SQLite**: la columna nueva no existe en el volumen persistente de la versión anterior, causando el error `no such column: application.port` al arrancar el backend.

**Solución aplicada:**

```powershell
docker compose down
docker volume rm iot-server_sqlite_data
docker compose up -d
```

> **Consecuencia:** Todos los datos de la base de datos fueron eliminados. El seed de `admin@iot.com / Admin1234!` es recreado automáticamente por `docker_entrypoint.py`. Las aplicaciones, servicios, gerentes, usuarios y dispositivos creados anteriormente deben volver a crearse.

---

### 17.3 Nueva matriz de permisos OSO — Módulo de Roles

El archivo `app/shared/authorization/policies.polar` define los permisos que el backend aplica sobre el nuevo recurso `Role`:

| Acción | Admin Master | Admin Normal | Gerente | Usuario |
|---|---|---|---|---|
| `read` (listar/ver) | ✅ | ✅ | ✅ | ✅ |
| `write` (crear/editar) | ✅ | ✅ | ✅ | ❌ |
| `delete` (eliminar) | ✅ | ✅ | ❌ | ❌ |

El frontend refleja exactamente esta matriz: administradores y gerentes ven los botones Crear y Editar; solo administradores ven el botón Eliminar; usuarios acceden a la tabla en modo solo lectura.

---

### 17.4 Nuevo módulo de Roles en el frontend

#### 17.4.1 Tipos TypeScript — `types.ts`

Se agregaron tres nuevas interfaces al archivo `src/shared/api/types.ts` (antes de la sección de Tickets):

```typescript
export interface RoleCreate {
    name: string;
    description?: string;
    service_id: string;
    is_active?: boolean;
}

export interface RoleUpdate {
    name?: string;
    description?: string;
    is_active?: boolean;
}

export interface RoleResponse {
    [key: string]: unknown;
    id: string;
    name: string;
    description: string | null;
    service_id: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
```

#### 17.4.2 Validación Yup — `validation.ts`

Se agregó `generateRoleSchema()` al final de `src/shared/api/schemas/validation.ts`:

| Campo | Validación |
|---|---|
| `name` | Obligatorio; solo letras (`/^[A-Za-záéíóúÁÉÍÓÚñÑüÜ]+$/`); sin `<>"'&`; coincide con `_normalize_role_name_strict_letters` del backend |
| `description` | Opcional; máximo 500 caracteres |
| `service_id` | Obligatorio en creación; debe ser UUID válido |
| `is_active` | Opcional; boolean |

#### 17.4.3 Página CRUD — `Roles.tsx`

Se creó `src/pages/Roles.tsx`, nueva página completa de gestión de roles.

**Comportamiento de permisos (conforme a OSO):**

| Acción UI | Condición |
|---|---|
| Botón "Crear" visible | `isAdmin || isManager` |
| Botón "Editar" visible | `isAdmin || isManager` |
| Botón "Eliminar" visible | `isAdmin` únicamente |
| Tabla visible (solo lectura) | Todos los roles autenticados |

**Campo `service_id`:** Se carga dinámicamente desde `GET /api/v1/services/` y se presenta como un `Select` de MUI con el nombre del servicio. El usuario nunca necesita escribir un UUID manualmente.

**Endpoint utilizado:**

| Operación | Método | Endpoint |
|---|---|---|
| Listar | GET | `/api/v1/roles/` |
| Crear | POST | `/api/v1/roles/` |
| Editar | PATCH | `/api/v1/roles/{id}` |
| Eliminar | DELETE | `/api/v1/roles/{id}` |

#### 17.4.4 Registro en router y navegación — `main.tsx`

| Cambio | Detalle |
|---|---|
| Import lazy | `const Roles = lazy(() => import("./pages/Roles"))` |
| Ícono MUI | `import BadgeIcon from "@mui/icons-material/Badge"` |
| Nav item | `{ text: "Roles", path: "/roles", icon: <BadgeIcon />, allowedTypes: ["administrator", "manager", "user"], section: "Plataforma" }` |
| Ruta | `<Route path="/roles" element={<ProtectedRoute element={Roles} />} />` |

---

### 17.5 Esquema de firma criptográfica de peticiones (PG/TAG/PF)

#### 17.5.1 Motivación

El frontend autenticaba las peticiones únicamente con el header `Authorization: Bearer <JWT>`. Para reforzar la autenticación de canal y detectar peticiones replayed o manipuladas, se implementó un esquema adicional de tres cabeceras derivadas criptográficamente del JWT usando la **Web Crypto API** nativa del navegador (sin dependencias externas).

#### 17.5.2 Archivo nuevo — `requestSigning.ts`

Se creó `src/shared/api/requestSigning.ts` con la función exportada:

```typescript
buildSignedHeaders(jwt: string, bodyJson: string): Promise<Record<string, string>>
```

**Derivación de claves:**

| Símbolo | Derivación | Uso |
|---|---|---|
| `IDsess` | `SHA-256(JWT)` → hex-64 | Identificador de sesión sin exponer el JWT |
| `kEnc` | `SHA-256("iot-enc-v1:" ‖ JWT)` → 32 bytes | Clave AES-256-CBC para cifrar el payload |
| `SessApp` | `SHA-256("iot-sess-v1:" ‖ JWT)` → 32 bytes | Clave HMAC-SHA256 para firmar el token PG |

**Construcción del token PG:**

```
PLcifrado = AES-256-CBC(bodyJson, kEnc, IV_random)   → "b64(iv):b64(ct)"
PG        = base64( JSON({ session_id: IDsess, payload: PLcifrado, timestamp }) )
```

**Construcción del TAG:**

```
TAG = HMAC-SHA256(SessApp, PG)  → hex-64
```

#### 17.5.3 Cabeceras HTTP generadas

| Header | Valor | Propósito |
|---|---|---|
| `X-Session-Id` | `IDsess` (hex-64) | Identifica la sesión sin exponer el JWT |
| `X-Request-Pg` | Token PG (base64) | Payload cifrado + timestamp |
| `X-Request-Tag` | `TAG` (hex-64) | Firma HMAC del PG |
| `X-Request-Ts` | ISO 8601 timestamp | Anti-replay por ventana temporal |

> **Compatibilidad con el backend:** El backend no valida estas cabeceras (no se modificó). Las cabeceras `X-*` desconocidas son ignoradas por FastAPI. El esquema es completamente forward-compatible y puede activarse en el backend en cualquier momento sin romper el contrato.

#### 17.5.4 Integración en `functions.ts`

Se modificó `src/shared/api/functions.ts` para incluir las cabeceras firmadas en todas las peticiones autenticadas:

```typescript
import { buildSignedHeaders } from "./requestSigning";

// En useSendDataMutation, useDeleteByIdMutation, useGetQuery:
const signedHeaders = await buildSignedHeaders(jwt, bodyJson).catch(() => ({}));
// Se mezclan con los headers existentes antes del fetch
```

El `.catch(() => ({}))` garantiza degradación graceful: si Web Crypto API no está disponible (contexto no-HTTPS), las peticiones continúan normalmente sin las cabeceras firmadas.

---

### 17.6 Archivos modificados en esta actualización

#### Archivos existentes actualizados

| Archivo | Cambio |
|---|---|
| `src/shared/api/types.ts` | Agregadas interfaces `RoleCreate`, `RoleUpdate`, `RoleResponse` |
| `src/shared/api/schemas/validation.ts` | Agregada función `generateRoleSchema()` con validación de nombre solo letras |
| `src/shared/api/functions.ts` | Import de `buildSignedHeaders`; cabeceras firmadas en los tres hooks de fetch |
| `src/main.tsx` | Import lazy de `Roles`; import de `BadgeIcon`; nav item para Roles; ruta `/roles` |

#### Archivos nuevos creados

| Archivo | Descripción |
|---|---|
| `src/pages/Roles.tsx` | Página CRUD de roles con permisos OSO; Select dinámico para `service_id` |
| `src/shared/api/requestSigning.ts` | Módulo de firma criptográfica con Web Crypto API (SHA-256, AES-256-CBC, HMAC-SHA256) |

---

### 17.7 Mapa de endpoints actualizado tras esta fase

| Endpoint | GET | POST | PATCH | DELETE | UI |
|---|---|---|---|---|---|
| `/api/v1/auth/login` | — | ✅ | — | — | Login pages |
| `/api/v1/auth/change-password` | — | — | ✅ | — | Icono 🔒 en AppBar |
| `/api/v1/administrators/` | ✅ | ✅ | ✅ | ✅ | Administradores |
| `/api/v1/managers/` | ✅ | ✅ | ✅ | ✅ | Gerentes |
| `/api/v1/users/` | ✅ | ✅ | ✅ | ✅ | Usuarios |
| `/api/v1/devices/` | ✅ | ✅ | ✅ | ✅ | Dispositivos |
| `/api/v1/services/` | ✅ | ✅ | ✅ | ✅ | Servicios |
| `/api/v1/applications/` | ✅ | ✅ | ✅ | ✅ | Aplicaciones |
| `/api/v1/tickets/service/` | ✅ | ✅ | ✅ | — | Tickets (pestaña 1) |
| `/api/v1/tickets/ecosystem/` | ✅ | ✅ | ✅ | — | Tickets (pestaña 2) |
| `/api/v1/roles/` | ✅ | ✅ | ✅ | ✅ | **Roles** *(nuevo)* |

---

### 17.8 Rutas del frontend tras esta actualización

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
| `/usuarios` | Usuarios | Administrador y Gerente |
| `/dispositivos` | Dispositivos | Cualquier autenticado |
| `/servicios` | Servicios | Administrador y Gerente |
| `/aplicaciones` | Aplicaciones | Administrador y Gerente |
| `/tickets` | Tickets | Cualquier autenticado |
| `/roles` | **Roles** *(nuevo)* | Cualquier autenticado |

---

### 17.9 Estado global tras esta actualización

| Módulo | Estado anterior (20 abr) | Estado actual (5 may) |
|---|---|---|
| Autenticación | ✅ Funciona | ✅ Sin cambios |
| Administradores | ✅ Funciona | ✅ Sin cambios |
| Gerentes | ✅ Funciona | ✅ Sin cambios |
| Usuarios | ✅ Funciona | ✅ Sin cambios |
| Dispositivos | ✅ Funciona | ✅ Sin cambios |
| Servicios | ✅ Funciona | ✅ Sin cambios |
| Aplicaciones | ✅ Funciona | ✅ Sin cambios |
| Tickets | ✅ Funciona (FKs sin selector) | ✅ Sin cambios |
| **Roles** | ❌ Sin endpoints ni UI | ✅ **Implementado** (CRUD completo) |
| Firma de peticiones (PG/TAG) | ❌ Solo Bearer token | ✅ **Implementado** (cabeceras X-* en todas las peticiones) |
| Cambio de contraseña | ✅ Diálogo disponible | ✅ Sin cambios |
| Búsqueda en sidebar | ❌ Sin funcionalidad | ❌ Pendiente |
| UserRole / ManagerService | ❌ Sin endpoints backend | ❌ Pendiente |

---

## 18. Actualización — Modo Configuración Inicial (5 de mayo de 2026)

**Motivo:** En la Fase 1 del arranque desde cero, las variables de entorno `VITE_APP_APPLICATION_ID`, `VITE_APP_API_KEY` y `VITE_APP_SERVER_KEY` están vacías porque aún no existe ninguna `Application` registrada. El frontend arrancaba completamente funcional en este estado, dando acceso a todos los módulos sin que el `BackendGate` hubiera verificado la autenticidad del servidor. Se implementó un **modo configuración inicial** que restringe la UI exclusivamente a la pantalla de Aplicaciones mientras las credenciales RC no estén configuradas.

---

### 18.1 Problema anterior

| Situación | Comportamiento anterior | Comportamiento esperado |
|---|---|---|
| Variables RC vacías | `BackendGate` omite verificación y renderiza toda la app | Solo mostrar lo mínimo para crear la Application |
| Navegación en setup | Todos los módulos accesibles (Dashboard, Usuarios, etc.) | Solo Aplicaciones accesible |
| Sidebar | Todos los ítems visibles | Solo ítem Aplicaciones visible |
| Redirección | Rutas habituales funcionan | Cualquier ruta redirige a `/aplicaciones` |

---

### 18.2 Cambios implementados

#### `src/shared/components/BackendGate.tsx`

Se exportaron dos nuevos elementos del módulo:

```typescript
/** true = sin credenciales RC (modo configuración inicial). */
export const SetupModeContext = createContext<boolean>(false);
export const useSetupMode = () => useContext(SetupModeContext);
```

El provider envuelve los children con el valor del contexto:

```typescript
// Antes:
return <>{children}</>;

// Después:
return (
    <SetupModeContext.Provider value={status === "unconfigured"}>
        {children}
    </SetupModeContext.Provider>
);
```

Cuando las 3 variables RC están vacías, `status` es `"unconfigured"` y el contexto propaga `true` a toda la app.

#### `src/components/SidebarLayout.tsx`

Se importó `useSetupMode` y se añadieron dos cambios:

**1. Filtro de ítems de navegación:**
```typescript
const visibleItems = navItems.filter((item) => {
    if (isSetupMode) return item.path === "/aplicaciones";
    // ... lógica normal de allowedTypes ...
});
```

**2. Banner de advertencia en el drawer:**
```tsx
{isSetupMode && (
    <Alert severity="warning" sx={{ borderRadius: 0, fontSize: 12, py: 1 }}>
        <strong>Modo configuración inicial</strong><br />
        Crea una Application para activar el sistema completo.
    </Alert>
)}
```

#### `src/main.tsx`

Se importó `useSetupMode` y `Navigate`. Las rutas dentro de `SidebarLayout` ahora tienen dos ramas:

```tsx
{isSetupMode ? (
    // Modo configuración inicial: solo Aplicaciones
    <>
        <Route path="/aplicaciones" element={<ProtectedRoute element={Aplicaciones} />} />
        <Route path="*" element={<Navigate to="/aplicaciones" replace />} />
    </>
) : (
    // Modo normal: todas las rutas disponibles
    <>
        <Route path="/" element={<ProtectedRoute element={Dashboard} />} />
        <Route path="/usuarios" ... />
        {/* ... resto de rutas ... */}
    </>
)}
```

---

### 18.3 Comportamiento por estado

| Estado del sistema | `isSetupMode` | Sidebar | Rutas disponibles | BackendGate |
|---|---|---|---|---|
| Variables RC vacías | `true` | Solo "Aplicaciones" + banner amarillo | `/aplicaciones` (resto redirige aquí) | Omite verificación |
| Variables RC configuradas + puzzle OK | `false` | Todos los módulos según rol | Todas las rutas normales | Verificado ✅ |
| Variables RC configuradas + puzzle FAIL | — | — | App bloqueada (pantalla de error) | Falla ❌ |

---

### 18.4 Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/components/BackendGate.tsx` | Exporta `SetupModeContext` y `useSetupMode`; envuelve children en el Provider con `value={status === "unconfigured"}` |
| `src/components/SidebarLayout.tsx` | Importa `useSetupMode`; filtro de navItems en setup mode; banner `Alert` amarillo en el drawer |
| `src/main.tsx` | Importa `useSetupMode` y `Navigate`; rutas condicionales según `isSetupMode` |

---

### 18.5 Estado de funcionalidades tras esta actualización

| Funcionalidad | Estado |
|---|---|
| Modo configuración inicial (sin credenciales RC) | ✅ Solo muestra Aplicaciones; todo lo demás bloqueado |
| Modo normal (con credenciales RC verificadas) | ✅ Todos los módulos disponibles según rol |
| Bloqueo total si puzzle falla | ✅ Pantalla de error con botón Reintentar |
| Banner visual de setup mode | ✅ Alert amarillo en sidebar |
| Redirección automática en setup mode | ✅ Cualquier ruta → `/aplicaciones` |

---

## 19. Fase 2 — Configuracion RC completa (5 de mayo de 2026)

### 19.1 Contexto

Tras completar la Fase 1 (sistema en modo configuracion inicial), el siguiente paso
fue obtener las credenciales RC de la Application creada y configurar el frontend para
verificar la autenticidad del backend en cada arranque.

### 19.2 Extraccion de credenciales

Los tres valores requeridos se obtienen de fuentes distintas:

| Variable | Origen | Metodo de obtencion |
|---|---|---|
| `VITE_APP_APPLICATION_ID` | Tabla `application` en SQLite | `docker exec iot-backend python3 -c "import sqlite3; c=sqlite3.connect('/app/data/iot.db'); print(c.execute('SELECT id FROM application').fetchall())"` |
| `VITE_APP_API_KEY` | Campo `api_key` en SQLite (generado al crear) | Misma query incluyendo la columna `api_key` |
| `VITE_APP_SERVER_KEY` | Derivado de `SECRET_KEY` del backend | `docker exec iot-backend python3 -c "import hashlib,os; print(hashlib.sha256((os.environ['SECRET_KEY']+'|puzzle_v1').encode()).hexdigest())"` |

> **Nota de seguridad:** `VITE_APP_SERVER_KEY` nunca se almacena en la base de datos.
> Es una derivacion determinista de `SECRET_KEY + "|puzzle_v1"` via SHA-256. Si cambia
> `SECRET_KEY` en el backend, el `server_key` cambia y hay que recalcular.

#### Valores obtenidos (Application "IoT Frontend")

| Variable | Valor |
|---|---|
| `VITE_APP_APPLICATION_ID` | `00cc9e54b352407fa81e62b173798aec` |
| `VITE_APP_API_KEY` | `256b8b912178fd27e20955765afb716c555e2e166735a0230e67371d47adb290` |
| `VITE_APP_SERVER_KEY` | `8269a34f97e745a6c2b7df5be5184f76f878f647d356cfe46a10bf0022c680d4` |

### 19.3 Cambios en docker-compose.yml

Se anadieron las tres variables RC al bloque `args` del servicio `frontend`:

`yaml
frontend:
  build:
    context: ./frontend
    dockerfile: Dockerfile.test
    args:
      VITE_API_BASE_URL: /api/v1/
      VITE_APP_APPLICATION_ID: "00cc9e54b352407fa81e62b173798aec"
      VITE_APP_API_KEY: "256b8b912178fd27e20955765afb716c555e2e166735a0230e67371d47adb290"
      VITE_APP_SERVER_KEY: "8269a34f97e745a6c2b7df5be5184f76f878f647d356cfe46a10bf0022c680d4"
`

Estas variables se inyectan en tiempo de build como `import.meta.env.*` via Vite.
El Dockerfile.test las declara como `ARG` y las pasa a `vite build` como variables de entorno.

### 19.4 Panel de credenciales en Aplicaciones.tsx

Para facilitar futuras configuraciones (nuevas instancias, recuperacion de credenciales),
se anadio un panel de visualizacion directamente en la pagina de Aplicaciones que solo
se activa en setup mode (variables RC vacias).

**Componente `SetupCredentialsPanel`:**

| Elemento | Descripcion |
|---|---|
| Tarjeta amarilla con icono de llave | Solo visible cuando `isSetupMode = true` y hay Applications creadas |
| Campo `VITE_APP_APPLICATION_ID` | Muestra el UUID completo con boton de copiar al portapapeles |
| Campo `VITE_APP_API_KEY` | Muestra la clave hex completa con boton de copiar |
| Bloque de terminal | Comando para calcular `VITE_APP_SERVER_KEY` (seleccionable, texto monoespacio oscuro) |
| Alerta instructiva | Indica exactamente que editar en `docker-compose.yml` y que comando ejecutar |

**Componente `CopyField`:**
- Clic en icono copia el valor al portapapeles del navegador via `navigator.clipboard.writeText`
- El icono cambia a verde durante 2 segundos para confirmar la copia

**Logica de visibilidad:**

`	sx
// Solo en setup mode y con apps ya creadas
{isSetupMode && apps.length > 0 && <SetupCredentialsPanel apps={apps} />}

// Si aun no hay apps, guia para crear la primera
{isSetupMode && apps.length === 0 && <Alert severity="info">...</Alert>}
`

### 19.5 Archivos modificados

| Archivo | Tipo de cambio | Descripcion |
|---|---|---|
| `IOT-Server/docker-compose.yml` | Configuracion | Anadidas 3 variables RC en `args` del servicio frontend |
| `frontend/src/pages/Aplicaciones.tsx` | Funcionalidad | Panel de credenciales copiables en setup mode |

### 19.6 Reconstruccion y verificacion

`powershell
docker compose build frontend   # Build exitoso: 1700 modulos, ~24s
docker compose up -d frontend   # Contenedor iot-frontend Started
`

**Estado tras la Fase 2:**

| Servicio | Estado |
|---|---|
| iot-valkey | Healthy |
| iot-backend | Healthy |
| iot-frontend | Started (RC verificado en cada carga) |

**Comportamiento del frontend tras Fase 2:**
`BackendGate` ejecuta el puzzle AES-256-CBC + HMAC-SHA256 contra `POST /api/v1/applications/auth`.
Si el backend devuelve `{ valid: true }`, el sistema entra en modo normal con todos los modulos disponibles.

---

## 20. Actualización — Mejoras en Aplicaciones: logs, credenciales automáticas y botones de flujo (8 de mayo de 2026)

**Motivo:** Tres mejoras de usabilidad para simplificar el proceso de configuración inicial y la operación cotidiana, concentradas en la página de Aplicaciones y el componente `Gestion`.

---

### 20.1 Resumen de cambios

| # | Cambio | Archivos afectados |
|---|---|---|
| 1 | Logs de actividad se borran al hacer una desinstalación total | `Aplicaciones.tsx` |
| 2 | Credenciales RC aparecen automáticamente al crear una Application, sin recargar la página ni volver a hacer login | `Aplicaciones.tsx`, `Gestion.tsx` |
| 3 | Botón "Insertar en docker-compose.yml" + confirmación de estado | `Aplicaciones.tsx` |
| 4 | Botón "Reconstruir frontend" con copia de comandos al portapapeles | `Aplicaciones.tsx` |

---

### 20.2 Problema 1 — Logs no se borraban en desinstalación total

**Situación anterior:** El proceso de desinstalación total (`docker compose down -v --remove-orphans`) destruye los datos del servidor (SQLite + Valkey), pero los logs de actividad del panel (almacenados en `localStorage` del navegador bajo la clave `iot_activity_log`) persistían. Después de reinstalar, el Dashboard seguía mostrando acciones de la instalación anterior.

**Solución:** Se añadió una **"Zona de desinstalación total"** al final de la página de Aplicaciones, **visible únicamente para el Admin Master**. Contiene:

- El comando `docker compose down -v --remove-orphans` en un bloque de código copiable.
- Un botón **"Limpiar logs de actividad local"** que invoca `clearEvents()` del `ActivityContext`, eliminando el `localStorage` y reseteando el estado del feed del Dashboard.
- Confirmación visual verde ("¡Logs eliminados!") que desaparece a los 4 segundos.
- Nota explicativa que aclara que solo afecta al historial local del navegador, no a la base de datos del servidor.

---

### 20.3 Problema 2 — Credenciales RC no aparecían hasta refrescar la página

**Situación anterior:** Al crear una `Application` en modo configuración inicial, el panel amarillo con las credenciales (`SetupCredentialsPanel`) no aparecía hasta recargar la página y volver a iniciar sesión. Esto ocurría porque `Aplicaciones.tsx` dependía únicamente de la consulta React Query (`useGetQuery`), la cual no se invalidaba automáticamente tras la creación.

**Solución técnica:**

**En `Gestion.tsx`:**
- Se añadió la prop opcional `onCreateSuccess?: (row: T) => void` a `GestionProps<T>`.
- La callback interna `handleCreateSuccess` invoca `onCreateSuccess?.(newRow)` inmediatamente después de actualizar `tableRows`.

**En `Aplicaciones.tsx`:**
- Se añadió el estado local `newlyCreatedApps: ApplicationResponse[]`.
- Se pasa `onCreateSuccess={handleCreateSuccess}` al componente `<Gestion>`, donde `handleCreateSuccess` agrega la nueva `ApplicationResponse` (que incluye el `api_key` completo) a `newlyCreatedApps`.
- La variable `apps` de renderizado combina los datos de la consulta con los locales:

```typescript
const apps = [
    ...queryApps,
    ...newlyCreatedApps.filter((n) => !queryApps.some((a) => a.id === n.id)),
];
```

Resultado: `SetupCredentialsPanel` recibe la app recién creada en el mismo ciclo de render, sin ninguna recarga ni re-login.

---

### 20.4 Nuevos botones en `SetupCredentialsPanel`

#### Botón 1 — "Insertar en docker-compose.yml"

| Aspecto | Detalle |
|---|---|
| Visibilidad | Solo en setup mode con al menos una Application creada |
| Acción | Copia al portapapeles el bloque YAML completo de los cuatro `args` del servicio `frontend` |
| Contenido copiado | `VITE_API_BASE_URL`, `VITE_APP_APPLICATION_ID` (con valor real), `VITE_APP_API_KEY` (con valor real), `VITE_APP_SERVER_KEY` (placeholder con instrucción de reemplazo) |
| Estado "copiado" | Botón cambia a verde con ícono `CheckCircleOutline` durante 4 segundos |
| Alerta de seguimiento | `Alert severity="success"` que indica exactamente en qué sección de `docker-compose.yml` pegar el bloque y que `VITE_APP_SERVER_KEY` debe reemplazarse con el resultado del comando de terminal |

**Formato del bloque YAML copiado:**

```yaml
        VITE_API_BASE_URL: /api/v1/
        VITE_APP_APPLICATION_ID: "<id de la Application>"
        VITE_APP_API_KEY: "<api_key de la Application>"
        VITE_APP_SERVER_KEY: "← REEMPLAZAR con el resultado del comando de abajo"
```

#### Botón 2 — "Reconstruir frontend"

| Aspecto | Detalle |
|---|---|
| Visibilidad | Siempre visible en el panel de credenciales |
| Acción | Copia al portapapeles los dos comandos de reconstrucción |
| Contenido copiado | `docker compose build frontend\ndocker compose up -d` |
| Estado "copiado" | Botón cambia a verde con ícono `CheckCircleOutline` durante 4 segundos |
| Alerta de seguimiento | `Alert severity="info"` que muestra los dos comandos inline con instrucción de ejecutarlos desde `IOT-Server/` |

---

### 20.5 Archivos modificados

#### `src/components/Gestion.tsx`

| Cambio | Detalle |
|---|---|
| Nueva prop en `GestionProps<T>` | `onCreateSuccess?: (row: T) => void` |
| Nueva prop en destructuring | `onCreateSuccess` con valor por defecto `undefined` |
| Invocación en `handleCreateSuccess` | `onCreateSuccess?.(newRow)` al final de la función |

#### `src/pages/Aplicaciones.tsx`

| Cambio | Detalle |
|---|---|
| Imports nuevos | `useCallback`, `Button`, `CheckCircleOutlineIcon`, `BuildIcon`, `DeleteForeverIcon`, `LayersClearIcon`, `useActivity` |
| Estado `newlyCreatedApps` | `useState<ApplicationResponse[]>([])` — apps creadas en la sesión actual |
| Estado `logsClearedMsg` | `useState<boolean>(false)` — controla la confirmación del botón de logs |
| `handleCreateSuccess` | `useCallback` que agrega la nueva app a `newlyCreatedApps` |
| `handleClearLogs` | Invoca `clearEvents()` y activa `logsClearedMsg` por 4 segundos |
| Variable `apps` | Combina `queryApps` + `newlyCreatedApps` deduplicados por `id` |
| Variable `isMaster` | Nueva derivada de `session` para condicionar la zona de desinstalación |
| `SetupCredentialsPanel` | Refactorizado: ahora acepta los botones de copia de config y rebuild con estado propio |
| Zona de desinstalación | Card roja con el comando `docker compose down -v`, botón de limpiar logs y confirmación |

---

### 20.6 Estado de funcionalidades tras esta actualización

| Funcionalidad | Estado |
|---|---|
| Credenciales RC aparecen sin recargar la página | ✅ Inmediato tras crear la Application |
| Botón "Insertar en docker-compose.yml" con estado de confirmación | ✅ Copia bloque YAML + alerta verde |
| Botón "Reconstruir frontend" con copia de comandos | ✅ Copia comandos docker + alerta azul |
| Logs de actividad local limpiables desde la UI | ✅ Botón en zona de desinstalación (solo Admin Master) |
| Zona de desinstalación visible solo para Admin Master | ✅ Condicionado por `isMaster` |

---

## 21. Actualización — Restricción de acceso por tipo de cuenta en pantallas de login (8 de mayo de 2026)

**Motivo:** Las cinco pantallas de login usaban el mismo endpoint `POST /api/v1/auth/login` sin ninguna verificación del tipo de cuenta retornado. Cualquier usuario podía introducir sus credenciales en cualquier pantalla y obtener una sesión válida aunque el rol no correspondiera a esa entrada. Se implementó validación post-respuesta que rechaza la sesión antes de establecerla si el `account_type` o `is_master` devueltos por el servidor no coinciden con los requeridos por la pantalla.

---

### 21.1 Problema anterior

| Pantalla | Endpoint llamado | Verificación de tipo | Resultado incorrecto |
|---|---|---|---|
| Admin Master | `auth/login` | ❌ Ninguna | Un gerente o usuario podía iniciar sesión aquí |
| Admin Normal | `auth/login` | ❌ Ninguna | Un admin master o usuario podía iniciar sesión aquí |
| Gerente | `auth/login` | ❌ Ninguna | Un administrador o usuario podía iniciar sesión aquí |
| Usuario (Control Industrial) | `auth/login` | ❌ Ninguna | Un administrador o gerente podía iniciar sesión aquí |
| Usuario (Monitoreo Ambiental) | `auth/login` | ❌ Ninguna | Un administrador o gerente podía iniciar sesión aquí |

---

### 21.2 Descubrimiento tras actualizar el repositorio upstream

**El backend SÍ tiene endpoints separados por tipo de entidad.** Fueron añadidos en el upstream (`github.com/Coquita01/IOT-Server`) durante commits posteriores al estado local. Tras ejecutar `git fetch upstream` y `git merge upstream/main`, el backend se actualizó e incluye los siguientes endpoints en `app/shared/auth/controller.py`:

| Endpoint | Tipo de entidad | `expected_is_master` |
|---|---|---|
| `POST /api/v1/auth-rc/master/login` | `administrator` | `True` (solo Admin Master) |
| `POST /api/v1/auth-rc/admin/login` | `administrator` | `False` (solo Admin Normal) |
| `POST /api/v1/auth-rc/manager/login` | `manager` | — |
| `POST /api/v1/auth-rc/user/login` | `user` | — |
| `POST /api/v1/auth-rc/devices/login` | `device` | — |
| `POST /api/v1/auth-rc/applications/login` | `application` | — |

El endpoint antiguo `POST /api/v1/auth/login` fue **eliminado** del backend.

**Cómo funciona el enforcement en el backend:**  
`login_human_rc` llama a `repository.get_human_by_email(email, entity_type)` — busca la cuenta por email **y** por tipo de entidad en la tabla correspondiente. Si el email pertenece a un usuario pero se llama al endpoint `/auth-rc/manager/login`, la búsqueda devuelve `None` y el backend responde `"Invalid credentials"`. La restricción existe en la base de datos, no solo en la lógica de la aplicación.

---

### 21.3 Estrategia de seguridad (doble capa)

La restricción opera en **dos capas independientes**:

| Capa | Dónde | Qué hace |
|---|---|---|
| **Capa 1 — Backend** | `app/shared/auth/service.py → login_human_rc` | Busca por email + entity_type. Si no coincide → `"Invalid credentials"` |
| **Capa 2 — Frontend** | `authContext.tsx → mutationFn` | Valida `account_type` e `is_master` en la respuesta antes de establecer sesión |

La capa 2 es defensa en profundidad: aunque el backend ya rechaza el tipo incorrecto, el frontend también verifica que la sesión resultante sea del tipo esperado antes de crearla.

---

### 21.4 Cambios en el frontend

#### `authContext.tsx`

```typescript
// login() — nuevos parámetros opcionales:
login(email, password, endpoint?, requiredAccountType?, requiredIsMaster?)

// mutationFn — validación post-respuesta antes de retornar tokenData:
if (credentials.requiredAccountType && tokenData.account_type !== credentials.requiredAccountType) {
    throw new Error("Las credenciales no corresponden a este tipo de acceso.");
}
if (credentials.requiredIsMaster !== undefined && Boolean(tokenData.is_master) !== credentials.requiredIsMaster) {
    throw new Error("Las credenciales no corresponden a este tipo de acceso.");
}
```

#### `LoginBase.tsx`

```typescript
// LoginConfig — nuevas props:
requiredAccountType: string;
requiredIsMaster?: boolean;

// handleLogin pasa las props a login():
login(email.trim(), password, config.apiEndpoint, config.requiredAccountType, config.requiredIsMaster);
```

#### Configuración final de las 5 pantallas de login

| Pantalla | `apiEndpoint` | `requiredAccountType` | `requiredIsMaster` |
|---|---|---|---|
| `LoginAdminMaster` | `auth-rc/master/login` | `"administrator"` | `true` |
| `LoginAdminNormal` | `auth-rc/admin/login` | `"administrator"` | `false` |
| `LoginGerente` | `auth-rc/manager/login` | `"manager"` | — |
| `LoginUsuarioControlIndustrial` | `auth-rc/user/login` | `"user"` | — |
| `LoginUsuarioMonitoreoAmbiental` | `auth-rc/user/login` | `"user"` | — |

---

### 21.5 Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/auth/authContext.tsx` | `login()` con `requiredAccountType` / `requiredIsMaster`; validación post-respuesta |
| `src/components/LoginBase.tsx` | `LoginConfig` con `requiredAccountType` / `requiredIsMaster`; `handleLogin` los pasa a `login()` |
| `src/pages/login/LoginAdminMaster.tsx` | `apiEndpoint: "auth-rc/master/login"`; restricción de tipo y master |
| `src/pages/login/LoginAdminNormal.tsx` | `apiEndpoint: "auth-rc/admin/login"`; restricción de tipo, no master |
| `src/pages/login/LoginGerente.tsx` | `apiEndpoint: "auth-rc/manager/login"`; restricción de tipo manager |
| `src/pages/login/LoginUsuarioControlIndustrial.tsx` | `apiEndpoint: "auth-rc/user/login"`; restricción de tipo user |
| `src/pages/login/LoginUsuarioMonitoreoAmbiental.tsx` | `apiEndpoint: "auth-rc/user/login"`; restricción de tipo user |

**Backend (upstream merge):**
- `app/domain/auth/` eliminado (controller, schemas, service, security)
- `app/shared/auth/` creado (controller, service, schemas, security, auth_policy, repository)
- `app/main.py` actualizado: registra `change_password_logout_router`, `auth_rc_router`, `auth_xmss_router`


---

### 21.6 Estado de funcionalidades tras esta actualización

| Funcionalidad | Estado |
|---|---|
| Admin Master solo puede loguear en pantalla de Admin Master | ✅ Backend: endpoint `/auth-rc/master/login` filtra por entity_type + is_master |
| Admin Normal no puede loguear en pantalla de Admin Master | ✅ Backend: `/auth-rc/master/login` verifica `expected_is_master=True` |
| Gerente no puede loguear en pantalla de Admin | ✅ Backend: `/auth-rc/admin/login` filtra por entity_type `administrator` |
| Usuario no puede loguear en pantalla de Gerente | ✅ Backend: `/auth-rc/manager/login` filtra por entity_type `manager` |
| Administrador no puede loguear en pantalla de Usuario | ✅ Backend: `/auth-rc/user/login` filtra por entity_type `user` |
| Validación frontend adicional (defensa en profundidad) | ✅ `authContext` verifica `account_type` e `is_master` antes de crear sesión |
| Mensaje de error genérico (anti-enumeración de roles) | ✅ Siempre: "Las credenciales no corresponden a este tipo de acceso." |
| Sesión nunca establecida para tipo de cuenta incorrecto | ✅ `setSession()` no se llama si la validación frontend falla |

---

## 22. Actualización — Sincronización con upstream y corrección de endpoints de login (8 de mayo de 2026)

**Motivo:** El repositorio local tenía el backend desactualizado respecto al original (`github.com/Coquita01/IOT-Server`). Al momento de implementar la restricción de login por tipo de cuenta (sección 21) se asumió que el backend solo tenía un endpoint genérico `POST /auth/login`. Tras actualizar desde el upstream se confirmó que el backend **sí tiene endpoints separados por tipo de entidad**, añadidos en commits posteriores al estado local.

**Restricción:** No se realizaron ni se realizarán cambios en el backend. El trabajo se limitó a sincronizar el estado del repositorio con el upstream original y ajustar el frontend para usar los endpoints correctos.

---

### 22.1 Estado del repositorio antes de la actualización

- Remote `origin` → `https://github.com/GemmaDI300/IOT-Server.git` (fork local)
- Remote `upstream` → `https://github.com/Coquita01/IOT-Server.git` (ya configurado)
- Commits locales detrás del upstream: **más de 20 commits**, incluyendo PR #36, #38, #40, #41, #42, #43, #44, #45 ya mergeados en upstream

---

### 22.2 Commits integrados desde upstream

Principales cambios incluidos en el merge `git fetch upstream && git merge upstream/main`:

| PR / Commit | Descripción |
|---|---|
| `feat: add audit logging with Loguru + AuditLog table` | Nuevo sistema de logs de auditoría |
| `feat: add CORS middleware configuration` | Configuración CORS en `main.py` |
| `feat: implement granular RBAC with instance-level filtering via SQL views` | RBAC por instancia con vistas SQL |
| `feat: add payment entity and validation tests` | Nueva entidad `payment` |
| `feat: implement granular RBAC with instance-level filtering via SQL views` | Autorización Oso Polar mejorada |
| `Se agregó la funcionalidad de vincular roles a usuario` + rate limiting | Asignación de roles a usuarios + límite de peticiones |
| Eliminación de `app/domain/auth/` | Los archivos `controller.py`, `schemas.py`, `service.py`, `security.py` del dominio `auth` fueron eliminados |
| Creación de `app/shared/auth/` | Nuevo módulo compartido con `controller.py`, `service.py`, `schemas.py`, `security.py`, `auth_policy.py`, `repository.py` |

**Archivos de backend afectados (solo seguimiento):** `app/main.py`, `app/database/model.py`, `app/shared/auth/*`, `app/domain/user/*`, `app/domain/role/*`, `app/domain/manager/*`, `app/domain/payment/*`, `app/shared/authorization/*`, etc.

---

### 22.3 Endpoints de login descubiertos en el upstream

El nuevo módulo `app/shared/auth/controller.py` define routers con prefijo `/auth-rc` (autenticación RC) y `/auth-xmss` (autenticación XMSS post-cuántica), registrados en `main.py` bajo `/api/v1`:

**Auth RC — Entidades humanas:**

| Endpoint | Tipo de entidad | `expected_is_master` |
|---|---|---|
| `POST /api/v1/auth-rc/master/login` | `administrator` | `True` |
| `POST /api/v1/auth-rc/admin/login` | `administrator` | `False` |
| `POST /api/v1/auth-rc/manager/login` | `manager` | — |
| `POST /api/v1/auth-rc/user/login` | `user` | — |

**Auth RC — Entidades no humanas:**

| Endpoint | Tipo de entidad |
|---|---|
| `POST /api/v1/auth-rc/devices/login` | `device` |
| `POST /api/v1/auth-rc/applications/login` | `application` |

**Auth compartido (sin cambios de tipo):**

| Endpoint | Descripción |
|---|---|
| `PATCH /api/v1/auth/change-password` | Cambiar contraseña (requiere sesión) |
| `POST /api/v1/auth/logout` | Cerrar sesión / invalidar token |

El endpoint anterior `POST /api/v1/auth/login` fue **eliminado** del backend y no existe en la versión actualizada.

---

### 22.4 Cómo funciona el enforcement en el backend

`login_human_rc` en `app/shared/auth/service.py` llama a:

```python
resolved = self.repository.get_human_by_email(
    email=payload.email,
    entity_type=payload.entity_type,  # filtra por tipo en la tabla correspondiente
)
if resolved is None:
    raise BadRequestException("Invalid credentials")
```

Si el email pertenece a un `user` pero se llama a `/auth-rc/manager/login` (donde `entity_type = "manager"`), la búsqueda retorna `None` y el backend responde con `400 "Invalid credentials"`. La restricción existe a nivel de base de datos.

Para Admin Master vs Admin Normal, el backend adicionalmente llama a `_validate_expected_admin_scope` con `expected_is_master=True` o `False` según el endpoint.

---

### 22.5 Ajustes en el frontend (únicos cambios realizados)

Solo se modificaron los valores de `apiEndpoint` en las 5 páginas de login para apuntar al endpoint correcto por tipo de entidad:

| Archivo | `apiEndpoint` antes | `apiEndpoint` después |
|---|---|---|
| `LoginAdminMaster.tsx` | `"auth/login"` | `"auth-rc/master/login"` |
| `LoginAdminNormal.tsx` | `"auth/login"` | `"auth-rc/admin/login"` |
| `LoginGerente.tsx` | `"auth/login"` | `"auth-rc/manager/login"` |
| `LoginUsuarioControlIndustrial.tsx` | `"auth/login"` | `"auth-rc/user/login"` |
| `LoginUsuarioMonitoreoAmbiental.tsx` | `"auth/login"` | `"auth-rc/user/login"` |

La validación adicional de `requiredAccountType` / `requiredIsMaster` en `authContext.tsx` y `LoginBase.tsx` (implementada en la sección 21) se mantiene como **defensa en profundidad** del lado del cliente, independientemente del enforcement del backend.

---

### 22.6 Estado final de la restricción de login

| Escenario | Capa que rechaza | Resultado |
|---|---|---|
| Gerente intenta loguear en pantalla de Admin Master | **Backend** — `/auth-rc/master/login` no encuentra cuenta con entity_type `administrator` para ese email | `400 Invalid credentials` |
| Admin Normal intenta loguear en pantalla de Admin Master | **Backend** — `_validate_expected_admin_scope(expected_is_master=True)` falla | `400` o error de scope |
| Cualquier tipo incorrecto (respuesta inesperada) | **Frontend** — `authContext` verifica `account_type` antes de crear sesión | Sesión rechazada, error mostrado en UI |

---

## 23. Actualización — Habilitación de HTTPS con certificado autofirmado (8 de mayo de 2026)

**Motivo:** Las credenciales de login (email y contraseña) viajaban en texto plano. Al inspeccionar las peticiones en DevTools → Network o con una herramienta de captura de tráfico (Wireshark, mitmproxy), el body de los requests `POST /api/v1/auth-rc/*/login` era completamente legible. Nginx servía en HTTP puro (`listen 3000`) sin ningún cifrado de transporte.

Se analizaron los módulos criptográficos del backend antes de implementar esta solución:

---

### 23.1 Análisis previo del backend

| Módulo | Descripción | ¿Resuelve el problema de texto plano? |
|---|---|---|
| `app/shared/middleware/cryptography.py` — `DecryptionMiddleware` | Cifra/descifra cuerpos con AES-256-CBC. El body debe llegar como `{"pl": "iv:ciphertext"}` | ❌ No registrado en `main.py`. Excluye rutas `/login/`. Clave hardcodeada (`"me_tienes_que_cambiar_2026"`) expuesta en el JS del frontend |
| `app/shared/middleware/auth/auth_manager/manager.py` — `AuthManager` | Genera `key_session` por sesión (32 bytes aleatorios) y la devuelve al cliente | ❌ Solo para devices/applications. No conectado a los endpoints humanos |
| `app/shared/middleware/auth/auth_rc/puzzle.py` — `PuzzleVerifier` | Verifica reto criptográfico AES-256-CBC + HMAC-SHA256 | ❌ Solo verifica autenticidad del cliente, no cifra credenciales de login |
| HTTPS/TLS | Cifrado de transporte a nivel de red | ✅ Única solución que protege realmente las credenciales en tránsito |

**Conclusión:** Activar `DecryptionMiddleware` requeriría cambios en el backend (`main.py`) y la clave de cifrado estaría embebida en el bundle JS (visible en DevTools → Sources), lo que no aporta seguridad real. La solución correcta es TLS.

---

### 23.2 Solución implementada: HTTPS con certificado autofirmado

El certificado se genera en **tiempo de build del contenedor Docker**, sin requerir archivos externos ni secrets adicionales. Para un entorno de desarrollo/lab esto es suficiente; en producción se reemplazaría por un certificado de una CA reconocida (Let's Encrypt, etc.).

**Algoritmo del certificado:**
- RSA 2048 bits
- SHA-256
- Validez: 825 días (límite de Chrome para self-signed)
- `subjectAltName`: `DNS:localhost, IP:127.0.0.1` — requerido por Chrome y Firefox para no mostrar error de nombre

---

### 23.3 Archivos modificados

#### `frontend/Dockerfile` y `frontend/Dockerfile.test`

Se añade una etapa de generación de certificado en la segunda fase (imagen nginx):

```dockerfile
FROM nginx:1.25-alpine
# Generar certificado autofirmado para desarrollo (TLS en localhost)
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
           -keyout /etc/nginx/certs/server.key \
           -out    /etc/nginx/certs/server.crt \
           -subj "/C=MX/ST=Dev/L=Dev/O=IoT-Dev/CN=localhost" \
           -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
    && chmod 600 /etc/nginx/certs/server.key
```

La clave privada se genera dentro del contenedor en cada build — nunca se almacena en el repositorio.

---

#### `frontend/nginx.conf` y `frontend/nginx.docker.conf`

Cambios en la directiva `server`:

```nginx
# Antes:
listen 3000;

# Después:
listen 3000 ssl;
ssl_certificate     /etc/nginx/certs/server.crt;
ssl_certificate_key /etc/nginx/certs/server.key;
ssl_protocols       TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers  ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:
             ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_session_cache   shared:SSL:10m;
ssl_session_timeout 10m;
```

Solo TLS 1.2 y 1.3 habilitados. Los ciphers seleccionados corresponden a los suites recomendados por OWASP TLS Cheat Sheet (Forward Secrecy via ECDHE).

**`nginx.conf` también recibió:**
- Bloque `location /api/` con `proxy_pass http://backend:8000/api/` — antes solo existía en `nginx.docker.conf`
- CSP actualizada: se eliminó `http://localhost:8000` de `connect-src`. Ahora es solo `'self'` porque todas las peticiones al backend pasan por el proxy nginx, sin requests directas del navegador al puerto 8000

---

#### `frontend/docker-compose.yml`

```yaml
# Antes:
VITE_API_BASE_URL: http://localhost:8000/api/v1/

# Después:
VITE_API_BASE_URL: /api/v1/   # URL relativa — nginx hace el proxy
extra_hosts:
  - "backend:host-gateway"    # Permite que nginx resuelva 'backend' como la IP del host
```

El cambio a URL relativa elimina el problema de **mixed content**: el navegador cargaba la página por HTTPS pero hacía las peticiones al backend por HTTP. Con el proxy nginx, el navegador solo ve peticiones HTTPS a `'self'` (mismo origen).

---

### 23.4 Flujo de tráfico antes y después

**Antes:**
```
Navegador  ──HTTP──►  nginx:3000  (texto plano)
Navegador  ──HTTP──►  backend:8000/api/  (texto plano, mixed content)
```

**Después:**
```
Navegador  ──HTTPS──►  nginx:3000  (cifrado TLS)
nginx      ──HTTP──►   backend:8000/api/  (red interna Docker, no expuesta al exterior)
```

El tramo nginx → backend es HTTP pero ocurre dentro de la red Docker, inaccesible desde el exterior. El único tramo expuesto (navegador ↔ nginx) está cifrado.

---

### 23.5 Instrucciones de uso

```bash
# Reconstruir y levantar (obligatorio tras cambios en Dockerfile/nginx.conf)
docker compose up --build

# Acceder en el navegador:
https://localhost:3000
```

Al acceder por primera vez el navegador muestra advertencia de certificado autofirmado:
- **Chrome/Edge:** "Tu conexión no es privada" → "Avanzado" → "Continuar a localhost (no seguro)"
- **Firefox:** "Advertencia: Riesgo de seguridad potencial" → "Avanzado" → "Aceptar el riesgo y continuar"

Una vez aceptado, todas las peticiones (incluyendo login) viajan cifradas por TLS — las credenciales no son visibles en texto plano en DevTools → Network ni en capturas de red.

---

### 23.6 Limitaciones

| Limitación | Descripción |
|---|---|
| Certificado autofirmado | El navegador muestra advertencia. No válido para producción — requiere certificado de CA reconocida |
| Clave generada en build | Se regenera en cada `docker build`. No persistente entre builds (no es problema en desarrollo) |
| Tramo nginx→backend en HTTP | Aceptable en red Docker interna. En producción con servicios en hosts separados se requeriría TLS también en el backend |

---

## 24. Actualización — Auto-inyección de administrador en crear servicio y paneles de vinculación (8 de mayo de 2026)

**Motivo:** Se detectaron dos problemas funcionales pendientes:

1. Al crear un servicio, el formulario mostraba un campo `administrator_id` que el usuario tenía que rellenar manualmente. Esto es incorrecto: el administrador que está creando el servicio _es_ el administrador responsable; el ID debe tomarse automáticamente de la sesión.
2. El backend expone endpoints completos de vinculación (Gerente↔Servicio, Dispositivo↔Servicio, Rol↔Usuario) pero ninguna pantalla del frontend los consumía. No había forma de asignar o quitar estas relaciones desde la interfaz.

---

### 24.1 Fix — `administrator_id` oculto y auto-inyectado en crear servicio

**Archivos modificados:** `src/pages/Servicios.tsx`, `src/shared/api/types.ts`

El campo `administrator_id` ya existía en el `fieldsConfig` como un `select` con opciones de administradores disponibles. Se cambió a `hidden: true` para que el componente `EditarDialog` lo omita visualmente:

```typescript
// Antes — el usuario tenía que escoger un administrador
fieldsConfig = {
    administrator_id: {
        type: "select",
        options: adminOptions,
        helperText: "Selecciona el administrador responsable del servicio",
    },
    ...
}

// Después — campo oculto, valor inyectado desde la sesión
fieldsConfig = {
    administrator_id: {
        hidden: true,   // EditarDialog no renderiza este campo
    },
    ...
}
```

El valor se sigue enviando al backend mediante `defaultValues`:

```typescript
defaultValues={{ administrator_id: session?.accountId } as Partial<ServiceResponse>}
```

`EditarDialog` incluye los campos de `defaultValues` en el payload POST aunque sean `hidden`, por lo que el backend recibe el UUID correcto sin que el usuario pueda modificarlo.

Se eliminaron adicionalmente las variables `adminOptions` y `devicesData` que quedaron sin uso.

---

### 24.2 Nuevo componente reutilizable — `LinkPanel`

**Archivo:** `src/components/LinkPanel.tsx` (nuevo)

Componente genérico para gestionar cualquier relación de vinculación (join-table) entre dos entidades. Parámetros principales:

| Prop | Tipo | Descripción |
|---|---|---|
| `title` | `string` | Encabezado del panel, e.g. "Gerentes asignados" |
| `session` | `SessionCredentials` | Sesión activa para cabeceras de autenticación |
| `listEndpoint` | `string` | GET que devuelve los vínculos actuales como array |
| `linkedIdField` | `string` | Campo del vínculo que contiene el ID del objeto vinculado |
| `addMode` | `"path" \| "body"` | Cómo se envía el ID: en la URL o en el body JSON |
| `addEndpoint` | `string` | URL base para el POST de asignación |
| `addBodyKey` | `string?` | Clave del body cuando `addMode = "body"` |
| `removeEndpoint` | `string` | URL base para el DELETE de desvinculación |
| `allItemsEndpoint` | `string` | GET de todos los elementos disponibles (PageResponse) |
| `getItemLabel` | `(item) => string` | Función para mostrar el nombre legible de cada opción |

**Comportamiento:**

- Carga los vínculos actuales con `useGetQuery` y los muestra como `Chip` con botón de eliminar (🔗off)
- Carga todos los ítems disponibles y filtra los ya vinculados del autocomplete
- Al hacer clic en "Vincular" ejecuta el POST correspondiente
- Al hacer clic en el icono de un chip ejecuta el DELETE correspondiente
- Invalida automáticamente la query de la lista tras cada operación via `useQueryClient`
- Incluye validación de UUID antes de construir la URL (`isValidId`) para prevenir inyección de path

```tsx
<LinkPanel
    title="Gerentes asignados"
    session={session!}
    listEndpoint={`services/${row.id}/managers`}
    linkedIdField="manager_id"
    addMode="path"                              // POST services/{sid}/managers/{mid}
    addEndpoint={`services/${row.id}/managers`}
    removeEndpoint={`services/${row.id}/managers`}
    allItemsEndpoint="managers/?limit=500"
    getItemLabel={(item) => `${item.first_name} ${item.last_name}`}
/>
```

---

### 24.3 Extensión de `Gestion.tsx` — prop `renderLinkPanel`

**Archivo modificado:** `src/components/Gestion.tsx`

Se añadió la prop opcional `renderLinkPanel`:

```typescript
interface GestionProps<T extends GenericDataWithId> {
    // ...props existentes...
    /** Cuando se provee, muestra un botón "Vínculos" que abre un Dialog con este contenido. */
    renderLinkPanel?: (row: T) => React.ReactNode;
}
```

**Cambios en la columna de acciones:**
- Si `renderLinkPanel` está definido, se añade un botón "Vínculos" (`LinkIcon`) antes de los botones existentes
- El ancho de la columna se amplía en 110 px automáticamente
- Al pulsar el botón se guarda la fila en el estado `linkRow`

**Nuevo diálogo:**
```tsx
{renderLinkPanel && linkRow && (
    <Dialog open={!!linkRow} onClose={() => setLinkRow(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Vínculos — {resolveEntityName(linkRow)}</DialogTitle>
        <DialogContent dividers>
            {renderLinkPanel(linkRow)}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setLinkRow(null)}>Cerrar</Button>
        </DialogActions>
    </Dialog>
)}
```

---

### 24.4 Paneles implementados por pantalla

#### Servicios (`src/pages/Servicios.tsx`)

Cada fila de la tabla muestra el botón "Vínculos". Al pulsarlo se abre un diálogo con dos paneles:

**Panel 1 — Gerentes asignados**
- Lista: `GET /api/v1/services/{id}/managers` → array de `{ manager_id, service_id, ... }`
- Asignar: `POST /api/v1/services/{id}/managers/{manager_id}` (sin body)
- Quitar: `DELETE /api/v1/services/{id}/managers/{manager_id}`
- Pool de opciones: `GET /api/v1/managers/?limit=500`

**Panel 2 — Dispositivos asignados**
- Lista: `GET /api/v1/services/{id}/devices` → array de `{ device_id, service_id, ... }`
- Asignar: `POST /api/v1/services/{id}/devices/{device_id}` (sin body)
- Quitar: `DELETE /api/v1/services/{id}/devices/{device_id}`
- Pool de opciones: `GET /api/v1/devices/?limit=500`

#### Roles (`src/pages/Roles.tsx`)

**Panel — Usuarios asignados a este rol**
- Lista: `GET /api/v1/roles/{id}/users` → array de `{ user_id, role_id, ... }`
- Asignar: `POST /api/v1/roles/{id}/users` con body `{ "user_id": "..." }` (addMode = "body")
- Quitar: `DELETE /api/v1/roles/{id}/users/{user_id}`
- Pool de opciones: `GET /api/v1/users/?limit=500`

---

### 24.5 Tipos añadidos a `types.ts`

```typescript
export interface ManagerServiceResponse {
    id: string;
    manager_id: string;
    service_id: string;
    created_at: string;
    updated_at: string;
}

export interface DeviceServiceResponse {
    id: string;
    device_id: string;
    service_id: string;
    created_at: string;
    updated_at: string;
}

export interface UserRoleResponse {
    id: string;
    user_id: string;
    role_id: string;
    created_at: string;
    updated_at: string;
}
```

---

### 24.6 Relación Servicio↔Usuario

No existe un endpoint directo para vincular usuarios a servicios. La relación se gestiona a través de roles: cada `Role` pertenece a un `service_id` y los usuarios se asignan a roles. El panel Roles↔Usuario (§24.4) cubre esta necesidad indirectamente.

---

### 24.7 Resumen de archivos modificados / creados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/shared/api/types.ts` | Modificado | Añadidos `ManagerServiceResponse`, `DeviceServiceResponse`, `UserRoleResponse` |
| `src/components/LinkPanel.tsx` | **Nuevo** | Componente genérico de paneles de vinculación |
| `src/components/Gestion.tsx` | Modificado | Nueva prop `renderLinkPanel`, botón "Vínculos" y diálogo asociado |
| `src/pages/Servicios.tsx` | Modificado | `administrator_id` oculto + auto-inyectado; paneles Gerente y Dispositivo |
| `src/pages/Roles.tsx` | Modificado | Panel de vinculación Usuario↔Rol |

---

## 25. Pruebas de funcionalidad de la API — inventario de operaciones (9 de mayo de 2026)

### 25.1 Contexto

Se realizaron pruebas funcionales completas contra el backend IOT-Server (FastAPI + SQLite) corriendo en Docker (`http://localhost:8000/api/v1`). El objetivo fue verificar todas las operaciones CRUD y de vinculación expuestas por la API, y documentar el inventario completo de endpoints con sus códigos HTTP de respuesta esperados.

Las pruebas se ejecutaron como script Python dentro del contenedor `iot-backend` usando `docker exec -i iot-backend python3`. Se utilizó la librería estándar `urllib.request` (sin dependencias externas) para hacer las peticiones HTTP.

---

### 25.2 Correcciones al backend (artefactos del merge)

Antes de poder ejecutar las pruebas, fue necesario corregir 9 defectos introducidos por el merge upstream en el backend. Estos defectos impedían el arranque completo del servidor:

| # | Archivo | Problema | Corrección |
|---|---|---|---|
| 1 | `app/database/model.py` | Bloque huérfano dentro de la clase `Role` con referencia a `Role` antes de estar definida → `NameError` | Eliminado el bloque (pertenecía a clase `RolePermission` cuyo encabezado se perdió en el merge) |
| 2 | `app/database/model.py` | Clase `AuditLog` referenciada en `app/domain/audit/repository.py` pero no existía en el modelo | Añadida clase `AuditLog` al final del archivo |
| 3 | `app/config.py` | `SessionRepository.store_session()` usaba `settings.SESSION_TTL_SECONDS` pero el campo no existía en `Settings` | Añadido `SESSION_TTL_SECONDS: int = 3600` |
| 4 | `app/shared/rate_limit.py` | `app/shared/auth/controller.py` y `app/shared/base_domain/controller.py` importaban `enforce_request_rate_limit` pero la función no existía | Implementada usando `SessionRepository` de Valkey |
| 5 | `pyproject.toml` | `from loguru import logger` en múltiples módulos pero `loguru` no estaba en dependencias | Añadido `"loguru>=0.7.0"` |
| 6 | `app/main.py` | `lifespan` llamaba a `init_logging()` sin importar `init_logging` | Añadido `from app.shared.logging import init_logging` |
| 7 | `app/main.py` | `app.add_middleware(Human)` duplicado | Eliminado el duplicado |
| 8 | `app/main.py` | `app.include_router(role_router, ...)` duplicado | Eliminado el duplicado |
| 9 | `app/shared/authorization/oso_config.py` | `oso.register_class(Role)` llamado dos veces → `DuplicateClassAliasError` en todos los endpoints protegidos → HTTP 500 | Eliminado el import y registro duplicado de `Role` |

Adicionalmente, fue necesario resetear el esquema SQLite (volumen Docker `iot-server_sqlite_data`) para que refleja la nueva columna `xmss_public_root` añadida en el merge.

---

### 25.3 Reglas de negocio descubiertas durante las pruebas

| Regla | Detalle |
|---|---|
| **Paginación** | Respuesta `GET /list` tiene estructura `{total, offset, limit, data: []}` (clave `data`, no `items`) |
| **DELETE → 204** | Todas las operaciones de borrado retornan HTTP 204 No Content (cuerpo vacío) |
| **Rate limiting** | Máximo 3 peticiones por segundo por endpoint (respaldado por Valkey). Exceder devuelve 429 con cabecera `Retry-After` |
| **CURP obligatoria** | Formato CURP mexicano de 18 caracteres con dígito verificador. Posiciones 14-16 deben ser consonantes. Código de estado debe ser uno de los 32 estados válidos de México |
| **RFC obligatorio** | Formato RFC mexicano: 4 letras (persona física) ó 3 letras (persona moral) + 6 dígitos (fecha) + 3 alfanuméricos |
| **PersonalData extra="forbid"** | No se permiten campos extra en el body de administradores/gerentes/usuarios (422 si se envía campo desconocido como `is_master`) |
| **Nombre de rol** | Solo letras (sin dígitos, espacios ni símbolos). Validado con `isalpha()` |
| **Application — campos requeridos** | `name`, `version`, `url`, `description` son NOT NULL en el modelo aunque el schema los marca como opcionales — deben enviarse siempre |
| **CURP/RFC únicos** | Restricción UNIQUE en base de datos. Cada persona debe tener CURP y RFC distintos entre sí |

---

### 25.4 Inventario de endpoints CRUD

| Método | Endpoint | Descripción | HTTP esperado |
|---|---|---|---|
| `POST` | `/auth-rc/master/login` | Login administrador master | 200 |
| `POST` | `/auth-rc/admin/login` | Login administrador no-master | 200 |
| `POST` | `/auth-rc/manager/login` | Login gerente | 200 |
| `POST` | `/auth-rc/user/login` | Login usuario final | 200 |
| `POST` | `/auth/logout` | Cierre de sesión (invalida token en Valkey) | 200 |
| `PATCH` | `/auth/change-password` | Cambio de contraseña autenticado | 200 |
| **Administradores** | | | |
| `GET` | `/administrators/` | Listar administradores (paginado) | 200 |
| `POST` | `/administrators/` | Crear administrador | 201 |
| `GET` | `/administrators/{id}` | Obtener administrador por ID | 200 |
| `PATCH` | `/administrators/{id}` | Actualizar administrador | 200 |
| `DELETE` | `/administrators/{id}` | Eliminar administrador | 204 |
| **Gerentes** | | | |
| `GET` | `/managers/` | Listar gerentes (paginado) | 200 |
| `POST` | `/managers/` | Crear gerente | 201 |
| `GET` | `/managers/{id}` | Obtener gerente por ID | 200 |
| `PATCH` | `/managers/{id}` | Actualizar gerente | 200 |
| `DELETE` | `/managers/{id}` | Eliminar gerente | 204 |
| **Usuarios** | | | |
| `GET` | `/users/` | Listar usuarios (paginado) | 200 |
| `POST` | `/users/` | Crear usuario | 201 |
| `GET` | `/users/{id}` | Obtener usuario por ID | 200 |
| `PATCH` | `/users/{id}` | Actualizar usuario | 200 |
| `DELETE` | `/users/{id}` | Eliminar usuario | 204 |
| **Dispositivos** | | | |
| `GET` | `/devices/` | Listar dispositivos (paginado) | 200 |
| `POST` | `/devices/` | Crear dispositivo | 201 |
| `GET` | `/devices/{id}` | Obtener dispositivo por ID | 200 |
| `PATCH` | `/devices/{id}` | Actualizar dispositivo | 200 |
| `DELETE` | `/devices/{id}` | Eliminar dispositivo | 204 |
| **Aplicaciones** | | | |
| `GET` | `/applications/` | Listar aplicaciones (paginado) | 200 |
| `POST` | `/applications/` | Crear aplicación | 201 |
| `GET` | `/applications/{id}` | Obtener aplicación por ID | 200 |
| `PATCH` | `/applications/{id}` | Actualizar aplicación | 200 |
| `DELETE` | `/applications/{id}` | Eliminar aplicación | 204 |
| **Servicios** | | | |
| `GET` | `/services/` | Listar servicios (paginado) | 200 |
| `POST` | `/services/` | Crear servicio | 201 |
| `GET` | `/services/{id}` | Obtener servicio por ID | 200 |
| `PATCH` | `/services/{id}` | Actualizar servicio | 200 |
| `DELETE` | `/services/{id}` | Eliminar servicio | 204 |
| **Roles** | | | |
| `GET` | `/roles/` | Listar roles (paginado) | 200 |
| `POST` | `/roles/` | Crear rol (requiere `service_id`) | 201 |
| `GET` | `/roles/{id}` | Obtener rol por ID | 200 |
| `PATCH` | `/roles/{id}` | Actualizar rol | 200 |
| `DELETE` | `/roles/{id}` | Eliminar rol | 204 |

---

### 25.5 Inventario de endpoints de vinculación (join tables)

| Método | Endpoint | Descripción | HTTP esperado |
|---|---|---|---|
| **Servicio ↔ Gerente** | | | |
| `POST` | `/services/{sid}/managers/{mid}` | Vincular gerente a servicio | 201 |
| `GET` | `/services/{sid}/managers` | Listar gerentes de un servicio | 200 |
| `DELETE` | `/services/{sid}/managers/{mid}` | Desvincular gerente de servicio | 204 |
| **Servicio ↔ Dispositivo** | | | |
| `POST` | `/services/{sid}/devices/{did}` | Vincular dispositivo a servicio | 201 |
| `GET` | `/services/{sid}/devices` | Listar dispositivos de un servicio | 200 |
| `DELETE` | `/services/{sid}/devices/{did}` | Desvincular dispositivo de servicio | 204 |
| **Servicio ↔ Aplicación** | | | |
| `POST` | `/services/{sid}/applications/{aid}` | Vincular aplicación a servicio | 201 |
| `GET` | `/services/{sid}/applications` | Listar aplicaciones de un servicio | 200 |
| `DELETE` | `/services/{sid}/applications/{aid}` | Desvincular aplicación de servicio | 204 |
| **Rol ↔ Usuario** | | | |
| `POST` | `/roles/{rid}/users` | Vincular usuario a rol (body: `{user_id}`) | 201 |
| `GET` | `/roles/{rid}/users` | Listar usuarios de un rol | 200 |
| `DELETE` | `/roles/{rid}/users/{uid}` | Desvincular usuario de rol | 204 |

---

### 25.6 Resultado final de las pruebas

**49/49 pruebas PASS** en una sola ejecución limpia, cubriendo:

- 1 login + 1 logout
- 5 entidades × 5 operaciones CRUD = 25 pruebas CRUD
- 4 relaciones × 3 operaciones (vincular / listar / desvincular) = 12 pruebas de vinculación  
- 7 operaciones de borrado (cleanup)
- 4 operaciones de listado + obtención por ID extras

**Comando de ejecución:**
```bash
# Script Python ejecutado dentro del contenedor
docker exec -i iot-backend python3 << 'EOF'
# Script usa urllib.request estándar, genera TAG aleatorio de consonantes
# para CURP únicos y agrega delay=1.1s entre peticiones para respetar rate limit
EOF
```

**Schemas de creación (resumen):**

```python
# PersonalData (administradores, gerentes, usuarios)
{
  "email": "...", "password": "...",
  "first_name": "...", "last_name": "...", "second_last_name": "...",
  "phone": "5550000001",          # 10-15 dígitos
  "address": "Calle 123",
  "city": "CDMX", "state": "DF", "postal_code": "06600",
  "birth_date": "1980-01-01T00:00:00",
  "curp": "TAAS800101HDFBJX03",   # 18 chars, dígito verificador
  "rfc": "TAAS800101JXA"          # 13 chars RFC mexicano
}

# Dispositivo
{"name": "Sensor-01", "brand": "Acme", "serial_number": "SN-001", "ip": "192.168.1.10"}

# Aplicación (todos los campos requeridos en la BD)
{"name": "MiApp", "version": "1.0", "url": "https://...", "description": "...", "administrator_id": "<UUID>"}

# Servicio
{"name": "MiServicio", "description": "...", "administrator_id": "<UUID>"}

# Rol
{"name": "tester", "service_id": "<UUID>"}   # nombre: solo letras
```

---

### 25.7 Flujo recomendado para creación de entidades

El orden correcto para crear entidades sin conflictos de dependencias es:

```
1. Login (obtener token)
2. Crear Administrador
3. Crear Gerente, Usuario, Dispositivo (sin dependencias)
4. Crear Aplicación (requiere administrator_id)
5. Crear Servicio (requiere administrator_id)
6. Crear Rol (requiere service_id)
7. Vincular: Servicio↔Gerente, Servicio↔Dispositivo, Servicio↔Aplicación, Rol↔Usuario
8. Eliminar en orden inverso: Rol → Servicio → Aplicación → Dispositivo → Usuario → Gerente → Administrador
```

---

### 25.8 Archivos del backend corregidos en esta sesión

| Archivo | Cambio |
|---|---|
| `app/database/model.py` | Eliminado bloque huérfano en `Role`; añadida clase `AuditLog` |
| `app/config.py` | Añadido `SESSION_TTL_SECONDS: int = 3600` |
| `app/shared/rate_limit.py` | Implementadas `build_rate_limit_key`, `_get_rate_limit_repository`, `enforce_request_rate_limit` |
| `app/main.py` | Añadido import `init_logging`; eliminados middleware y router duplicados |
| `app/shared/authorization/oso_config.py` | Eliminado `import Role` y `oso.register_class(Role)` duplicados |
| `pyproject.toml` | Añadida dependencia `loguru>=0.7.0` |

---

## 26. Actualización del frontend — integración completa con todas las funcionalidades del backend (9 de mayo de 2026)

### 26.1 Objetivo

Alinear el frontend con la totalidad de funcionalidades que el backend expone: operaciones CRUD verificadas, relaciones de vinculación entre entidades, y validaciones coherentes con los schemas de Pydantic del servidor.

---

### 26.2 Análisis de estado previo

Antes de esta sesión, el frontend tenía los siguientes desvíos respecto al backend:

| Archivo | Problema identificado |
|---|---|
| `validation.ts` — `generateDeviceSchema` | `model` y `mac` marcados como **requeridos** al crear; el backend los define como `str \| None = None` (opcionales) |
| `Servicios.tsx` | Sólo tenía paneles de vinculación para **Gerentes** y **Dispositivos**; faltaba el panel de **Aplicaciones** (`services/{id}/applications`) |
| `Aplicaciones.tsx` | `administrator_id` estaba en `defaultValues` pero no en `fieldsConfig` como `hidden: true`, por lo que el campo era visible en el formulario de creación |
| `Gerentes.tsx` | Faltaban las props `showDetail={true}` y `entityTypeLabel` presentes en todos los demás módulos de personal |

---

### 26.3 Cambios realizados

#### `frontend/src/shared/api/schemas/validation.ts`

Se corrigió `generateDeviceSchema`: los campos `model` y `mac` pasaron de requeridos (cuando `isRequired=true`) a siempre opcionales, reflejando el schema del backend:

```python
# Backend: app/domain/device/schemas.py
class DeviceCreate(BaseModel):
    name: str
    brand: str | None = None
    model: str | None = None      # opcional
    serial_number: str | None = None
    ip: str | None = None
    mac: str | None = None        # opcional
```

Antes:
```typescript
model: Yup.string().max(100).when([], {
    is: () => isRequired,
    then: (s) => s.required("Campo obligatorio"),
}),
```

Después:
```typescript
model: Yup.string().max(100, "Máximo 100 caracteres").optional(),
```

Idéntico cambio para `mac`.

---

#### `frontend/src/pages/Servicios.tsx`

Se añadió el tercer `LinkPanel` dentro de `renderLinkPanel` para vincular **Aplicaciones** a un Servicio:

```tsx
<LinkPanel
    title="Aplicaciones asignadas"
    session={session!}
    listEndpoint={`services/${row.id}/applications`}
    linkedIdField="application_id"
    addMode="path"
    addEndpoint={`services/${row.id}/applications`}
    removeEndpoint={`services/${row.id}/applications`}
    allItemsEndpoint="applications/?limit=500"
    getItemLabel={(item) => `${item.name ?? ""}`.trim()}
/>
```

Los endpoints utilizados están verificados en la suite de 49 pruebas:
- `POST /services/{sid}/applications/{aid}` → 201
- `GET /services/{sid}/applications` → 200 (array de `ApplicationServiceResponse`)
- `DELETE /services/{sid}/applications/{aid}` → 204

---

#### `frontend/src/pages/Aplicaciones.tsx`

Se añadió `fieldsConfig` para ocultar el campo `administrator_id` del formulario. El campo sigue siendo enviado al backend a través de `defaultValues`:

```tsx
<Gestion<ApplicationResponse>
    ...
    defaultValues={{ administrator_id: session?.accountId } as Partial<ApplicationResponse>}
    fieldsConfig={{ administrator_id: { hidden: true } }}
    ...
/>
```

Esto es consistente con el patrón ya aplicado en `Servicios.tsx`.

---

#### `frontend/src/pages/Gerentes.tsx`

Se añadieron `showDetail={true}` y `entityTypeLabel="Gerente"` para que el módulo tenga las mismas capacidades de detalle que `Administradores.tsx` y `Usuarios.tsx`:

```tsx
<Gestion<PersonalDataResponse>
    ...
    getEntityName={(row) => `${row.first_name} ${row.last_name}`}
    showDetail={true}
    entityTypeLabel="Gerente"
/>
```

---

### 26.4 Verificación

Todos los archivos modificados fueron validados con el compilador TypeScript de VS Code — **sin errores**.

| Archivo | Estado |
|---|---|
| `validation.ts` | ✅ Sin errores |
| `Servicios.tsx` | ✅ Sin errores |
| `Aplicaciones.tsx` | ✅ Sin errores |
| `Gerentes.tsx` | ✅ Sin errores |

---

### 26.5 Estado final de vinculaciones del frontend

| Relación | Panel ubicado en | Endpoint principal | Estado |
|---|---|---|---|
| Servicio ↔ Gerente | `Servicios.tsx` | `services/{id}/managers` | ✅ Implementado |
| Servicio ↔ Dispositivo | `Servicios.tsx` | `services/{id}/devices` | ✅ Implementado |
| Servicio ↔ Aplicación | `Servicios.tsx` | `services/{id}/applications` | ✅ **Añadido esta sesión** |
| Rol ↔ Usuario | `Roles.tsx` | `roles/{id}/users` | ✅ Implementado |

---

### 26.6 Estado final de módulos CRUD

| Módulo | CRUD | Campo oculto auto-inyectado | Detalle | Vinculaciones |
|---|---|---|---|---|
| Administradores | ✅ | — | ✅ | — |
| Gerentes | ✅ | — | ✅ **actualizado** | — |
| Usuarios | ✅ | — | ✅ | — |
| Dispositivos | ✅ | — | ✅ | — |
| Aplicaciones | ✅ | `administrator_id` ✅ **corregido** | — | — |
| Servicios | ✅ | `administrator_id` | — | Gerentes, Dispositivos, Aplicaciones ✅ |
| Roles | ✅ | — | — | Usuarios ✅ |


