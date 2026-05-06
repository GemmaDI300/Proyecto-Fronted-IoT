import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../shared/auth/authContext";
import {
    Container,
    Typography,
    Box,
    Card,
    CardActionArea,
    CardContent,
    Grid,
} from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import PersonIcon from "@mui/icons-material/Person";

interface RoleCard {
    title: string;
    subtitle: string;
    path: string;
    color: string;
    colorLight: string;
    icon: React.ReactNode;
}

const roles: RoleCard[] = [
    {
        title: "Admin Master",
        subtitle: "Control total del sistema",
        path: "/login/admin-master",
        color: "#2563eb",
        colorLight: "#dbeafe",
        icon: <AdminPanelSettingsIcon sx={{ fontSize: 48 }} />,
    },
    {
        title: "Admin Normal",
        subtitle: "Gestión operativa",
        path: "/login/admin-normal",
        color: "#0891b2",
        colorLight: "#cffafe",
        icon: <ManageAccountsIcon sx={{ fontSize: 48 }} />,
    },
    {
        title: "Gerente",
        subtitle: "Supervisión de servicios",
        path: "/login/gerente",
        color: "#059669",
        colorLight: "#d1fae5",
        icon: <SupervisorAccountIcon sx={{ fontSize: 48 }} />,
    },
    {
        title: "Usuario",
        subtitle: "Selecciona tu servicio para acceder",
        path: "/login/usuario",
        color: "#7c3aed",
        colorLight: "#ede9fe",
        icon: <PersonIcon sx={{ fontSize: 48 }} />,
    },
];

const LoginSelector = () => {
    const { session } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (session) navigate("/");
    }, [session, navigate]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background: "linear-gradient(135deg, #f0f4ff 0%, #e8ecf4 50%, #dbeafe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
            }}
        >
            <Container maxWidth="md">
                <Box textAlign="center" mb={5} sx={{ animation: "fadeSlideUp 0.4s ease both" }}>
                    <Box
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, #2563eb 0%, #0891b2 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            mb: 2,
                            boxShadow: "0 4px 24px rgba(37,99,235,0.25)",
                        }}
                    >
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="#fff">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: "#1e293b" }}>
                        IoT Platform
                    </Typography>
                    <Typography variant="body1" sx={{ color: "#64748b", mt: 1 }}>
                        Plataforma de Gestión IoT Empresarial
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "#94a3b8", mt: 1, fontSize: 13 }}
                    >
                        Selecciona tu tipo de acceso para iniciar sesión
                    </Typography>
                </Box>

                <Grid container spacing={3} justifyContent="center">
                    {roles.map((role, idx) => (
                        <Grid item xs={12} sm={6} md={3} key={role.path}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 3,
                                    transition: "box-shadow 0.25s ease, border-color 0.25s ease",
                                    cursor: "pointer",
                                    animation: "fadeSlideUp 0.4s ease both",
                                    animationDelay: `${idx * 0.08}s`,
                                    "&:hover": {
                                        boxShadow: `0 8px 28px ${role.color}28`,
                                        borderColor: role.color,
                                    },
                                }}
                            >
                                <CardActionArea
                                    onClick={() => navigate(role.path)}
                                    sx={{ p: 2 }}
                                >
                                    <CardContent sx={{ textAlign: "center", p: 1 }}>
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 80,
                                                borderRadius: "50%",
                                                bgcolor: role.colorLight,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                mx: "auto",
                                                mb: 2,
                                                color: role.color,
                                            }}
                                        >
                                            {role.icon}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 700,
                                                color: role.color,
                                                mb: 0.5,
                                            }}
                                        >
                                            {role.title}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: "#64748b", fontSize: 13 }}
                                        >
                                            {role.subtitle}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default LoginSelector;
