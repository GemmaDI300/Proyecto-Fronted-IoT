import {
    Box,
    Grid,
    Paper,
    Typography,
    Chip,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import DevicesIcon from "@mui/icons-material/Devices";
import PeopleIcon from "@mui/icons-material/People";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import SensorsIcon from "@mui/icons-material/Sensors";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import SettingsIcon from "@mui/icons-material/Settings";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MiscellaneousServicesIcon from "@mui/icons-material/MiscellaneousServices";
import AppsIcon from "@mui/icons-material/Apps";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumber";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddTaskIcon from "@mui/icons-material/AddTask";
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../shared/auth/authContext";
import { useActivity } from "../shared/activity/activityContext";
import { useGetQuery } from "../shared/api/functions";
import { PageResponse, PersonalDataResponse, DeviceResponse } from "../shared/api/types";

/* ── Stat Card matching wireframe style ───────────────────── */
interface StatCardProps {
    title: string;
    count: number | undefined;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    subtitle?: string;
}

function StatCard({ title, count, icon, color, bgColor, subtitle }: StatCardProps) {
    return (
        <Paper
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, fontSize: 28, lineHeight: 1.2 }}>
                    {count ?? "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" sx={{ color, fontWeight: 600, mt: 0.5 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
            <Box
                sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    bgcolor: bgColor,
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {icon}
            </Box>
        </Paper>
    );
}

/* ── Quick Action Card ────────────────────────────────────── */
interface QuickActionProps {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    onClick: () => void;
}

function QuickAction({ title, subtitle, icon, iconBg, iconColor, onClick }: QuickActionProps) {
    return (
        <Paper
            elevation={0}
            onClick={onClick}
            sx={{
                p: 2.5,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                cursor: "pointer",
                transition: "box-shadow 0.2s, border-color 0.2s",
                "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 6px 20px rgba(6,182,212,0.15)",
                },
            }}
        >
            <Box
                sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 3,
                    bgcolor: iconBg,
                    color: iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1.5,
                }}
            >
                {icon}
            </Box>
            <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Paper>
    );
}

/* ══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
    const { session } = useAuth();
    const navigate = useNavigate();

    const { data: usersData } = useGetQuery<PageResponse<PersonalDataResponse>>(
        "users/",
        session!,
        { enabled: session?.accountType !== "user" }
    );

    const { data: devicesData } = useGetQuery<PageResponse<DeviceResponse>>(
        "devices/",
        session!
    );

    const { data: adminsData } = useGetQuery<PageResponse<PersonalDataResponse>>(
        "administrators/",
        session!,
        { enabled: session?.accountType === "administrator" && session?.isMaster === true }
    );

    const { data: managersData } = useGetQuery<PageResponse<PersonalDataResponse>>(
        "managers/",
        session!,
        { enabled: session?.accountType === "administrator" }
    );

    const { events: activityEvents } = useActivity();

    const actionConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
        created: { color: "#059669", icon: <AddTaskIcon sx={{ fontSize: 16 }} />, label: "Creado" },
        edited:  { color: "#0891b2", icon: <EditOutlinedIcon sx={{ fontSize: 16 }} />, label: "Editado" },
        deleted: { color: "#dc2626", icon: <DeleteOutlineIcon sx={{ fontSize: 16 }} />, label: "Eliminado" },
    };

    // Keep useMemo to not break the existing counts
    useMemo(() => {}, [devicesData, usersData, managersData, adminsData]);

    function formatTimeAgo(dateStr: string): string {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Justo ahora";
        if (mins < 60) return `Hace ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Hace ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Hace ${days}d`;
    }

    const roleLabel =
        session?.accountType === "administrator"
            ? session.isMaster
                ? "Administrador Master"
                : "Administrador"
            : session?.accountType === "manager"
              ? "Gerente"
              : "Usuario";

    return (
        <Box>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
                Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Bienvenido al panel de control — Rol: <strong>{roleLabel}</strong>
            </Typography>

            {/* ── Stat Cards ─────────────────────────────────────── */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4} sx={{ animation: "fadeSlideUp 0.4s ease both", animationDelay: "0s" }}>
                    <StatCard
                        title="Dispositivos IoT"
                        count={devicesData?.total}
                        icon={<DevicesIcon />}
                        color="#06b6d4"
                        bgColor="#cffafe"
                        subtitle={`↑ ${devicesData?.data?.filter((d) => d.is_active).length ?? 0} activos`}
                    />
                </Grid>
                {session?.accountType !== "user" && (
                    <Grid item xs={12} sm={6} md={4} sx={{ animation: "fadeSlideUp 0.4s ease both", animationDelay: "0.08s" }}>
                        <StatCard
                            title="Usuarios"
                            count={usersData?.total}
                            icon={<PeopleIcon />}
                            color="#059669"
                            bgColor="#d1fae5"
                        />
                    </Grid>
                )}
                {session?.accountType === "administrator" && (
                    <Grid item xs={12} sm={6} md={4} sx={{ animation: "fadeSlideUp 0.4s ease both", animationDelay: "0.16s" }}>
                        <StatCard
                            title="Gerentes"
                            count={managersData?.total}
                            icon={<SupervisorAccountIcon />}
                            color="#d97706"
                            bgColor="#fef3c7"
                        />
                    </Grid>
                )}
                {session?.accountType === "administrator" && session.isMaster && (
                    <Grid item xs={12} sm={6} md={4} sx={{ animation: "fadeSlideUp 0.4s ease both", animationDelay: "0.24s" }}>
                        <StatCard
                            title="Administradores"
                            count={adminsData?.total}
                            icon={<ManageAccountsIcon />}
                            color="#0f172a"
                            bgColor="#e2e8f0"
                        />
                    </Grid>
                )}
            </Grid>

            {/* ── Two-column: Quick Actions (Crear + Gestionar) ── */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Crear nuevo */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                            <Typography variant="subtitle1" fontWeight={700}>Crear nuevo</Typography>
                        </Box>
                        <Box sx={{ p: 2.5 }}>
                            <Grid container spacing={1.5}>
                                {session?.accountType !== "user" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Usuario" subtitle="Registrar nuevo usuario" icon={<PersonAddIcon />} iconBg="#dbeafe" iconColor="#2563eb" onClick={() => navigate("/usuarios")} />
                                    </Grid>
                                )}
                                <Grid item xs={6}>
                                    <QuickAction title="Dispositivo" subtitle="Nuevo dispositivo IoT" icon={<AddCircleOutlineIcon />} iconBg="#fef3c7" iconColor="#d97706" onClick={() => navigate("/dispositivos")} />
                                </Grid>
                                <Grid item xs={6}>
                                    <QuickAction title="Ticket" subtitle="Nuevo ticket de soporte" icon={<ConfirmationNumberIcon />} iconBg="#ede9fe" iconColor="#7c3aed" onClick={() => navigate("/tickets")} />
                                </Grid>
                                {session?.accountType === "administrator" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Servicio" subtitle="Registrar nuevo servicio" icon={<MiscellaneousServicesIcon />} iconBg="#d1fae5" iconColor="#059669" onClick={() => navigate("/servicios")} />
                                    </Grid>
                                )}
                                {session?.accountType === "administrator" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Aplicación" subtitle="Registrar aplicación" icon={<AppsIcon />} iconBg="#cffafe" iconColor="#0891b2" onClick={() => navigate("/aplicaciones")} />
                                    </Grid>
                                )}
                                {session?.accountType === "administrator" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Gerente" subtitle="Asignar nuevo gerente" icon={<SupervisorAccountIcon />} iconBg="#fce7f3" iconColor="#be185d" onClick={() => navigate("/gerentes")} />
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Paper>
                </Grid>

                {/* Gestionar */}
                <Grid item xs={12} md={6}>
                    <Paper elevation={0} sx={{ borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                            <Typography variant="subtitle1" fontWeight={700}>Gestionar</Typography>
                        </Box>
                        <Box sx={{ p: 2.5 }}>
                            <Grid container spacing={1.5}>
                                {session?.accountType !== "user" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Usuarios" subtitle="Administrar usuarios" icon={<PeopleIcon />} iconBg="#dbeafe" iconColor="#2563eb" onClick={() => navigate("/usuarios")} />
                                    </Grid>
                                )}
                                <Grid item xs={6}>
                                    <QuickAction title="Dispositivos" subtitle="Gestionar IoT" icon={<DevicesIcon />} iconBg="#fef3c7" iconColor="#d97706" onClick={() => navigate("/dispositivos")} />
                                </Grid>
                                <Grid item xs={6}>
                                    <QuickAction title="Tickets" subtitle="Ver todos los tickets" icon={<ConfirmationNumberIcon />} iconBg="#ede9fe" iconColor="#7c3aed" onClick={() => navigate("/tickets")} />
                                </Grid>
                                {(session?.accountType === "administrator" || session?.accountType === "manager") && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Servicios" subtitle="Gestionar servicios" icon={<MiscellaneousServicesIcon />} iconBg="#d1fae5" iconColor="#059669" onClick={() => navigate("/servicios")} />
                                    </Grid>
                                )}
                                {(session?.accountType === "administrator" || session?.accountType === "manager") && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Aplicaciones" subtitle="Gestionar apps" icon={<AppsIcon />} iconBg="#cffafe" iconColor="#0891b2" onClick={() => navigate("/aplicaciones")} />
                                    </Grid>
                                )}
                                {session?.accountType === "administrator" && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Gerentes" subtitle="Administrar gerentes" icon={<SupervisorAccountIcon />} iconBg="#fce7f3" iconColor="#be185d" onClick={() => navigate("/gerentes")} />
                                    </Grid>
                                )}
                                {session?.accountType === "administrator" && session.isMaster && (
                                    <Grid item xs={6}>
                                        <QuickAction title="Administradores" subtitle="Gestión de admins" icon={<SettingsIcon />} iconBg="#e2e8f0" iconColor="#0f172a" onClick={() => navigate("/administradores")} />
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    </Paper>
                </Grid>

            </Grid>

            {/* Activity Feed — full width */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                <Grid item xs={12}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            maxHeight: 380,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography variant="subtitle1" fontWeight={700}>Actividad Reciente</Typography>
                            <Chip label={`${activityEvents.length} acciones`} size="small" />
                        </Box>
                        <List dense sx={{ overflow: "auto", flex: 1, px: 1 }}>
                            {activityEvents.length === 0 ? (
                                <ListItem sx={{ px: 2, py: 3, justifyContent: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay acciones registradas aún. Las creaciones, ediciones y eliminaciones aparecerán aquí.
                                    </Typography>
                                </ListItem>
                            ) : (
                                activityEvents.map((event) => {
                                    const cfg = actionConfig[event.action];
                                    return (
                                        <ListItem
                                            key={event.id}
                                            sx={{
                                                px: 2,
                                                py: 1,
                                                borderBottom: "1px solid",
                                                borderColor: "divider",
                                                "&:last-child": { borderBottom: 0 },
                                            }}
                                        >
                                            <ListItemIcon sx={{ minWidth: 36 }}>
                                                <Box
                                                    sx={{
                                                        width: 30,
                                                        height: 30,
                                                        borderRadius: 1.5,
                                                        bgcolor: `${cfg.color}18`,
                                                        color: cfg.color,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                    }}
                                                >
                                                    {cfg.icon}
                                                </Box>
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Typography variant="body2" fontWeight={600} noWrap>
                                                            {event.entityName}
                                                        </Typography>
                                                        <Chip
                                                            label={event.entityType}
                                                            size="small"
                                                            sx={{ height: 20, fontSize: 10, fontWeight: 600, bgcolor: `${cfg.color}15`, color: cfg.color }}
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="text.secondary">
                                                        {cfg.label} · {formatTimeAgo(event.timestamp)}
                                                    </Typography>
                                                }
                                            />
                                        </ListItem>
                                    );
                                })
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>

            {/* ── Two-column: Alerts + Sensor Chart ──────────── */}
            <Grid container spacing={2.5}>
                {/* Alerts */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Centro de Alertas
                            </Typography>
                            <Chip label="0 alertas" size="small" color="success" />
                        </Box>
                        <List dense sx={{ px: 1 }}>
                            <ListItem sx={{ px: 2, py: 3, justifyContent: "center" }}>
                                <Typography variant="body2" color="text.secondary">
                                    Sin alertas activas
                                </Typography>
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                {/* Sensor readings mini chart */}
                <Grid item xs={12} md={6}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Lecturas de Sensores (24h)
                            </Typography>
                            <SensorsIcon fontSize="small" color="primary" />
                        </Box>
                        <Box sx={{ p: 3 }}>
                            <Box sx={{ display: "flex", gap: 3, mb: 2 }}>
                                <Box>
                                    <Typography variant="h5" fontWeight={800}>0</Typography>
                                    <Typography variant="caption" color="text.secondary">lecturas hoy</Typography>
                                </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                No hay lecturas de sensores registradas
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
