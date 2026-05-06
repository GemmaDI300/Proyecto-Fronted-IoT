# Reporte Completo del Frontend — IoT Platform

**Fecha:** 28 de abril de 2026  
**Proyecto:** IoT Server — Frontend React (TypeScript)  
**Ruta raíz:** `frontend/src/`  
**Stack:** React 18 · TypeScript 5 · Vite 5 · MUI 6 · React Query 5 · React Router 6 · Formik/Yup

---

## Índice

1. [Estructura General](#1-estructura-general)
2. [Archivos de Configuración](#2-archivos-de-configuración)
3. [Punto de Entrada — `main.tsx`](#3-punto-de-entrada--maintsx)
4. [Capa Compartida (`shared/`)](#4-capa-compartida-shared)
5. [Componentes Reutilizables (`components/`)](#5-componentes-reutilizables-components)
6. [Páginas (`pages/`)](#6-páginas-pages)
7. [Tests (`__tests__/`)](#7-tests-__tests__)
8. [Endpoints Consumidos](#8-endpoints-consumidos)
9. [Características de Seguridad](#9-características-de-seguridad)
10. [Diagrama de Flujo de Procesos](#10-diagrama-de-flujo-de-procesos)
11. [Matriz de Permisos por Rol](#11-matriz-de-permisos-por-rol)

---

## 1. Estructura General

```
frontend/src/
├── main.tsx                    ← Punto de entrada de la aplicación
├── vite-env.d.ts               ← Declaraciones de tipos de Vite
├── pages/                      ← Páginas/vistas completas
│   ├── Dashboard.tsx
│   ├── Usuarios.tsx
│   ├── Dispositivos.tsx
│   ├── Administradores.tsx
│   ├── Gerentes.tsx
│   ├── Servicios.tsx
│   ├── Aplicaciones.tsx
│   ├── Tickets.tsx
│   ├── Login.tsx               ← Login genérico (legacy)
│   ├── LoginSelector.tsx       ← Selector de rol
│   ├── LoginUsuarioServices.tsx← Selector de servicio (usuarios)
│   ├── RoleLogin.tsx           ← Login dinámico por rol (URL param)
│   └── login/                  ← Logins especializados por rol
│       ├── LoginAdminMaster.tsx
│       ├── LoginAdminNormal.tsx
│       ├── LoginGerente.tsx
│       ├── LoginUsuarioControlIndustrial.tsx
│       └── LoginUsuarioMonitoreoAmbiental.tsx
├── components/                 ← Componentes UI reutilizables
│   ├── SidebarLayout.tsx
│   ├── Gestion.tsx
│   ├── EditarDialog.tsx
│   ├── ConfirmDeleteDialog.tsx
│   ├── DetalleDialog.tsx
│   ├── LoginBase.tsx
│   └── CambiarPasswordDialog.tsx
├── shared/                     ← Lógica transversal
│   ├── api/
│   │   ├── functions.ts        ← Hooks de API (GET/POST/PUT/PATCH/DELETE)
│   │   ├── types.ts            ← Interfaces TypeScript de todas las entidades
│   │   └── schemas/
│   │       └── validation.ts   ← Esquemas Yup + validadores OWASP
│   ├── auth/
│   │   ├── authContext.tsx     ← Contexto de autenticación (JWT)
│   │   └── ProtectedRoute.tsx  ← Guardia de rutas
│   ├── activity/
│   │   └── activityContext.tsx ← Registro de eventos de actividad
│   ├── components/
│   │   └── SafeText.tsx        ← Renderizado seguro de texto
│   ├── hooks/
│   │   └── useSanitizedData.ts ← Hooks de sanitización de datos
│   ├── utils/
│   │   └── sanitization.ts     ← Utilidades anti-XSS / anti-SQLi / anti-URL
│   └── crypto.ts               ← Cifrado AES-256-CBC
└── __tests__/                  ← Pruebas unitarias
    ├── sanitization.test.ts
    ├── validation.test.ts
    ├── SafeText.test.tsx
    └── setup.ts
```

---

## 2. Archivos de Configuración

### `package.json`
**Propósito:** Define metadatos del proyecto, scripts de npm y todas las dependencias.

| Campo | Valor |
|---|---|
| Nombre | `iot-frontend` |
| Versión | `1.0.0` |
| Tipo | ES Module |

**Scripts principales:**

| Script | Comando | Descripción |
|---|---|---|
| `dev` | `vite` | Servidor de desarrollo (hot reload) |
| `build` | `tsc -b && vite build` | Compilación TypeScript + bundle Vite |
| `test` | `vitest` | Ejecuta pruebas unitarias |
| `test:coverage` | `vitest --coverage` | Genera reporte de cobertura |

**Dependencias de producción clave:**

| Paquete | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | ^18.3.1 | Framework UI |
| `@mui/material` | ^6.1.1 | Componentes UI (Material Design) |
| `@tanstack/react-query` | ^5.59.0 | Cache y sincronización de datos del servidor |
| `react-router-dom` | ^6.26.2 | Enrutamiento del lado del cliente |
| `formik` + `yup` | ^2.4.6 / ^1.4.0 | Formularios y validación |

---

### `vite.config.ts`
**Propósito:** Configuración del bundler Vite.

**Funciones principales:**
- Activa el plugin `@vitejs/plugin-react` para JSX rápido
- Configura el servidor de desarrollo en **puerto 3000**
- Base URL `/` para enrutamiento SPA

---

### `nginx.conf`
**Propósito:** Configuración del servidor web Nginx para producción (contenedor Docker).

**Funciones principales:**
- Escucha en el **puerto 3000**
- Sirve archivos estáticos desde `/var/www/html`
- Redirige todas las rutas a `index.html` (soporte SPA con `try_files`)
- Cache de assets estáticos por 7 días (`Cache-Control: public, immutable`)
- Aplica **6 cabeceras de seguridad HTTP** (detalladas en la sección 9)

---

### `tsconfig.json`
**Propósito:** Configuración del compilador TypeScript.

**Puntos relevantes:** Strict mode habilitado, targets modernos (ESNext), paths configurados para imports.

---

### `index.html`
**Propósito:** Punto de entrada HTML de la SPA.

**Funciones principales:**
- Carga el `<script type="module" src="/src/main.tsx">`
- Define `<meta charset="UTF-8">` y viewport
- Referencia la fuente *Space Grotesk* de Google Fonts

---

## 3. Punto de Entrada — `main.tsx`

**Propósito:** Bootstrapping completo de la aplicación React. Configura todo el árbol de providers y el sistema de rutas.

### Funciones principales

| Función/Concepto | Descripción |
|---|---|
| `createTheme()` | Define paleta de colores y tipografía global de MUI |
| `QueryClient` | Configura React Query con `refetchOnWindowFocus: false`, retry 1 |
| `navItems` | Array de ítems de navegación con `allowedTypes` y `requireMaster` |
| `LoadingFallback` | Componente de carga para Suspense (spinner centrado) |
| Lazy loading | Todas las páginas se cargan con `React.lazy()` para code-splitting |

### Árbol de Providers (orden exterior → interior)

```
StrictMode
  └── QueryClientProvider         ← React Query cache global
        └── ThemeProvider + CssBaseline  ← Tema MUI
              └── Router (BrowserRouter)
                    └── AuthProvider   ← Sesión / JWT
                          └── ActivityProvider  ← Log de actividad
                                └── Suspense
                                      └── Routes (páginas)
```

### Sistema de Rutas

| Ruta | Componente | Protección |
|---|---|---|
| `/login` | `LoginSelector` | Pública |
| `/login/admin-master` | `LoginAdminMaster` | Pública |
| `/login/admin-normal` | `LoginAdminNormal` | Pública |
| `/login/gerente` | `LoginGerente` | Pública |
| `/login/usuario` | `LoginUsuarioServices` | Pública |
| `/login/usuario/:role` | `RoleLogin` | Pública |
| `/login/:role` | `RoleLogin` | Pública |
| `/` | `Dashboard` | `ProtectedRoute` |
| `/usuarios` | `Usuarios` | `ProtectedRoute` (administrator \| manager) |
| `/dispositivos` | `Dispositivos` | `ProtectedRoute` |
| `/administradores` | `Administradores` | `ProtectedRoute` (administrator + isMaster) |
| `/gerentes` | `Gerentes` | `ProtectedRoute` (administrator) |
| `/servicios` | `Servicios` | `ProtectedRoute` (administrator \| manager) |
| `/aplicaciones` | `Aplicaciones` | `ProtectedRoute` (administrator \| manager) |
| `/tickets` | `Tickets` | `ProtectedRoute` |

---

## 4. Capa Compartida (`shared/`)

### 4.1 `shared/api/functions.ts`
**Propósito:** Provee hooks de React Query para todas las operaciones HTTP. Centraliza autenticación, sanitización y manejo de errores.

| Función exportada | Tipo | Descripción |
|---|---|---|
| `useGetQuery<T>()` | Query (GET) | Obtiene datos paginados del backend. Añade `Authorization: Bearer <token>` automáticamente. Sanitiza respuesta con `sanitizeBackendResponse()` |
| `useSendDataMutation<TData, TResponse>()` | Mutation (POST/PUT/PATCH) | Envía datos al backend. Sanitiza el payload con `sanitizeObject()` antes de enviar (excluye `password`, `token`, `hash`). Parsea errores del backend |
| `useDeleteByIdMutation<T>()` | Mutation (DELETE) | Elimina recurso por ID. Valida el ID con `isValidId()` antes de construir la URL. Soporta 204 No Content |
| `parseApiError()` | Helper | Parsea errores del backend (JSON detail, UNIQUE constraints). Devuelve mensaje legible |

**Flujo de una petición:**

```
Hook llamado
  → (Mutation) sanitizeObject(payload)    [bloquea XSS en datos enviados]
  → fetch(API_BASE_URL + endpoint, {Authorization: Bearer token})
  → response.ok? → sanitizeBackendResponse(data)  [bloquea XSS en datos recibidos]
                 → throw Error (parseApiError)
```

---

### 4.2 `shared/api/types.ts`
**Propósito:** Define todas las interfaces TypeScript del sistema. Garantiza tipado estricto extremo-a-extremo.

| Interfaz | Descripción |
|---|---|
| `TokenResponse` | Respuesta del endpoint de login (access_token, token_type, account_type, is_master) |
| `SessionCredentials` | Sesión almacenada en frontend (token, accountId, accountType, isMaster) |
| `PersonalDataCreate/Update/Response` | Datos personales (nombre, apellidos, CURP, RFC, email, teléfono, etc.) |
| `DeviceCreate/Update/Response` | Dispositivo IoT (nombre, marca, modelo, IP, MAC, serial) |
| `ServiceCreate/Update/Response` | Servicio de la plataforma (nombre, descripción, administrator_id) |
| `ApplicationCreate/Update/Response` | Aplicación (nombre, versión, URL, puerto, api_key) |
| `ServiceTicketCreate/Update/Response` | Ticket de servicio (título, descripción, prioridad, estado, service_id) |
| `EcosystemTicketCreate/Update/Response` | Ticket de ecosistema (título, descripción, manager_service_id) |
| `PageResponse<T>` | Respuesta paginada genérica (total, offset, limit, data[]) |
| `GenericDataWithId` | Base para entidades con `id: string` |

---

### 4.3 `shared/api/schemas/validation.ts`
**Propósito:** Define esquemas de validación Yup para todos los formularios. Implementa validaciones OWASP.

| Función/Validador | Descripción |
|---|---|
| `validatePasswordStrength(pwd)` | OWASP: requiere mayúscula + minúscula + número + carácter especial + mínimo 8 chars |
| `validateCURP(curp)` | Valida formato CURP mexicana (regex completo: 4 letras + 6 números + H/M + estado + consonantes) |
| `validateRFC(rfc)` | Valida RFC persona física (13 chars) y moral (12 chars) con homoclave |
| `generatePersonalDataSchema(isRequired)` | Schema Yup para datos personales: regex de solo letras, test `no-html` (bloquea `< > " ' &`), límites de longitud |
| `generateDeviceSchema(isRequired)` | Schema para dispositivos: validación IP, MAC, número de serie |
| `generateServiceSchema(isRequired)` | Schema para servicios |
| `generateApplicationSchema(isRequired)` | Schema para aplicaciones: validación URL y puerto numérico |
| `generateServiceTicketSchema(isRequired)` | Schema para tickets de servicio |
| `generateEcosystemTicketSchema(isRequired)` | Schema para tickets de ecosistema |
| `isSafeEmail(email)` | Valida formato de email seguro |
| `isSafeSqlInput(input)` | Detecta patrones SQL injection (SELECT/INSERT/DROP/UNION, comentarios SQL, etc.) |

---

### 4.4 `shared/auth/authContext.tsx`
**Propósito:** Contexto global de autenticación. Gestiona la sesión JWT de forma segura.

| Función/Estado | Descripción |
|---|---|
| `login(email, password, endpoint?)` | Ejecuta `POST {endpoint}` con credenciales. Extrae `accountId` del payload JWT. Guarda sesión en `sessionStorage` |
| `logout()` | Elimina sesión de `sessionStorage` y resetea estado |
| `loadSession()` | Al iniciar la app, carga sesión guardada y **valida la expiración del token** (campo `exp` del JWT). Si expiró, borra la sesión |
| `session` | Estado: `SessionCredentials | null` |
| `loginError` | Mensaje de error del backend o "Error {status}" |
| `isLoggingIn` | Estado de carga de la mutación |
| `STORAGE_KEY` | `"iot_session"` — clave en sessionStorage |

**Seguridad clave:** La sesión se guarda en **`sessionStorage`** (no `localStorage`), por lo que se destruye automáticamente al cerrar la pestaña.

---

### 4.5 `shared/auth/ProtectedRoute.tsx`
**Propósito:** Guardia de rutas para el enrutador de React. Implementa RBAC en el cliente.

| Condición | Redirección |
|---|---|
| Sin sesión activa | `/login/admin-master` |
| `requiredType` no coincide con `session.accountType` | `/` (Dashboard) |
| `requireMaster = true` pero `session.isMaster = false` | `/` (Dashboard) |
| Todo correcto | Renderiza el componente destino |

---

### 4.6 `shared/activity/activityContext.tsx`
**Propósito:** Sistema de registro de actividad local (audit log del cliente).

| Función | Descripción |
|---|---|
| `addEvent(action, entityType, entityName)` | Añade evento: `created/edited/deleted` con timestamp ISO y UUID |
| `clearEvents()` | Limpia todos los eventos del log |
| `events` | Array de `ActivityEvent[]` (máx. 50 eventos, FIFO) |

Los eventos se persisten en `localStorage` (`iot_activity_log`) y se muestran en el Dashboard como "Actividad Reciente".

---

### 4.7 `shared/utils/sanitization.ts`
**Propósito:** Librería de sanitización frontend. Defensa en profundidad contra XSS e inyecciones.

| Función | Descripción |
|---|---|
| `sanitizeHtml(input)` | Escapa `& < > " ' /` a entidades HTML. Primera línea de defensa contra XSS |
| `stripHtmlTags(input)` | Elimina completamente todos los tags HTML. Para campos que no aceptan ningún HTML |
| `sanitizeUrl(url)` | Lista negra de protocolos peligrosos: `javascript:`, `data:`, `file:`, `vbscript:`, `about:`. Solo permite `http/https/mailto/` relativas |
| `sanitizeObject(obj, exceptions)` | Sanitiza recursivamente todos los strings de un objeto (incluyendo arrays y objetos anidados). Excluye campos en `exceptions` (password, token, hash) |
| `isSafeSqlInput(input)` | Detecta patrones SQL: `SELECT/INSERT/DROP/UNION/EXEC`, comentarios `--` `/**/`, `' OR '1'='1` |
| `sanitizeFilename(filename)` | Elimina caracteres peligrosos de nombres de archivo (`/ \ : * ? " < > \|`) |
| `isSafeEmail(email)` | Valida formato de email |
| `sanitizeBackendResponse(data)` | Sanitiza respuestas del backend recursivamente antes de usarlas |
| `truncateText(text, maxLength)` | Previene DoS visual con textos extremadamente largos (añade `...`) |
| `isValidId(id)` | Valida que un ID sea número o UUID v4 (previene path injection en DELETE) |
| `sanitizeQueryParams(params)` | Sanitiza parámetros de query string |

---

### 4.8 `shared/components/SafeText.tsx`
**Propósito:** Componente React para renderizar texto de forma segura. Reemplaza los `{variable}` directos cuando el origen es el backend.

| Prop | Tipo | Descripción |
|---|---|---|
| `children` | `string \| null \| undefined` | Texto a renderizar |
| `maxLength` | `number` (default: 1000) | Longitud máxima antes de truncar |
| `allowHtml` | `boolean` (default: false) | Si `false`: texto plano seguro. Si `true`: `dangerouslySetInnerHTML` (solo fuentes confiables) |

**Funciones principales:**
- `sanitizeHtml()` aplicado automáticamente cuando `allowHtml = false`
- `truncateText()` siempre aplicado para prevenir DoS visual
- React escapa automáticamente el texto plano (doble protección)

---

### 4.9 `shared/hooks/useSanitizedData.ts`
**Propósito:** Custom hooks para sanitizar datos del backend antes de usarlos en componentes.

| Hook | Descripción |
|---|---|
| `useSanitizedData<T>(data)` | Sanitiza un objeto del backend con `sanitizeBackendResponse()`. Memoizado con `useMemo` |
| `useSanitizedArray<T>(data)` | Sanitiza un array de objetos del backend. Memoizado con `useMemo` |

---

### 4.10 `shared/crypto.ts`
**Propósito:** Módulo de cifrado simétrico AES-256-CBC compatible con el backend Python (IOT-Server).

| Función | Descripción |
|---|---|
| `deriveKey(secret)` | Deriva clave AES-256: si el secret tiene 64 chars hexadecimales lo decodifica como hex; si no, aplica SHA-256 |
| `encrypt<T>(obj, secret)` | Cifra un objeto JSON con AES-256-CBC. Genera IV aleatorio (16 bytes). Formato de salida: `"base64(iv):base64(ciphertext)"` |
| `decrypt<T>(encryptedText, secret)` | Descifra un payload en formato `"base64(iv):base64(ciphertext)"` y devuelve el objeto JSON |

**Compatibilidad:** El formato es compatible con `AesCbcCryptography` del backend Python.

---

## 5. Componentes Reutilizables (`components/`)

### 5.1 `SidebarLayout.tsx`
**Propósito:** Layout principal de la aplicación. Provee la barra lateral de navegación y la barra superior.

**Funciones principales:**

| Función | Descripción |
|---|---|
| `visibleItems` filter | Filtra los ítems de nav según `session.accountType` e `isMaster`. Control de acceso visual |
| Section grouping | Agrupa los ítems de nav por secciones (Principal, Gestión de Entidades, IoT, Plataforma, Soporte) |
| `handleLogout()` | Llama a `logout()` del AuthContext y redirige a `/login/admin-master` |
| `isMobile` | Responsive: en móvil el drawer se cierra al navegar |
| Avatar/Rol chip | Muestra iniciales y rol del usuario actual con color diferenciado |
| `CambiarPasswordDialog` | Botón en la barra superior para cambiar contraseña |

**Etiquetas ARIA:** `role="banner"`, `aria-label` en botones, `aria-expanded` en toggle del menú.

---

### 5.2 `Gestion.tsx`
**Propósito:** Componente genérico de gestión CRUD. El más importante del proyecto: todas las páginas de entidades lo utilizan.

**Props principales:**

| Prop | Tipo | Descripción |
|---|---|---|
| `columns` | `GridColDef[]` | Definición de columnas para MUI DataGrid |
| `rows` | `T[]` | Datos de la entidad |
| `title` | `string` | Título de la sección |
| `keyEndpoint` | `string` | Prefijo del endpoint para mutaciones |
| `canCreate/canEdit/canDelete` | `boolean` | Permisos de operación (por rol) |
| `selfId` | `string?` | ID del usuario actual (previene auto-eliminación) |
| `editValidationSchema` | `Yup.ObjectSchema` | Schema para formulario de edición |
| `newValidationSchema` | `Yup.ObjectSchema` | Schema para formulario de creación |
| `fieldsConfig` | `Partial<Record<string, FieldConfig>>` | Config de tipo de campo (select, boolean, password, date) |
| `showDetail` | `boolean` | Muestra botón de detalle |

**Funciones principales:**

| Función | Descripción |
|---|---|
| `handleConfirmDelete(reason)` | Solicita razón de eliminación. Ejecuta `useDeleteByIdMutation`. Llama `addEvent("deleted", ...)` |
| `handleClickOpen(rowData)` | Abre el diálogo de edición con datos precargados |
| `handleCreate(newRow)` | Añade la nueva entidad a la tabla local optimistamente |
| Status filter | Filtros "Todos / Activos / Inactivos" con `useMemo` |
| `resolveEntityName(row)` | Determina el nombre de la entidad para logs (intenta `name`, `first_name`, `title`) |

---

### 5.3 `EditarDialog.tsx`
**Propósito:** Diálogo Modal para crear o editar entidades. Usa Formik para gestión de formularios.

**Funciones principales:**
- Genera campos de formulario dinámicamente desde `validationSchema`
- Soporta tipos: `text`, `password` (con toggle de visibilidad), `date`, `select`, `number`, `boolean`
- Campos sensibles (`email`, `phone`, `CURP`, `RFC`, `address`, etc.) se muestran **enmascarados** en modo edición (protección de datos personales)
- `useSendDataMutation` con `POST` (crear) o `PATCH` (editar)
- Validación en tiempo real con Yup (errores por campo)
- Campos ocultos: `id`, `created_at`, `updated_at`, `api_key` no se muestran en el formulario

---

### 5.4 `ConfirmDeleteDialog.tsx`
**Propósito:** Diálogo de confirmación de eliminación. Requiere razón escrita.

**Funciones principales:**
- Valida que la razón tenga al menos 3 caracteres antes de confirmar
- Muestra el nombre de la entidad a eliminar
- Roles ARIA: `aria-labelledby`, `aria-describedby`, `role="alert"`, `aria-live="polite"`
- Indicador de carga (`isPending`) durante la mutación

---

### 5.5 `DetalleDialog.tsx`
**Propósito:** Diálogo de vista detalle de una entidad (solo lectura).

**Funciones principales:**
- Renderiza todos los campos con etiquetas en español
- Formatea `boolean` como chips Activo/Inactivo
- Formatea fechas ISO a formato local
- Campos sensibles de datos personales (`email`, `phone`, `CURP`, `RFC`, etc.) se muestran como **"••••••••"** (enmascarados) ya que la API no los devuelve
- Oculta campos `password` y `password_hash`
- Prioridades de tickets con chips de color semántico

---

### 5.6 `LoginBase.tsx`
**Propósito:** Componente base para todos los formularios de login. Recibe configuración visual y de endpoint por props.

**Funciones principales:**

| Función | Descripción |
|---|---|
| `handleLogin(e)` | Previene `e.preventDefault()`, valida inputs no vacíos, llama `login()` del AuthContext |
| `useEffect([session])` | Redirige a `/` automáticamente si ya hay sesión activa |
| `config.apiEndpoint` | Endpoint flexible por tipo de rol |
| Warning panel | Muestra política de sesión única (error 409) |
| Animación CSS | `fadeSlideUp` para entrada suave |

---

### 5.7 `CambiarPasswordDialog.tsx`
**Propósito:** Diálogo para cambio de contraseña del usuario autenticado.

**Funciones principales:**
- 3 campos: contraseña actual, nueva contraseña, confirmación
- Validación con Yup: `validatePasswordStrength()` (OWASP), coincidencia de contraseñas, mínimo 8 chars, máximo 128 chars
- `PATCH auth/change-password` con `current_password` y `new_password`
- Las contraseñas **no se sanitizan** (excluidas de `sanitizeObject`) para no alterar el hash

---

## 6. Páginas (`pages/`)

### 6.1 `Dashboard.tsx`
**Propósito:** Panel de control principal. Muestra métricas, acciones rápidas y actividad reciente.

**Funciones principales:**

| Función | Descripción |
|---|---|
| `StatCard` | Tarjeta de estadística con contador, ícono y color |
| `QuickAction` | Tarjeta de acción rápida con navegación |
| Métricas condicionales | Muestra solo las métricas relevantes al rol: usuarios (admin/manager), gerentes (admin), admins (admin master) |
| `formatTimeAgo(dateStr)` | Formatea timestamps relativos ("Hace 5 min", "Hace 2h") |
| Activity Log | Muestra últimos 50 eventos del `activityContext` |

**Endpoints consumidos (GET):**
- `users/` — solo si no es usuario
- `devices/` — todos los roles
- `administrators/` — solo admin master
- `managers/` — solo administrador

---

### 6.2 `Usuarios.tsx`
**Propósito:** CRUD completo de usuarios del sistema.

**Endpoint:** `users/`  
**Permisos:** Admin (CRUD completo), Manager (lectura + escritura, sin eliminar)

---

### 6.3 `Dispositivos.tsx`
**Propósito:** Gestión de dispositivos IoT (sensores, actuadores, cámaras).

**Endpoint:** `devices/`  
**Permisos:** Admin y Manager (CRUD completo), Usuario (solo lectura)

**Campos mostrados:** Nombre, Marca, Modelo, Número de Serie, IP, MAC, Estado

---

### 6.4 `Administradores.tsx`
**Propósito:** Gestión de cuentas de administrador. Solo accesible al Admin Master.

**Endpoint:** `administrators/`  
**Permisos:** Solo Admin Master (`isMaster = true`). Protección extra: `selfId` evita que el Admin Master se auto-elimine.

---

### 6.5 `Gerentes.tsx`
**Propósito:** Gestión de cuentas de gerentes.

**Endpoint:** `managers/`  
**Permisos:** Solo Administrador (cualquier nivel)

---

### 6.6 `Servicios.tsx`
**Propósito:** Gestión de servicios de la plataforma IoT.

**Endpoints consumidos:**
- `services/` — CRUD de servicios
- `administrators/` — Para el select de administrador responsable (solo si es admin)

**Permisos:** Solo Administrador (CRUD). Manager tiene acceso de lectura.  
**Campo especial:** `administrator_id` usa un `<Select>` con la lista de admins del sistema.

---

### 6.7 `Aplicaciones.tsx`
**Propósito:** Gestión de aplicaciones cliente que consumen la API IoT.

**Endpoint:** `applications/`  
**Permisos:** Solo Administrador (CRUD). Manager tiene acceso de lectura.  
**Campo especial:** `api_key` se muestra truncada (primeros 20 chars + "…") con tooltip para ver el valor completo.

---

### 6.8 `Tickets.tsx`
**Propósito:** Sistema de tickets de soporte. Doble pestaña: Tickets de Servicio y Tickets de Ecosistema.

**Endpoints consumidos:**
- `tickets/service/` — Tickets de servicio
- `tickets/ecosystem/` — Tickets de ecosistema
- `services/` — Para el select de servicio en tickets

**Permisos:** Todos los roles pueden crear tickets. La gestión depende del rol.

**Estados de ticket:** Abierto (1), En progreso (2), Resuelto (3), Cerrado (4)  
**Prioridades:** Baja, Media, Alta, Crítica (con chips de color semántico)

---

### 6.9 Páginas de Login

| Archivo | Rol | Endpoint API | Color |
|---|---|---|---|
| `Login.tsx` | Genérico (legacy) | `auth/login` | Cyan/azul |
| `LoginSelector.tsx` | Selector de rol | — (navegación) | Gradiente azul |
| `LoginAdminMaster.tsx` | Admin Master | `auth/login` | Azul (#2563eb) |
| `LoginAdminNormal.tsx` | Admin Normal | `auth/login` | Cyan (#0891b2) |
| `LoginGerente.tsx` | Gerente | `auth/login` | Verde (#059669) |
| `LoginUsuarioMonitoreoAmbiental.tsx` | Usuario Ambiental | `auth/login` | Violeta (#7c3aed) |
| `LoginUsuarioControlIndustrial.tsx` | Usuario Industrial | `auth/login` | Violeta (#7c3aed) |
| `LoginUsuarioServices.tsx` | Selector de servicio usuario | — (navegación) | Violeta |
| `RoleLogin.tsx` | Login dinámico por URL param | `auth/login` | Variable por rol |

Todos usan el mismo endpoint `POST auth/login`. La diferenciación de rol la determina el backend a través del JWT devuelto (`account_type`, `is_master`).

---

## 7. Tests (`__tests__/`)

### 7.1 `setup.ts`
Configura el entorno de testing con `@testing-library/jest-dom` matchers.

### 7.2 `sanitization.test.ts`
**Cobertura:** `sanitizeHtml`, `stripHtmlTags`, `sanitizeUrl`, `sanitizeObject`, `isSafeSqlInput`, `sanitizeFilename`, `isSafeEmail`, `sanitizeBackendResponse`, `truncateText`, `isValidId`, `sanitizeQueryParams`.

**Casos notables:** Vectores XSS reales (`<script>`, `<img onerror>`, payloads con `javascript:`), SQL injection patterns, URLs peligrosas.

### 7.3 `validation.test.ts`
**Cobertura:** `validatePasswordStrength`, `validateCURP`, `validateRFC`.

**Casos OWASP:** Contraseñas sin mayúscula/minúscula/número/especial, contraseñas comunes débiles. CURPs con género inválido, RFC con longitud incorrecta.

### 7.4 `SafeText.test.tsx`
**Cobertura:** Renderizado básico, prevención XSS (`<script>`, `<img onerror>`, `<iframe>`, event handlers), truncación de texto largo.

---

## 8. Endpoints Consumidos

Todos los endpoints son relativos a `VITE_API_BASE_URL` (configurable por entorno).  
Todas las peticiones (excepto login) llevan la cabecera: `Authorization: Bearer <token>`

### Autenticación

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| POST | `auth/login` | Obtiene JWT con credenciales email+password | No |
| PATCH | `auth/change-password` | Cambia la contraseña del usuario autenticado | Sí |

### Usuarios

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `users/` | Lista paginada de usuarios | admin, manager |
| POST | `users` | Crea un nuevo usuario | admin, manager |
| PATCH | `users/{id}` | Actualiza datos de un usuario | admin, manager |
| DELETE | `users/{id}` | Elimina un usuario | admin |

### Administradores

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `administrators/` | Lista paginada de admins | admin |
| POST | `administrators` | Crea un administrador | admin master |
| PATCH | `administrators/{id}` | Actualiza un administrador | admin master |
| DELETE | `administrators/{id}` | Elimina un administrador | admin master |

### Gerentes

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `managers/` | Lista paginada de gerentes | admin |
| POST | `managers` | Crea un gerente | admin |
| PATCH | `managers/{id}` | Actualiza un gerente | admin |
| DELETE | `managers/{id}` | Elimina un gerente | admin |

### Dispositivos IoT

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `devices/` | Lista paginada de dispositivos | todos |
| POST | `devices` | Registra un dispositivo | admin, manager |
| PATCH | `devices/{id}` | Actualiza un dispositivo | admin, manager |
| DELETE | `devices/{id}` | Elimina un dispositivo | admin, manager |

### Servicios

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `services/` | Lista paginada de servicios | admin, manager |
| POST | `services` | Crea un servicio | admin |
| PATCH | `services/{id}` | Actualiza un servicio | admin |
| DELETE | `services/{id}` | Elimina un servicio | admin |

### Aplicaciones

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `applications/` | Lista paginada de aplicaciones | admin, manager |
| POST | `applications` | Registra una aplicación | admin |
| PATCH | `applications/{id}` | Actualiza una aplicación | admin |
| DELETE | `applications/{id}` | Elimina una aplicación | admin |

### Tickets de Servicio

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `tickets/service/` | Lista de tickets de servicio | todos |
| POST | `tickets/service` | Crea un ticket de servicio | todos |
| PATCH | `tickets/service/{id}` | Actualiza un ticket | todos |
| DELETE | `tickets/service/{id}` | Elimina un ticket | admin |

### Tickets de Ecosistema

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `tickets/ecosystem/` | Lista de tickets de ecosistema | todos |
| POST | `tickets/ecosystem` | Crea un ticket de ecosistema | todos |
| PATCH | `tickets/ecosystem/{id}` | Actualiza un ticket | todos |
| DELETE | `tickets/ecosystem/{id}` | Elimina un ticket | admin |

---

## 9. Características de Seguridad

### 9.1 Autenticación con JWT

**Archivo:** `shared/auth/authContext.tsx`  
**Cómo funciona:**
- El login hace `POST auth/login` con email/password y recibe un `access_token` (JWT Bearer)
- El token se almacena en **`sessionStorage`** (no `localStorage`): se destruye al cerrar la pestaña/navegador, reduciendo el riesgo de robo de sesión persistente
- En cada carga de la app, `loadSession()` **decodifica el payload del JWT** (campo `exp`) y verifica que no haya expirado. Si expiró, elimina la sesión automáticamente
- Todas las peticiones autenticadas incluyen `Authorization: Bearer <token>` en las cabeceras HTTP

---

### 9.2 Control de Acceso Basado en Roles (RBAC)

**Archivos:** `ProtectedRoute.tsx`, `SidebarLayout.tsx`, páginas individuales  
**Cómo funciona:**

| Nivel | Implementación | Descripción |
|---|---|---|
| **Ruta** | `ProtectedRoute` | Verifica `session`, `accountType` e `isMaster` antes de renderizar |
| **Navegación** | `SidebarLayout.visibleItems` | Oculta ítems del menú no permitidos al rol actual |
| **CRUD** | `canCreate/canEdit/canDelete` props | Oculta botones de acción según rol en cada página |
| **Auto-eliminación** | `selfId` prop | Previene que el Admin Master se elimine a sí mismo |

**Jerarquía de roles:**
```
Admin Master (isMaster=true)  ← acceso total, CRUD admins
  └── Admin Normal             ← CRUD usuarios, gerentes, servicios, apps
        └── Gerente (Manager)  ← lectura de servicios/apps, CRUD dispositivos/usuarios
              └── Usuario      ← solo lectura de dispositivos, tickets
```

---

### 9.3 Prevención de XSS (Cross-Site Scripting)

**Archivos:** `shared/utils/sanitization.ts`, `shared/components/SafeText.tsx`, `shared/api/functions.ts`  
**Estrategia de defensa en profundidad:**

| Capa | Mecanismo | Descripción |
|---|---|---|
| **Envío al backend** | `sanitizeObject()` en `useSendDataMutation` | Escapa `< > & " ' /` en todos los strings del payload antes de enviar |
| **Recepción del backend** | `sanitizeBackendResponse()` en `useGetQuery/useSendDataMutation` | Sanitiza recursivamente los datos del servidor antes de almacenarlos |
| **Renderizado** | `SafeText` component | Escapa automáticamente texto antes de renderizar. `truncateText()` para prevención de DoS visual |
| **Validación de formularios** | Tests `no-html` en Yup | Bloquea caracteres `< > " ' &` en campos de texto |
| **React nativo** | Renderizado JSX | React escapa automáticamente todos los valores en `{expresiones}` |

---

### 9.4 Validación de Entradas (OWASP)

**Archivo:** `shared/api/schemas/validation.ts`  
**Cómo funciona:**
- `validatePasswordStrength()`: contraseñas de al menos 8 chars, con mayúscula, minúscula, número y carácter especial (`!@#$%^&*(),.?":{}|<>`)
- Máximo 128 chars en contraseñas (previene DoS por hashing de contraseñas largas)
- Validación de CURP y RFC con regex estrictos para México
- Todos los campos de texto: límites de longitud (`min/max`), regex de caracteres permitidos
- Dirección IP y MAC con formatos específicos para dispositivos

---

### 9.5 Prevención de SQL Injection

**Archivo:** `shared/utils/sanitization.ts` — función `isSafeSqlInput()`  
**Cómo funciona:**  
Detecta patrones comunes: palabras clave SQL (`SELECT, INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, EXEC`), comentarios SQL (`--`, `/**/`), patrones de bypass (`' OR '1'='1`), `UNION SELECT`, y secuencias `; DROP`.

> **Nota:** Esta es una validación de defensa adicional en el cliente. La protección primaria está en el ORM del backend (SQLAlchemy con parámetros parametrizados).

---

### 9.6 Sanitización de URLs

**Archivo:** `shared/utils/sanitization.ts` — función `sanitizeUrl()`  
**Cómo funciona:**  
Lista negra de protocolos peligrosos: `javascript:`, `data:`, `file:`, `vbscript:`, `about:`.  
Lista blanca de protocolos seguros: `https://`, `http://`, `mailto:`, rutas relativas (`/`, `./`, `../`, `#`).  
Retorna `null` si la URL es peligrosa y registra un warning en consola.

---

### 9.7 Validación de IDs en Rutas

**Archivo:** `shared/api/functions.ts` — `useDeleteByIdMutation` + `isValidId()`  
**Cómo funciona:**  
Antes de construir la URL `DELETE /endpoint/{id}`, valida que el ID sea un **número entero** o un **UUID v4** mediante regex. Si no pasa la validación, lanza error sin realizar la petición, previniendo path injection como `../../admin` o IDs con caracteres especiales.

---

### 9.8 Cabeceras de Seguridad HTTP

**Archivo:** `nginx.conf`  
**Cómo funciona:**

| Cabecera | Valor | Protección |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:8000 ...` | Bloquea carga de recursos externos maliciosos, previene XSS vía scripts externos |
| `X-Frame-Options` | `DENY` | Previene ataques de Clickjacking (embedding en iframes) |
| `X-Content-Type-Options` | `nosniff` | Previene MIME sniffing (carga de scripts disfrazados de otros tipos) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita información enviada en la cabecera Referer |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Deshabilita acceso a hardware sensible del dispositivo |

---

### 9.9 Protección de Datos Sensibles

**Archivos:** `EditarDialog.tsx`, `DetalleDialog.tsx`  
**Cómo funciona:**  
Los campos `email`, `phone`, `address`, `city`, `state`, `postal_code`, `birth_date`, `CURP`, `RFC` son **datos personales sensibles** que:
1. La API **no devuelve en las respuestas de listado** (protección en backend)
2. En el `DetalleDialog`, se muestran como `"••••••••"` indicando que están protegidos
3. En el `EditarDialog` en modo edición, estos campos aparecen con un indicador de que contienen datos sensibles y están enmascarados

---

### 9.10 Cifrado AES-256-CBC

**Archivo:** `shared/crypto.ts`  
**Cómo funciona:**  
Implementa cifrado simétrico AES-256-CBC compatible con el backend:
- IV (vector de inicialización) aleatorio de 16 bytes por cada cifrado
- Derivación de clave: SHA-256 del secreto (o decodificación hex si es 64 chars)
- Formato: `"base64(iv):base64(ciphertext)"` — compatible con `AesCbcCryptography` de Python

---

### 9.11 Registro de Actividad (Audit Log del Cliente)

**Archivo:** `shared/activity/activityContext.tsx`  
**Cómo funciona:**  
Registra cada operación `created/edited/deleted` con: UUID único, tipo de entidad, nombre de entidad, y timestamp ISO. Se almacena en `localStorage` con máximo 50 eventos (FIFO). Visible en el Dashboard como "Actividad Reciente".

---

### 9.12 Lazy Loading y Code Splitting

**Archivo:** `main.tsx`  
**Cómo funciona:**  
Todas las páginas se cargan con `React.lazy()` + `<Suspense>`. Beneficios de seguridad:
- Reduce el código JavaScript enviado inicialmente al navegador (menor superficie de ataque)
- Los módulos de páginas protegidas no se descargan hasta que el usuario autenticado navega a ellas

---

## 10. Diagrama de Flujo de Procesos

### 10.1 Flujo de Autenticación

```
[Usuario abre la app]
        │
        ▼
[loadSession() verifica sessionStorage]
        │
   ┌────┴────┐
   │ Sesión  │
   │ válida? │
   └────┬────┘
     Sí │         No
        │    ──────────────────────────────────────
        │    │
        ▼    ▼
[Dashboard]  [Redirige a /login/admin-master]
                       │
                       ▼
             [LoginSelector — elige rol]
                       │
          ┌────────────┼────────────────────────┐
          ▼            ▼            ▼            ▼
    [Admin Master] [Admin] [Gerente] [Usuario→Selector Servicio]
          │            │            │            │
          └────────────┴────────────┴────────────┘
                       │
                       ▼
           [LoginBase.handleLogin()]
                       │
                       ▼
           [POST auth/login {email, password}]
                       │
              ┌────────┴────────┐
              │    Respuesta    │
              │   exitosa?      │
              └────────┬────────┘
                  Sí   │   No
                       │   └──► [Muestra loginError al usuario]
                       ▼
        [Extrae accountId del JWT payload]
                       │
                       ▼
        [Guarda SessionCredentials en sessionStorage]
                       │
                       ▼
        [setSession(creds) → AuthContext]
                       │
                       ▼
        [useEffect detecta session → navigate("/")]
                       │
                       ▼
              [Dashboard]
```

---

### 10.2 Flujo de Operación CRUD (Crear/Editar/Eliminar)

```
[Página de entidad (ej: Usuarios)]
        │
        ▼
[useGetQuery("users/", session)]
  ├─ GET {API_BASE_URL}/users/
  │      Authorization: Bearer {token}
  └─ sanitizeBackendResponse(data) → rows[]
        │
        ▼
[Gestion<PersonalDataResponse>]
        │
  ┌─────┴──────────────────────┐
  │                            │
  ▼                            ▼
[Botón CREAR]           [Botón EDITAR (fila)]
  │                            │
  ▼                            ▼
[EditarDialog — POST]   [EditarDialog — PATCH]
  │                            │
  └──────────┬─────────────────┘
             │
             ▼
  [Formik valida con Yup schema]
     ├─ ¿Errores? → muestra por campo
     └─ Sin errores
             │
             ▼
  [useSendDataMutation]
     ├─ sanitizeObject(payload)  [bloquea XSS]
     ├─ isValidId(id)            [solo PATCH/DELETE]
     ├─ fetch(endpoint, {method, headers, body})
     └─ sanitizeBackendResponse(responseData)
             │
        ┌────┴────┐
        │ Éxito   │ Error
        │         └──► [Muestra apiError en Dialog]
        ▼
  [addEvent(action, entityType, name)]
        │
        ▼
  [handleChange(updatedRow) → actualiza tabla local]
        │
        ▼
  [Dialog se cierra]

---

[Botón ELIMINAR (fila)]
        │
        ▼
[ConfirmDeleteDialog]
  ├─ Requiere razón (≥3 chars)
  └─ Confirmar
        │
        ▼
[useDeleteByIdMutation]
  ├─ isValidId(id)  ← VALIDACIÓN CRÍTICA
  ├─ DELETE {endpoint}/{id}
  │      Authorization: Bearer {token}
  └─ 204 No Content → {}
        │
        ▼
[addEvent("deleted", ...)]
        │
        ▼
[Elimina fila de tabla local]
```

---

### 10.3 Flujo de Cambio de Contraseña

```
[Botón 🔒 en AppBar (SidebarLayout)]
        │
        ▼
[CambiarPasswordDialog — abierto]
        │
        ▼
[Formik: current_password, new_password, confirm_password]
        │
[Yup validación]:
  ├─ current_password: min 8 chars
  ├─ new_password: validatePasswordStrength() OWASP
  └─ confirm_password: oneOf([new_password])
        │
  ┌─────┴────┐
  │ Válido   │ Inválido → muestra errores por campo
  ▼
[useSendDataMutation PATCH "auth/change-password"]
  ├─ Payload: {current_password, new_password}
  │   (contraseñas excluidas de sanitizeObject)
  └─ Authorization: Bearer {token}
        │
  ┌─────┴────┐
  │ Éxito   │ Error → apiError en Alert
  ▼
[Alert "Contraseña actualizada"]
  └─ Usuario cierra → resetForm()
```

---

### 10.4 Flujo de Protección de Rutas

```
[Navegación a ruta protegida (ej: /administradores)]
        │
        ▼
[ProtectedRoute evalúa]:
  ├─ session === null?
  │     └──► Navigate to "/login/admin-master"
  │
  ├─ requiredType !== session.accountType?
  │     └──► Navigate to "/"
  │
  ├─ requireMaster && !session.isMaster?
  │     └──► Navigate to "/"
  │
  └─ Todo OK → <Administradores />
```

---

## 11. Matriz de Permisos por Rol

| Recurso | Admin Master | Admin Normal | Gerente | Usuario |
|---|:---:|:---:|:---:|:---:|
| **Dashboard** | ✅ (completo) | ✅ (sin admins) | ✅ (sin gerentes/admins) | ✅ (solo devices) |
| **Usuarios** — Leer | ✅ | ✅ | ✅ | ❌ |
| **Usuarios** — Crear/Editar | ✅ | ✅ | ✅ | ❌ |
| **Usuarios** — Eliminar | ✅ | ✅ | ❌ | ❌ |
| **Administradores** — Leer | ✅ | ❌ (no visible) | ❌ | ❌ |
| **Administradores** — CRUD | ✅ | ❌ | ❌ | ❌ |
| **Gerentes** — Leer | ✅ | ✅ | ❌ (no visible) | ❌ |
| **Gerentes** — CRUD | ✅ | ✅ | ❌ | ❌ |
| **Dispositivos** — Leer | ✅ | ✅ | ✅ | ✅ |
| **Dispositivos** — CRUD | ✅ | ✅ | ✅ | ❌ |
| **Servicios** — Leer | ✅ | ✅ | ✅ | ❌ |
| **Servicios** — CRUD | ✅ | ✅ | ❌ (solo lectura) | ❌ |
| **Aplicaciones** — Leer | ✅ | ✅ | ✅ | ❌ |
| **Aplicaciones** — CRUD | ✅ | ✅ | ❌ (solo lectura) | ❌ |
| **Tickets** — Leer/Crear | ✅ | ✅ | ✅ | ✅ |
| **Tickets** — Eliminar | ✅ | ✅ | ❌ | ❌ |
| **Cambiar Contraseña** | ✅ | ✅ | ✅ | ✅ |

---

*Reporte generado automáticamente el 28 de abril de 2026.*
