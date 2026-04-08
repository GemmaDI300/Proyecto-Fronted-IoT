# Diagrama de Comunicación — Frontend IoT Platform

Este documento contiene el diagrama de secuencia que ilustra la comunicación completa entre el navegador, el frontend SPA, la capa de cifrado AES-256-CBC, el backend FastAPI y las bases de datos.

## Diagrama de Secuencia

```mermaid
sequenceDiagram
    actor U as Usuario (Navegador)
    participant F as Frontend SPA<br/>(React + TypeScript)
    participant C as Capa Crypto<br/>(AES-256-CBC)
    participant B as Backend API<br/>(FastAPI)
    participant DB as Base de Datos<br/>(MySQL / MongoDB)

    Note over U,DB: ── FLUJO DE AUTENTICACIÓN ──

    U->>F: Ingresa email + contraseña
    F->>F: Valida formato con Yup
    F->>B: POST /api/v1/auth/login<br/>{ email, password }
    B->>DB: Busca usuario por email
    DB-->>B: Datos del usuario
    B->>B: Verifica password con bcrypt
    B-->>F: { access_token (JWT),<br/>account_type, is_master }
    F->>F: AuthContext almacena<br/>SessionCredentials
    F-->>U: Redirige a Dashboard

    Note over U,DB: ── FLUJO DE LECTURA (GET) ──

    U->>F: Navega a /dispositivos
    F->>F: ProtectedRoute verifica<br/>sesión + rol
    F->>B: GET /api/v1/devices/<br/>Authorization: Bearer JWT
    B->>B: Valida JWT
    B->>DB: SELECT dispositivos
    DB-->>B: Lista de dispositivos
    B->>C: Cifra respuesta con AES-256-CBC
    C-->>B: { pl: "base64(iv):base64(ct)" }
    B-->>F: HTTP 200 + payload cifrado
    F->>C: Descifra response.pl
    C-->>F: { total, offset, limit, data: [...] }
    F->>F: React Query cachea resultado
    F-->>U: Renderiza DataGrid con datos

    Note over U,DB: ── FLUJO DE ESCRITURA (POST/PATCH) ──

    U->>F: Llena formulario + clic "Guardar"
    F->>F: Formik valida con esquema Yup
    F->>C: encrypt(datos, clave_compartida)
    C-->>F: { pl: "base64(iv):base64(ct)" }
    F->>B: POST /api/v1/devices/<br/>Authorization: Bearer JWT<br/>Body: { pl: "iv:ct" }
    B->>B: Valida JWT
    B->>C: Descifra payload.pl
    C-->>B: { name, brand, model, ... }
    B->>B: Valida datos en servidor
    B->>DB: INSERT/UPDATE
    DB-->>B: Registro guardado
    B->>C: Cifra respuesta
    C-->>B: { pl: "base64(iv):base64(ct)" }
    B-->>F: HTTP 200/201 + payload cifrado
    F->>C: Descifra respuesta
    C-->>F: Objeto actualizado
    F->>F: Actualiza tabla (local + cache)
    F-->>U: Muestra datos actualizados

    Note over U,DB: ── FLUJO DE ELIMINACIÓN (DELETE) ──

    U->>F: Clic "Eliminar" en fila
    F-->>U: Muestra ConfirmDeleteDialog
    U->>F: Escribe motivo + confirma
    F->>B: DELETE /api/v1/devices/{id}<br/>Authorization: Bearer JWT
    B->>B: Valida JWT + permisos
    B->>DB: DELETE/soft-delete
    DB-->>B: OK
    B-->>F: HTTP 204 No Content
    F->>F: Elimina fila de tabla local
    F-->>U: Tabla actualizada
```

## Diagrama de Arquitectura

```mermaid
graph TB
    subgraph NAVEGADOR["🌐 Navegador del Usuario"]
        UI["Interfaz React<br/>(Componentes + Hooks)"]
    end

    subgraph FRONTEND["📦 Frontend SPA"]
        direction TB
        ROUTER["React Router<br/>+ ProtectedRoute"]
        AUTH["AuthContext<br/>(Sesión JWT)"]
        RQ["React Query<br/>(Cache + Refetch)"]
        CRYPTO_F["crypto.ts<br/>AES-256-CBC<br/>encrypt() / decrypt()"]
        FORMIK["Formik + Yup<br/>(Validación)"]
    end

    subgraph TRANSPORTE["🔒 Canal de Comunicación"]
        HTTP["HTTP REST<br/>JSON { pl: 'iv:ct' }<br/>Authorization: Bearer JWT"]
    end

    subgraph BACKEND["⚙️ Backend API"]
        direction TB
        FASTAPI["FastAPI<br/>Routers v1"]
        MW["Middleware<br/>AesCbcCryptography"]
        JWT["JWT Auth<br/>+ bcrypt"]
        ORM["SQLModel<br/>+ aiosqlite"]
    end

    subgraph DATOS["💾 Bases de Datos"]
        MYSQL["MySQL/SQLite<br/>(Usuarios, Dispositivos,<br/>Admins, Gerentes)"]
        MONGO["MongoDB<br/>(Lecturas sensores,<br/>Alertas)"]
    end

    UI --> ROUTER
    ROUTER --> AUTH
    AUTH --> RQ
    RQ --> CRYPTO_F
    FORMIK --> CRYPTO_F
    CRYPTO_F --> HTTP
    HTTP --> MW
    MW --> FASTAPI
    FASTAPI --> JWT
    FASTAPI --> ORM
    ORM --> MYSQL
    ORM --> MONGO

    style NAVEGADOR fill:#dbeafe,stroke:#2563eb
    style FRONTEND fill:#f0fdf4,stroke:#059669
    style TRANSPORTE fill:#fef3c7,stroke:#d97706
    style BACKEND fill:#ede9fe,stroke:#7c3aed
    style DATOS fill:#fee2e2,stroke:#dc2626
```

## Diagrama de Roles y Permisos

```mermaid
graph LR
    subgraph ROLES["Roles del Sistema"]
        AM["🔑 Admin Master<br/>16/16 permisos"]
        AN["🛡️ Admin Normal<br/>4/16 permisos"]
        GR["👔 Gerente<br/>5/16 permisos"]
        US["👤 Usuario<br/>2/16 permisos"]
    end

    subgraph ENTIDADES["Entidades"]
        USERS["Usuarios"]
        DEVICES["Dispositivos"]
        ADMINS["Administradores"]
        MANAGERS["Gerentes"]
    end

    AM -->|CRUD| USERS
    AM -->|CRUD| DEVICES
    AM -->|CRUD| ADMINS
    AM -->|CRUD| MANAGERS

    AN -->|Ver| USERS
    AN -->|Ver| DEVICES

    GR -->|CRUD| USERS
    GR -->|Ver| DEVICES

    US -->|Ver| DEVICES

    style AM fill:#fef3c7,stroke:#92400e
    style AN fill:#dbeafe,stroke:#2563eb
    style GR fill:#d1fae5,stroke:#059669
    style US fill:#e0e7ff,stroke:#3730a3
```
