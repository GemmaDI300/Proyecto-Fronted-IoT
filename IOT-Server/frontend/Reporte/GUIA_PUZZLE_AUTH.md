# Guía de Autenticación por Reto Criptográfico (RC)

## Requisitos previos

Al registrar una entidad (Device o Application), el servidor retorna dos valores que el cliente debe guardar de forma segura:

| Valor | Ejemplo | Descripción |
|-------|---------|-------------|
| `encryption_key` o `api_key` | `a1b2c3...` (64 caracteres hex) | Clave única de la entidad. 32 bytes en formato hexadecimal |
| `server_key` | `d4e5f6...` (64 caracteres hex) | Clave derivada del servidor. Se entrega solo al crear la entidad |

Estos valores **nunca se vuelven a enviar** por el servidor. El cliente debe guardarlos de forma segura (firmware, almacenamiento cifrado, etc.).


## Endpoint

```
POST /api/v1/devices/auth       ← para dispositivos
POST /api/v1/applications/auth  ← para applications
```


## Formato del request

```json
{
    "device_id": "uuid-del-device",
    "encrypted_payload": {
        "ciphertext": "base64-del-payload-cifrado",
        "iv": "base64-del-iv"
    }
}
```

Para applications, usar `application_id` en vez de `device_id`.


## Cómo construir el puzzle (paso a paso)

### Paso 1 — Generar R2 (32 bytes aleatorios)

R2 es un nonce aleatorio que cambia en cada autenticación. Debe ser criptográficamente seguro.

```python
import os
r2 = os.urandom(32)
```

```javascript
const r2 = crypto.getRandomValues(new Uint8Array(32));
```

### Paso 2 — Obtener timestamp actual

El timestamp es la cantidad de segundos desde epoch (1 de enero de 1970). Se codifica como 8 bytes en big-endian.

```python
import time
timestamp = int(time.time()).to_bytes(8, byteorder="big")
```

```javascript
const timestamp = new ArrayBuffer(8);
const view = new DataView(timestamp);
view.setBigUint64(0, BigInt(Math.floor(Date.now() / 1000)));
```

El servidor acepta una ventana de **60 segundos**. Si el reloj del cliente difiere más de 60 segundos del servidor, la autenticación falla.


### Paso 3 — Calcular P2 (HMAC-SHA256)

P2 es la prueba de que el cliente conoce tanto su clave (`entity_key`) como la del servidor (`server_key`).

```
hmac_key = entity_key + server_key     ← concatenar las dos claves (64 bytes)
message  = R2 + timestamp              ← concatenar R2 y timestamp (40 bytes)
P2       = HMAC-SHA256(hmac_key, message) ← resultado: 32 bytes
```

**Conversión de claves:** tanto `entity_key` como `server_key` vienen en formato hexadecimal (64 caracteres). Deben convertirse a bytes (32 bytes cada una) antes de usarlas.

```python
import hashlib
import hmac

entity_key = bytes.fromhex("a1b2c3...")   # 64 chars hex → 32 bytes
server_key = bytes.fromhex("d4e5f6...")   # 64 chars hex → 32 bytes

hmac_key = entity_key + server_key         # 64 bytes
message = r2 + timestamp                   # 40 bytes

p2 = hmac.new(hmac_key, message, hashlib.sha256).digest()  # 32 bytes
```

```javascript
const entityKey = hexToBytes("a1b2c3...");
const serverKey = hexToBytes("d4e5f6...");

const hmacKey = new Uint8Array([...entityKey, ...serverKey]);
const message = new Uint8Array([...r2, ...timestamp]);

const cryptoKey = await crypto.subtle.importKey(
    "raw", hmacKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
);
const p2 = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));
```


### Paso 4 — Ensamblar el plaintext

Concatenar P2, R2 y timestamp en ese orden exacto:

```
plaintext = P2 + R2 + timestamp
            ↓     ↓       ↓
          32 bytes  32 bytes  8 bytes  =  72 bytes total
```

```python
plaintext = p2 + r2 + timestamp  # 72 bytes
```


### Paso 5 — Aplicar PKCS7 padding

AES-256-CBC requiere que el plaintext sea múltiplo de 16 bytes. PKCS7 padding agrega bytes al final.

72 bytes ÷ 16 = 4 bloques + 8 bytes sobrantes → se agregan 8 bytes de padding (valor 0x08).

```python
from cryptography.hazmat.primitives import padding as crypto_padding

padder = crypto_padding.PKCS7(128).padder()  # 128 bits = 16 bytes
padded = padder.update(plaintext) + padder.finalize()  # 80 bytes
```


### Paso 6 — Generar IV (16 bytes aleatorios)

El IV (Initialization Vector) debe ser único por cada cifrado. Nunca reutilizar un IV.

```python
iv = os.urandom(16)
```


### Paso 7 — Cifrar con AES-256-CBC

```python
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

cipher = Cipher(algorithms.AES(entity_key), modes.CBC(iv))
encryptor = cipher.encryptor()
ciphertext = encryptor.update(padded) + encryptor.finalize()
```

```javascript
const cryptoKey = await crypto.subtle.importKey(
    "raw", entityKey, { name: "AES-CBC" }, false, ["encrypt"]
);
const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv }, cryptoKey, padded)
);
```


### Paso 8 — Codificar en base64

Tanto el ciphertext como el IV deben codificarse en base64 para enviar como JSON.

```python
from base64 import b64encode

payload = {
    "ciphertext": b64encode(ciphertext).decode(),
    "iv": b64encode(iv).decode(),
}
```


### Paso 9 — Enviar la petición

```python
import requests

response = requests.post(
    "https://servidor/api/v1/devices/auth",
    json={
        "device_id": "uuid-del-device",
        "encrypted_payload": payload,
    }
)
```


## Ejemplo completo en Python

```python
import hashlib
import hmac
import os
import time
from base64 import b64encode

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding as crypto_padding


def build_puzzle(entity_id: str, entity_key_hex: str, server_key_hex: str) -> dict:
    """
    Construir un puzzle de autenticación.

    Args:
        entity_id: UUID de la entidad (device_id o application_id)
        entity_key_hex: encryption_key o api_key en hexadecimal (64 chars)
        server_key_hex: server_key en hexadecimal (64 chars)

    Returns:
        dict listo para enviar como JSON al endpoint /auth
    """
    # Convertir claves
    entity_key = bytes.fromhex(entity_key_hex)  # 32 bytes
    server_key = bytes.fromhex(server_key_hex)  # 32 bytes

    # Paso 1: R2 aleatorio
    r2 = os.urandom(32)

    # Paso 2: timestamp
    timestamp = int(time.time()).to_bytes(8, byteorder="big")

    # Paso 3: calcular P2
    p2 = hmac.new(
        entity_key + server_key,
        r2 + timestamp,
        hashlib.sha256,
    ).digest()

    # Paso 4: ensamblar plaintext
    plaintext = p2 + r2 + timestamp  # 72 bytes

    # Paso 5: PKCS7 padding
    padder = crypto_padding.PKCS7(128).padder()
    padded = padder.update(plaintext) + padder.finalize()

    # Paso 6: IV aleatorio
    iv = os.urandom(16)

    # Paso 7: cifrar AES-256-CBC
    cipher = Cipher(algorithms.AES(entity_key), modes.CBC(iv))
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    # Paso 8: codificar base64
    return {
        "device_id": entity_id,  # cambiar a "application_id" si es application
        "encrypted_payload": {
            "ciphertext": b64encode(ciphertext).decode(),
            "iv": b64encode(iv).decode(),
        },
    }


# Uso:
puzzle = build_puzzle(
    entity_id="550e8400-e29b-41d4-a716-446655440000",
    entity_key_hex="a1b2c3d4e5f6...",   # 64 caracteres
    server_key_hex="d4e5f6a7b8c9...",   # 64 caracteres
)
```


## Respuesta del servidor

**Autenticación exitosa (200):**
```json
{
    "valid": true,
    "session_id": "uuid-de-la-sesion",
    "encrypted_token": "token-cifrado-para-requests",
    "key_session": "base64url-llave-de-sesion-32-bytes"
}
```

El cliente debe guardar `key_session` para cifrar mensajes futuros y `encrypted_token` para autenticar requests posteriores.

**Autenticación fallida (401):**
```json
{
    "detail": "Authentication failed"
}
```

El servidor siempre retorna el mismo mensaje genérico. Las posibles causas internas (solo visibles en logs del servidor) son: entidad no existe, entidad inactiva, sesión ya activa, descifrado fallido, timestamp expirado, P2 no coincide.


## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| Timestamp expirado | Reloj del cliente difiere > 60 segundos | Sincronizar reloj con NTP |
| Descifrado fallido | entity_key incorrecta | Verificar que se usa la clave correcta |
| P2 no coincide | server_key incorrecta o datos manipulados | Verificar server_key, verificar orden de concatenación |
| 422 Unprocessable Entity | JSON mal formado | Verificar estructura del request y campos requeridos |


## Diagrama de verificación en el servidor

```
Cliente envía: { entity_id, encrypted_payload: { ciphertext, iv } }

Servidor:
    entity_key ← BD (encryption_key o api_key del entity_id)
    server_key ← SHA256(SECRET_KEY + "|puzzle_v1")

    Descifrar AES-256-CBC(ciphertext, entity_key, iv) → plaintext (72+ bytes)
    Separar → P2_recibido (32) + R2 (32) + timestamp (8)

    Verificar: |now - timestamp| < 60 segundos

    P2_esperado = HMAC-SHA256(entity_key + server_key, R2 + timestamp)

    Comparar: P2_recibido == P2_esperado (timing-safe)
        ✓ → Crear sesión → Retornar tokens
        ✗ → 401 Authentication failed
```
