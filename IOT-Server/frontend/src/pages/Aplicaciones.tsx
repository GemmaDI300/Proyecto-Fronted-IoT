import { useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateApplicationSchema } from "../shared/api/schemas/validation";
import { PageResponse, ApplicationResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box, Tooltip, Card, CardContent, Typography, IconButton, Divider, Chip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyIcon from "@mui/icons-material/Key";
import { useSetupMode } from "../shared/components/BackendGate";

const editSchema = generateApplicationSchema(false);
const newSchema = generateApplicationSchema(true);

const columns: GridColDef[] = [
    { field: "name", headerName: "Nombre", flex: 1, minWidth: 130 },
    { field: "version", headerName: "Versión", width: 100 },
    { field: "url", headerName: "URL", flex: 1, minWidth: 180 },
    { field: "port", headerName: "Puerto", width: 90 },
    {
        field: "api_key",
        headerName: "API Key",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => (
            <Tooltip title={String(params.value ?? "")} placement="top">
                <Box
                    sx={{
                        fontFamily: "monospace",
                        fontSize: 11,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                    }}
                >
                    {String(params.value ?? "").substring(0, 20)}…
                </Box>
            </Tooltip>
        ),
    },
    {
        field: "is_active",
        headerName: "Estado",
        width: 120,
        renderCell: (params) => (
            <Box
                sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: 1.5,
                    fontSize: 12,
                    fontWeight: 600,
                    bgcolor: params.value ? "#d1fae5" : "#fee2e2",
                    color: params.value ? "#065f46" : "#991b1b",
                }}
            >
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: params.value ? "#10b981" : "#ef4444" }} />
                {params.value ? "Activo" : "Inactivo"}
            </Box>
        ),
    },
];

const paginationModel = { page: 0, pageSize: 10 };

const SERVER_KEY_CMD = `docker exec iot-backend python3 -c "import hashlib,os; print(hashlib.sha256((os.environ['SECRET_KEY']+'|puzzle_v1').encode()).hexdigest())"`;

function CopyField({ label, value }: { label: string; value: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: "block", fontWeight: 600 }}>
                {label}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 1, px: 1.5, py: 0.75 }}>
                <Typography sx={{ fontFamily: "monospace", fontSize: 11, flex: 1, wordBreak: "break-all" }}>
                    {value}
                </Typography>
                <Tooltip title={copied ? "\u00a1Copiado!" : "Copiar"}>
                    <IconButton size="small" onClick={handleCopy} color={copied ? "success" : "default"}>
                        <ContentCopyIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Box>
        </Box>
    );
}

function SetupCredentialsPanel({ apps }: { apps: ApplicationResponse[] }) {
    return (
        <Card sx={{ mb: 3, border: "2px solid #f59e0b", bgcolor: "#fffbeb" }}>
            <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <KeyIcon color="warning" />
                    <Typography variant="h6" fontWeight={600}>
                        Credenciales RC \u2014 docker-compose.yml
                    </Typography>
                </Box>
                <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
                    Copia estos valores al bloque <code>args</code> del servicio <code>frontend</code>
                    {" "}en <code>docker-compose.yml</code>, luego ejecuta <code>docker compose build frontend</code>.
                </Alert>
                {apps.map((app) => (
                    <Box key={app.id as string} sx={{ mb: 2 }}>
                        <Chip label={app.name as string} size="small" color="warning" sx={{ mb: 1.5 }} />
                        <CopyField label="VITE_APP_APPLICATION_ID" value={app.id as string} />
                        <CopyField label="VITE_APP_API_KEY" value={app.api_key} />
                    </Box>
                ))}
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
                    VITE_APP_SERVER_KEY \u2014 obtener ejecutando en terminal:
                </Typography>
                <Box sx={{ bgcolor: "#1e1e1e", color: "#d4d4d4", p: 1.5, borderRadius: 1, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", userSelect: "all" }}>
                    {SERVER_KEY_CMD}
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Aplicaciones() {
    const { session } = useAuth();
    const isSetupMode = useSetupMode();
    const { data, isLoading, isError, error } = useGetQuery<PageResponse<ApplicationResponse>>(
        "applications/",
        session!
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    // Admin: full CRUD. Manager: read only.
    const canModify = session?.accountType === "administrator";
    const apps = data?.data ?? [];

    return (
        <Box>
            {isSetupMode && apps.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Crea tu primera Application con el bot\u00f3n <strong>Nuevo</strong>. Las credenciales aparecer\u00e1n aquí para que puedas copiarlas.
                </Alert>
            )}
            {isSetupMode && apps.length > 0 && (
                <SetupCredentialsPanel apps={apps} />
            )}
            <Gestion<ApplicationResponse>
                columns={columns}
                rows={apps}
                paginationModel={paginationModel}
                title="Aplicaciones"
                editValidationSchema={editSchema}
                newValidationSchema={newSchema}
                keyEndpoint="applications"
                canCreate={canModify}
                canEdit={canModify}
                canDelete={canModify}
                getEntityName={(row) => row.name}
                defaultValues={{ administrator_id: session?.accountId } as Partial<ApplicationResponse>}
            />
        </Box>
    );
}
