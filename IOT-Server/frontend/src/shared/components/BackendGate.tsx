import React, { useEffect, useState, useCallback, ReactNode } from "react";
import {
    Box,
    CircularProgress,
    Typography,
    Button,
    Alert,
} from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";
import { verifyBackendWithPuzzle } from "../services/backendVerification";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;
const APPLICATION_ID = import.meta.env.VITE_APP_APPLICATION_ID as string | undefined;
const API_KEY       = import.meta.env.VITE_APP_API_KEY        as string | undefined;
const SERVER_KEY    = import.meta.env.VITE_APP_SERVER_KEY     as string | undefined;

type VerificationStatus = "pending" | "verified" | "failed" | "unconfigured";

interface BackendGateProps {
    children: ReactNode;
}

/**
 * BackendGate — verificación RC del backend antes de mostrar la aplicación.
 *
 * Bloquea el renderizado de la app hasta confirmar que el backend
 * al que apunta el frontend es el servidor original, usando el
 * protocolo de Reto Criptográfico (puzzle AES-256-CBC + HMAC-SHA256).
 *
 * Si las variables VITE_APP_APPLICATION_ID / VITE_APP_API_KEY /
 * VITE_APP_SERVER_KEY no están configuradas, la verificación se omite
 * (útil en entornos de desarrollo).
 */
export const BackendGate: React.FC<BackendGateProps> = ({ children }) => {
    const [status, setStatus] = useState<VerificationStatus>("pending");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const runVerification = useCallback(async () => {
        // Sin credenciales configuradas → omitir (modo desarrollo)
        if (!APPLICATION_ID || !API_KEY || !SERVER_KEY) {
            setStatus("unconfigured");
            return;
        }

        setStatus("pending");
        setErrorMsg(null);

        try {
            const ok = await verifyBackendWithPuzzle(
                API_BASE_URL,
                APPLICATION_ID,
                API_KEY,
                SERVER_KEY,
            );

            if (ok) {
                setStatus("verified");
            } else {
                setStatus("failed");
                setErrorMsg(
                    "El backend no pudo validar el puzzle criptográfico. " +
                    "El servidor puede no ser el original o estar mal configurado.",
                );
            }
        } catch (err) {
            setStatus("failed");
            setErrorMsg(
                "No se pudo conectar con el backend: " +
                (err instanceof Error ? err.message : "Error desconocido"),
            );
        }
    }, []);

    useEffect(() => {
        void runVerification();
    }, [runVerification]);

    // ── Estado: verificando ──────────────────────────────────────────
    if (status === "pending") {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    gap: 2,
                }}
            >
                <CircularProgress size={60} />
                <Typography variant="h6" color="text.secondary">
                    Verificando autenticidad del servidor...
                </Typography>
            </Box>
        );
    }

    // ── Estado: fallo de verificación ───────────────────────────────
    if (status === "failed") {
        return (
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    gap: 3,
                    p: 4,
                    textAlign: "center",
                }}
            >
                <SecurityIcon sx={{ fontSize: 80, color: "error.main" }} />
                <Typography variant="h4" color="error.main">
                    Servidor no verificado
                </Typography>
                <Alert severity="error" sx={{ maxWidth: 540 }}>
                    {errorMsg}
                </Alert>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => void runVerification()}
                >
                    Reintentar verificación
                </Button>
            </Box>
        );
    }

    // ── Estado: verificado o sin configurar → mostrar la app ────────
    return <>{children}</>;
};
