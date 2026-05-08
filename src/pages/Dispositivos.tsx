import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { FieldConfig } from "../components/EditarDialog";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateDeviceSchema } from "../shared/api/schemas/validation";
import { PageResponse, DeviceResponse } from "../shared/api/types";
import { CircularProgress, Alert, Box } from "@mui/material";

const STATUS_OPTIONS: { label: string; value: boolean }[] = [
    { label: "Activo", value: true },
    { label: "Inactivo", value: false },
];


const editSchema = generateDeviceSchema(false);
const newSchema = generateDeviceSchema(true);

const columns: GridColDef[] = [
    { field: "name", headerName: "Nombre", flex: 1, minWidth: 120 },
    { field: "brand", headerName: "Marca", flex: 1, minWidth: 100 },
    { field: "model", headerName: "Modelo", flex: 1, minWidth: 100 },
    { field: "serial_number", headerName: "No. Serie", flex: 1, minWidth: 130 },
    { field: "ip", headerName: "IP", width: 140 },
    { field: "mac", headerName: "MAC", width: 160 },
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

export default function Dispositivos() {
    const { session } = useAuth();
    const { data, isLoading, isError, error } = useGetQuery<PageResponse<DeviceResponse>>(
        "devices/",
        session!
    );

    if (isLoading) return <CircularProgress />;
    if (isError) return <Alert severity="error">{error.message}</Alert>;

    const canModify = session?.accountType === "administrator" || session?.accountType === "manager";

    const fieldsConfig = useMemo<Partial<Record<string, FieldConfig>>>(
        () => ({
            is_active: { type: "boolean", options: STATUS_OPTIONS },
        }),
        []
    );

    return (
        <Gestion<DeviceResponse>
            columns={columns}
            rows={data?.data || []}
            paginationModel={paginationModel}
            title="Dispositivos IoT"
            editValidationSchema={editSchema}
            newValidationSchema={newSchema}
            keyEndpoint="devices"
            canCreate={canModify}
            canEdit={canModify}
            canDelete={canModify}
            getEntityName={(row) => row.name}
            showDetail={true}
            entityTypeLabel="Dispositivo"
            fieldsConfig={fieldsConfig}
        />
    );
}
