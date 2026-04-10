import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generatePersonalDataSchema } from "../shared/api/schemas/validation";
import { PageResponse, PersonalDataResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box } from "@mui/material";

const editSchema = generatePersonalDataSchema(false);
const newSchema = generatePersonalDataSchema(true);

const columns: GridColDef[] = [
    { field: "first_name", headerName: "Nombre", flex: 1, minWidth: 120 },
    { field: "last_name", headerName: "Apellido", flex: 1, minWidth: 120 },
    { field: "second_last_name", headerName: "Segundo apellido", flex: 1, minWidth: 120 },
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

export default function Usuarios() {
    const { session } = useAuth();
    const { data, isLoading, isError, error } = useGetQuery<PageResponse<PersonalDataResponse>>(
        "users/",
        session!
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    const canModify = session?.accountType === "administrator";

    return (
        <Gestion<PersonalDataResponse>
            columns={columns}
            rows={data?.data || []}
            paginationModel={paginationModel}
            title="Usuarios"
            editValidationSchema={editSchema}
            newValidationSchema={newSchema}
            keyEndpoint="users"
            canCreate={canModify}
            canEdit={canModify}
            canDelete={canModify}
            getEntityName={(row) => `${row.first_name} ${row.last_name}`}
        />
    );
}
