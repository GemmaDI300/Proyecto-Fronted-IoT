import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, ThemeProvider, CssBaseline, CircularProgress, Box } from "@mui/material";
import { StrictMode, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./shared/auth/authContext";
import { ActivityProvider } from "./shared/activity/activityContext";
import ProtectedRoute from "./shared/auth/ProtectedRoute";
import SidebarLayout, { NavItem } from "./components/SidebarLayout";
import { BackendGate } from "./shared/components/BackendGate";

// Lazy loading de páginas de login (menos críticas)
const LoginAdminMaster = lazy(() => import("./pages/login/LoginAdminMaster"));
const LoginAdminNormal = lazy(() => import("./pages/login/LoginAdminNormal"));
const LoginGerente = lazy(() => import("./pages/login/LoginGerente"));
const LoginUsuarioMonitoreoAmbiental = lazy(() => import("./pages/login/LoginUsuarioMonitoreoAmbiental"));
const LoginUsuarioControlIndustrial = lazy(() => import("./pages/login/LoginUsuarioControlIndustrial"));

// Lazy loading de páginas principales
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const Dispositivos = lazy(() => import("./pages/Dispositivos"));
const Administradores = lazy(() => import("./pages/Administradores"));
const Gerentes = lazy(() => import("./pages/Gerentes"));
const Servicios = lazy(() => import("./pages/Servicios"));
const Aplicaciones = lazy(() => import("./pages/Aplicaciones"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Roles = lazy(() => import("./pages/Roles"));

import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import DevicesIcon from "@mui/icons-material/Devices";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import MiscellaneousServicesIcon from "@mui/icons-material/MiscellaneousServices";
import AppsIcon from "@mui/icons-material/Apps";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import BadgeIcon from "@mui/icons-material/Badge";

const theme = createTheme({
    palette: {
        primary: {
            main: "#0891b2", // Cyan oscuro mejorado para mejor contraste (antes: #06b6d4)
            light: "#67e8f9",
            dark: "#0e7490",
        },
        secondary: {
            main: "#0f172a",
        },
        success: {
            main: "#059669",
        },
        warning: {
            main: "#d97706",
        },
        error: {
            main: "#dc2626",
        },
        info: {
            main: "#7c3aed",
        },
        background: {
            default: "#f8fafc",
            paper: "#ffffff",
        },
        text: {
            primary: "#0f172a",
            secondary: "#64748b",
        },
    },
    typography: {
        fontFamily: "'Space Grotesk', 'Segoe UI', sans-serif",
        h1: { fontFamily: "'Space Grotesk', sans-serif" },
        h2: { fontFamily: "'Space Grotesk', sans-serif" },
        h3: { fontFamily: "'Space Grotesk', sans-serif" },
        h4: { fontFamily: "'Space Grotesk', sans-serif" },
        h5: { fontFamily: "'Space Grotesk', sans-serif" },
        h6: { fontFamily: "'Space Grotesk', sans-serif" },
    },
    shape: {
        borderRadius: 12,
    },
});

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const navItems: NavItem[] = [
    { text: "Dashboard", path: "/", icon: <HomeIcon />, section: "Principal" },
    {
        text: "Usuarios",
        path: "/usuarios",
        icon: <PeopleIcon />,
        allowedTypes: ["administrator", "manager"],
        section: "Gestión de Entidades",
    },
    {
        text: "Dispositivos",
        path: "/dispositivos",
        icon: <DevicesIcon />,
        section: "IoT",
    },
    {
        text: "Administradores",
        path: "/administradores",
        icon: <AdminPanelSettingsIcon />,
        allowedTypes: ["administrator"],
        requireMaster: true,
        section: "Gestión de Entidades",
    },
    {
        text: "Gerentes",
        path: "/gerentes",
        icon: <SupervisorAccountIcon />,
        allowedTypes: ["administrator"],
        section: "Gestión de Entidades",
    },
    {
        text: "Servicios",
        path: "/servicios",
        icon: <MiscellaneousServicesIcon />,
        allowedTypes: ["administrator", "manager"],
        section: "Plataforma",
    },
    {
        text: "Aplicaciones",
        path: "/aplicaciones",
        icon: <AppsIcon />,
        allowedTypes: ["administrator", "manager"],
        section: "Plataforma",
    },
    {
        text: "Roles",
        path: "/roles",
        icon: <BadgeIcon />,
        allowedTypes: ["administrator", "manager", "user"],
        section: "Plataforma",
    },
    {
        text: "Tickets",
        path: "/tickets",
        icon: <ConfirmationNumberIcon />,
        section: "Soporte",
    },
];

// Componente de carga para Suspense
const LoadingFallback = () => (
    <Box
        sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            flexDirection: 'column',
            gap: 2,
        }}
    >
        <CircularProgress size={60} />
        <Box sx={{ color: 'text.secondary', fontSize: '1rem' }}>
            Cargando...
        </Box>
    </Box>
);

function MainApp() {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                <Route path="/login/admin-master" element={<LoginAdminMaster />} />
                <Route path="/login/admin-normal" element={<LoginAdminNormal />} />
                <Route path="/login/gerente" element={<LoginGerente />} />
                <Route path="/login/usuario/monitoreo-ambiental" element={<LoginUsuarioMonitoreoAmbiental />} />
                <Route path="/login/usuario/control-industrial" element={<LoginUsuarioControlIndustrial />} />
                <Route
                    path="*"
                    element={
                        <SidebarLayout navItems={navItems}>
                            <Routes>
                                <Route path="/" element={<ProtectedRoute element={Dashboard} />} />
                                <Route
                                    path="/usuarios"
                                    element={<ProtectedRoute element={Usuarios} />}
                                />
                                <Route
                                    path="/dispositivos"
                                    element={<ProtectedRoute element={Dispositivos} />}
                                />
                                <Route
                                    path="/administradores"
                                    element={
                                        <ProtectedRoute
                                            element={Administradores}
                                            requiredType="administrator"
                                            requireMaster
                                        />
                                    }
                                />
                                <Route
                                    path="/gerentes"
                                    element={
                                        <ProtectedRoute
                                            element={Gerentes}
                                            requiredType="administrator"
                                        />
                                    }
                                />
                                <Route
                                    path="/servicios"
                                    element={<ProtectedRoute element={Servicios} />}
                                />
                                <Route
                                    path="/aplicaciones"
                                    element={<ProtectedRoute element={Aplicaciones} />}
                                />
                                <Route
                                    path="/roles"
                                    element={<ProtectedRoute element={Roles} />}
                                />
                                <Route
                                    path="/tickets"
                                    element={<ProtectedRoute element={Tickets} />}
                                />
                            </Routes>
                        </SidebarLayout>
                    }
                />
            </Routes>
        </Suspense>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BackendGate>
                    <ActivityProvider>
                        <AuthProvider>
                            <Router>
                                <MainApp />
                            </Router>
                        </AuthProvider>
                    </ActivityProvider>
                </BackendGate>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
