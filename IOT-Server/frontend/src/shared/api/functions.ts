import {
    useQuery,
    UseQueryOptions,
    useMutation,
    UseMutationOptions,
} from "@tanstack/react-query";
import { SessionCredentials } from "./types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

async function parseApiError(response: Response): Promise<string> {
    const raw = await response.text();
    try {
        const json = JSON.parse(raw);
        if (json.detail) return typeof json.detail === "string" ? json.detail : JSON.stringify(json.detail);
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
            const response = await fetch(API_BASE_URL + endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            return await response.json() as TResponse;
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
            const response = await fetch(API_BASE_URL + endpoint + `/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(await parseApiError(response));
            }

            // DELETE 204 no tiene body
            if (response.status === 204) {
                return {} as TResponse;
            }

            return await response.json() as TResponse;
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
            const response = await fetch(API_BASE_URL + endpoint, {
                headers: {
                    Authorization: `Bearer ${session.token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            return await response.json() as TResponse;
        },
        ...options,
    });
}
