import { useEffect, useState } from "react";
import { useAuth } from "../shared/auth/authContext";
import { useNavigate, useParams, Link as RouterLink } from "react-router-dom";
import {
    Container,
    Typography,
    Button,
    Box,
    TextField,
    Alert,
    CircularProgress,
    Chip,
    IconButton,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

interface RoleConfig {
    badge: string;
    serviceBadge?: string;
    emailPlaceholder: string;
    warning: string;
    apiEndpoint: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    bgGradient: string;
    expectedAccountType: string;
    expectMaster?: boolean;
    backPath?: string;
}

const roleConfigs: Record<string, RoleConfig> = {
    "admin-master": {
        badge: "Admin Master",
        emailPlaceholder: "admin@iot-platform.local",
        warning:
            "Política de sesión única: Solo una sesión activa permitida. Si hay sesión activa, recibirás error 409.",
        apiEndpoint: "auth/login",
        primary: "#2563eb",
        primaryDark: "#1d4ed8",
        primaryLight: "#dbeafe",
        bgGradient:
            "linear-gradient(135deg, #f0f4ff 0%, #e0eaff 50%, #dbeafe 100%)",
        expectedAccountType: "administrator",
        expectMaster: true,
    },
    "admin-normal": {
        badge: "Admin Normal",
        emailPlaceholder: "admin_normal@iot-platform.local",
        warning:
            "Sesión única: Solo una sesión activa permitida (409 Conflict si ya existe).",
        apiEndpoint: "auth/login",
        primary: "#0891b2",
        primaryDark: "#0e7490",
        primaryLight: "#cffafe",
        bgGradient:
            "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
        expectedAccountType: "administrator",
        expectMaster: false,
    },
    gerente: {
        badge: "Gerente (Manager)",
        emailPlaceholder: "gerente@iot-platform.local",
        warning:
            "Sesión única: Solo una sesión activa permitida (409 Conflict). Usa POST /logout antes de reloguear.",
        apiEndpoint: "auth/login",
        primary: "#059669",
        primaryDark: "#047857",
        primaryLight: "#d1fae5",
        bgGradient:
            "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)",
        expectedAccountType: "manager",
    },
    "monitoreo-ambiental": {
        badge: "Usuario (User)",
        serviceBadge: "Monitoreo Ambiental",
        emailPlaceholder: "user1.amb@iot-platform.local",
        warning:
            "Sesión única: Solo una sesión activa permitida (409 Conflict). Usa POST /logout antes de reloguear.",
        apiEndpoint: "auth/login",
        primary: "#7c3aed",
        primaryDark: "#6d28d9",
        primaryLight: "#ede9fe",
        bgGradient:
            "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
        expectedAccountType: "user",
        backPath: "/login/usuario",
    },
    "control-industrial": {
        badge: "Usuario (User)",
        serviceBadge: "Control Industrial",
        emailPlaceholder: "user1.ind@iot-platform.local",
        warning:
            "Sesión única: Solo una sesión activa permitida (409 Conflict). Usa POST /logout antes de reloguear.",
        apiEndpoint: "auth/login",
        primary: "#7c3aed",
        primaryDark: "#6d28d9",
        primaryLight: "#ede9fe",
        bgGradient:
            "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
        expectedAccountType: "user",
        backPath: "/login/usuario",
    },
};

const RoleLogin = () => {
    const { role } = useParams<{ role: string }>();
    const { login, session, loginError, isLoggingIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const config = role ? roleConfigs[role] : undefined;

    useEffect(() => {
        if (session) navigate("/");
    }, [session, navigate]);

    if (!config) {
        return (
            <Container
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Box textAlign="center">
                    <Typography variant="h5" gutterBottom>
                        Tipo de acceso no válido
                    </Typography>
                    <Button
                        component={RouterLink}
                        to="/login"
                        variant="contained"
                    >
                        Volver al selector
                    </Button>
                </Box>
            </Container>
        );
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim() && password.trim()) {
            login(email.trim(), password, config.apiEndpoint);
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
            }}
        >
            {/* Back button */}
            <IconButton
                component={RouterLink}
                to={config.backPath || "/login"}
                sx={{
                    position: "absolute",
                    top: 24,
                    left: 24,
                    color: config.primary,
                    bgcolor: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: config.primaryLight },
                }}
            >
                <ArrowBackIcon />
            </IconButton>

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
                <Typography
                    variant="h4"
                    sx={{ fontWeight: 800, color: "#1e293b", mb: 0.5 }}
                >
                    IoT Platform
                </Typography>
                <Typography
                    variant="body2"
                    sx={{ color: "#64748b", mb: 1.5 }}
                >
                    Plataforma de Gestión IoT Empresarial
                </Typography>

                {/* Role badge */}
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
                    <WarningAmberIcon
                        sx={{ color: "#d97706", fontSize: 20, mt: 0.2 }}
                    />
                    <Typography
                        variant="caption"
                        sx={{ color: "#92400e", lineHeight: 1.5 }}
                    >
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
                        sx={{
                            fontWeight: 600,
                            color: "#374151",
                            mb: 0.5,
                            display: "block",
                        }}
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
                                "&:hover fieldset": {
                                    borderColor: config.primary,
                                },
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
                        sx={{
                            fontWeight: 600,
                            color: "#374151",
                            mb: 0.5,
                            display: "block",
                        }}
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
                                "&:hover fieldset": {
                                    borderColor: config.primary,
                                },
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
                        "&:hover": {
                            bgcolor: config.primaryDark,
                            boxShadow: `0 6px 20px ${config.primary}4D`,
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
                    sx={{
                        display: "block",
                        mt: 2,
                        color: "#94a3b8",
                        fontSize: 11,
                    }}
                >
                    POST /api/v1/{config.apiEndpoint} → JWT Bearer Token
                </Typography>
            </Box>
        </Box>
    );
};

export default RoleLogin;
