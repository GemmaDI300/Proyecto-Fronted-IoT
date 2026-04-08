# Diagrama de Comunicación — Frontend IoT Platform (Actualizado)

Este documento contiene los diagramas de comunicación actualizados que ilustran la interacción entre todos los componentes del frontend, incluyendo el sistema de login separado por rol y servicio.

---

## 1. Comunicación de Autenticación por Rol

```mermaid
sequenceDiagram
    actor U as Usuario (Navegador)
    participant LS as LoginSelector<br/>/login
    participant RL as RoleLogin<br/>/login/:role
    participant US as LoginUsuarioServices<br/>/login/usuario
    participant AC as AuthContext<br/>(React Context)
    participant MK as mock.ts<br/>(DEMO_MODE)
    participant API as Backend API<br/>(FastAPI)

    Note over U,API: ── FLUJO LOGIN: ADMIN MASTER ──

    U->>LS: Accede a /login
    LS-->>U: Muestra 4 tarjetas de rol
    U->>LS: Selecciona "Admin Master"
    LS->>RL: Navega a /login/admin-master
    RL-->>U: Formulario azul (#2563eb)<br/>Badge: "Admin Master"<br/>Warning: sesión única 409
    U->>RL: Ingresa admin@demo.com + password
    RL->>AC: login(email, pwd, "auth/login/admin")
    AC->>MK: mockLogin("admin@demo.com", "password")
    MK-->>AC: { token: "demo-token-admin",<br/>account_type: "administrator",<br/>is_master: true }
    AC->>AC: setSession(credentials)
    AC-->>RL: session actualizada
    RL-->>U: Redirige a / (Dashboard)

    Note over U,API: ── FLUJO LOGIN: ADMIN NORMAL ──

    U->>LS: Selecciona "Admin Normal"
    LS->>RL: Navega a /login/admin-normal
    RL-->>U: Formulario cyan (#0891b2)<br/>Badge: "Admin Normal"
    U->>RL: Ingresa admin2@demo.com + password
    RL->>AC: login(email, pwd, "auth/login/admin")
    AC->>MK: mockLogin()
    MK-->>AC: { account_type: "administrator",<br/>is_master: false }
    AC-->>RL: Redirige a Dashboard

    Note over U,API: ── FLUJO LOGIN: GERENTE ──

    U->>LS: Selecciona "Gerente"
    LS->>RL: Navega a /login/gerente
    RL-->>U: Formulario verde (#059669)<br/>Badge: "Gerente (Manager)"
    U->>RL: Ingresa gerente@demo.com + password
    RL->>AC: login(email, pwd, "auth/login/manager")
    AC->>MK: mockLogin()
    MK-->>AC: { account_type: "manager" }
    AC-->>RL: Redirige a Dashboard

    Note over U,API: ── FLUJO LOGIN: USUARIO POR SERVICIO ──

    U->>LS: Selecciona "Usuario"
    LS->>US: Navega a /login/usuario
    US-->>U: Muestra 2 tarjetas de servicio:<br/>🌡️ Monitoreo Ambiental<br/>🏭 Control Industrial
    U->>US: Selecciona "Monitoreo Ambiental"
    US->>RL: Navega a /login/usuario/monitoreo-ambiental
    RL-->>U: Formulario violeta (#7c3aed)<br/>Badge: "Usuario (User)" + "Monitoreo Ambiental"
    U->>RL: Ingresa user1.amb@demo.com + password
    RL->>AC: login(email, pwd, "auth/login/user")
    AC->>MK: mockLogin()
    MK-->>AC: { account_type: "user" }
    AC-->>RL: Redirige a Dashboard

    Note over U,API: ── FLUJO REAL (DEMO_MODE = false) ──

    U->>RL: Ingresa credenciales reales
    RL->>AC: login(email, pwd, endpoint)
    AC->>API: POST /api/v1/{endpoint}<br/>{ email, password }
    API->>API: bcrypt.verify + JWT sign
    API-->>AC: { access_token, account_type, is_master }
    AC-->>RL: Redirige a Dashboard
```

---

## 2. Comunicación de Datos (CRUD completo)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant P as Página CRUD<br/>(Usuarios/Dispositivos/<br/>Admins/Gerentes)
    participant G as Gestion.tsx<br/>(Componente genérico)
    participant RQ as React Query<br/>(TanStack)
    participant CR as crypto.ts<br/>(AES-256-CBC)
    participant MK as mock.ts | API
    participant DB as Base de Datos

    Note over U,DB: ── CARGA INICIAL ──

    U->>P: Navega a /dispositivos
    P->>G: Renderiza Gestion con config
    G->>RQ: useGetQuery("devices/")
    RQ->>MK: GET /api/v1/devices/<br/>(mock o fetch + Bearer JWT)
    MK->>DB: SELECT dispositivos
    DB-->>MK: Resultados
    MK-->>RQ: { pl: "iv:ciphertext" }
    RQ->>CR: decrypt(response.pl)
    CR-->>RQ: { total, data: [...] }
    RQ-->>G: Datos desencriptados
    G-->>U: DataGrid + filtros<br/>(Todos / Activos / Inactivos)

    Note over U,DB: ── CREAR ENTIDAD ──

    U->>G: Clic botón "+ Nuevo"
    G-->>U: Abre EditarDialog (vacío)
    U->>G: Llena campos + "Guardar"
    G->>G: Formik + Yup validan
    G->>CR: encrypt(datos)
    CR-->>G: { pl: "iv:ct" }
    G->>RQ: useSendDataMutation POST
    RQ->>MK: POST /api/v1/devices/<br/>Body: { pl: "iv:ct" }
    MK->>DB: INSERT
    DB-->>MK: Nuevo registro
    MK-->>RQ: Respuesta cifrada
    RQ->>RQ: invalidateQueries → re-fetch
    RQ-->>G: Datos actualizados
    G-->>U: Tabla actualizada

    Note over U,DB: ── EDITAR ENTIDAD ──

    U->>G: Clic "Editar" en fila
    G-->>U: Abre EditarDialog (pre-llenado)
    U->>G: Modifica + "Guardar"
    G->>G: Formik + Yup validan
    G->>CR: encrypt(datos)
    CR-->>G: { pl: "iv:ct" }
    G->>RQ: useSendDataMutation PATCH
    RQ->>MK: PATCH /api/v1/devices/{id}
    MK->>DB: UPDATE
    DB-->>MK: Registro actualizado
    MK-->>RQ: Respuesta cifrada
    RQ->>RQ: invalidateQueries
    RQ-->>G: Datos actualizados
    G-->>U: Tabla actualizada

    Note over U,DB: ── ELIMINAR ENTIDAD ──

    U->>G: Clic "Eliminar" en fila
    G-->>U: Abre ConfirmDeleteDialog
    U->>G: Escribe motivo (mín 3 chars)<br/>+ clic "Eliminar definitivamente"
    G->>RQ: useDeleteByIdMutation
    RQ->>MK: DELETE /api/v1/devices/{id}
    MK->>DB: DELETE/soft-delete
    DB-->>MK: 204 No Content
    MK-->>RQ: OK
    RQ->>RQ: invalidateQueries
    RQ-->>G: Datos actualizados
    G-->>U: Fila eliminada de tabla
```

---

## 3. Comunicación Interna de Componentes

```mermaid
graph TB
    subgraph ENTRY["🚪 Punto de Entrada"]
        MAIN["main.tsx\n• ThemeProvider\n• QueryClientProvider\n• AuthProvider\n• Router"]
    end

    subgraph LOGIN_FLOW["🔐 Flujo de Login (3 niveles)"]
        direction TB
        LSEL["LoginSelector\n4 tarjetas de rol"]
        LUSVC["LoginUsuarioServices\n2 tarjetas de servicio"]
        RLOGIN["RoleLogin\nFormulario parametrizado\nroleConfigs + serviceBadge"]
    end

    subgraph AUTH_LAYER["🛡️ Capa de Autenticación"]
        ACTX["AuthContext\n• session state\n• login(email, pwd, endpoint)\n• logout()"]
        PROT["ProtectedRoute\n• session check\n• accountType check\n• isMaster check"]
    end

    subgraph LAYOUT["📐 Layout Principal"]
        SIDEBAR["SidebarLayout\n• Sidebar con secciones\n• AppBar con búsqueda\n• NavItems filtrados por rol"]
    end

    subgraph PAGES["📄 Páginas"]
        DASH["Dashboard\n• StatCards\n• Activity Feed\n• Alerts Panel\n• MiniBarChart"]
        GEST["Gestion (genérico)\n• DataGrid\n• Filtros estado\n• CRUD ops"]
    end

    subgraph DIALOGS["💬 Diálogos"]
        EDIT["EditarDialog\n• Formik + Yup\n• fieldLabels"]
        CDEL["ConfirmDeleteDialog\n• Motivo obligatorio\n• getEntityName()"]
    end

    subgraph DATA_LAYER["📡 Capa de Datos"]
        FNS["functions.ts\n• useGetQuery\n• useSendDataMutation\n• useDeleteByIdMutation"]
        CRYPT["crypto.ts\n• encrypt()\n• decrypt()\n• AES-256-CBC"]
        MOCK["mock.ts\n• DEMO_MODE\n• mockLogin()\n• mockGet/Create/Update/Delete\n• 10 cuentas demo"]
    end

    MAIN --> LSEL
    LSEL -->|"Admin Master/Normal/Gerente"| RLOGIN
    LSEL -->|"Usuario"| LUSVC
    LUSVC -->|"Servicio seleccionado"| RLOGIN
    RLOGIN --> ACTX
    ACTX --> PROT
    PROT --> SIDEBAR
    SIDEBAR --> DASH
    SIDEBAR --> GEST
    GEST --> EDIT
    GEST --> CDEL
    GEST --> FNS
    DASH --> FNS
    FNS --> CRYPT
    FNS --> MOCK

    style ENTRY fill:#f8fafc,stroke:#64748b
    style LOGIN_FLOW fill:#f0f4ff,stroke:#2563eb
    style AUTH_LAYER fill:#fef3c7,stroke:#d97706
    style LAYOUT fill:#f0fdf4,stroke:#059669
    style PAGES fill:#dbeafe,stroke:#2563eb
    style DIALOGS fill:#ede9fe,stroke:#7c3aed
    style DATA_LAYER fill:#fee2e2,stroke:#dc2626
```

---

## 4. Mapa de Rutas y Comunicación entre Vistas

```mermaid
graph LR
    subgraph PUBLICAS["Rutas Públicas (sin sesión)"]
        R_LOGIN["/login\nLoginSelector"]
        R_AM["/login/admin-master\nRoleLogin 🔵"]
        R_AN["/login/admin-normal\nRoleLogin 🔷"]
        R_GR["/login/gerente\nRoleLogin 🟢"]
        R_US["/login/usuario\nLoginUsuarioServices 🟣"]
        R_AMB["/login/usuario/\nmonitoreo-ambiental\nRoleLogin 🟣🌡️"]
        R_IND["/login/usuario/\ncontrol-industrial\nRoleLogin 🟣🏭"]
    end

    subgraph PROTEGIDAS["Rutas Protegidas (requieren sesión)"]
        R_DASH["/ Dashboard\n✅ Todos los roles"]
        R_USERS["/usuarios\n🔒 administrator, manager"]
        R_DEVS["/dispositivos\n✅ Todos los roles"]
        R_ADMINS["/administradores\n🔒 administrator + master"]
        R_MGRS["/gerentes\n🔒 administrator"]
    end

    R_LOGIN --> R_AM
    R_LOGIN --> R_AN
    R_LOGIN --> R_GR
    R_LOGIN --> R_US
    R_US --> R_AMB
    R_US --> R_IND

    R_AM -->|"login exitoso"| R_DASH
    R_AN -->|"login exitoso"| R_DASH
    R_GR -->|"login exitoso"| R_DASH
    R_AMB -->|"login exitoso"| R_DASH
    R_IND -->|"login exitoso"| R_DASH

    R_DASH --> R_USERS
    R_DASH --> R_DEVS
    R_DASH --> R_ADMINS
    R_DASH --> R_MGRS

    style PUBLICAS fill:#f8fafc,stroke:#94a3b8
    style PROTEGIDAS fill:#f0fdf4,stroke:#059669
    style R_LOGIN fill:#f0f4ff,stroke:#2563eb
    style R_AM fill:#dbeafe,stroke:#2563eb
    style R_AN fill:#cffafe,stroke:#0891b2
    style R_GR fill:#d1fae5,stroke:#059669
    style R_US fill:#ede9fe,stroke:#7c3aed
    style R_AMB fill:#ede9fe,stroke:#7c3aed
    style R_IND fill:#ede9fe,stroke:#7c3aed
    style R_DASH fill:#d1fae5,stroke:#059669
    style R_USERS fill:#dbeafe,stroke:#2563eb
    style R_DEVS fill:#dbeafe,stroke:#2563eb
    style R_ADMINS fill:#fef3c7,stroke:#d97706
    style R_MGRS fill:#dbeafe,stroke:#2563eb
```

---

## Resumen de Endpoints por Login

| Ruta del Login | Endpoint API | Tipo de cuenta |
|---|---|---|
| `/login/admin-master` | `POST /api/v1/auth/login/admin` | `administrator` (master) |
| `/login/admin-normal` | `POST /api/v1/auth/login/admin` | `administrator` (normal) |
| `/login/gerente` | `POST /api/v1/auth/login/manager` | `manager` |
| `/login/usuario/monitoreo-ambiental` | `POST /api/v1/auth/login/user` | `user` |
| `/login/usuario/control-industrial` | `POST /api/v1/auth/login/user` | `user` |
