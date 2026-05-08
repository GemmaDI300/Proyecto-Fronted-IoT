import { useEffect, useState } from "react";
import { useAuth } from "../shared/auth/authContext";
import { useNavigate } from "react-router-dom";
import {
    Typography,
    Button,
    Box,
    TextField,
    Alert,
    CircularProgress,
    Chip,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export interface LoginConfig {
    badge: string;
    serviceBadge?: string;
    emailPlaceholder: string;
    warning: string;
    apiEndpoint: string;
    /** Tipo de cuenta requerido: rechaza la sesión si el servidor devuelve otro tipo. */
    requiredAccountType: string;
    /** Si se indica, verifica que is_master coincida exactamente. */
    requiredIsMaster?: boolean;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    bgGradient: string;
}

interface LoginBaseProps {
    config: LoginConfig;
}

const LoginBase = ({ config }: LoginBaseProps) => {
    const { login, session, loginError, isLoggingIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        if (session) navigate("/");
    }, [session, navigate]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim() && password.trim()) {
            login(
                email.trim(),
                password,
                config.apiEndpoint,
                config.requiredAccountType,
                config.requiredIsMaster,
            );
        }
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: config.bgGradient,
                position: "relative",
                overflow: "hidden",
                "&::before": {
                    content: '""',
                    position: "absolute",
                    top: "10%",
                    right: "10%",
                    width: 300,
                    height: 300,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, ${config.primary}0F 0%, transparent 70%)`,
                    pointerEvents: "none",
                },
                /* diagonal geometric decoration */
                "&::after": {
                    content: '""',
                    position: "absolute",
                    bottom: "-60px",
                    left: "-40px",
                    width: 280,
                    height: 280,
                    background: `linear-gradient(135deg, ${config.primary}18 0%, transparent 60%)`,
                    transform: "rotate(-20deg)",
                    borderRadius: "40% 60% 60% 40% / 40% 40% 60% 60%",
                    pointerEvents: "none",
                },
            }}
        >
            <Box
                component="form"
                onSubmit={handleLogin}
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    mx: 2,
                    p: { xs: 3, sm: 4, md: 5 },
                    borderRadius: "16px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
                    bgcolor: "#fff",
                    textAlign: "center",
                    border: "1px solid #e2e8f0",
                    animation: "fadeSlideUp 0.45s ease both",
                    position: "relative",
                    zIndex: 1,
                }}
            >
                {/* Logo icon */}
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: config.primaryLight,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                        boxShadow: `0 4px 16px ${config.primary}33`,
                    }}
                >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={config.primary}>
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </Box>

                {/* Title */}
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}>
                    IoT Platform
                </Typography>
                <Typography variant="body2" sx={{ color: "#64748b", mb: 1.5 }}>
                    Plataforma de Gestión IoT Empresarial
                </Typography>

                {/* Role badge(s) */}
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap", mb: 2 }}>
                    <Chip
                        label={config.badge}
                        sx={{
                            bgcolor: config.primaryLight,
                            color: config.primary,
                            fontWeight: 700,
                            fontSize: 13,
                            px: 1,
                        }}
                    />
                    {config.serviceBadge && (
                        <Chip
                            label={config.serviceBadge}
                            variant="outlined"
                            sx={{
                                borderColor: config.primary,
                                color: config.primary,
                                fontWeight: 600,
                                fontSize: 12,
                            }}
                        />
                    )}
                </Box>

                {/* Session warning */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                        bgcolor: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: "8px",
                        p: 1.5,
                        mb: 3,
                        textAlign: "left",
                    }}
                >
                    <WarningAmberIcon sx={{ color: "#d97706", fontSize: 20, mt: 0.2 }} />
                    <Typography variant="caption" sx={{ color: "#92400e", lineHeight: 1.5 }}>
                        {config.warning}
                    </Typography>
                </Box>

                {/* Error alert */}
                {loginError && (
                    <Alert severity="error" sx={{ mb: 2, textAlign: "left" }}>
                        {loginError}
                    </Alert>
                )}

                {/* Email */}
                <Box sx={{ textAlign: "left", mb: 2 }}>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: "#374151", mb: 0.5, display: "block" }}
                    >
                        Correo electrónico
                    </Typography>
                    <TextField
                        name="email"
                        type="email"
                        placeholder={config.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        fullWidth
                        required
                        autoComplete="email"
                        autoFocus
                        size="small"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "8px",
                                "&:hover fieldset": { borderColor: config.primary },
                                "&.Mui-focused fieldset": {
                                    borderColor: config.primary,
                                    boxShadow: `0 0 0 3px ${config.primary}1A`,
                                },
                            },
                        }}
                    />
                </Box>

                {/* Password */}
                <Box sx={{ textAlign: "left", mb: 3 }}>
                    <Typography
                        variant="caption"
                        sx={{ fontWeight: 600, color: "#374151", mb: 0.5, display: "block" }}
                    >
                        Contraseña
                    </Typography>
                    <TextField
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        fullWidth
                        required
                        autoComplete="current-password"
                        size="small"
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "8px",
                                "&:hover fieldset": { borderColor: config.primary },
                                "&.Mui-focused fieldset": {
                                    borderColor: config.primary,
                                    boxShadow: `0 0 0 3px ${config.primary}1A`,
                                },
                            },
                        }}
                    />
                </Box>

                {/* Submit */}
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={isLoggingIn}
                    sx={{
                        py: 1.4,
                        fontSize: "0.95rem",
                        fontWeight: 700,
                        borderRadius: "8px",
                        bgcolor: config.primary,
                        boxShadow: `0 4px 12px ${config.primary}40`,
                        textTransform: "none",
                        cursor: "pointer",
                        "&:hover": {
                            bgcolor: config.primaryDark,
                            boxShadow: `0 8px 24px ${config.primary}4D`,
                        },
                    }}
                >
                    {isLoggingIn ? (
                        <CircularProgress size={24} sx={{ color: "#fff" }} />
                    ) : (
                        "Iniciar Sesión"
                    )}
                </Button>

                {/* API endpoint annotation */}
                <Typography
                    variant="caption"
                    sx={{ display: "block", mt: 2, color: "#94a3b8", fontSize: 11 }}
                >
                    POST /api/v1/{config.apiEndpoint} → JWT Bearer Token
                </Typography>
            </Box>
        </Box>
    );
};

export default LoginBase;
