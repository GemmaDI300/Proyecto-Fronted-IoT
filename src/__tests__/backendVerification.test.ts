/**
 * Tests para backendVerification.ts
 *
 * Verifican cada paso del protocolo RC (Reto Criptográfico) de forma tangible:
 *  - hexToBytes       → convierte claves hex a bytes correctamente
 *  - bytesToBase64    → codifica bytes en base64 estándar
 *  - buildPuzzlePayload → construye el puzzle con las dimensiones correctas
 *  - verifyBackendWithPuzzle → envía el puzzle y procesa la respuesta del backend
 *
 * Para ver la salida visual de cada paso ejecutar:
 *   npm test -- --reporter=verbose backendVerification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    hexToBytes,
    bytesToBase64,
    buildPuzzlePayload,
    verifyBackendWithPuzzle,
} from "../shared/services/backendVerification";

// ─── Claves de prueba (fijas, no reales) ─────────────────────────────────────
// 64 caracteres hex = 32 bytes cada una
const API_KEY_HEX    = "aa".repeat(32); // 0xaa × 32
const SERVER_KEY_HEX = "bb".repeat(32); // 0xbb × 32
const APP_ID         = "00000000-0000-0000-0000-000000000001";
const API_BASE_URL   = "http://localhost:8000/api/v1/";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function base64ToBytes(b64: string): Uint8Array {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

// ─── hexToBytes ───────────────────────────────────────────────────────────────
describe("hexToBytes", () => {
    it("convierte 64 caracteres hex a 32 bytes", () => {
        const bytes = hexToBytes(API_KEY_HEX);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(32);
        // 0xaa = 170
        expect(bytes[0]).toBe(0xaa);
        expect(bytes[31]).toBe(0xaa);
    });

    it("convierte correctamente valores conocidos", () => {
        const bytes = hexToBytes("deadbeef");
        expect(bytes.length).toBe(4);
        expect(Array.from(bytes)).toEqual([0xde, 0xad, 0xbe, 0xef]);
    });

    it("lanza error si la longitud es impar", () => {
        expect(() => hexToBytes("abc")).toThrow("La clave hexadecimal debe tener longitud par");
    });

    it("produce array vacío para string vacío", () => {
        const bytes = hexToBytes("");
        expect(bytes.length).toBe(0);
    });
});

// ─── bytesToBase64 ────────────────────────────────────────────────────────────
describe("bytesToBase64", () => {
    it("codifica bytes conocidos y es reversible con atob", () => {
        const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
        const b64 = bytesToBase64(original);
        expect(b64).toBe(btoa("Hello"));
        const decoded = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        expect(Array.from(decoded)).toEqual(Array.from(original));
    });

    it("codifica 16 bytes en una cadena base64 de 24 caracteres", () => {
        const bytes = new Uint8Array(16).fill(0xff);
        const b64 = bytesToBase64(bytes);
        expect(b64.length).toBe(24); // ceil(16/3)*4
    });

    it("codifica 80 bytes en una cadena base64 de 108 caracteres", () => {
        const bytes = new Uint8Array(80).fill(0x00);
        const b64 = bytesToBase64(bytes);
        expect(b64.length).toBe(108); // ceil(80/3)*4
    });
});

// ─── buildPuzzlePayload ───────────────────────────────────────────────────────
describe("buildPuzzlePayload", () => {
    it("retorna un objeto con application_id y encrypted_payload", async () => {
        const payload = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);

        expect(payload.application_id).toBe(APP_ID);
        expect(payload.encrypted_payload).toBeDefined();
        expect(typeof payload.encrypted_payload.ciphertext).toBe("string");
        expect(typeof payload.encrypted_payload.iv).toBe("string");
    });

    it("el IV decodificado tiene exactamente 16 bytes", async () => {
        const payload = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        const ivBytes = base64ToBytes(payload.encrypted_payload.iv);

        console.log("\n[RC Paso 6] IV generado (base64):", payload.encrypted_payload.iv);
        console.log("[RC Paso 6] IV en hex:", Array.from(ivBytes).map(b => b.toString(16).padStart(2,"0")).join(""));

        expect(ivBytes.length).toBe(16);
    });

    it("el ciphertext decodificado tiene exactamente 80 bytes (72 plaintext + 8 PKCS7)", async () => {
        const payload = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        const ctBytes = base64ToBytes(payload.encrypted_payload.ciphertext);

        // 72 bytes de plaintext (P2:32 + R2:32 + timestamp:8)
        // AES-CBC PKCS7: 72 % 16 = 8 bytes sobrantes → se agregan 8 bytes → 80 total
        console.log("\n[RC Pasos 5-7] Tamaño del ciphertext:", ctBytes.length, "bytes");
        console.log("[RC Paso 8]  Ciphertext (base64):", payload.encrypted_payload.ciphertext.substring(0, 40) + "...");

        expect(ctBytes.length).toBe(80);
    });

    it("dos llamadas producen ciphertexts distintos (IV y R2 son aleatorios)", async () => {
        const payload1 = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        const payload2 = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);

        expect(payload1.encrypted_payload.ciphertext).not.toBe(payload2.encrypted_payload.ciphertext);
        expect(payload1.encrypted_payload.iv).not.toBe(payload2.encrypted_payload.iv);
    });

    it("imprime una visión completa del payload generado (inspección visual)", async () => {
        const payload = await buildPuzzlePayload(APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        const ivBytes = base64ToBytes(payload.encrypted_payload.iv);
        const ctBytes = base64ToBytes(payload.encrypted_payload.ciphertext);

        console.log("\n════════════════════════════════════════════");
        console.log("  PUZZLE RC — Payload generado por el frontend");
        console.log("════════════════════════════════════════════");
        console.log("  application_id  :", payload.application_id);
        console.log("  IV (16 bytes)   :", Array.from(ivBytes).map(b => b.toString(16).padStart(2,"0")).join(""));
        console.log("  Ciphertext bytes:", ctBytes.length, "(esperado: 80)");
        console.log("  Ciphertext b64  :", payload.encrypted_payload.ciphertext);
        console.log("────────────────────────────────────────────");
        console.log("  Este payload se envía a POST /applications/auth");
        console.log("  Solo el backend original puede descifrarlo y");
        console.log("  verificar el HMAC interno (P2).");
        console.log("════════════════════════════════════════════\n");

        expect(payload.application_id).toBe(APP_ID);
        expect(ivBytes.length).toBe(16);
        expect(ctBytes.length).toBe(80);
    });

    it("lanza error si la api_key hex tiene longitud impar", async () => {
        await expect(buildPuzzlePayload(APP_ID, "abc", SERVER_KEY_HEX)).rejects.toThrow(
            "La clave hexadecimal debe tener longitud par",
        );
    });
});

// ─── verifyBackendWithPuzzle ──────────────────────────────────────────────────
describe("verifyBackendWithPuzzle", () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.stubGlobal("fetch", mockFetch);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        mockFetch.mockReset();
    });

    it("retorna true cuando el backend responde { valid: true }", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ valid: true }),
        });

        const result = await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        expect(result).toBe(true);
    });

    it("retorna false cuando el backend responde { valid: false }", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ valid: false }),
        });

        const result = await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        expect(result).toBe(false);
    });

    it("retorna false cuando el servidor devuelve HTTP 401", async () => {
        mockFetch.mockResolvedValue({ ok: false, status: 401 });

        const result = await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        expect(result).toBe(false);
    });

    it("retorna false si hay un error de red (fetch lanza excepción)", async () => {
        mockFetch.mockRejectedValue(new Error("Network Error"));

        const result = await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        expect(result).toBe(false);
    });

    it("llama a POST /applications/auth con la URL correcta", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ valid: true }),
        });

        await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);

        expect(mockFetch).toHaveBeenCalledOnce();
        const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("http://localhost:8000/api/v1/applications/auth");
        expect(options.method).toBe("POST");
        expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    });

    it("el body enviado contiene application_id correcto y encrypted_payload válido", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ valid: true }),
        });

        await verifyBackendWithPuzzle(API_BASE_URL, APP_ID, API_KEY_HEX, SERVER_KEY_HEX);

        const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        const body = JSON.parse(options.body as string) as {
            application_id: string;
            encrypted_payload: { ciphertext: string; iv: string };
        };

        console.log("\n[RC Paso 9] Request body enviado al backend:");
        console.log(JSON.stringify(body, null, 2));

        expect(body.application_id).toBe(APP_ID);
        expect(typeof body.encrypted_payload.ciphertext).toBe("string");
        expect(typeof body.encrypted_payload.iv).toBe("string");

        // Verificar tamaños correctos
        const ctBytes = base64ToBytes(body.encrypted_payload.ciphertext);
        const ivBytes = base64ToBytes(body.encrypted_payload.iv);
        expect(ctBytes.length).toBe(80);
        expect(ivBytes.length).toBe(16);
    });

    it("elimina la barra final de la URL base correctamente", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ valid: true }),
        });

        await verifyBackendWithPuzzle("http://localhost:8000/api/v1/", APP_ID, API_KEY_HEX, SERVER_KEY_HEX);
        const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("http://localhost:8000/api/v1/applications/auth");
        // Sin doble barra: no termina en "//applications/auth"
        expect(url).not.toContain("//applications");
    });
});
