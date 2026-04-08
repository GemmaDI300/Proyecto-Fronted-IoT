# 📘 Documentación Completa - API Plataforma IoT v1.1

## Índice
1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Herramientas y Tecnologías](#3-herramientas-y-tecnologías)
4. [Entidades del Sistema](#4-entidades-del-sistema)
5. [Sistema de Autenticación](#5-sistema-de-autenticación)
6. [Sistema de Permisos RBAC](#6-sistema-de-permisos-rbac)
7. [Endpoints de la API](#7-endpoints-de-la-api)
8. [Procesos por Entidad](#8-procesos-por-entidad)
9. [Servicios Implementables](#9-servicios-implementables)
10. [Seguridad](#10-seguridad)

---

## 1. Descripción General

**Auto-IOTSERVER** es una plataforma IoT de nivel empresarial construida con FastAPI que permite:
- Gestión de dispositivos IoT con autenticación criptográfica
- Recolección y consulta de datos de sensores (temperatura, humedad, batería)
- Administración multinivel con 4 tipos de usuarios
- Sistema RBAC (Control de Acceso Basado en Roles) con 16 permisos granulares
- Política de sesión única por entidad
- Registro de eventos de autenticación (audit log)

---

## 2. Arquitectura del Sistema

### Componentes de Infraestructura
```
┌─────────────┐     ┌──────────┐     ┌───────────┐
│   Cliente    │────▶│  Nginx   │────▶│  FastAPI   │
│  (Browser/   │     │ (Reverse │     │ (Uvicorn)  │
│  IoT Device) │     │  Proxy)  │     │            │
└─────────────┘     └──────────┘     └─────┬──────┘
                                           │
                    ┌──────────────────────┤
                    │            │          │
               ┌────▼───┐  ┌───▼────┐  ┌──▼─────┐
               │ MySQL  │  │MongoDB │  │ Redis  │
               │  8.0   │  │  7.0   │  │  7.0   │
               │(RBAC,  │  │(Sensor │  │(Sesión │
               │Users,  │  │Data,   │  │ única, │
               │Devices)│  │Alerts) │  │ Tokens)│
               └────────┘  └────────┘  └────────┘
```

### Flujo de Datos
- **MySQL**: Almacena entidades relacionales (usuarios, admins, gerentes, dispositivos, roles, permisos, servicios, apps)
- **MongoDB**: Almacena datos de sensores (lecturas de temperatura, humedad, batería), logs de dispositivos y alertas
- **Redis**: Gestiona sesiones activas con política de sesión única, almacena JTIs de tokens JWT

### Capas de Seguridad (5 niveles)
1. **nftables** - Firewall a nivel de kernel con rate limiting
2. **fail2ban** - Detección y bloqueo de intrusos (5 jails)
3. **Nginx** - Rate limiting, headers de seguridad, reverse proxy
4. **FastAPI** - Autenticación JWT, RBAC, validación de entrada
5. **Docker** - Aislamiento de contenedores en red interna

---

## 3. Herramientas y Tecnologías

### Backend
| Herramienta | Versión | Uso |
|------------|---------|-----|
| **Python** | 3.11+ | Lenguaje principal |
| **FastAPI** | Latest | Framework web API REST |
| **Uvicorn** | Latest | Servidor ASGI |
| **SQLAlchemy** | Latest | ORM para MySQL |
| **PyMongo** | Latest | Driver para MongoDB |
| **Pydantic** | v2 | Validación de esquemas |
| **python-jose** | Latest | Manejo de JWT |
| **argon2-cffi** | Latest | Hashing de contraseñas |
| **PyCryptodome** | Latest | Cifrado AES-256-CBC para dispositivos |
| **redis-py** | Latest | Cliente Redis para sesiones |

### Bases de Datos
| Base de Datos | Versión | Uso |
|--------------|---------|-----|
| **MySQL** | 8.0 | Datos relacionales (RBAC, entidades) |
| **MongoDB** | 7.0 | Datos de sensores (time-series) |
| **Redis** | 7.0 | Cache de sesiones / Tokens activos |

### Infraestructura
| Herramienta | Uso |
|------------|-----|
| **Docker** | Contenedorización de servicios |
| **Docker Compose** | Orquestación multi-contenedor |
| **Nginx** | Reverse proxy, TLS, rate limiting |
| **nftables** | Firewall de red |
| **fail2ban** | Protección contra brute force |

---

## 4. Entidades del Sistema

### 4.1 Administrador (Admin)
- **Tabla**: `admin`
- **Campos**: id, nombre, email, created_at, rol_id, pasadmin_id
- **Roles posibles**: `admin_master` (rol_id=1), `admin_normal` (rol_id=2)
- **Relaciones**: Tiene un PasAdmin (contraseña), un Rol, crea Dispositivos y Gerentes

### 4.2 Gerente (Manager)
- **Tabla**: `gerente`
- **Campos**: id, nombre, email, created_at, admin_id, pasgerente_id, rol_id
- **Rol**: `manager` (rol_id=4)
- **Relaciones**: Pertenece a un Admin, tiene PasGerente, gestiona Servicios

### 4.3 Usuario (User)
- **Tabla**: `usuario`
- **Campos**: id, nombre, email, rol_id, is_active, created_at, updated_at, pasusuario_id
- **Rol**: `user` (rol_id=3)
- **Relaciones**: Tiene PasUsuario, accede a Servicios asignados

### 4.4 Dispositivo (Device)
- **Tabla**: `dispositivo`
- **Campos**: id, nombre, device_type, is_active, created_at, updated_at, admin_id, pasdispositivo_id
- **Relaciones**: Pertenece a un Admin, tiene PasDispositivo (api_key + encryption_key)

### 4.5 Servicio (Service)
- **Tabla**: `servicio`
- **Campos**: id, nombre, descripcion, fecha_inicio, fecha_fin, estado (conectado/desconectado), gerente_id
- **Relaciones**: Gestionado por un Gerente, vincula Dispositivos y Apps

### 4.6 Aplicación (App)
- **Tabla**: `app`
- **Campos**: id, nombre, version, url, admin_id
- **Relaciones**: Creada por un Admin, vinculada a Servicios

### 4.7 Tablas de Contraseñas (Segregadas)
| Tabla | Entidad | Campos clave |
|-------|---------|-------------|
| `pasadmin` | Admin | hashed_password (Argon2), encryption_key |
| `pasusuario` | Usuario | hashed_password (Argon2), encryption_key |
| `pasgerente` | Gerente | hashed_password (Argon2), encryption_key |
| `pasdispositivo` | Dispositivo | api_key (UUID), encryption_key (AES-256) |

### 4.8 Tablas de Relación (Muchos a Muchos)
| Tabla | Vincula | Campos |
|-------|---------|--------|
| `rol_permiso` | Rol ↔ Permiso | role_id, permiso_id |
| `usuario_servicio` | Usuario ↔ Servicio | usuario_id, servicio_id, gerente_id |
| `servicio_dispositivo` | Servicio ↔ Dispositivo | servicio_id, dispositivo_id, admin_id |
| `servicio_app` | Servicio ↔ Aplicación | servicio_id, app_id, admin_id |

---

## 5. Sistema de Autenticación

### 5.1 Tipos de Login
| Endpoint | Tipo | Método de Auth |
|----------|------|---------------|
| `POST /api/v1/auth/login/user` | Usuario | Email + Contraseña (Argon2) |
| `POST /api/v1/auth/login/admin` | Administrador | Email + Contraseña (Argon2) |
| `POST /api/v1/auth/login/manager` | Gerente | Email + Contraseña (Argon2) |
| `POST /api/v1/auth/device/login` | Dispositivo | API Key + Puzzle Criptográfico (AES-256-CBC + HMAC-SHA256) |

### 5.2 Política de Sesión Única
- Cada entidad solo puede tener **una sesión activa** simultánea
- Si intenta logearse con sesión activa → **HTTP 409 Conflict**
- Debe hacer `POST /api/v1/auth/logout` antes de un nuevo login
- Las sesiones se almacenan en Redis con TTL (1h para humanos, 24h para dispositivos)

### 5.3 Flujo de Autenticación por Contraseña
1. Recibir email + password
2. Buscar entidad en MySQL
3. Verificar hash Argon2
4. Verificar que no haya sesión activa en Redis (409 si existe)
5. Generar token JWT con JTI único
6. Guardar JTI en Redis con TTL
7. Registrar evento en log CSV
8. Retornar token + metadata

### 5.4 Flujo de Autenticación de Dispositivo (Puzzle Criptográfico)
1. Dispositivo genera un nonce aleatorio de 32 bytes
2. Calcula HMAC-SHA256 con (device_key + server_key) sobre el nonce
3. Cifra el resultado con AES-256-CBC usando su clave
4. Envía: device_id, api_key, puzzle_response
5. Servidor verifica: api_key válida → descifra puzzle → recalcula HMAC → compara
6. Si válido → genera JWT (24h) → guarda sesión en Redis

---

## 6. Sistema de Permisos RBAC

### 6.1 Roles
| ID | Rol | Descripción |
|----|-----|-------------|
| 1 | `admin_master` | Control total del sistema (16/16 permisos) |
| 2 | `admin_normal` | Operaciones básicas (4/16 permisos) |
| 3 | `user` | Solo visualización (2/16 permisos) |
| 4 | `manager` | Operacional + crear usuarios (5/16 permisos) |

### 6.2 Permisos por Rol

| Permiso | admin_master | admin_normal | manager | user |
|---------|:---:|:---:|:---:|:---:|
| create_user | ✅ | ❌ | ✅ | ❌ |
| edit_user | ✅ | ❌ | ❌ | ❌ |
| delete_user | ✅ | ❌ | ❌ | ❌ |
| create_service | ✅ | ✅ | ✅ | ❌ |
| assign_device | ✅ | ✅ | ✅ | ❌ |
| view_reports | ✅ | ✅ | ✅ | ✅ |
| view_all_users | ✅ | ✅ | ✅ | ✅ |
| create_manager | ✅ | ❌ | ❌ | ❌ |
| edit_manager | ✅ | ❌ | ❌ | ❌ |
| delete_manager | ✅ | ❌ | ❌ | ❌ |
| create_admin | ✅ | ❌ | ❌ | ❌ |
| manage_roles | ✅ | ❌ | ❌ | ❌ |
| grant_permissions | ✅ | ❌ | ❌ | ❌ |
| create_device | ✅ | ❌ | ❌ | ❌ |
| edit_device | ✅ | ❌ | ❌ | ❌ |
| delete_device | ✅ | ❌ | ❌ | ❌ |

---

## 7. Endpoints de la API

### 7.1 Autenticación (`/api/v1/auth`)
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/login/user` | Login de usuario | No |
| POST | `/login/admin` | Login de administrador | No |
| POST | `/login/manager` | Login de gerente | No |
| POST | `/device/login` | Login de dispositivo (puzzle) | No |
| POST | `/logout` | Cerrar sesión (invalidar token) | Bearer JWT |
| POST | `/device/generate-puzzle-test` | Generar puzzle de prueba | No (Testing) |
| POST | `/device/init-encryption-key` | Inicializar clave de cifrado | No (Testing) |

### 7.2 Usuarios (`/api/v1/users`)
| Método | Endpoint | Descripción | Permiso requerido |
|--------|----------|-------------|-------------------|
| GET | `/me` | Perfil del usuario autenticado | Cualquier JWT válido |
| GET | `/` | Listar todos los usuarios | `view_all_users` |
| POST | `/` | Crear nuevo usuario | `create_user` |
| POST | `/manager` | Crear nuevo gerente | `create_manager` |

### 7.3 Dispositivos (`/api/v1/devices`)
| Método | Endpoint | Descripción | Permiso requerido |
|--------|----------|-------------|-------------------|
| GET | `/` | Listar todos los dispositivos | `view_reports` |
| GET | `/{device_id}` | Obtener dispositivo por ID | `view_reports` |
| POST | `/` | Crear nuevo dispositivo | `create_device` (solo admin_master) |

### 7.4 Sensores (`/api/v1`)
| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/device/reading` | Enviar lectura de sensores | JWT de Dispositivo |
| GET | `/devices/{id}/readings` | Consultar historial de lecturas | JWT de Usuario/Admin/Gerente |

### 7.5 Alertas (`/api/v1/alerts`) - Placeholder
| Método | Endpoint | Descripción | Estado |
|--------|----------|-------------|--------|
| GET | `/` | Listar alertas | No implementado (futuro) |

---

## 8. Procesos por Entidad

### 8.1 Admin Master (rol_id=1) - Control Total
| # | Proceso | Endpoint | Descripción |
|---|---------|----------|-------------|
| 1 | Login | POST /auth/login/admin | Autenticarse con email y contraseña |
| 2 | Logout | POST /auth/logout | Cerrar sesión activa |
| 3 | Ver perfil | GET /users/me | Consultar información propia |
| 4 | Crear usuario | POST /users/ | Registrar nuevos usuarios finales |
| 5 | Editar usuario | (futuro) | Modificar datos de usuario |
| 6 | Eliminar usuario | (futuro) | Desactivar/eliminar usuario |
| 7 | Listar usuarios | GET /users/ | Ver todos los usuarios del sistema |
| 8 | Crear gerente | POST /users/manager | Registrar nuevos gerentes |
| 9 | Editar gerente | (futuro) | Modificar datos de gerente |
| 10 | Eliminar gerente | (futuro) | Desactivar/eliminar gerente |
| 11 | Crear admin | (futuro) | Registrar nuevos administradores |
| 12 | Crear dispositivo | POST /devices/ | Registrar dispositivos IoT |
| 13 | Editar dispositivo | (futuro) | Modificar configuración de dispositivo |
| 14 | Eliminar dispositivo | (futuro) | Desactivar/eliminar dispositivo |
| 15 | Ver dispositivos | GET /devices/ | Listar todos los dispositivos |
| 16 | Ver dispositivo | GET /devices/{id} | Detalle de un dispositivo |
| 17 | Gestionar roles | (futuro) | Crear/editar roles y permisos |
| 18 | Ver lecturas | GET /devices/{id}/readings | Consultar datos de sensores |
| 19 | Crear servicio | (futuro) | Crear servicios IoT |
| 20 | Asignar dispositivo | (futuro) | Vincular dispositivos a servicios |

### 8.2 Admin Normal (rol_id=2) - Operaciones Básicas
| # | Proceso | Endpoint | Descripción |
|---|---------|----------|-------------|
| 1 | Login | POST /auth/login/admin | Autenticarse |
| 2 | Logout | POST /auth/logout | Cerrar sesión |
| 3 | Ver perfil | GET /users/me | Consultar información propia |
| 4 | Listar usuarios | GET /users/ | Ver todos los usuarios |
| 5 | Ver dispositivos | GET /devices/ | Listar dispositivos |
| 6 | Ver dispositivo | GET /devices/{id} | Detalle de dispositivo |
| 7 | Ver reportes (lecturas) | GET /devices/{id}/readings | Consultar datos de sensores |
| 8 | Crear servicio | (futuro) | Crear servicios IoT |
| 9 | Asignar dispositivo | (futuro) | Vincular dispositivos a servicios |

### 8.3 Gerente (Manager, rol_id=4) - Operacional
| # | Proceso | Endpoint | Descripción |
|---|---------|----------|-------------|
| 1 | Login | POST /auth/login/manager | Autenticarse |
| 2 | Logout | POST /auth/logout | Cerrar sesión |
| 3 | Ver perfil | GET /users/me | Consultar información propia |
| 4 | Crear usuario | POST /users/ | Registrar usuarios para sus servicios |
| 5 | Listar usuarios | GET /users/ | Ver todos los usuarios |
| 6 | Ver dispositivos | GET /devices/ | Listar dispositivos |
| 7 | Ver reportes (lecturas) | GET /devices/{id}/readings | Consultar datos de sensores |
| 8 | Crear servicio | (futuro) | Crear servicios IoT |
| 9 | Asignar dispositivo | (futuro) | Vincular dispositivos a servicios |
| 10 | Asignar usuario a servicio | (futuro) | Vincular usuarios a servicios |

### 8.4 Usuario (User, rol_id=3) - Solo Visualización
| # | Proceso | Endpoint | Descripción |
|---|---------|----------|-------------|
| 1 | Login | POST /auth/login/user | Autenticarse |
| 2 | Logout | POST /auth/logout | Cerrar sesión |
| 3 | Ver perfil | GET /users/me | Consultar información propia |
| 4 | Ver reportes (lecturas) | GET /devices/{id}/readings | Consultar datos de sensores |
| 5 | Listar usuarios | GET /users/ | Ver directorio de usuarios |
| 6 | Ver dispositivos | GET /devices/ | Listar dispositivos |

### 8.5 Dispositivo - Telemetría IoT
| # | Proceso | Endpoint | Descripción |
|---|---------|----------|-------------|
| 1 | Login (puzzle) | POST /auth/device/login | Autenticarse con rompecabezas criptográfico |
| 2 | Enviar lecturas | POST /device/reading | Enviar datos de temperatura, humedad, batería |
| 3 | Logout | POST /auth/logout | Cerrar sesión del dispositivo |

---

## 9. Servicios Implementables

### 9.1 Servicio de Monitoreo Ambiental
- **Tipo de dispositivos**: Sensores de temperatura y humedad
- **Datos**: Lecturas periódicas (temperatura °C, humedad %, batería %)
- **Uso**: Monitoreo de condiciones ambientales en almacenes, invernaderos, servidores

### 9.2 Servicio de Seguridad IoT
- **Tipo de dispositivos**: Sensores de movimiento, cámaras, sensores de apertura
- **Datos**: Eventos de detección, estado de dispositivos
- **Uso**: Vigilancia perimetral, control de accesos físicos

### 9.3 Servicio de Automatización Industrial
- **Tipo de dispositivos**: Actuadores, controladores PLC, sensores industriales
- **Datos**: Estados de máquinas, temperaturas operativas, consumo energético
- **Uso**: Control de líneas de producción, mantenimiento predictivo

### 9.4 Servicio de Smart Building
- **Tipo de dispositivos**: Termostatos, sensores de iluminación, medidores de energía
- **Datos**: Consumo energético, temperatura ambiental, ocupación
- **Uso**: Eficiencia energética, confort de ocupantes

### 9.5 Servicio de Gestión de Flotas
- **Tipo de dispositivos**: GPS, sensores de combustible, acelerómetros
- **Datos**: Ubicación, velocidad, consumo, estado del vehículo
- **Uso**: Rastreo de vehículos, optimización de rutas

### 9.6 Servicio de Agricultura Inteligente
- **Tipo de dispositivos**: Sensores de suelo, estaciones meteorológicas, sistemas de riego
- **Datos**: Humedad del suelo, lluvia, viento, luz solar
- **Uso**: Riego automatizado, predicción de cosecha

### 9.7 Servicio de Alertas (Futuro)
- **Estado**: Placeholder en la API (router definido)
- **Funcionalidades planificadas**:
  - Alertas por umbral de sensor (temperatura > X)
  - Alertas por dispositivo desconectado
  - Notificaciones por severidad (info, warning, critical)
  - Historial de alertas en MongoDB

---

## 10. Seguridad

### Medidas Implementadas
1. **Hashing Argon2** - Contraseñas nunca almacenadas en texto plano
2. **JWT con JTI** - Tokens con identificador único para invalidación
3. **Sesión Única** - Una sola sesión por entidad (Redis)
4. **Cifrado AES-256-CBC** - Autenticación de dispositivos IoT
5. **HMAC-SHA256** - Verificación de integridad en puzzles criptográficos
6. **Rate Limiting** - 10 intentos / 5 minutos en endpoints de login
7. **Validación de entrada** - Email, contraseña fuerte, sanitización HTML/JS
8. **Headers de seguridad** - X-Frame-Options, X-Content-Type-Options, etc.
9. **Audit Log** - Registro CSV de todos los eventos de autenticación
10. **Segregación de contraseñas** - Tablas separadas para cada tipo de entidad
11. **Red interna Docker** - Comunicación aislada entre servicios (172.20.0.0/16)
12. **Firewall nftables** - Filtrado a nivel de kernel con rate limiting
13. **fail2ban** - Bloqueo automático por intentos fallidos (5 jails)

---

*Documentación generada para Auto-IOTSERVER v1.1*
