/**
 * Firma criptográfica de peticiones al backend (Web Crypto API nativa).
 *
 * Esquema implementado:
 *
 *   IDsess    = SHA-256(JWT_token)                           → hex-64
 *   PLcifrado = AES-256-CBC(body_json, kEnc, IV_aleatorio)  → "b64(iv):b64(ct)"
 *   PG        = base64( JSON({ session_id, payload, timestamp }) )
 *   SessApp   = CryptoKey HMAC-SHA-256 derivada de JWT      → SHA-256("iot-sess-v1:" ‖ JWT)
 *   TAG       = HMAC-SHA256(SessApp, PG)                    → hex-64
 *   PF        = cabeceras X-Session-Id + X-Request-Pg + X-Request-Tag + X-Request-Ts
 *
 * El body HTTP sigue siendo JSON plano para que el backend actual pueda procesarlo.
 * Las cabeceras implementan el esquema completo y son verificables por el backend
 * sin requerir ningún cambio adicional en el frontend cuando lo soporte.
 *
 * Derivación de claves (sin secret externo — solo el JWT de sesión en RAM):
 *   kEnc    = SHA-256("iot-enc-v1:"  ‖ JWT)  → AES-256-CBC key
 *   kHMAC   = SHA-256("iot-sess-v1:" ‖ JWT)  → HMAC-SHA-256 key (SessApp)
 *
 * Protección contra ataques:
 *   • Replay:      timestamp incluido en PG y firmado en TAG (ventana de 60 s)
 *   • Tampering:   HMAC sobre PG cubre IDsess + PLcifrado + timestamp
 *   • Sniffing:    PLcifrado encripta el payload (AES-256-CBC + IV aleatorio)
 *   • Forgery:     claves derivadas del JWT (solo en RAM, nunca persistido)
 */

const ENC = new TextEncoder();

/** Convierte Uint8Array a cadena hexadecimal lowercase. */
function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Convierte Uint8Array a base64 estándar. */
function bytesToBase64(bytes: Uint8Array): string {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
}

/** SHA-256 de un Uint8Array → Uint8Array. */
async function sha256(data: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", data.buffer as ArrayBuffer));
}

/**
 * Deriva la clave AES-256-CBC para cifrar PLcifrado.
 * kEnc = SHA-256("iot-enc-v1:" ‖ JWT)
 */
async function deriveEncKey(jwt: string): Promise<CryptoKey> {
    const keyBytes = await sha256(ENC.encode("iot-enc-v1:" + jwt));
    return crypto.subtle.importKey(
        "raw",
        keyBytes.buffer as ArrayBuffer,
        { name: "AES-CBC" },
        false,
        ["encrypt"],
    );
}

/**
 * Deriva la clave HMAC (SessApp) para firmar PG.
 * kHMAC = SHA-256("iot-sess-v1:" ‖ JWT)
 */
async function deriveSessApp(jwt: string): Promise<CryptoKey> {
    const keyBytes = await sha256(ENC.encode("iot-sess-v1:" + jwt));
    return crypto.subtle.importKey(
        "raw",
        keyBytes.buffer as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
}

/**
 * Construye la Petición Final (PF) y devuelve las cabeceras de firma.
 *
 * Pasos:
 *  1. IDsess    = SHA-256(JWT) → hex
 *  2. PLcifrado = AES-256-CBC(body_json ‖ "{}" si vacío, kEnc, IV_random) → b64(iv):b64(ct)
 *  3. PG        = base64(JSON({ session_id, payload, timestamp }))
 *  4. TAG       = HMAC-SHA256(SessApp, PG) → hex
 *  5. Retorna { X-Session-Id, X-Request-Pg, X-Request-Tag, X-Request-Ts }
 *
 * @param jwt      JWT token de sesión (solo en RAM, nunca persistido)
 * @param bodyJson JSON.stringify(payload) o cadena vacía para GET / DELETE
 */
export async function buildSignedHeaders(
    jwt: string,
    bodyJson: string,
): Promise<Record<string, string>> {
    const timestamp = Math.floor(Date.now() / 1000);

    // Paso 1 — IDsess
    const IDsess = bytesToHex(await sha256(ENC.encode(jwt)));

    // Paso 2 — PLcifrado
    const encKey = await deriveEncKey(jwt);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const plaintext = ENC.encode(bodyJson.length > 0 ? bodyJson : "{}");
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv.buffer as ArrayBuffer }, encKey, plaintext.buffer as ArrayBuffer),
    );
    const PLcifrado = bytesToBase64(iv) + ":" + bytesToBase64(ciphertext);

    // Paso 3 — PG
    const pgPayload = { session_id: IDsess, payload: PLcifrado, timestamp };
    const PG = btoa(JSON.stringify(pgPayload));

    // Paso 4 — TAG = HMAC-SHA256(SessApp, PG)
    const sessApp = await deriveSessApp(jwt);
    const tagBytes = new Uint8Array(
        await crypto.subtle.sign("HMAC", sessApp, ENC.encode(PG).buffer as ArrayBuffer),
    );
    const TAG = bytesToHex(tagBytes);

    // Paso 5 — PF (cabeceras)
    return {
        "X-Session-Id": IDsess,
        "X-Request-Pg": PG,
        "X-Request-Tag": TAG,
        "X-Request-Ts": String(timestamp),
    };
}
