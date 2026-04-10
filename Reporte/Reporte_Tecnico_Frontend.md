# Reporte Técnico — Frontend IoT Platform

**Proyecto:** Sistema de Gestión IoT  
**Fecha:** 7 de abril de 2026  
**Versión:** 2.0.0  

---

## 1. Lenguaje y Tecnologías Utilizadas

### TypeScript 5.5

El frontend está desarrollado en **TypeScript**, un superconjunto tipado de JavaScript creado por Microsoft. Sus características principales son:

| Característica | Descripción |
|---|---|
| **Tipado estático** | Permite declarar tipos de variables, parámetros y retornos en tiempo de compilación, evitando errores comunes en ejecución. |
| **Interfaces y tipos genéricos** | Se usan extensivamente (por ejemplo `PageResponse<T>`, `GenericDataWithId`) para modelar las respuestas del backend de forma segura. |
| **Compatibilidad con JavaScript** | Todo código JS válido es TS válido; se transpila a JS estándar para el navegador. |
| **Autocompletado y refactorización** | El tipado permite herramientas de desarrollo superiores en editores como VS Code. |
| **Módulos ES** | Se usa `"type": "module"` en el proyecto, aprovechando la sintaxis `import/export` nativa. |

### React 18.3

La biblioteca de UI elegida es **React**, utilizada en su variante funcional con Hooks:

- **Componentes funcionales** — Todas las vistas (`Dashboard`, `Usuarios`, `Dispositivos`, etc.) son funciones.
- **Hooks personalizados** — `useAuth()`, `useGetQuery()`, `useSendDataMutation()`, `useDeleteByIdMutation()`.
- **Context API** — `AuthContext` maneja el estado global de la sesión del usuario.
- **Virtual DOM** — React compara el DOM virtual con el real para minimizar re-renderizados.

---

## 2. Aspectos de Seguridad

### 2.1 Cifrado de Tránsito — AES-256-CBC

Toda la comunicación de datos entre frontend y backend se cifra con **AES-256-CBC** (Advanced Encryption Standard, modo Cipher Block Chaining).

**¿Cómo funciona?**

```
Frontend                                        Backend
   │                                               │
   │  1. Prepara objeto JSON {first_name, ...}     │
   │  2. Genera IV aleatorio (16 bytes)            │
   │  3. Deriva clave con SHA-256(secreto)         │
   │  4. Cifra con AES-256-CBC                     │
   │  5. Envía: { pl: "base64(iv):base64(ct)" }   │
   │──────────────────────────────────────────────► │
   │                                               │  6. Descifra con misma clave
   │                                               │  7. Procesa datos
   │  8. Recibe: { pl: "base64(iv):base64(ct)" }  │
   │ ◄──────────────────────────────────────────── │
   │  9. Descifra y muestra al usuario             │
```

- **Clave compartida:** `"me_tienes_que_cambiar_2026"` — se deriva a 32 bytes usando SHA-256.
- **IV (Vector de Inicialización):** Se genera aleatoriamente con `randomBytes(16)` en cada operación, impidiendo que dos cifrados iguales produzcan la misma salida.
- **Formato de transmisión:** `base64(iv):base64(ciphertext)` — compatible con el middleware `AesCbcCryptography` del backend.
- **Librería:** `crypto-browserify` (polyfill del módulo `crypto` de Node.js para el navegador).

### 2.2 Autenticación JWT (Bearer Token)

- El sistema de login está **separado por rol**, cada uno con su propia pantalla y endpoint:
  - Admin Master / Admin Normal → `POST /api/v1/auth/login/admin`
  - Gerente → `POST /api/v1/auth/login/manager`
  - Usuario → `POST /api/v1/auth/login/user`
- Los usuarios deben además **seleccionar el servicio** al que están asignados antes de acceder al login (Monitoreo Ambiental o Control Industrial).
- El backend valida con **bcrypt** y devuelve un JWT (`access_token`).
- Cada petición subsecuente incluye el header: `Authorization: Bearer <token>`.
- El token contiene: `account_type` (administrator/manager/user) e `is_master` (booleano).
- Política de **sesión única**: solo una sesión activa por cuenta (error 409 si ya existe).

### 2.3 Control de Acceso Basado en Roles (RBAC)

El frontend implementa protección en tres niveles:

| Nivel | Mecanismo | Archivo |
|---|---|---|
| **Rutas protegidas** | `ProtectedRoute` verifica sesión, `requiredType` y `requireMaster` antes de renderizar. Si no cumple, redirige. | `ProtectedRoute.tsx` |
| **Navegación filtrada** | `SidebarLayout` filtra los `navItems` según `allowedTypes` e `isMaster` del usuario autenticado. | `SidebarLayout.tsx` |
| **Acciones CRUD** | Cada página de gestión evalúa `canCreate`, `canEdit`, `canDelete` según el rol. Los botones se ocultan si no tiene permiso. | `Gestion.tsx` |

**Roles del sistema:**

| Rol | Permisos |
|---|---|
| **administrator (master)** | Control total: CRUD de usuarios, gerentes, administradores y dispositivos (16/16 permisos) |
| **administrator (normal)** | Ver entidades, crear servicios, asignar dispositivos (4/16 permisos) |
| **manager** | CRUD de usuarios, crear servicios, ver reportes (5/16 permisos) |
| **user** | Solo lectura: ver dispositivos y reportes (2/16 permisos) |

### 2.4 Confirmación de Eliminación con Motivo

Antes de eliminar cualquier entidad, se presenta un diálogo (`ConfirmDeleteDialog`) que:
1. Muestra el nombre de la entidad a eliminar.
2. Requiere un **motivo escrito** (mínimo 3 caracteres).
3. Solo entonces ejecuta la petición DELETE.

Esto proporciona trazabilidad y previene eliminaciones accidentales.

### 2.5 Validación de Entrada (Yup)

Todos los formularios validan datos con esquemas **Yup** antes de enviarlos:
- Nombres: solo letras (regex), 2-60 caracteres.
- Email: formato válido, 6-254 caracteres.
- Contraseña: mínimo 8 caracteres.
- IP: formato `xxx.xxx.xxx.xxx`.
- MAC: formato `AA:BB:CC:DD:EE:FF`.
- CURP: 18 caracteres alfanuméricos.
- RFC: 12-13 caracteres.

Esto previene inyección de datos malformados y cumple con la validación en límites del sistema (OWASP).

---

## 3. Servidor de Desarrollo y Producción

### 3.1 Vite 5.4 (Desarrollo)

**¿Qué es?** Vite es un servidor de desarrollo y bundler de nueva generación para aplicaciones web.

**¿Para qué sirve?**
- Sirve archivos con **Hot Module Replacement (HMR)** — los cambios se reflejan instantáneamente sin recargar la página.
- Transpila TypeScript y JSX en tiempo real usando **esbuild** (extremadamente rápido).
- Provee polyfills de Node.js para que `crypto-browserify` funcione en el navegador.

**Configuración (`vite.config.ts`):**
```typescript
export default defineConfig({
    base: "/",
    plugins: [react(), nodePolyfills()],
    server: { port: 3000 },
});
```

### 3.2 Nginx 1.25 (Producción)

En producción, el frontend se empaqueta en un contenedor Docker multi-etapa:

1. **Etapa 1 — Build:** `node:20-alpine` ejecuta `npm run build` generando archivos estáticos en `/dist`.
2. **Etapa 2 — Serve:** `nginx:1.25-alpine` sirve los archivos estáticos en el puerto 3000.

Nginx maneja las rutas tipo SPA redirigiendo todas las peticiones a `index.html`:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 4. Endpoints a Consumir

Todos los endpoints usan el prefijo **`/api/v1/`** y esperan/responden payloads cifrados con AES-256-CBC (campo `pl`).

### 4.1 Autenticación

El login se realiza a través de **endpoints específicos por rol**:

| Método | Endpoint | Descripción | Rol |
|---|---|---|---|
| `POST` | `/auth/login/admin` | Login de administradores (master y normal) | administrator |
| `POST` | `/auth/login/manager` | Login de gerentes | manager |
| `POST` | `/auth/login/user` | Login de usuarios (por servicio) | user |

**Rutas del frontend por tipo de login:**

| Ruta Frontend | Endpoint API | Pantalla |
|---|---|---|
| `/login/admin-master` | `auth/login/admin` | Login azul — Admin Master |
| `/login/admin-normal` | `auth/login/admin` | Login cyan — Admin Normal |
| `/login/gerente` | `auth/login/manager` | Login verde — Gerente |
| `/login/usuario/monitoreo-ambiental` | `auth/login/user` | Login violeta — Servicio Monitoreo Ambiental |
| `/login/usuario/control-industrial` | `auth/login/user` | Login violeta — Servicio Control Industrial |

**Respuesta exitosa:**
```json
{
    "access_token": "eyJ...",
    "token_type": "bearer",
    "account_type": "administrator",
    "is_master": true
}
```

### 4.2 Usuarios

| Método | Endpoint | Descripción | Permiso |
|---|---|---|---|
| `GET` | `/users/?limit=N&offset=N` | Listar usuarios (paginado) | admin, manager |
| `POST` | `/users/` | Crear usuario | admin, manager |
| `PATCH` | `/users/{id}` | Editar usuario | admin, manager |
| `DELETE` | `/users/{id}` | Eliminar usuario | admin |

### 4.3 Dispositivos

| Método | Endpoint | Descripción | Permiso |
|---|---|---|---|
| `GET` | `/devices/?limit=N&offset=N` | Listar dispositivos | todos |
| `POST` | `/devices/` | Crear dispositivo | admin |
| `PATCH` | `/devices/{id}` | Editar dispositivo | admin |
| `DELETE` | `/devices/{id}` | Eliminar dispositivo | admin |

### 4.4 Administradores

| Método | Endpoint | Descripción | Permiso |
|---|---|---|---|
| `GET` | `/administrators/?limit=N&offset=N` | Listar admins | admin master |
| `POST` | `/administrators/` | Crear admin | admin master |
| `PATCH` | `/administrators/{id}` | Editar admin | admin master |
| `DELETE` | `/administrators/{id}` | Eliminar admin | admin master |

### 4.5 Gerentes

| Método | Endpoint | Descripción | Permiso |
|---|---|---|---|
| `GET` | `/managers/?limit=N&offset=N` | Listar gerentes | admin |
| `POST` | `/managers/` | Crear gerente | admin |
| `PATCH` | `/managers/{id}` | Editar gerente | admin |
| `DELETE` | `/managers/{id}` | Eliminar gerente | admin |

### 4.6 Formato de Paginación

Todas las respuestas `GET` de listas usan el formato:
```json
{
    "total": 5,
    "offset": 0,
    "limit": 100,
    "data": [ ... ]
}
```

---

## 5. Conexión Frontend ↔ Backend

La conexión se establece mediante **HTTP REST** con las siguientes capas de procesamiento:

### Flujo de una Petición (Escritura)

```
1. Usuario llena formulario → Formik valida con Yup
2. useSendDataMutation() recibe los datos
3. encrypt(datos, clave) → genera payload cifrado { pl: "iv:ct" }
4. fetch(POST/PATCH, { body: JSON.stringify(payload), headers: { Authorization: Bearer token } })
5. Backend descifra → procesa → cifra respuesta
6. Frontend recibe → decrypt(response.pl) → actualiza UI con React Query
```

### Flujo de una Petición (Lectura)

```
1. useGetQuery("endpoint", session) se ejecuta al montar el componente
2. fetch(GET, { headers: { Authorization: Bearer token } })
3. Backend cifra respuesta → { pl: "iv:ct" }
4. Frontend descifra → React Query cachea el resultado
5. Componente se re-renderiza con los datos
```

### Variable de Entorno

La URL base del backend se configura en `.env`:
```
VITE_API_BASE_URL=http://localhost:8000/api/v1/
```

En Docker se pasa como build arg:
```dockerfile
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
```

### Modo Demo

Existe un modo demo (`DEMO_MODE = true` en `mock.ts`) que intercepta todas las llamadas API y retorna datos ficticios sin necesidad del backend. Cuentas de prueba:

| Email | Contraseña | Rol | Login |
|---|---|---|---|
| `admin@demo.com` | `password` | Administrador Master | `/login/admin-master` |
| `admin2@demo.com` | `password` | Administrador Normal | `/login/admin-normal` |
| `gerente@demo.com` | `password` | Gerente | `/login/gerente` |
| `usuario@demo.com` | `password` | Usuario (genérico) | — |
| `user1.amb@demo.com` | `password` | Usuario — Monitoreo Ambiental | `/login/usuario/monitoreo-ambiental` |
| `user2.amb@demo.com` | `password` | Usuario — Monitoreo Ambiental | `/login/usuario/monitoreo-ambiental` |
| `user1.ind@demo.com` | `password` | Usuario — Control Industrial | `/login/usuario/control-industrial` |
| `user2.ind@demo.com` | `password` | Usuario — Control Industrial | `/login/usuario/control-industrial` |

### Servicios Demo

| Servicio | Descripción | Usuarios asignados |
|---|---|---|
| **Monitoreo Ambiental** | Temperatura, humedad y calidad del aire — sensores ambientales en tiempo real | `user1.amb@demo.com`, `user2.amb@demo.com` |
| **Control Industrial** | Actuadores, motores y cámaras — automatización y seguridad industrial | `user1.ind@demo.com`, `user2.ind@demo.com` |

---

## 6. Arquitectura del Sistema

### Tipo de Arquitectura: SPA + REST API

El proyecto sigue una arquitectura **Single Page Application (SPA)** con separación clara frontend/backend:

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (SPA)                      │
│  React + TypeScript + Vite                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Capa de Presentación                │   │
│  │  Pages: Dashboard, Usuarios, Dispositivos, etc.  │   │
│  │  Components: SidebarLayout, Gestion, EditarDialog│   │
│  └──────────────────────┬───────────────────────────┘   │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │              Capa de Estado                       │   │
│  │  React Query (cache, refetch)                     │   │
│  │  AuthContext (sesión global)                       │   │
│  └──────────────────────┬───────────────────────────┘   │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │              Capa de Comunicación                 │   │
│  │  functions.ts (fetch + AES encrypt/decrypt)       │   │
│  │  crypto.ts (AES-256-CBC)                          │   │
│  └──────────────────────┬───────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTPS + JSON { pl: "iv:ct" }
                          │ Authorization: Bearer <JWT>
┌─────────────────────────┼───────────────────────────────┐
│                     BACKEND (API)                       │
│  FastAPI + Python                                       │
│  ┌──────────────────────┴───────────────────────────┐   │
│  │  Middleware: AesCbcCryptography (descifra/cifra)  │   │
│  │  Auth: JWT + bcrypt                               │   │
│  │  ORM: SQLModel + aiosqlite                        │   │
│  │  NoSQL: MongoDB (lecturas sensores)               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Patrón de Componentes

- **Componente genérico reutilizable** — `Gestion<T>` recibe columnas, validaciones y endpoints como props; renderiza la tabla DataGrid + diálogos de CRUD para cualquier entidad.
- **Composición sobre herencia** — Cada página (Usuarios, Dispositivos, etc.) compone `Gestion` con su configuración específica.

---

## 7. Flujo del Proceso

### 7.1 Flujo de Autenticación (Login separado por rol y servicio)

```
1. Usuario abre la aplicación → ProtectedRoute detecta que no hay sesión
2. Redirige a /login → LoginSelector muestra 4 tarjetas de rol
3. Usuario selecciona su tipo de acceso:
   a. Admin Master  → /login/admin-master  (formulario azul)
   b. Admin Normal   → /login/admin-normal  (formulario cyan)
   c. Gerente        → /login/gerente        (formulario verde)
   d. Usuario        → /login/usuario        (selector de servicio)
4. Si eligió "Usuario":
   4a. LoginUsuarioServices muestra 2 tarjetas de servicio
   4b. Selecciona servicio → /login/usuario/monitoreo-ambiental o /login/usuario/control-industrial
5. RoleLogin muestra formulario con colores y badge del rol/servicio
6. Usuario ingresa email y contraseña
7. AuthProvider llama POST /api/v1/auth/login/{tipo} (admin, manager o user)
8. Backend valida con bcrypt → devuelve JWT (o 409 si ya hay sesión activa)
9. AuthProvider almacena SessionCredentials { token, accountType, isMaster }
10. React Router redirige a / (Dashboard)
11. SidebarLayout filtra navegación según el rol
```

### 7.2 Flujo de Operación CRUD

```
1. Usuario navega a una sección (ej. /dispositivos)
2. ProtectedRoute verifica permisos → renderiza Dispositivos
3. useGetQuery("devices/") → fetch GET con Bearer token → descifra respuesta
4. DataGrid muestra la lista con filtros de historial (Todos/Activos/Inactivos)
5a. CREAR: Clic "Crear" → EditarDialog (POST) → formulario con validación Yup → cifra y envía
5b. EDITAR: Clic "Editar" → EditarDialog (PATCH) → solo envía campos modificados
5c. ELIMINAR: Clic "Eliminar" → ConfirmDeleteDialog → usuario escribe motivo → DELETE
6. Tabla se actualiza localmente (optimista) + React Query revalida en background
```

---

## 8. Diagramas

*(Ver archivos adjuntos en la carpeta `Reporte/`)*

| Archivo | Contenido |
|---|---|
| `Diagrama_Comunicacion.md` | Diagrama de secuencia original (cifrado AES, CRUD, roles) |
| `Diagrama_Comunicacion_Frontend.md` | Comunicación actualizada: login por rol/servicio, CRUD completo, componentes internos, mapa de rutas |
| `Diagrama_Flujo_Frontend.md` | Flujos: navegación general, autenticación por rol, operaciones CRUD, protección de rutas |

---

## 9. Estructura del Frontend

```
frontend/
├── public/                     # Archivos estáticos
├── src/
│   ├── main.tsx                # Punto de entrada: theme, router, providers
│   ├── components/
│   │   ├── SidebarLayout.tsx   # Layout principal: sidebar + appbar + contenido
│   │   ├── Gestion.tsx         # Tabla CRUD genérica reutilizable
│   │   ├── EditarDialog.tsx    # Diálogo de crear/editar con Formik
│   │   └── ConfirmDeleteDialog.tsx  # Diálogo de confirmación de eliminación
│   ├── pages/
│   │   ├── LoginSelector.tsx       # Selector de tipo de acceso (4 roles)
│   │   ├── LoginUsuarioServices.tsx # Selector de servicio para usuarios
│   │   ├── RoleLogin.tsx           # Login parametrizado por rol/servicio
│   │   ├── Login.tsx               # (Legacy) Login único original
│   │   ├── Dashboard.tsx           # Panel principal con stats, actividad, alertas
│   │   ├── Usuarios.tsx            # Gestión de usuarios
│   │   ├── Dispositivos.tsx        # Gestión de dispositivos IoT
│   │   ├── Administradores.tsx     # Gestión de administradores
│   │   └── Gerentes.tsx            # Gestión de gerentes
│   └── shared/
│       ├── crypto.ts           # Cifrado/descifrado AES-256-CBC
│       ├── auth/
│       │   ├── authContext.tsx  # Contexto de autenticación (login, logout, sesión)
│       │   └── ProtectedRoute.tsx # Guardia de rutas por rol
│       └── api/
│           ├── types.ts        # Interfaces TypeScript para API
│           ├── functions.ts    # Hooks de React Query (GET, POST, PATCH, DELETE)
│           ├── mock.ts         # Datos ficticios y modo demo
│           └── schemas/
│               └── validation.ts # Esquemas Yup para validación de formularios
├── .env                        # VITE_API_BASE_URL
├── Dockerfile                  # Build multi-etapa (node → nginx)
├── nginx.conf                  # Config de nginx para SPA
├── docker-compose.yml          # Orquestación con Docker Compose
├── vite.config.ts              # Configuración de Vite + polyfills
├── tsconfig.json               # Configuración de TypeScript
└── package.json                # Dependencias y scripts
```

---

## 10. Librerías Instaladas

### Dependencias de Producción

| Librería | Versión | Propósito |
|---|---|---|
| **react** | 18.3.1 | Biblioteca de UI — componentes funcionales, Virtual DOM, Hooks |
| **react-dom** | 18.3.1 | Renderizado de React en el DOM del navegador |
| **react-router-dom** | 6.26.2 | Enrutamiento SPA — rutas declarativas, `useNavigate`, `Navigate` |
| **@mui/material** | 6.1.1 | Componentes UI de Material Design (Button, Dialog, Paper, Grid, etc.) |
| **@mui/icons-material** | 6.1.3 | Iconos SVG de Material Design (DevicesIcon, PeopleIcon, etc.) |
| **@mui/x-data-grid** | 7.19.0 | Tabla avanzada con paginación, ordenamiento y columnas personalizadas |
| **@emotion/react** | 11.13.3 | Motor CSS-in-JS requerido por MUI para estilos dinámicos |
| **@emotion/styled** | 11.13.0 | API `styled()` para componentes con estilos encapsulados |
| **@tanstack/react-query** | 5.59.0 | Gestión de estado del servidor — cache, refetch, mutaciones |
| **formik** | 2.4.6 | Gestión de formularios — estado, validación, submit |
| **yup** | 1.4.0 | Validación de esquemas — reglas declarativas para cada campo |
| **crypto-browserify** | 3.12.0 | Polyfill de `crypto` de Node.js para cifrado AES en el navegador |
| **assert** | 2.1.0 | Polyfill de `assert` de Node.js (dependencia de crypto-browserify) |
| **stream-browserify** | 3.0.0 | Polyfill de `stream` de Node.js (dependencia de crypto-browserify) |

### Dependencias de Desarrollo

| Librería | Versión | Propósito |
|---|---|---|
| **typescript** | 5.5.3 | Compilador TypeScript — tipado estático, transpilación a JS |
| **vite** | 5.4.1 | Bundler y servidor de desarrollo con HMR |
| **@vitejs/plugin-react** | 4.3.1 | Plugin de Vite para JSX/TSX + Fast Refresh |
| **vite-plugin-node-polyfills** | 0.22.0 | Polyfills automáticos de módulos Node.js (crypto, stream, buffer) |
| **eslint** | 9.9.0 | Linter de código — detecta errores y malas prácticas |
| **eslint-plugin-react-hooks** | 5.1.0-rc.0 | Reglas ESLint para uso correcto de Hooks de React |
| **eslint-plugin-react-refresh** | 0.4.9 | Reglas ESLint para compatibilidad con Fast Refresh |
| **typescript-eslint** | 8.0.1 | Parser de ESLint para TypeScript |
| **@types/react** | 18.3.3 | Definiciones de tipos TypeScript para React |
| **@types/react-dom** | 18.3.0 | Definiciones de tipos TypeScript para ReactDOM |
| **@types/node** | 22.7.4 | Definiciones de tipos TypeScript para APIs de Node.js |
| **globals** | 15.9.0 | Variables globales para configuración de ESLint |

---
## Definiciones
TypeScript — Es un lenguaje creado por Microsoft que extiende JavaScript añadiendo tipos estáticos. Escribes name: string en vez de solo name, y el compilador te avisa en tiempo de desarrollo si intentas pasar un número donde se espera texto. Se transpila a JavaScript normal antes de ejecutarse en el navegador.

SPA (Single Page Application) — Es una arquitectura web donde el navegador carga una sola página HTML al inicio. Después, toda la navegación (cambiar de Dashboard a Dispositivos, por ejemplo) ocurre sin recargar la página: JavaScript reemplaza el contenido dinámicamente. Esto da una experiencia fluida tipo app de escritorio. El backend solo sirve datos (JSON), no genera HTML.

React — Es la librería de Facebook para construir interfaces con componentes reutilizables. Cada vista (un botón, una tabla, una página entera) es una función que recibe datos (props) y devuelve lo que debe mostrarse. React compara lo que hay en pantalla con lo que debería haber y solo actualiza lo que cambió (Virtual DOM).

Yup — Es una librería de validación de esquemas. Defines reglas declarativas como "el email debe ser válido y obligatorio, la contraseña mínimo 8 caracteres", y Yup valida automáticamente los datos del formulario antes de enviarlos. Se integra con Formik (gestor de formularios) para mostrar errores en tiempo real.

El modo demo es un sistema de datos ficticios que permite usar el frontend completo sin necesidad de tener el backend corriendo.

En mock.ts hay una constante DEMO_MODE = true. Cuando está activada, todas las llamadas a la API se interceptan antes de salir al servidor y en su lugar devuelven datos inventados con un pequeño delay simulado (200-300ms).

Qué contiene:

10 cuentas de prueba con email/contraseña predefinidos: 4 genéricas (admin@demo.com, admin2@demo.com, gerente@demo.com, usuario@demo.com) y 4 por servicio (user1.amb@demo.com, user2.amb@demo.com, user1.ind@demo.com, user2.ind@demo.com — todas con password "password"). Cada una devuelve un TokenResponse falso con su rol correspondiente.
Arrays de datos falsos — 5 usuarios, 2 administradores, 3 gerentes y 6 dispositivos, cada uno con IDs, nombres, fechas y estados inventados.
2 servicios demo — Monitoreo Ambiental y Control Industrial, cada uno con 2 usuarios asignados.

## Para conectar frontend con backend necesitas:

Una URL base — La dirección donde corre el backend (ej. http://localhost:8000/api/v1/). En nuestro proyecto está en .env como VITE_API_BASE_URL.

fetch() o un cliente HTTP — Para hacer peticiones REST. Nosotros usamos fetch() nativo envuelto en hooks de React Query.

Autenticación compartida — El backend emite un JWT al hacer login; el frontend lo guarda en memoria y lo envía en cada petición como Authorization: Bearer <token>.

Formato de datos acordado — Ambos deben hablar el mismo "idioma". En nuestro caso es JSON cifrado con AES-256-CBC: el frontend cifra antes de enviar y descifra al recibir, usando la misma clave que el backend.

CORS habilitado — El backend debe permitir peticiones desde el dominio del frontend (FastAPI lo configura con CORSMiddleware).

## Resumen

Este frontend implementa una aplicación de gestión IoT empresarial con enfoque en **seguridad** (cifrado AES-256-CBC de todo el tráfico, autenticación JWT, RBAC en rutas y acciones, validación exhaustiva de formularios), **reutilización** (componente genérico `Gestion<T>` para todas las entidades CRUD), y **fidelidad visual** al wireframe original (sidebar con secciones, stat cards, status badges, activity feed, alerts panel). La arquitectura SPA + REST API permite una separación limpia entre presentación y lógica de negocio, con React Query como capa de cache inteligente entre ambos.
