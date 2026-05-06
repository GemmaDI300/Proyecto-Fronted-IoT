import { useMemo, useState } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import {
    generateServiceTicketSchema,
    generateEcosystemTicketSchema,
} from "../shared/api/schemas/validation";
import {
    PageResponse,
    ServiceTicketResponse,
    EcosystemTicketResponse,
    ServiceResponse,
} from "../shared/api/types";
import {
    CircularProgress,
    Alert,
    Box,
    Tab,
    Tabs,
    Chip,
} from "@mui/material";

const PRIORITY_OPTIONS = [
    { label: "Baja", value: "low" },
    { label: "Media", value: "medium" },
    { label: "Alta", value: "high" },
    { label: "Crítica", value: "critical" },
];

const STATUS_OPTIONS = [
    { label: "Abierto", value: 1 },
    { label: "En progreso", value: 2 },
    { label: "Resuelto", value: 3 },
    { label: "Cerrado", value: 4 },
];

const statusLabels: Record<number, string> = {
    1: "Abierto",
    2: "En progreso",
    3: "Resuelto",
    4: "Cerrado",
};

const priorityColors: Record<string, { bg: string; text: string }> = {
    low: { bg: "#e0f2fe", text: "#0369a1" },
    medium: { bg: "#fef9c3", text: "#854d0e" },
    high: { bg: "#ffedd5", text: "#9a3412" },
    critical: { bg: "#fee2e2", text: "#991b1b" },
};

const priorityLabels: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    critical: "Crítica",
};

const PriorityChip = ({ value }: { value: string }) => {
    const colors = priorityColors[value] ?? { bg: "#f1f5f9", text: "#475569" };
    return (
        <Box
            sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.25,
                py: 0.5,
                borderRadius: 1.5,
                fontSize: 12,
                fontWeight: 600,
                bgcolor: colors.bg,
                color: colors.text,
            }}
        >
            {priorityLabels[value] ?? value}
        </Box>
    );
};

const paginationModel = { page: 0, pageSize: 10 };

const serviceTicketEditSchema = generateServiceTicketSchema(false);
const serviceTicketNewSchema = generateServiceTicketSchema(true);
const ecosystemTicketEditSchema = generateEcosystemTicketSchema(false);
const ecosystemTicketNewSchema = generateEcosystemTicketSchema(true);

export default function Tickets() {
    const { session } = useAuth();
    const [tab, setTab] = useState(0);

    const {
        data: serviceTickets,
        isLoading: loadingST,
        isError: isErrorST,
        error: errorST,
    } = useGetQuery<PageResponse<ServiceTicketResponse>>("tickets/service/", session!);

    const {
        data: ecoTickets,
        isLoading: loadingET,
        isError: isErrorET,
        error: errorET,
    } = useGetQuery<PageResponse<EcosystemTicketResponse>>("tickets/ecosystem/", session!);

    const { data: servicesData } = useGetQuery<PageResponse<ServiceResponse>>(
        "services/",
        session!
    );

    const serviceOptions = useMemo(
        () =>
            (servicesData?.data ?? []).map((s) => ({
                label: s.name,
                value: s.id,
            })),
        [servicesData]
    );

    const serviceTicketFieldsConfig = useMemo(
        () => ({
            service_id: {
                type: "select" as const,
                options: serviceOptions,
                helperText: "Selecciona el servicio relacionado",
            },
            priority: {
                type: "select" as const,
                options: PRIORITY_OPTIONS,
            },
            status_id: {
                type: "select" as const,
                options: STATUS_OPTIONS,
                helperText: "Estado actual del ticket",
            },
            user_role_id: {
                helperText: "UUID del rol de usuario asignado al servicio (requiere configuración previa de roles)",
            },
        }),
        [serviceOptions]
    );

    const ecosystemTicketFieldsConfig = useMemo(
        () => ({
            priority: {
                type: "select" as const,
                options: PRIORITY_OPTIONS,
            },
            status_id: {
                type: "select" as const,
                options: STATUS_OPTIONS,
                helperText: "Estado actual del ticket",
            },
            manager_service_id: {
                helperText: "UUID de la asignación gerente-servicio (requiere configuración previa)",
            },
        }),
        []
    );

    const serviceTicketColumns: GridColDef[] = [
        { field: "title", headerName: "Título", flex: 1, minWidth: 200 },
        { field: "description", headerName: "Descripción", flex: 1, minWidth: 200 },
        {
            field: "status_id",
            headerName: "Estado",
            width: 120,
            valueFormatter: (value: number) => statusLabels[value] ?? `Estado ${value}`,
        },
        {
            field: "service_id",
            headerName: "Servicio",
            flex: 1,
            minWidth: 180,
            valueFormatter: (value: string) => {
                const found = servicesData?.data?.find((s) => s.id === value);
                return found ? found.name : value;
            },
        },
        { field: "user_role_id", headerName: "ID Rol Usuario", flex: 1, minWidth: 280 },
        {
            field: "priority",
            headerName: "Prioridad",
            width: 120,
            renderCell: (params) => <PriorityChip value={String(params.value)} />,
        },
    ];

    const ecosystemTicketColumns: GridColDef[] = [
        { field: "title", headerName: "Título", flex: 1, minWidth: 200 },
        { field: "description", headerName: "Descripción", flex: 1, minWidth: 200 },
        {
            field: "status_id",
            headerName: "Estado",
            width: 120,
            valueFormatter: (value: number) => statusLabels[value] ?? `Estado ${value}`,
        },
        { field: "manager_service_id", headerName: "ID Asignación Gerente", flex: 1, minWidth: 280 },
        {
            field: "priority",
            headerName: "Prioridad",
            width: 120,
            renderCell: (params) => <PriorityChip value={String(params.value)} />,
        },
    ];

    if (loadingST || loadingET) return <CircularProgress />;
    if (isErrorST) return <Alert severity="error">{errorST.message}</Alert>;
    if (isErrorET) return <Alert severity="error">{errorET.message}</Alert>;

    const canWrite =
        session?.accountType === "administrator" ||
        session?.accountType === "manager" ||
        session?.accountType === "user";

    return (
        <Box>
            <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
            >
                <Tab
                    label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            Tickets de Servicio
                            <Chip label={serviceTickets?.data.length ?? 0} size="small" />
                        </Box>
                    }
                />
                <Tab
                    label={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            Tickets de Ecosistema
                            <Chip label={ecoTickets?.data.length ?? 0} size="small" />
                        </Box>
                    }
                />
            </Tabs>

            {tab === 0 && (
                <Gestion<ServiceTicketResponse>
                    columns={serviceTicketColumns}
                    rows={serviceTickets?.data || []}
                    paginationModel={paginationModel}
                    title="Tickets de Servicio"
                    editValidationSchema={serviceTicketEditSchema}
                    newValidationSchema={serviceTicketNewSchema}
                    keyEndpoint="tickets/service"
                    canCreate={canWrite}
                    canEdit={canWrite}
                    canDelete={false}
                    getEntityName={(row) => row.title}
                    entityTypeLabel="Ticket de Servicio"
                    fieldsConfig={serviceTicketFieldsConfig}
                    showDetail={true}
                />
            )}

            {tab === 1 && (
                <Gestion<EcosystemTicketResponse>
                    columns={ecosystemTicketColumns}
                    rows={ecoTickets?.data || []}
                    paginationModel={paginationModel}
                    title="Tickets de Ecosistema"
                    editValidationSchema={ecosystemTicketEditSchema}
                    newValidationSchema={ecosystemTicketNewSchema}
                    keyEndpoint="tickets/ecosystem"
                    canCreate={canWrite}
                    canEdit={canWrite}
                    canDelete={false}
                    getEntityName={(row) => row.title}
                    entityTypeLabel="Ticket de Ecosistema"
                    fieldsConfig={ecosystemTicketFieldsConfig}
                    showDetail={true}
                />
            )}
        </Box>
    );
}

