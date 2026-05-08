import { useState, useCallback } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateApplicationSchema } from "../shared/api/schemas/validation";
import { PageResponse, ApplicationResponse } from "../shared/api/types";
import {
    CircularProgress, Alert, Box, Tooltip, Card, CardContent,
    Typography, IconButton, Divider, Chip, Button,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import KeyIcon from "@mui/icons-material/Key";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BuildIcon from "@mui/icons-material/Build";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import LayersClearIcon from "@mui/icons-material/LayersClear";
import { useSetupMode } from "../shared/components/BackendGate";
import { useActivity } from "../shared/activity/activityContext";

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
    const [configCopied, setConfigCopied] = useState(false);
    const [rebuildCopied, setRebuildCopied] = useState(false);

    const handleCopyConfig = () => {
        if (apps.length === 0) return;
        const app = apps[0];
        const yamlBlock =
            `        VITE_API_BASE_URL: /api/v1/\n` +
            `        VITE_APP_APPLICATION_ID: "${app.id as string}"\n` +
            `        VITE_APP_API_KEY: "${app.api_key}"\n` +
            `        VITE_APP_SERVER_KEY: "← REEMPLAZAR con el resultado del comando de abajo"`;
        void navigator.clipboard.writeText(yamlBlock).then(() => {
            setConfigCopied(true);
            setTimeout(() => setConfigCopied(false), 4000);
        });
    };

    const handleCopyRebuild = () => {
        const cmds = `docker compose build frontend\ndocker compose up -d`;
        void navigator.clipboard.writeText(cmds).then(() => {
            setRebuildCopied(true);
            setTimeout(() => setRebuildCopied(false), 4000);
        });
    };

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
                <Box sx={{ bgcolor: "#1e1e1e", color: "#d4d4d4", p: 1.5, borderRadius: 1, fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", userSelect: "all", mb: 2 }}>
                    {SERVER_KEY_CMD}
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* ── Botón 1: Insertar configuración completa ── */}
                <Box sx={{ mb: 1.5 }}>
                    <Button
                        variant="contained"
                        color={configCopied ? "success" : "warning"}
                        startIcon={configCopied ? <CheckCircleOutlineIcon /> : <ContentCopyIcon />}
                        onClick={handleCopyConfig}
                        disabled={apps.length === 0}
                        sx={{ textTransform: "none", fontWeight: 600, mr: 1.5 }}
                    >
                        {configCopied
                            ? "¡Configuración copiada! Pega en docker-compose.yml"
                            : "Insertar en docker-compose.yml"}
                    </Button>
                    {configCopied && (
                        <Alert severity="success" sx={{ mt: 1, fontSize: 12 }}>
                            Bloque <code>args</code> copiado al portapapeles. Pégalo en la sección <code>frontend &gt; build &gt; args</code> de <code>docker-compose.yml</code> y reemplaza <code>VITE_APP_SERVER_KEY</code> con el resultado del comando de arriba.
                        </Alert>
                    )}
                </Box>

                {/* ── Botón 2: Reconstruir frontend ── */}
                <Box>
                    <Button
                        variant="outlined"
                        color={rebuildCopied ? "success" : "primary"}
                        startIcon={rebuildCopied ? <CheckCircleOutlineIcon /> : <BuildIcon />}
                        onClick={handleCopyRebuild}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                        {rebuildCopied
                            ? "¡Comandos copiados! Pégalos en la terminal"
                            : "Reconstruir frontend"}
                    </Button>
                    {rebuildCopied && (
                        <Alert severity="info" sx={{ mt: 1, fontSize: 12 }}>
                            Pega y ejecuta en la terminal desde la carpeta <code>IOT-Server/</code>:<br />
                            <code>docker compose build frontend</code><br />
                            <code>docker compose up -d</code>
                        </Alert>
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}

export default function Aplicaciones() {
    const { session } = useAuth();
    const isSetupMode = useSetupMode();
    const { clearEvents } = useActivity();
    const { data, isLoading, isError, error } = useGetQuery<PageResponse<ApplicationResponse>>(
        "applications/",
        session!
    );

    // Track apps created in this session so credentials appear immediately
    // without requiring a page refresh or re-login
    const [newlyCreatedApps, setNewlyCreatedApps] = useState<ApplicationResponse[]>([]);
    const [logsClearedMsg, setLogsClearedMsg] = useState(false);

    const handleCreateSuccess = useCallback((row: ApplicationResponse) => {
        setNewlyCreatedApps((prev) =>
            prev.some((a) => a.id === row.id) ? prev : [...prev, row]
        );
    }, []);

    const handleClearLogs = () => {
        clearEvents();
        setLogsClearedMsg(true);
        setTimeout(() => setLogsClearedMsg(false), 4000);
    };

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    // Admin: full CRUD. Manager: read only.
    const canModify = session?.accountType === "administrator";
    const isMaster = session?.accountType === "administrator" && session?.isMaster === true;
    const queryApps = data?.data ?? [];

    // Merge query results with locally-created apps (newly created show immediately)
    const apps = [
        ...queryApps,
        ...newlyCreatedApps.filter((n) => !queryApps.some((a) => a.id === n.id)),
    ];

    return (
        <Box>
            {isSetupMode && apps.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Crea tu primera Application con el bot\u00f3n <strong>Nuevo</strong>. Las credenciales aparecer\u00e1n aqu\u00ed para que puedas copiarlas.
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
                fieldsConfig={{ administrator_id: { hidden: true } }}
                onCreateSuccess={handleCreateSuccess}
            />

            {/* ── Zona de desinstalación total (solo admin master) ── */}
            {isMaster && (
                <Card sx={{ mt: 4, border: "2px solid #ef4444", bgcolor: "#fff5f5" }}>
                    <CardContent>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                            <DeleteForeverIcon sx={{ color: "#dc2626" }} />
                            <Typography variant="h6" fontWeight={700} color="error.main">
                                Zona de desinstalaci\u00f3n total
                            </Typography>
                        </Box>
                        <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
                            Esta acci\u00f3n destruye <strong>todos los datos</strong> (base de datos SQLite y cach\u00e9 Valkey). Despu\u00e9s deber\u00e1s repetir el proceso de configuraci\u00f3n inicial desde cero.
                        </Alert>

                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75, fontWeight: 600 }}>
                            Ejecutar en terminal desde <code>IOT-Server/</code>:
                        </Typography>
                        <Box sx={{ bgcolor: "#1e1e1e", color: "#f87171", p: 1.5, borderRadius: 1, fontFamily: "monospace", fontSize: 12, mb: 2, userSelect: "all" }}>
                            docker compose down -v --remove-orphans
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={logsClearedMsg ? <CheckCircleOutlineIcon /> : <LayersClearIcon />}
                                onClick={handleClearLogs}
                                sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                                {logsClearedMsg ? "\u00a1Logs eliminados!" : "Limpiar logs de actividad local"}
                            </Button>
                            {logsClearedMsg && (
                                <Typography variant="caption" color="success.main" fontWeight={600}>
                                    El registro de actividad del panel fue borrado correctamente.
                                </Typography>
                            )}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                            Esto borra el historial de acciones mostrado en el Dashboard (almacenado en el navegador). No afecta la base de datos del servidor.
                        </Typography>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
