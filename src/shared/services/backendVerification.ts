/**
 * Verificación RC del backend — Reto Criptográfico (puzzle).
 *
 * El frontend se registra como una Application en el backend y obtiene
 * `api_key` y `server_key`. Al arrancar, construye un puzzle cifrado
 * siguiendo exactamente el protocolo de GUIA_PUZZLE_AUTH.md y lo envía
 * a POST /applications/auth.  Solo el backend genuino (que posee la
 * entidad en su BD y la SECRET_KEY correcta) puede validarlo.
 *
 * Usa exclusivamente la Web Crypto API nativa del navegador (sin dependencias).
 */

export interface PuzzleRequest {
    application_id: string;
    encrypted_payload: {
        ciphertext: string; // base64
        iv: string;         // base64
    };
}

/** Convierte una cadena hexadecimal a Uint8Array (e.g. 64 chars → 32 bytes). */
export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
    if (hex.length % 2 !== 0) {
        throw new Error("La clave hexadecimal debe tener longitud par");
    }
    const buf = new ArrayBuffer(hex.length / 2);
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}

/** Codifica un Uint8Array en base64 estándar. */
export function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Construye el puzzle RC (pasos 1–8 de GUIA_PUZZLE_AUTH.md).
 * Función pura: solo usa Web Crypto API, no realiza ninguna petición de red.
 *
 * Pasos:
 *  1. R2 = 32 bytes aleatorios criptográficamente seguros
 *  2. timestamp = segundos desde epoch como 8 bytes big-endian
 *  3. P2 = HMAC-SHA256(apiKey ‖ serverKey,  R2 ‖ timestamp)
 *  4. plaintext = P2 ‖ R2 ‖ timestamp  (72 bytes)
 *  5. PKCS7 padding — lo aplica automáticamente AES-CBC de Web Crypto API
 *  6. IV = 16 bytes aleatorios
 *  7. ciphertext = AES-256-CBC(plaintext, apiKey, IV)  → 80 bytes (72 + 8 padding)
 *  8. Codificar ciphertext e IV en base64
 */
export async function buildPuzzlePayload(
    applicationId: string,
    apiKeyHex: string,
    serverKeyHex: string,
): Promise<PuzzleRequest> {
    const entityKey = hexToBytes(apiKeyHex);
    const serverKey = hexToBytes(serverKeyHex);

    // Paso 1 — R2 aleatorio
    const r2 = crypto.getRandomValues(new Uint8Array(32));

    // Paso 2 — timestamp como 8 bytes big-endian
    const timestampBuf = new ArrayBuffer(8);
    new DataView(timestampBuf).setBigUint64(0, BigInt(Math.floor(Date.now() / 1000)));
    const timestamp = new Uint8Array(timestampBuf);

    // Paso 3 — P2 = HMAC-SHA256(entityKey ‖ serverKey,  R2 ‖ timestamp)
    const hmacKeyMaterial = new Uint8Array(64);
    hmacKeyMaterial.set(entityKey, 0);
    hmacKeyMaterial.set(serverKey, 32);

    const message = new Uint8Array(40);
    message.set(r2, 0);
    message.set(timestamp, 32);

    const hmacCryptoKey = await crypto.subtle.importKey(
        "raw",
        hmacKeyMaterial,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const p2 = new Uint8Array(await crypto.subtle.sign("HMAC", hmacCryptoKey, message));

    // Paso 4 — plaintext = P2 ‖ R2 ‖ timestamp  (72 bytes)
    const plaintext = new Uint8Array(72);
    plaintext.set(p2, 0);
    plaintext.set(r2, 32);
    plaintext.set(timestamp, 64);

    // Pasos 5-7 — AES-256-CBC cifra con PKCS7 padding automático → 80 bytes
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const aesCryptoKey = await crypto.subtle.importKey(
        "raw",
        entityKey,
        { name: "AES-CBC" },
        false,
        ["encrypt"],
    );
    const ciphertext = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-CBC", iv }, aesCryptoKey, plaintext),
    );

    // Paso 8 — Codificar en base64
    return {
        application_id: applicationId,
        encrypted_payload: {
            ciphertext: bytesToBase64(ciphertext),
            iv: bytesToBase64(iv),
        },
    };
}

/**
 * Construye el puzzle (paso 9) y lo envía a POST /applications/auth.
 *
 * @returns true  si el backend responde { valid: true }  → servidor genuino
 *          false si el backend rechaza el puzzle, no responde o hay error de red
 */
export async function verifyBackendWithPuzzle(
    apiBaseUrl: string,
    applicationId: string,
    apiKeyHex: string,
    serverKeyHex: string,
): Promise<boolean> {
    try {
        const payload = await buildPuzzlePayload(applicationId, apiKeyHex, serverKeyHex);
        const url = apiBaseUrl.replace(/\/$/, "") + "/applications/auth";

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) return false;

        const data = (await response.json()) as { valid?: boolean };
        return data.valid === true;
    } catch {
        return false;
    }
}

// ── Helpers de sesión RC ────────────────────────────────────────────────────
//
// El backend (Valkey) mantiene una sola sesión RC activa por application_id.
// Ejecutar el puzzle más de una vez mientras esa sesión esté viva devuelve 401.
// Usamos localStorage con TTL para evitar re-verificaciones innecesarias:
//   - Compartido entre pestañas (a diferencia de sessionStorage).
//   - TTL de 55 min — la sesión RC del backend expira a los 60 min (ACCESS_TOKEN_EXPIRE_MINUTES).
//   - En un despliegue nuevo con Valkey limpio, el TTL habrá expirado o localStorage
//     estará vacío → el puzzle se ejecuta exactamente una vez y todo funciona.

const RC_LS_KEY = "rc_verified_at";
const RC_TTL_MS = 55 * 60 * 1000; // 55 minutos

/** Devuelve true si existe una verificación RC válida y no expirada. */
export function isRcSessionValid(): boolean {
    try {
        const raw = localStorage.getItem(RC_LS_KEY);
        if (!raw) return false;
        return Date.now() - Number(raw) < RC_TTL_MS;
    } catch {
        return false;
    }
}

/** Registra la verificación RC como exitosa con timestamp actual. */
export function markRcSessionValid(): void {
    try {
        localStorage.setItem(RC_LS_KEY, String(Date.now()));
    } catch { /* ignore — entornos sin localStorage (SSR, pruebas) */ }
}

/** Elimina la marca de verificación RC (fuerza re-verificación en la próxima carga). */
export function clearRcSession(): void {
    try {
        localStorage.removeItem(RC_LS_KEY);
    } catch { /* ignore */ }
}
