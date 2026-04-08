import { useQuery, UseQueryOptions, useMutation, UseMutationOptions } from '@tanstack/react-query';
import { encrypt, decrypt } from '../crypto'; // Asumiendo que tienes estas funciones importadas
import { SessionCredentials, Payload } from './types'; // Asumiendo que tienes estos tipos definidos

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export function useSendDataMutation<TData, TResponse, TError = Error>(
    endpoint: string,
    sessionCredentials: SessionCredentials,
    method: "POST" | "PUT" = "POST",
    options?: Omit<UseMutationOptions<TResponse, TError, TData>, 'mutationFn'>
) {
    return useMutation<TResponse, TError, TData>({
        mutationFn: async (data: TData) => {
            const payload: Payload = {
                pl: encrypt<TData>(data, sessionCredentials.password),
            };

            const response = await fetch(API_BASE_URL + endpoint, {
                method: method,
                headers: {
                    "Content-Type": "application/json",
                    "X-Session": sessionCredentials.ID_Session,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`Network response was not ok: ${errorMessage}`);
            }

            const responseData = await response.json();
            return decrypt<TResponse>(responseData.pl, sessionCredentials.password);
        },
        ...options
    });
}

export function useDeleteByIdMutation<TResponse, TError = Error>(
    endpoint: string,
    sessionCredentials: SessionCredentials,
    options?: Omit<UseMutationOptions<TResponse, TError, string>, 'mutationFn'>
) {
    return useMutation<TResponse, TError, string>({
        mutationFn: async (id: string) => {
            const response = await fetch(API_BASE_URL + endpoint + `/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-Session": sessionCredentials.ID_Session,
                },
            });
            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`Network response was not ok: ${errorMessage}`);
            }
            const responseData = await response.json();
            return decrypt<TResponse>(responseData.pl, sessionCredentials.password);
        },
        ...options
    });
}

export function useGetQuery<TResponse, TError = Error>(
    endpoint: string,
    sessionCredentials: SessionCredentials,
    options?: Omit<UseQueryOptions<TResponse, TError>, 'queryKey' | 'queryFn'>
) {
    return useQuery<TResponse, TError>({
        queryKey: [endpoint, sessionCredentials.ID_Session],
        queryFn: async () => {
            const response = await fetch(API_BASE_URL + endpoint, {
                headers: {
                    "X-Session": sessionCredentials.ID_Session,
                },
            });

            if (!response.ok) {
                throw new Error(`Error en la solicitud: ${response.statusText}`);
            }

            const data = await response.json();
            return decrypt<TResponse>(data.pl, sessionCredentials.password);
        },
        ...options
    });
}
