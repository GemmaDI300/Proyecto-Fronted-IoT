import {
    createCipheriv,
    createDecipheriv,
    randomBytes,
    createHash,
} from "crypto";

import { SessionCredentials } from "./api/types";

const algorithm = "aes-256-cbc";

interface UserCredentials {
    userHash: string;
    newPassword: Buffer;
    na: number;
    iv: Buffer;
    pl: { hid: string };
}

export function generatePassword(
    userName: string,
    password: string
): UserCredentials {
    // Crear el hash SHA-256 del nombre de usuario y convertirlo a formato hexadecimal
    // Generate an initialization vector
    const iv: Buffer = randomBytes(16);
    const userHash: string = createHash("sha256").update(userName).digest("hex");

    // Crear el hash SHA-256 de la contraseña y convertirlo a formato bytes
    const passwordHash: string = createHash("sha256")
        .update(password)
        .digest("hex");

    // Generar un número aleatorio de 4 dígitos
    const randomNumber: number =
        Math.floor(Math.random() * (99999999 - 10000000 + 1)) + 10000000;

    // Concatenar el hash del usuario, el hash de la contraseña y el número aleatorio
    const finalData: string = userHash + passwordHash + randomNumber.toString();

    // Crear el hash SHA-256 de la combinación final para generar la contraseña (en bytes)
    const hid: string = createHash("sha256").update(finalData).digest("hex");

    // Devolver el hash del nombre de usuario en formato hexadecimal y la contraseña generada en formato de bytes
    return {
        userHash: userHash, // userHash en formato hexadecimal
        newPassword: Buffer.from(passwordHash, "hex"), // passwordHash en formato de bytes
        na: randomNumber,
        iv: iv,
        pl: { hid: hid }, // generatedPassword en formato Buffer (bytes)
    };
}

interface Session {
    na2: number;
    ID_Session: string;
    Port: string;
}

export function generateFinalPassword(
    userHash: string,
    pl: string,
    key: Buffer
): SessionCredentials {
    const session_data: Session = decrypt<Session>(pl, key);
    const key_final = createHash("sha256")
        .update(session_data.na2.toString() + userHash)
        .digest("hex");
    // Devolver el hash del nombre de usuario en formato hexadecimal y la contraseña generada en formato de bytes
    return {
        password: Buffer.from(key_final, "hex"),
        ID_Session: session_data.ID_Session,
    };
}

// Función para cifrar un objeto
export function encrypt<T = object>(
    obj: T,
    key: Buffer,
    iv: Buffer = randomBytes(16)
): string {
    // Convertir el objeto a JSON y cifrarlo
    const jsonString = JSON.stringify(obj);
    const cipher = createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(jsonString, "utf8", "base64");
    encrypted += cipher.final("base64");
    return iv.toString("base64") + ":" + encrypted; // Incluye el IV en la salida
}

// Función para descifrar un objeto tipado
export function decrypt<T = object>(encryptedText: string, key: Buffer): T {
    // Separar el IV y el texto cifrado
    const parts = encryptedText.split(":");
    const ivFromEncrypted = Buffer.from(parts.shift()!, "base64");
    const decipher = createDecipheriv(algorithm, key, ivFromEncrypted);
    let decrypted = decipher.update(parts.join(":"), "base64", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted) as T; // Convertir de nuevo a objeto, devolviendo el texto original con tipo genérico
}
