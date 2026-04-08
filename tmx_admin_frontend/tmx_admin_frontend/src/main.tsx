import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTheme, ThemeProvider } from "@mui/material";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
    BrowserRouter as Router,
    Route,
    Routes,
} from "react-router-dom";
import { AuthProvider } from "./shared/auth/authContext";
import Home from "./contents/home";
import Usuarios from "./contents/usuarios";
import Administradores from "./contents/administradores";
import Dispositivos from "./contents/dispositivos";
import Login from "./contents/login";
import ProtectedRoute from "./shared/auth/ProtectedRoute";
import SidebarLayout, { NavItem } from "./components/SidebarLayout";

// Iconos para la navegación
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import DevicesIcon from '@mui/icons-material/Devices';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1dbecf',
        },
        secondary: {
            main: '#00bdf2',
        },
        success: {
            main: '#57c1a6',
        },
        info: {
            main: '#74c7ec',
        },
        warning: {
            main: '#eba0ac',
        },
        error: {
            main: '#f38ba8',
        },
        background: {
            default: '#ffffff',
            paper: '#f2f2f2',
        },
        text: {
            primary: '#000000',
            secondary: '#2c3a3b',
        },
    },
});

const queryClient = new QueryClient();

// Definir el basename para usarlo en toda la aplicación
const BASENAME = "/admin";

// Define los elementos de navegación con rutas relativas al basename
const navItems: NavItem[] = [
    { text: "Inicio", path: "/", icon: <HomeIcon /> },
    { text: "Usuarios", path: "/users", icon: <PeopleIcon /> },
    { text: "Administradores", path: "/admins", icon: <AdminPanelSettingsIcon /> },
    { text: "Dispositivos", path: "/devices", icon: <DevicesIcon /> },
];

// eslint-disable-next-line react-refresh/only-export-components
function MainApp() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={
                <SidebarLayout navItems={navItems}>
                    <Routes>
                        <Route path="/" element={<ProtectedRoute element={Home} />} />
                        <Route path="/users" element={<ProtectedRoute element={Usuarios} />} />
                        <Route path="/admins" element={<ProtectedRoute element={Administradores} />} />
                        <Route path="/devices" element={<ProtectedRoute element={Dispositivos} />} />
                    </Routes>
                </SidebarLayout>
            } />
        </Routes>
    );
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <AuthProvider>
                    <Router basename={BASENAME}>
                        <MainApp />
                    </Router>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </StrictMode>
);
