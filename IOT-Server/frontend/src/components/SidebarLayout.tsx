import React, { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Box,
    Drawer,
    AppBar,
    Toolbar,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Divider,
    IconButton,
    useMediaQuery,
    useTheme,
    ListItemButton,
    Chip,
    Avatar,
    InputBase,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import LogoutIcon from "@mui/icons-material/Logout";
import SearchIcon from "@mui/icons-material/Search";
import { useAuth } from "../shared/auth/authContext";

export interface NavItem {
    text: string;
    path: string;
    icon?: React.ReactNode;
    allowedTypes?: ("administrator" | "manager" | "user")[];
    requireMaster?: boolean;
    section?: string;
}

interface SidebarLayoutProps {
    children: ReactNode;
    navItems: NavItem[];
    title?: string;
}

const drawerWidth = 260;

const roleColors: Record<string, "primary" | "success" | "secondary" | "warning"> = {
    administrator: "primary",
    manager: "success",
    user: "secondary",
};

const roleLabels: Record<string, string> = {
    administrator: "Administrador",
    manager: "Gerente",
    user: "Usuario",
};

const SidebarLayout: React.FC<SidebarLayoutProps> = ({
    children,
    navItems,
    title = "IoT Platform",
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const [open, setOpen] = React.useState(!isMobile);
    const { logout, session } = useAuth();

    const handleDrawerToggle = () => setOpen(!open);

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) setOpen(false);
    };

    const isActive = (path: string) => location.pathname === path;

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const visibleItems = navItems.filter((item) => {
        if (!item.allowedTypes) return true;
        if (!session) return false;
        if (item.requireMaster && !session.isMaster) return false;
        return item.allowedTypes.includes(session.accountType);
    });

    // Group items by section
    const sections: { title: string; items: NavItem[] }[] = [];
    let currentSection = "";
    for (const item of visibleItems) {
        const sec = item.section || "Principal";
        if (sec !== currentSection) {
            sections.push({ title: sec, items: [] });
            currentSection = sec;
        }
        sections[sections.length - 1].items.push(item);
    }

    const userInitials = session
        ? session.accountType === "administrator"
            ? session.isMaster ? "AM" : "AN"
            : session.accountType === "manager" ? "GR" : "US"
        : "??";

    const fullRoleLabel = roleLabels[session?.accountType || "user"] +
        (session?.isMaster ? " (Master)" : "");

    return (
        <Box sx={{ display: "flex" }}>
            <AppBar
                position="fixed"
                elevation={0}
                sx={{
                    width: { md: open ? `calc(100% - ${drawerWidth}px)` : "100%" },
                    ml: { md: open ? `${drawerWidth}px` : 0 },
                    transition: theme.transitions.create(["margin", "width"], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    bgcolor: "white",
                    color: "text.primary",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Toolbar>
                    <IconButton
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, color: "text.secondary" }}
                    >
                        {open ? <ChevronLeftIcon /> : <MenuIcon />}
                    </IconButton>

                    {/* Search bar — wireframe style */}
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            bgcolor: "#f1f5f9",
                            borderRadius: 2,
                            px: 1.5,
                            py: 0.5,
                            flexGrow: 1,
                            maxWidth: 400,
                        }}
                    >
                        <SearchIcon sx={{ color: "text.secondary", fontSize: 20, mr: 1 }} />
                        <InputBase placeholder="Buscar..." sx={{ fontSize: 14, flex: 1 }} />
                    </Box>

                    <Box sx={{ flexGrow: 1 }} />
                    {session && (
                        <Chip
                            label={fullRoleLabel}
                            color={roleColors[session.accountType] || "default"}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                background: session.isMaster
                                    ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                                    : undefined,
                                color: "#fff",
                            }}
                        />
                    )}
                </Toolbar>
            </AppBar>

            <Drawer
                variant={isMobile ? "temporary" : "persistent"}
                open={open}
                onClose={isMobile ? handleDrawerToggle : undefined}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    "& .MuiDrawer-paper": {
                        width: drawerWidth,
                        boxSizing: "border-box",
                        bgcolor: "white",
                        borderRight: "1px solid",
                        borderColor: "divider",
                    },
                }}
            >
                {/* Sidebar header */}
                <Box sx={{ px: 2.5, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Box
                        sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 2,
                            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontWeight: 800,
                            fontSize: 14,
                        }}
                    >
                        IoT
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} lineHeight={1.2}>
                            {title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            v1.1 — {fullRoleLabel}
                        </Typography>
                    </Box>
                </Box>

                <Divider />

                {/* Nav sections */}
                <Box sx={{ flex: 1, overflow: "auto", py: 1 }}>
                    {sections.map((sec) => (
                        <Box key={sec.title}>
                            <Typography
                                variant="overline"
                                sx={{
                                    px: 2.5,
                                    pt: 2,
                                    pb: 0.5,
                                    display: "block",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: 1.2,
                                    color: "text.secondary",
                                }}
                            >
                                {sec.title}
                            </Typography>
                            <List dense disablePadding>
                                {sec.items.map((item) => (
                                    <ListItem key={item.text} disablePadding sx={{ px: 1 }}>
                                        <ListItemButton
                                            onClick={() => handleNavigation(item.path)}
                                            selected={isActive(item.path)}
                                            sx={{
                                                py: 1,
                                                px: 1.5,
                                                borderRadius: 2,
                                                mb: 0.25,
                                                "&.Mui-selected": {
                                                    bgcolor: "#eff6ff",
                                                    color: "#2563eb",
                                                    "& .MuiListItemIcon-root": { color: "#2563eb" },
                                                },
                                                "&.Mui-selected:hover": {
                                                    bgcolor: "#dbeafe",
                                                },
                                                "&:hover": {
                                                    bgcolor: "#f8fafc",
                                                },
                                            }}
                                        >
                                            {item.icon && (
                                                <ListItemIcon sx={{ minWidth: 36, color: isActive(item.path) ? "#2563eb" : "text.secondary" }}>
                                                    {item.icon}
                                                </ListItemIcon>
                                            )}
                                            <ListItemText
                                                primary={item.text}
                                                primaryTypographyProps={{
                                                    fontSize: 13.5,
                                                    fontWeight: isActive(item.path) ? 700 : 500,
                                                }}
                                            />
                                        </ListItemButton>
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    ))}
                </Box>

                <Divider />

                {/* User footer — wireframe style */}
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Avatar
                        sx={{
                            width: 36,
                            height: 36,
                            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                            fontSize: 14,
                            fontWeight: 700,
                        }}
                    >
                        {userInitials}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                            {fullRoleLabel}
                        </Typography>
                        <Chip
                            label={session?.accountType || ""}
                            size="small"
                            sx={{
                                height: 20,
                                fontSize: 10,
                                fontWeight: 700,
                                background: session?.isMaster
                                    ? "linear-gradient(135deg, #2563eb, #7c3aed)"
                                    : undefined,
                                color: session?.isMaster ? "white" : undefined,
                            }}
                            color={session?.isMaster ? undefined : roleColors[session?.accountType || "user"]}
                        />
                    </Box>
                    <IconButton
                        size="small"
                        onClick={handleLogout}
                        sx={{
                            color: "text.secondary",
                            "&:hover": { color: "error.main", bgcolor: "#fee2e2" },
                        }}
                    >
                        <LogoutIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Drawer>

            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    bgcolor: "#f8fafc",
                    minHeight: "100vh",
                    width: { md: open ? `calc(100% - ${drawerWidth}px)` : "100%" },
                    ml: { md: open ? 0 : 0 },
                    transition: theme.transitions.create(["margin", "width"], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Toolbar />
                <Box sx={{ width: "100%", maxWidth: "1400px" }}>{children}</Box>
            </Box>
        </Box>
    );
};

export default SidebarLayout;
