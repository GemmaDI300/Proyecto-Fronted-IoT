import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateApplicationSchema } from "../shared/api/schemas/validation";
import { PageResponse, ApplicationResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box, Tooltip } from "@mui/material";

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

export default function Aplicaciones() {
    const { session } = useAuth();
    const { data, isLoading, isError, error } = useGetQuery<PageResponse<ApplicationResponse>>(
        "applications/",
        session!
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    // Admin: full CRUD. Manager: read only.
    const canModify = session?.accountType === "administrator";

    return (
        <Gestion<ApplicationResponse>
            columns={columns}
            rows={data?.data || []}
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
    );
}
