# Diagrama de Flujo — Frontend IoT Platform

Este documento contiene los diagramas de flujo que describen el funcionamiento completo del frontend, incluyendo el sistema de login separado por rol y por servicio.

---

## 1. Flujo General de Navegación

```mermaid
flowchart TD
    START(["👤 Usuario abre la aplicación"]) --> CHECK_SESSION{"¿Tiene sesión\nactiva?"}

    CHECK_SESSION -->|Sí| DASHBOARD["📊 Dashboard"]
    CHECK_SESSION -->|No| SELECTOR["🔐 Selector de Rol\n/login"]

    SELECTOR --> R_AM["Admin Master\n/login/admin-master"]
    SELECTOR --> R_AN["Admin Normal\n/login/admin-normal"]
    SELECTOR --> R_GR["Gerente\n/login/gerente"]
    SELECTOR --> R_US["Usuario\n/login/usuario"]

    R_US --> SVC_SELECTOR["📋 Selector de Servicio\n/login/usuario"]
    SVC_SELECTOR --> SVC_AMB["🌡️ Monitoreo Ambiental\n/login/usuario/monitoreo-ambiental"]
    SVC_SELECTOR --> SVC_IND["🏭 Control Industrial\n/login/usuario/control-industrial"]

    R_AM --> LOGIN_FORM["📝 Formulario de Login\n(email + contraseña)"]
    R_AN --> LOGIN_FORM
    R_GR --> LOGIN_FORM
    SVC_AMB --> LOGIN_FORM
    SVC_IND --> LOGIN_FORM

    LOGIN_FORM --> VALIDATE{"¿Campos\nválidos?"}
    VALIDATE -->|No| ERR_FIELD["⚠️ Error de validación"]
    ERR_FIELD --> LOGIN_FORM

    VALIDATE -->|Sí| CALL_API["🔄 POST /api/v1/auth/login/{tipo}\nenvía email + password"]
    CALL_API --> API_RESP{"¿Respuesta\nexitosa?"}

    API_RESP -->|No| ERR_AUTH["❌ Error: Credenciales inválidas\no 409 sesión activa"]
    ERR_AUTH --> LOGIN_FORM

    API_RESP -->|Sí| STORE_SESSION["✅ AuthContext almacena:\n• JWT token\n• account_type\n• is_master"]
    STORE_SESSION --> DASHBOARD

    DASHBOARD --> NAV_PAGES{"Navegación\npor Sidebar"}
    NAV_PAGES --> P_USERS["👥 Usuarios"]
    NAV_PAGES --> P_DEVICES["📡 Dispositivos"]
    NAV_PAGES --> P_ADMINS["🔑 Administradores"]
    NAV_PAGES --> P_MANAGERS["👔 Gerentes"]

    NAV_PAGES --> LOGOUT["🚪 Cerrar Sesión"]
    LOGOUT --> SELECTOR

    style START fill:#dbeafe,stroke:#2563eb
    style SELECTOR fill:#f0f4ff,stroke:#2563eb
    style R_AM fill:#dbeafe,stroke:#2563eb
    style R_AN fill:#cffafe,stroke:#0891b2
    style R_GR fill:#d1fae5,stroke:#059669
    style R_US fill:#ede9fe,stroke:#7c3aed
    style SVC_SELECTOR fill:#ede9fe,stroke:#7c3aed
    style SVC_AMB fill:#f5f3ff,stroke:#7c3aed
    style SVC_IND fill:#f5f3ff,stroke:#7c3aed
    style LOGIN_FORM fill:#fff,stroke:#374151
    style DASHBOARD fill:#d1fae5,stroke:#059669
    style ERR_FIELD fill:#fef3c7,stroke:#d97706
    style ERR_AUTH fill:#fee2e2,stroke:#dc2626
    style STORE_SESSION fill:#d1fae5,stroke:#059669
    style LOGOUT fill:#fee2e2,stroke:#dc2626
```

---

## 2. Flujo de Autenticación por Rol (Detallado)

```mermaid
flowchart TD
    ENTRY(["Accede a /login"]) --> ROLE_CARDS["Muestra 4 tarjetas de rol:\nAdmin Master · Admin Normal\nGerente · Usuario"]

    ROLE_CARDS -->|Admin Master| AM_LOGIN["🔵 Login Admin Master\nEndpoint: auth/login/admin\nColor: #2563eb"]
    ROLE_CARDS -->|Admin Normal| AN_LOGIN["🔷 Login Admin Normal\nEndpoint: auth/login/admin\nColor: #0891b2"]
    ROLE_CARDS -->|Gerente| GR_LOGIN["🟢 Login Gerente\nEndpoint: auth/login/manager\nColor: #059669"]
    ROLE_CARDS -->|Usuario| USR_SVC["🟣 Selector de Servicios"]

    USR_SVC --> INFO_SVC["Muestra servicios disponibles:\n• Monitoreo Ambiental (3 disp.)\n• Control Industrial (3 disp.)"]

    INFO_SVC -->|Monitoreo Ambiental| AMB_LOGIN["🟣🌡️ Login Usuario\nServicio: Monitoreo Ambiental\nEndpoint: auth/login/user"]
    INFO_SVC -->|Control Industrial| IND_LOGIN["🟣🏭 Login Usuario\nServicio: Control Industrial\nEndpoint: auth/login/user"]

    AM_LOGIN --> FORM_SUBMIT["Envía credenciales\nal endpoint correspondiente"]
    AN_LOGIN --> FORM_SUBMIT
    GR_LOGIN --> FORM_SUBMIT
    AMB_LOGIN --> FORM_SUBMIT
    IND_LOGIN --> FORM_SUBMIT

    FORM_SUBMIT --> DEMO_CHECK{"¿DEMO_MODE\nactivado?"}
    DEMO_CHECK -->|Sí| MOCK_LOGIN["mockLogin()\nbusca en demoAccounts"]
    DEMO_CHECK -->|No| REAL_API["fetch() al backend\ncon endpoint del rol"]

    MOCK_LOGIN --> RESULT{"¿Credenciales\ncorrectas?"}
    REAL_API --> RESULT

    RESULT -->|Sí| SUCCESS["SessionCredentials:\n{ token, accountType, isMaster }"]
    RESULT -->|No| FAIL["Muestra Alert de error"]

    SUCCESS --> REDIRECT["Redirige a /\n(Dashboard)"]
    FAIL --> RETRY["Volver a intentar"]

    style ENTRY fill:#f8fafc,stroke:#64748b
    style ROLE_CARDS fill:#f0f4ff,stroke:#2563eb
    style AM_LOGIN fill:#dbeafe,stroke:#2563eb
    style AN_LOGIN fill:#cffafe,stroke:#0891b2
    style GR_LOGIN fill:#d1fae5,stroke:#059669
    style USR_SVC fill:#ede9fe,stroke:#7c3aed
    style AMB_LOGIN fill:#ede9fe,stroke:#7c3aed
    style IND_LOGIN fill:#ede9fe,stroke:#7c3aed
    style SUCCESS fill:#d1fae5,stroke:#059669
    style FAIL fill:#fee2e2,stroke:#dc2626
    style REDIRECT fill:#d1fae5,stroke:#059669
```

---

## 3. Flujo de Operaciones CRUD

```mermaid
flowchart TD
    PAGE(["📄 Página de Gestión\n(Usuarios / Dispositivos / Admins / Gerentes)"]) --> LOAD["React Query ejecuta GET\n→ API o mock según DEMO_MODE"]

    LOAD --> DECRYPT["Descifra respuesta\ncrypto.ts → decrypt()"]
    DECRYPT --> RENDER["Renderiza DataGrid\ncon datos + filtros\n(Todos / Activos / Inactivos)"]

    RENDER --> ACTION{"Acción del usuario"}

    ACTION -->|"➕ Crear"| DIALOG_CREATE["Abre EditarDialog\n(formulario vacío)"]
    ACTION -->|"✏️ Editar"| DIALOG_EDIT["Abre EditarDialog\n(datos pre-llenados)"]
    ACTION -->|"🗑️ Eliminar"| DIALOG_DELETE["Abre ConfirmDeleteDialog\n(requiere motivo)"]

    DIALOG_CREATE --> FORMIK_VALIDATE["Formik + Yup validan campos"]
    DIALOG_EDIT --> FORMIK_VALIDATE

    FORMIK_VALIDATE --> VALID{"¿Válido?"}
    VALID -->|No| SHOW_ERRORS["Muestra errores\nen campos"]
    SHOW_ERRORS --> FORMIK_VALIDATE

    VALID -->|Sí| ENCRYPT["Cifra datos\ncrypto.ts → encrypt()"]
    ENCRYPT --> SEND_MUTATION["useSendDataMutation\nPOST / PATCH al backend"]

    DIALOG_DELETE --> REASON{"¿Motivo ingresado\n(mín. 3 chars)?"}
    REASON -->|No| WAIT_REASON["Botón deshabilitado\nhasta escribir motivo"]
    WAIT_REASON --> REASON
    REASON -->|Sí| SEND_DELETE["useDeleteByIdMutation\nDELETE al backend"]

    SEND_MUTATION --> MUT_RESULT{"¿Éxito?"}
    SEND_DELETE --> MUT_RESULT

    MUT_RESULT -->|Sí| INVALIDATE["React Query invalida cache\n→ re-fetch automático"]
    MUT_RESULT -->|No| MUT_ERROR["Muestra Alert de error"]

    INVALIDATE --> RENDER
    MUT_ERROR --> RENDER

    style PAGE fill:#f0f4ff,stroke:#2563eb
    style RENDER fill:#dbeafe,stroke:#2563eb
    style DIALOG_CREATE fill:#d1fae5,stroke:#059669
    style DIALOG_EDIT fill:#fef3c7,stroke:#d97706
    style DIALOG_DELETE fill:#fee2e2,stroke:#dc2626
    style ENCRYPT fill:#ede9fe,stroke:#7c3aed
    style INVALIDATE fill:#d1fae5,stroke:#059669
    style MUT_ERROR fill:#fee2e2,stroke:#dc2626
```

---

## 4. Flujo de Protección de Rutas

```mermaid
flowchart TD
    NAV(["Usuario navega a una ruta\nej: /administradores"]) --> PR["ProtectedRoute evalúa"]

    PR --> HAS_SESSION{"¿session\nexiste?"}
    HAS_SESSION -->|No| REDIRECT_LOGIN["Redirige a /login\n(Selector de Rol)"]

    HAS_SESSION -->|Sí| CHECK_TYPE{"¿requiredType\nespecificado?"}
    CHECK_TYPE -->|No| ALLOW["✅ Permite acceso"]

    CHECK_TYPE -->|Sí| MATCH_TYPE{"¿accountType\ncoincide?"}
    MATCH_TYPE -->|No| REDIRECT_HOME["Redirige a /\n(Dashboard)"]

    MATCH_TYPE -->|Sí| CHECK_MASTER{"¿requireMaster\nespecificado?"}
    CHECK_MASTER -->|No| ALLOW

    CHECK_MASTER -->|Sí| IS_MASTER{"¿isMaster\n= true?"}
    IS_MASTER -->|No| REDIRECT_HOME
    IS_MASTER -->|Sí| ALLOW

    ALLOW --> COMPONENT["Renderiza el componente\nde la página"]

    style NAV fill:#f8fafc,stroke:#64748b
    style ALLOW fill:#d1fae5,stroke:#059669
    style REDIRECT_LOGIN fill:#fee2e2,stroke:#dc2626
    style REDIRECT_HOME fill:#fef3c7,stroke:#d97706
    style COMPONENT fill:#dbeafe,stroke:#2563eb
```

---

## Leyenda de Colores

| Color | Significado |
|---|---|
| 🔵 Azul `#2563eb` | Admin Master |
| 🔷 Cyan `#0891b2` | Admin Normal |
| 🟢 Verde `#059669` | Gerente (Manager) |
| 🟣 Violeta `#7c3aed` | Usuario (User) |
| 🟡 Amarillo `#d97706` | Advertencias / Edición |
| 🔴 Rojo `#dc2626` | Errores / Eliminación |

## Cuentas Demo

| Rol | Login | Email | Contraseña |
|---|---|---|---|
| Admin Master | `/login/admin-master` | `admin@demo.com` | `password` |
| Admin Normal | `/login/admin-normal` | `admin2@demo.com` | `password` |
| Gerente | `/login/gerente` | `gerente@demo.com` | `password` |
| Usuario — Monitoreo Ambiental | `/login/usuario/monitoreo-ambiental` | `user1.amb@demo.com` | `password` |
| Usuario — Monitoreo Ambiental | `/login/usuario/monitoreo-ambiental` | `user2.amb@demo.com` | `password` |
| Usuario — Control Industrial | `/login/usuario/control-industrial` | `user1.ind@demo.com` | `password` |
| Usuario — Control Industrial | `/login/usuario/control-industrial` | `user2.ind@demo.com` | `password` |
