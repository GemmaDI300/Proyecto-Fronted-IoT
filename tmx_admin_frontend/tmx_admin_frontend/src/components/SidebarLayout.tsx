import React, { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from "../shared/auth/authContext";

// Definición del tipo para los elementos de navegación
export interface NavItem {
    text: string;
    path: string;
    icon?: React.ReactNode;
}

interface SidebarLayoutProps {
    children: ReactNode;
    navItems: NavItem[];
    title?: string;
}

const drawerWidth = 240;

const SidebarLayout: React.FC<SidebarLayoutProps> = ({
    children,
    navItems,
    title = "Admin Dashboard",
}) => {
    const theme = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [open, setOpen] = React.useState(!isMobile);
    const { logout } = useAuth();

    const handleDrawerToggle = () => {
        setOpen(!open);
    };

    // Función para manejar la navegación
    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            setOpen(false);
        }
    };

    // Comprobar si una ruta está activa
    const isActive = (path: string) => {
        return location.pathname === path;
    };

    const handeleLogout = () => {
        logout();
        navigate('login');
    }

    return (
        <Box sx={{ display: 'flex' }}>
            {/* AppBar */}
            <AppBar
                position="fixed"
                sx={{
                    width: { sm: open ? `calc(100% - ${drawerWidth}px)` : '100%' },
                    ml: { sm: open ? `${drawerWidth}px` : 0 },
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        {open ? <ChevronLeftIcon /> : <MenuIcon />}
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        {title}
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* Sidebar Drawer */}
            <Drawer
                variant={isMobile ? "temporary" : "persistent"}
                open={open}
                onClose={isMobile ? handleDrawerToggle : undefined}
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
            >
                <Toolbar />
                <Divider />
                <List>
                    {navItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                onClick={() => handleNavigation(item.path)}
                                selected={isActive(item.path)}
                                sx={{
                                    padding: 2,
                                    '&.Mui-selected': {
                                        backgroundColor: theme.palette.primary.light,
                                        color: theme.palette.primary.contrastText,
                                        '& .MuiListItemIcon-root': {
                                            color: theme.palette.primary.contrastText,
                                        },
                                    },
                                    '&.Mui-selected:hover': {
                                        backgroundColor: theme.palette.primary.main,
                                    },
                                }}
                            >
                                {item.icon && (
                                    <ListItemIcon sx={{
                                        color: isActive(item.path)
                                            ? theme.palette.primary.contrastText
                                            : undefined
                                    }}>
                                        {item.icon}
                                    </ListItemIcon>
                                )}
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                    <ListItem key="logout" disablePadding>
                        <ListItemButton
                            onClick={handeleLogout}
                            sx={{
                                padding: 2,
                                '&.Mui-selected': {
                                    backgroundColor: theme.palette.primary.light,
                                    color: theme.palette.primary.contrastText,
                                    '& .MuiListItemIcon-root': {
                                        color: theme.palette.primary.contrastText,
                                    },
                                },
                                '&.Mui-selected:hover': {
                                    backgroundColor: theme.palette.primary.main,
                                },
                            }}
                        >
                            <ListItemIcon sx={{
                                color: theme.palette.primary.contrastText
                            }}>
                                <LogoutIcon />
                            </ListItemIcon>
                            <ListItemText primary="Cerrar sesión" />
                        </ListItemButton>
                    </ListItem>
                </List>
            </Drawer>

            {/* Main Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    ml: { sm: open ? `${drawerWidth}px` : 0 },
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Toolbar /> {/* Spacer to push content below AppBar */}
                <Box sx={{ width: '100%', maxWidth: '1200px' }}>
                    {children}
                </Box>
            </Box>
        </Box>
    );
};

export default SidebarLayout;
