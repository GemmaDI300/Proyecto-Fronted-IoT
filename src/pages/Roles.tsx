import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import LinkPanel from "../components/LinkPanel";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateRoleSchema } from "../shared/api/schemas/validation";
import { PageResponse, RoleResponse, ServiceResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box } from "@mui/material";

const editSchema = generateRoleSchema(false);
const newSchema = generateRoleSchema(true);

const paginationModel = { page: 0, pageSize: 10 };

export default function Roles() {
    const { session } = useAuth();

    const { data, isLoading, isError, error } = useGetQuery<PageResponse<RoleResponse>>(
        "roles/",
        session!
    );

    // Los servicios se necesitan para mostrar nombre en lugar de UUID y para el selector al crear/editar
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

    const columns: GridColDef[] = [
        { field: "name", headerName: "Nombre", flex: 1, minWidth: 150 },
        { field: "description", headerName: "Descripción", flex: 2, minWidth: 200 },
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
                    <Box
                        sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: params.value ? "#10b981" : "#ef4444",
                        }}
                    />
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
            service_id: {
                type: "select" as const,
                options: serviceOptions,
                helperText: "Selecciona el servicio al que pertenece este rol",
            },
            is_active: {
                type: "boolean" as const,
                options: STATUS_OPTIONS,
            },
        }),
        [serviceOptions]
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    // Según policies.polar:
    // - administrator (master o no): read + write + delete
    // - manager: read + write (sin delete)
    // - user: solo read
    const isAdmin = session?.accountType === "administrator";
    const isManager = session?.accountType === "manager";
    const canCreate = isAdmin || isManager;
    const canEdit = isAdmin || isManager;
    const canDelete = isAdmin;

    return (
        <Gestion<RoleResponse>
            columns={columns}
            rows={data?.data || []}
            paginationModel={paginationModel}
            title="Roles"
            editValidationSchema={editSchema}
            newValidationSchema={newSchema}
            keyEndpoint="roles"
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            getEntityName={(row) => row.name}
            entityTypeLabel="Rol"
            fieldsConfig={fieldsConfig}
            renderLinkPanel={(row) => (
                <LinkPanel
                    title="Usuarios asignados a este rol"
                    session={session!}
                    listEndpoint={`roles/${row.id}/users`}
                    linkedIdField="user_id"
                    addMode="body"
                    addEndpoint={`roles/${row.id}/users`}
                    addBodyKey="user_id"
                    removeEndpoint={`roles/${row.id}/users`}
                    allItemsEndpoint="users/?limit=100"
                    getItemLabel={(item) =>
                        `${item.first_name ?? ""} ${item.last_name ?? ""}`.trim()
                    }
                />
            )}
        />
    );
}
