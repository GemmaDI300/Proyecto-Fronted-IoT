import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    Divider,
    Chip,
} from "@mui/material";
import { GenericDataWithId } from "../shared/api/types";

const fieldLabels: Record<string, string> = {
    id: "ID",
    first_name: "Nombre",
    last_name: "Apellido paterno",
    second_last_name: "Apellido materno",
    phone: "Teléfono",
    address: "Dirección",
    city: "Ciudad",
    state: "Estado",
    postal_code: "Código postal",
    birth_date: "Fecha de nacimiento",
    email: "Correo electrónico",
    curp: "CURP",
    rfc: "RFC",
    name: "Nombre",
    brand: "Marca",
    model: "Modelo",
    serial_number: "Número de serie",
    ip: "Dirección IP",
    mac: "Dirección MAC",
    description: "Descripción",
    administrator_id: "ID Administrador",
    version: "Versión",
    url: "URL",
    port: "Puerto",
    api_key: "API Key",
    title: "Título",
    user_role_id: "ID Rol de Usuario",
    status_id: "Estado ID",
    service_id: "ID Servicio",
    priority: "Prioridad",
    manager_service_id: "ID Asignación Gerente-Servicio",
    is_active: "Estado",
    created_at: "Creado",
    updated_at: "Última actualización",
};

const priorityLabels: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
};

const HIDDEN_FIELDS = new Set(["password", "password_hash"]);

// Sensitive personal data fields not returned by the API — shown as masked
const SENSITIVE_PERSONAL_FIELDS: { key: string; label: string }[] = [
    { key: "email", label: "Correo electrónico" },
    { key: "phone", label: "Teléfono" },
    { key: "address", label: "Dirección" },
    { key: "city", label: "Ciudad" },
    { key: "state", label: "Estado" },
    { key: "postal_code", label: "Código postal" },
    { key: "birth_date", label: "Fecha de nacimiento" },
    { key: "curp", label: "CURP" },
    { key: "rfc", label: "RFC" },
];

function formatValue(key: string, value: unknown): React.ReactNode {
    if (value === null || value === undefined || value === "") {
        return (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                —
            </Typography>
        );
    }
    if (key === "is_active") {
        return (
            <Chip
                label={value ? "Activo" : "Inactivo"}
                size="small"
                sx={{
                    bgcolor: value ? "#d1fae5" : "#fee2e2",
                    color: value ? "#065f46" : "#991b1b",
                    fontWeight: 600,
                }}
            />
        );
    }
    if (key === "priority") {
        return (
            <Typography variant="body2">
                {priorityLabels[String(value)] ?? String(value)}
            </Typography>
        );
    }
    if (key === "created_at" || key === "updated_at") {
        return (
            <Typography variant="body2">
                {new Date(String(value)).toLocaleString("es-MX")}
            </Typography>
        );
    }
    if (typeof value === "boolean") {
        return <Chip label={value ? "Sí" : "No"} size="small" />;
    }
    return (
        <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
            {String(value)}
        </Typography>
    );
}

interface DetalleDialogProps<T extends GenericDataWithId> {
    open: boolean;
    onClose: () => void;
    row: T | null;
    title?: string;
}

export default function DetalleDialog<T extends GenericDataWithId>({
    open,
    onClose,
    row,
    title = "Detalle",
}: DetalleDialogProps<T>) {
    if (!row) return null;

    const entries = Object.entries(row).filter(([key]) => !HIDDEN_FIELDS.has(key));

    // If this is a personal-data entity (has first_name), add masked sensitive fields
    // that the API doesn't return for privacy reasons
    const isPersonalData = "first_name" in row;
    const maskedEntries = isPersonalData
        ? SENSITIVE_PERSONAL_FIELDS.filter(({ key }) => !(key in row))
        : [];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>{title}</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                    {entries.map(([key, value], idx) => (
                        <Box key={key}>
                            {idx > 0 && <Divider />}
                            <Box
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    gap: 2,
                                    py: 1.5,
                                    px: 0.5,
                                }}
                            >
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ fontWeight: 600, minWidth: 180, flexShrink: 0 }}
                                >
                                    {fieldLabels[key] ?? key}
                                </Typography>
                                <Box sx={{ flex: 1, textAlign: "right" }}>
                                    {formatValue(key, value)}
                                </Box>
                            </Box>
                        </Box>
                    ))}
                    {maskedEntries.length > 0 && (
                        <>
                            <Divider />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ px: 0.5, pt: 1, pb: 0.5, display: "block" }}
                            >
                                Datos confidenciales (no devueltos por la API)
                            </Typography>
                            {maskedEntries.map(({ key, label }) => (
                                <Box key={key}>
                                    <Divider />
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 2,
                                            py: 1.5,
                                            px: 0.5,
                                        }}
                                    >
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontWeight: 600, minWidth: 180, flexShrink: 0 }}
                                        >
                                            {label}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            color="text.disabled"
                                            sx={{ letterSpacing: 2 }}
                                        >
                                            ••••••••
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </>
                    )}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="outlined" sx={{ textTransform: "none" }}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
