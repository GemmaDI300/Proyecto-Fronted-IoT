import { useMemo } from 'react';
import { sanitizeBackendResponse } from '../utils/sanitization';

/**
 * Hook personalizado para sanitizar datos del backend automáticamente
 * 
 * Uso:
 * const { data } = useGetQuery(...);
 * const safeData = useSanitizedData(data);
 * 
 * @param data - Datos del backend (puede ser null/undefined durante carga)
 * @returns Datos sanitizados
 */
export function useSanitizedData<T extends Record<string, unknown> | null | undefined>(
    data: T
): T {
    return useMemo(() => {
        if (!data) return data;
        return sanitizeBackendResponse(data as Record<string, unknown>) as T;
    }, [data]);
}

/**
 * Hook para sanitizar arrays de datos
 */
export function useSanitizedArray<T extends Record<string, unknown>>(
    data: T[] | null | undefined
): T[] | null | undefined {
    return useMemo(() => {
        if (!data) return data;
        return data.map(item => sanitizeBackendResponse(item));
    }, [data]);
}
