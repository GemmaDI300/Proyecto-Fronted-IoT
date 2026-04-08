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
import { useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { useAuth } from "../shared/auth/authContext";
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
                transition: "all 0.2s",
                "&:hover": {
                    borderColor: "primary.main",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    transform: "translateY(-2px)",
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

    /* ── Build activity feed from all entities ─────────── */
    interface ActivityItem {
        id: string;
        label: string;
        type: "device" | "user" | "manager" | "admin";
        color: string;
        icon: React.ReactNode;
        createdAt: string;
        updatedAt: string;
        isNew: boolean;
    }

    const recentActivity = useMemo(() => {
        const items: ActivityItem[] = [];

        devicesData?.data?.forEach((d) => {
            items.push({
                id: d.id,
                label: d.name,
                type: "device",
                color: "#2563eb",
                icon: <DevicesIcon sx={{ fontSize: 18 }} />,
                createdAt: d.created_at,
                updatedAt: d.updated_at,
                isNew: d.created_at === d.updated_at,
            });
        });

        usersData?.data?.forEach((u) => {
            items.push({
                id: u.id,
                label: `${u.first_name} ${u.last_name}`,
                type: "user",
                color: "#059669",
                icon: <PeopleIcon sx={{ fontSize: 18 }} />,
                createdAt: u.created_at,
                updatedAt: u.updated_at,
                isNew: u.created_at === u.updated_at,
            });
        });

        managersData?.data?.forEach((m) => {
            items.push({
                id: m.id,
                label: `${m.first_name} ${m.last_name}`,
                type: "manager",
                color: "#d97706",
                icon: <SupervisorAccountIcon sx={{ fontSize: 18 }} />,
                createdAt: m.created_at,
                updatedAt: m.updated_at,
                isNew: m.created_at === m.updated_at,
            });
        });

        adminsData?.data?.forEach((a) => {
            items.push({
                id: a.id,
                label: `${a.first_name} ${a.last_name}`,
                type: "admin",
                color: "#0891b2",
                icon: <ManageAccountsIcon sx={{ fontSize: 18 }} />,
                createdAt: a.created_at,
                updatedAt: a.updated_at,
                isNew: a.created_at === a.updated_at,
            });
        });

        // Sort by most recent activity (updated_at) descending
        items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        return items.slice(0, 15);
    }, [devicesData, usersData, managersData, adminsData]);

    const typeLabels: Record<string, string> = {
        device: "Dispositivo",
        user: "Usuario",
        manager: "Gerente",
        admin: "Administrador",
    };

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
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Dispositivos IoT"
                        count={devicesData?.total}
                        icon={<DevicesIcon />}
                        color="#2563eb"
                        bgColor="#dbeafe"
                        subtitle={`↑ ${devicesData?.data?.filter((d) => d.is_active).length ?? 0} activos`}
                    />
                </Grid>
                {session?.accountType !== "user" && (
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
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
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Administradores"
                            count={adminsData?.total}
                            icon={<ManageAccountsIcon />}
                            color="#0891b2"
                            bgColor="#cffafe"
                        />
                    </Grid>
                )}
            </Grid>

            {/* ── Two-column: Quick Actions + Activity ────────── */}
            <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Quick Actions */}
                {session?.accountType !== "user" && (
                    <Grid item xs={12} md={6}>
                        <Paper
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                border: "1px solid",
                                borderColor: "divider",
                            }}
                        >
                            <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider" }}>
                                <Typography variant="subtitle1" fontWeight={700}>
                                    Acciones Rápidas — {roleLabel}
                                </Typography>
                            </Box>
                            <Box sx={{ p: 2.5 }}>
                                <Grid container spacing={1.5}>
                                    <Grid item xs={6}>
                                        <QuickAction
                                            title="Crear Usuario"
                                            subtitle="Registrar nuevo usuario"
                                            icon={<PersonAddIcon />}
                                            iconBg="#dbeafe"
                                            iconColor="#2563eb"
                                            onClick={() => navigate("/usuarios")}
                                        />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <QuickAction
                                            title="Crear Dispositivo"
                                            subtitle="Registrar dispositivo IoT"
                                            icon={<AddCircleOutlineIcon />}
                                            iconBg="#fef3c7"
                                            iconColor="#d97706"
                                            onClick={() => navigate("/dispositivos")}
                                        />
                                    </Grid>
                                    {session?.accountType === "administrator" && (
                                        <Grid item xs={6}>
                                            <QuickAction
                                                title="Crear Gerente"
                                                subtitle="Asignar a servicios"
                                                icon={<SupervisorAccountIcon />}
                                                iconBg="#d1fae5"
                                                iconColor="#059669"
                                                onClick={() => navigate("/gerentes")}
                                            />
                                        </Grid>
                                    )}
                                    {session?.accountType === "administrator" && (
                                        <Grid item xs={6}>
                                            <QuickAction
                                                title="Gestión"
                                                subtitle="Roles y permisos"
                                                icon={<SettingsIcon />}
                                                iconBg="#ede9fe"
                                                iconColor="#7c3aed"
                                                onClick={() => navigate("/administradores")}
                                            />
                                        </Grid>
                                    )}
                                </Grid>
                            </Box>
                        </Paper>
                    </Grid>
                )}

                {/* Activity Feed */}
                <Grid item xs={12} md={session?.accountType === "user" ? 12 : 6}>
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            maxHeight: 420,
                            display: "flex",
                            flexDirection: "column",
                        }}
                    >
                        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Actividad Reciente
                            </Typography>
                            <Chip label={`${recentActivity.length} registros`} size="small" />
                        </Box>
                        <List dense sx={{ overflow: "auto", flex: 1, px: 1 }}>
                            {recentActivity.length === 0 ? (
                                <ListItem sx={{ px: 2, py: 3, justifyContent: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No hay actividad registrada aún
                                    </Typography>
                                </ListItem>
                            ) : (
                                recentActivity.map((item) => (
                                    <ListItem
                                        key={`${item.type}-${item.id}`}
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
                                                    bgcolor: `${item.color}15`,
                                                    color: item.color,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                            >
                                                {item.icon}
                                            </Box>
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                        {item.label}
                                                    </Typography>
                                                    <Chip
                                                        label={typeLabels[item.type]}
                                                        size="small"
                                                        sx={{
                                                            height: 20,
                                                            fontSize: 10,
                                                            fontWeight: 600,
                                                            bgcolor: `${item.color}15`,
                                                            color: item.color,
                                                        }}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Typography variant="caption" color="text.secondary">
                                                    {item.isNew ? "Creado" : "Actualizado"} · {formatTimeAgo(item.updatedAt)}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))
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
