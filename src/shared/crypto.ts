import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    createHash,
} from "crypto";

const algorithm = "aes-256-cbc";
const BLOCK_SIZE = 16;

/**
 * Deriva una clave AES-256 a partir de un string secreto.
 * Compatible con el backend IOT-Server (AesCbcCryptography.__derive_key).
 */
function deriveKey(secret: string): Buffer {
    if (secret.length === 64) {
        try {
            return Buffer.from(secret, "hex");
        } catch {
            // fall through to SHA-256
        }
    }
    return createHash("sha256").update(secret, "utf-8").digest();
}

/**
 * Cifra un objeto JSON con AES-256-CBC.
 * Formato de salida: "base64(iv):base64(ciphertext)" — compatible con el backend.
 */
export function encrypt<T = object>(obj: T, secret: string): string {
    const key = deriveKey(secret);
    const iv = randomBytes(BLOCK_SIZE);
    const plaintext = JSON.stringify(obj);

    const cipher = createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf-8"),
        cipher.final(),
    ]);

    return iv.toString("base64") + ":" + encrypted.toString("base64");
}

/**
 * Descifra un payload "base64(iv):base64(ciphertext)" y devuelve el objeto JSON.
 */
export function decrypt<T = object>(encryptedText: string, secret: string): T {
    const key = deriveKey(secret);
    const [ivB64, ctB64] = encryptedText.split(":", 2);
    const iv = Buffer.from(ivB64, "base64");
    const ciphertext = Buffer.from(ctB64, "base64");

    const decipher = createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    return JSON.parse(decrypted.toString("utf-8")) as T;
}
