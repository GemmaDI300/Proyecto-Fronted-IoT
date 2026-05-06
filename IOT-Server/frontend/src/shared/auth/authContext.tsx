import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { SessionCredentials, TokenResponse } from "../api/types";
import { verifyBackendWithPuzzle } from "../services/backendVerification";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const RC_APPLICATION_ID = import.meta.env.VITE_APP_APPLICATION_ID as string | undefined;
const RC_API_KEY        = import.meta.env.VITE_APP_API_KEY        as string | undefined;
const RC_SERVER_KEY     = import.meta.env.VITE_APP_SERVER_KEY     as string | undefined;

interface AuthContextType {
    session: SessionCredentials | null;
    login: (email: string, password: string, endpoint?: string) => void;
    logout: () => void;
    loginError: string | null;
    isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Patrón UUID v4 estricto */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Extrae el `sub` (account UUID) del payload de un JWT de forma segura.
 *
 * Diferencias con `atob()` directo:
 *  - Usa decodificación base64url (RFC 7515): reemplaza `-`→`+` y `_`→`/` antes de decodificar.
 *  - Valida que el token tenga exactamente 3 partes (header.payload.signature).
 *  - Valida que el `sub` extraído sea un UUID válido antes de aceptarlo.
 *
 * Si la validación falla en cualquier paso, retorna "" sin lanzar excepción.
 * Las decisiones de seguridad (accountType, isMaster) NUNCA deben tomarse de aquí;
 * deben tomarse del cuerpo de la respuesta HTTP del servidor.
 */
function extractAccountIdFromJwt(token: string): string {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return "";

        // JWT usa base64url (RFC 4648 §5): `-` en lugar de `+`, `_` en lugar de `/`, sin padding
        const base64url = parts[1];
        const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "=");

        const payload: unknown = JSON.parse(atob(padded));

        if (typeof payload !== "object" || payload === null) return "";

        const sub = (payload as Record<string, unknown>).sub;
        if (typeof sub !== "string") return "";

        // Solo aceptar UUIDs válidos para prevenir inyección de valores arbitrarios
        if (!UUID_RE.test(sub)) return "";

        return sub;
    } catch {
        return "";
    }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // La sesión se almacena SOLO en RAM (estado React).
    // Al cerrar la pestaña el estado JS se destruye y la llave desaparece.
    const [session, setSession] = useState<SessionCredentials | null>(null);
    const [loginError, setLoginError] = useState<string | null>(null);

    // Advierte al usuario antes de cerrar/recargar la pestaña cuando hay sesión activa.
    useEffect(() => {
        if (!session) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            // Los navegadores modernos ignoran el texto personalizado,
            // pero asignar returnValue es obligatorio para activar el diálogo.
            e.returnValue = "Si cierras esta pestaña se cerrará tu sesión activa.";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [session]);

    const mutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string; endpoint: string }) => {
            // Verificación RC: confirmar que el backend es el original antes de enviar credenciales
            if (RC_APPLICATION_ID && RC_API_KEY && RC_SERVER_KEY) {
                const backendOk = await verifyBackendWithPuzzle(
                    API_BASE_URL, RC_APPLICATION_ID, RC_API_KEY, RC_SERVER_KEY,
                );
                if (!backendOk) {
                    throw new Error(
                        "No se pudo verificar la autenticidad del servidor. Conexión rechazada.",
                    );
                }
            }

            const response = await fetch(API_BASE_URL + credentials.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: credentials.email, password: credentials.password }),
            });

            if (!response.ok) {
                const errBody = await response.json().catch(() => null);
                const detail = errBody?.detail;
                throw new Error(typeof detail === "string" ? detail : `Error ${response.status}`);
            }

            return response.json() as Promise<TokenResponse>;
        },
        onSuccess: (data: TokenResponse) => {
            setLoginError(null);
            // Extraer account ID del payload JWT usando decodificación base64url correcta.
            // NOTA DE SEGURIDAD: accountType e isMaster provienen del cuerpo de la respuesta
            // del servidor (data.account_type / data.is_master), NO del payload del JWT,
            // por lo que no pueden ser falsificados por un token crafteado.
            // accountId solo se usa para conveniencia UX (pre-rellenar formularios); el
            // backend valida el token completo en cada petición.
            const accountId = extractAccountIdFromJwt(data.access_token);
            const creds: SessionCredentials = {
                token: data.access_token,
                accountId,
                accountType: data.account_type,
                isMaster: data.is_master,
            };
            // Solo RAM: nunca se escribe en sessionStorage ni localStorage.
            setSession(creds);
        },
        onError: (error: Error) => {
            setLoginError(error.message);
        },
    });

    const login = (email: string, password: string, endpoint?: string) => {
        setLoginError(null);
        mutation.mutate({ email, password, endpoint: endpoint || "auth/login" });
    };

    const logout = () => {
        setSession(null);
        setLoginError(null);
    };

    return (
        <AuthContext.Provider
            value={{
                session,
                login,
                logout,
                loginError,
                isLoggingIn: mutation.isPending,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe usarse dentro de AuthProvider");
    }
    return context;
};
