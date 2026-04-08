import React, { createContext, useContext, useState, ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { generatePassword, encrypt, generateFinalPassword } from "../crypto";
import { Session, SessionCredentials, Payload } from "../api/types";
import { API_BASE_URL } from "../api/functions";

interface AuthContextType {
    sessionCredentials: SessionCredentials | null;
    login: (userName: string, password: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [sessionCredentials, setSessionCredentials] =
        useState<SessionCredentials | null>(null);

    const mutation = useMutation({
        mutationFn: async ({ sessionData }: { sessionData: Session }) => {
            const response = await fetch(API_BASE_URL + "login/admin/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(sessionData),
            });

            if (!response.ok) {
                throw new Error(`Error en la respuesta: ${response.status}`);
            }

            return response.json();
        },
        onSuccess: (
            data: Payload,
            variables: { sessionData: Session; userHash: string; newPassword: Buffer }
        ) => {
            const sessionData: SessionCredentials = generateFinalPassword(
                variables.userHash,
                data.pl,
                variables.newPassword
            );
            setSessionCredentials(sessionData);
        },
        onError: (error) => {
            console.error("Error al intentar iniciar sesión:", error);
        },
    });

    const login = (userName: string, password: string) => {
        const { userHash, newPassword, na, iv, pl } = generatePassword(
            userName,
            password
        );

        const sessionData: Session = {
            UserName: userHash,
            Payload: encrypt(pl, newPassword, iv),
            RandomNumber: na,
        };

        mutation.mutate({ sessionData, userHash, newPassword });
    };

    const logout = () => {
        setSessionCredentials(null);
    };

    return (
        <AuthContext.Provider value={{ sessionCredentials, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
