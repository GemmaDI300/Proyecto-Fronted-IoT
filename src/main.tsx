import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, ThemeProvider, CssBaseline } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./shared/auth/authContext";
import ProtectedRoute from "./shared/auth/ProtectedRoute";
import SidebarLayout, { NavItem } from "./components/SidebarLayout";
import LoginAdminMaster from "./pages/login/LoginAdminMaster";
import LoginAdminNormal from "./pages/login/LoginAdminNormal";
import LoginGerente from "./pages/login/LoginGerente";
import LoginUsuarioMonitoreoAmbiental from "./pages/login/LoginUsuarioMonitoreoAmbiental";
import LoginUsuarioControlIndustrial from "./pages/login/LoginUsuarioControlIndustrial";
import Dashboard from "./pages/Dashboard";
import Usuarios from "./pages/Usuarios";
import Dispositivos from "./pages/Dispositivos";
import Administradores from "./pages/Administradores";
import Gerentes from "./pages/Gerentes";

import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import DevicesIcon from "@mui/icons-material/Devices";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";

const theme = createTheme({
    palette: {
        primary: {
            main: "#2563eb",
            light: "#60a5fa",
            dark: "#1d4ed8",
        },
        secondary: {
            main: "#0891b2",
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
            primary: "#1e293b",
            secondary: "#64748b",
        },
    },
    typography: {
        fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
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
];

function MainApp() {
    return (
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
                                element={
                                    <ProtectedRoute
                                        element={Usuarios}
                                        requiredType="administrator"
                                    />
                                }
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
                        </Routes>
                    </SidebarLayout>
                }
            />
        </Routes>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AuthProvider>
                    <Router>
                        <MainApp />
                    </Router>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
