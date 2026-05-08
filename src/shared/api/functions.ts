import {
    useQuery,
    UseQueryOptions,
    useMutation,
    UseMutationOptions,
} from "@tanstack/react-query";
import { SessionCredentials } from "./types";
import { sanitizeObject, sanitizeBackendResponse, isValidId } from "../utils/sanitization";
import { buildSignedHeaders } from "./requestSigning";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function parseApiError(response: Response): Promise<string> {
    const raw = await response.text();
    try {
        const json = JSON.parse(raw);
        if (json.detail) {
            // detail puede ser string (error del negocio) o array (errores de validación Pydantic 422)
            if (typeof json.detail === "string") return json.detail;
            if (Array.isArray(json.detail)) {
                // Cada elemento tiene { loc, msg, type } — extraemos solo el msg legible
                return json.detail
                    .map((e: { msg?: string; loc?: string[] }) => {
                        const field = e.loc ? e.loc.filter((l) => l !== "body").join(".") : "";
                        return field ? `${field}: ${e.msg ?? "error"}` : (e.msg ?? "error");
                    })
                    .join(" | ");
            }
        }
    } catch {
        if (raw.includes("UNIQUE constraint failed")) {
            const match = raw.match(/UNIQUE constraint failed: \S+\.(\w+)/);
            const field = match?.[1] ?? "valor";
            return `Ya existe un registro con ese ${field}`;
        }
    }
    return `Error ${response.status}`;
}

/**
 * Mutation para enviar datos (POST / PUT / PATCH).
 */
export function useSendDataMutation<TData, TResponse, TError = Error>(
    endpoint: string,
    session: SessionCredentials,
    method: "POST" | "PUT" | "PATCH" = "POST",
    options?: Omit<UseMutationOptions<TResponse, TError, TData>, "mutationFn">
) {
    return useMutation<TResponse, TError, TData>({
        mutationFn: async (data: TData) => {
            // 🛡️ SANITIZACIÓN DE ENTRADA: Limpia datos antes de enviar al backend
            const sanitizedData = sanitizeObject(
                data as Record<string, unknown>,
                ['password', 'token', 'hash'] // Excluye campos sensibles de sanitización
            ) as TData;

            // 🔐 PF = TAG + PG: firma criptográfica de la petición
            const bodyJson = JSON.stringify(sanitizedData);
            const sigHeaders = await buildSignedHeaders(session.token, bodyJson).catch(() => ({}));

            const response = await fetch(API_BASE_URL + endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                    ...sigHeaders,
                },
                body: bodyJson,
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            const responseData = await response.json() as TResponse;
            
            // 🛡️ SANITIZACIÓN DE SALIDA: Limpia datos del backend antes de usar
            return sanitizeBackendResponse(responseData as Record<string, unknown>) as TResponse;
        },
        ...options,
    });
}

/**
 * Mutation para eliminar un recurso por ID.
 */
export function useDeleteByIdMutation<TResponse, TError = Error>(
    endpoint: string,
    session: SessionCredentials,
    options?: Omit<UseMutationOptions<TResponse, TError, string>, "mutationFn">
) {
    return useMutation<TResponse, TError, string>({
        mutationFn: async (id: string) => {
            // 🛡️ VALIDACIÓN DE ID: Previene inyección en la ruta
            if (!isValidId(id)) {
                throw new Error('ID inválido: solo se permiten números o UUIDs');
            }

            // 🔐 PF = TAG + PG: firma criptográfica de la petición (sin body)
            const sigHeaders = await buildSignedHeaders(session.token, "").catch(() => ({}));

            const response = await fetch(API_BASE_URL + endpoint + `/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                    ...sigHeaders,
                },
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            // DELETE 204 no tiene body
            if (response.status === 204) {
                return {} as TResponse;
            }

            const responseData = await response.json() as TResponse;
            return sanitizeBackendResponse(responseData as Record<string, unknown>) as TResponse;
        },
        ...options,
    });
}

/**
 * Query para obtener datos con descifrado automático (GET).
 */
export function useGetQuery<TResponse, TError = Error>(
    endpoint: string,
    session: SessionCredentials,
    options?: Omit<UseQueryOptions<TResponse, TError>, "queryKey" | "queryFn">
) {
    return useQuery<TResponse, TError>({
        queryKey: [endpoint, session.token],
        queryFn: async () => {
            // 🔐 PF = TAG + PG: firma criptográfica de la petición (GET, sin body)
            const sigHeaders = await buildSignedHeaders(session.token, "").catch(() => ({}));

            const response = await fetch(API_BASE_URL + endpoint, {
                headers: {
                    Authorization: `Bearer ${session.token}`,
                    ...sigHeaders,
                },
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            const responseData = await response.json() as TResponse;
            
            // 🛡️ SANITIZACIÓN DE SALIDA: Limpia datos del backend
            // Previene que scripts maliciosos del backend se ejecuten en el frontend
            return sanitizeBackendResponse(responseData as Record<string, unknown>) as TResponse;
        },
        ...options,
    });
}
