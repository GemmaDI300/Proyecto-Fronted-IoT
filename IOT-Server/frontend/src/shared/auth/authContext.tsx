import React, { createContext, useContext, useState, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { SessionCredentials, TokenResponse } from "../api/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface AuthContextType {
    session: SessionCredentials | null;
    login: (email: string, password: string, endpoint?: string) => void;
    logout: () => void;
    loginError: string | null;
    isLoggingIn: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "iot_session";

function loadSession(): SessionCredentials | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as SessionCredentials;
        // Validate token is not expired
        const payload = JSON.parse(atob(parsed.token.split(".")[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            sessionStorage.removeItem(STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch {
        sessionStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<SessionCredentials | null>(loadSession);
    const [loginError, setLoginError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: async (credentials: { email: string; password: string; endpoint: string }) => {
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
            // Extract account ID from JWT payload
            let accountId = "";
            try {
                const payload = JSON.parse(atob(data.access_token.split(".")[1]));
                accountId = payload.sub || "";
            } catch { /* ignore */ }
            const creds: SessionCredentials = {
                token: data.access_token,
                accountId,
                accountType: data.account_type,
                isMaster: data.is_master,
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(creds));
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
        sessionStorage.removeItem(STORAGE_KEY);
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
