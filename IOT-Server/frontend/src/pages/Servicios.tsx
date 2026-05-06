import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateServiceSchema } from "../shared/api/schemas/validation";
import { PageResponse, ServiceResponse, PersonalDataResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box } from "@mui/material";

const editSchema = generateServiceSchema(false);
const newSchema = generateServiceSchema(true);

const paginationModel = { page: 0, pageSize: 10 };

export default function Servicios() {
    const { session } = useAuth();

    const { data, isLoading, isError, error } = useGetQuery<PageResponse<ServiceResponse>>(
        "services/",
        session!
    );

    const { data: adminsData } = useGetQuery<PageResponse<PersonalDataResponse>>(
        "administrators/",
        session!,
        { enabled: session?.accountType === "administrator" }
    );

    const adminOptions = useMemo(
        () =>
            (adminsData?.data ?? []).map((a) => ({
                label: `${a.first_name} ${a.last_name}`,
                value: a.id,
            })),
        [adminsData]
    );

    const columns: GridColDef[] = [
        { field: "name", headerName: "Nombre", flex: 1, minWidth: 150 },
        { field: "description", headerName: "Descripción", flex: 2, minWidth: 200 },
        {
            field: "administrator_id",
            headerName: "Administrador",
            flex: 1,
            minWidth: 200,
            valueFormatter: (value: string) => {
                const found = adminsData?.data?.find((a) => a.id === value);
                return found ? `${found.first_name} ${found.last_name}` : value;
            },
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

    const STATUS_OPTIONS = [
        { label: "Activo", value: true },
        { label: "Inactivo", value: false },
    ];

    const fieldsConfig = useMemo(
        () => ({
            administrator_id: {
                type: "select" as const,
                options: adminOptions,
                helperText: "Selecciona el administrador responsable del servicio",
            },
            is_active: {
                type: "boolean" as const,
                options: STATUS_OPTIONS,
            },
        }),
        [adminOptions]
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    const canModify = session?.accountType === "administrator";

    return (
        <Gestion<ServiceResponse>
            columns={columns}
            rows={data?.data || []}
            paginationModel={paginationModel}
            title="Servicios"
            editValidationSchema={editSchema}
            newValidationSchema={newSchema}
            keyEndpoint="services"
            canCreate={canModify}
            canEdit={canModify}
            canDelete={canModify}
            getEntityName={(row) => row.name}
            entityTypeLabel="Servicio"
            defaultValues={{ administrator_id: session?.accountId } as Partial<ServiceResponse>}
            fieldsConfig={fieldsConfig}
        />
    );
}
