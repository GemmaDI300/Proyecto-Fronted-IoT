import { DataGrid, GridCellParams, GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import EditarDialog from "./EditarDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import * as Yup from "yup";
import { useState, useEffect, useMemo } from "react";
import { useDeleteByIdMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { GenericDataWithId } from "../shared/api/types";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";

type StatusFilter = "all" | "active" | "inactive";

interface GestionProps<T extends GenericDataWithId> {
    columns: GridColDef[];
    rows: T[];
    paginationModel: { page: number; pageSize: number };
    title: string;
    editValidationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    newValidationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    keyEndpoint: string;
    canCreate?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    /** ID of the currently logged-in user to prevent self-deletion */
    selfId?: string;
    /** Label builder for the ConfirmDeleteDialog entity name */
    getEntityName?: (row: T) => string;
}

export default function Gestion<T extends GenericDataWithId>({
    columns,
    rows,
    paginationModel,
    title,
    editValidationSchema,
    newValidationSchema,
    keyEndpoint,
    canCreate = true,
    canEdit = true,
    canDelete = true,
    selfId,
    getEntityName,
}: GestionProps<T>) {
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<T | null>(null);
    const [openCreate, setOpenCreate] = useState(false);
    const [tableRows, setTableRows] = useState<T[]>(rows);
    const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

    const { session } = useAuth();
    const mutation = useDeleteByIdMutation<T>(keyEndpoint, session!);

    useEffect(() => {
        setTableRows(rows);
    }, [rows]);

    const handleClickOpen = (rowData: T) => {
        setSelectedRow(rowData);
        setOpen(true);
    };

    const handleRequestDelete = (row: T) => {
        setDeleteTarget(row);
    };

    const handleConfirmDelete = (_reason: string) => {
        if (!deleteTarget?.id) return;
        mutation.mutate(deleteTarget.id, {
            onSuccess: () => {
                setTableRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
                setDeleteTarget(null);
            },
            onError: (error) => {
                console.error(`Error al eliminar ID ${deleteTarget.id}:`, error);
            },
        });
    };

    const handleChange = (updatedRow: T) => {
        setTableRows((prev) => {
            const idx = prev.findIndex((row) => row.id === updatedRow.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = updatedRow;
                return copy;
            }
            return [...prev, updatedRow];
        });
    };

    const filteredRows = useMemo(() => {
        if (statusFilter === "all") return tableRows;
        const isActive = statusFilter === "active";
        return tableRows.filter(
            (row) => (row as Record<string, unknown>).is_active === isActive
        );
    }, [tableRows, statusFilter]);

    const activeCount = tableRows.filter(
        (r) => (r as Record<string, unknown>).is_active === true
    ).length;
    const inactiveCount = tableRows.filter(
        (r) => (r as Record<string, unknown>).is_active === false
    ).length;

    const actionColumns: GridColDef[] =
        canEdit || canDelete
            ? [
                  {
                      field: "acciones",
                      headerName: "Acciones",
                      width: 220,
                      sortable: false,
                      renderCell: (params: GridCellParams) => (
                          <Box sx={{ display: "flex", gap: 1 }}>
                              {canEdit && (
                                  <Button
                                      variant="outlined"
                                      size="small"
                                      onClick={() => handleClickOpen(params.row)}
                                      sx={{ textTransform: "none", fontWeight: 600 }}
                                  >
                                      Editar
                                  </Button>
                              )}
                              {canDelete && (
                                  <Button
                                      variant="outlined"
                                      color="error"
                                      size="small"
                                      disabled={!!selfId && params.row.id === selfId}
                                      onClick={() => handleRequestDelete(params.row)}
                                      sx={{ textTransform: "none", fontWeight: 600 }}
                                  >
                                      Eliminar
                                  </Button>
                              )}
                          </Box>
                      ),
                  },
              ]
            : [];

    const combinedColumns = [...columns, ...actionColumns];

    const deleteEntityName = deleteTarget
        ? getEntityName
            ? getEntityName(deleteTarget)
            : (deleteTarget as Record<string, unknown>).name as string ||
              (deleteTarget as Record<string, unknown>).first_name as string ||
              `ID ${deleteTarget.id}`
        : "";

    return (
        <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="h5" fontWeight={700}>
                        {title}
                    </Typography>
                    <Chip label={`${tableRows.length} total`} size="small" />
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    {canCreate && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenCreate(true)}
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                        >
                            Crear
                        </Button>
                    )}
                </Box>
            </Box>

            {/* History / filter bar */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <HistoryIcon fontSize="small" color="action" />
                <Typography variant="body2" color="text.secondary">
                    Historial:
                </Typography>
                <ToggleButtonGroup
                    value={statusFilter}
                    exclusive
                    onChange={(_, val) => { if (val) setStatusFilter(val); }}
                    size="small"
                >
                    <ToggleButton value="all" sx={{ textTransform: "none", px: 2 }}>
                        Todos ({tableRows.length})
                    </ToggleButton>
                    <ToggleButton value="active" sx={{ textTransform: "none", px: 2 }}>
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", mr: 1 }} />
                        Activos ({activeCount})
                    </ToggleButton>
                    <ToggleButton value="inactive" sx={{ textTransform: "none", px: 2 }}>
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444", mr: 1 }} />
                        Inactivos ({inactiveCount})
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>

            <Paper
                elevation={0}
                sx={{
                    width: "100%",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 3,
                    overflow: "hidden",
                }}
            >
                <DataGrid
                    rows={filteredRows}
                    columns={combinedColumns}
                    initialState={{ pagination: { paginationModel } }}
                    pageSizeOptions={[5, 10, 20]}
                    sx={{
                        border: 0,
                        minHeight: 400,
                        "& .MuiDataGrid-columnHeaders": {
                            fontSize: 12,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                        },
                    }}
                    getRowId={(row) => row.id ?? ""}
                />
            </Paper>

            {selectedRow && (
                <EditarDialog<T>
                    open={open}
                    handleClose={() => setOpen(false)}
                    handleChange={handleChange}
                    rowData={selectedRow}
                    validationSchema={editValidationSchema}
                    endpoint={`${keyEndpoint}/${selectedRow.id}`}
                    method="PATCH"
                />
            )}

            {openCreate && (
                <EditarDialog<T>
                    open={openCreate}
                    handleClose={() => setOpenCreate(false)}
                    handleChange={handleChange}
                    endpoint={keyEndpoint + "/"}
                    validationSchema={newValidationSchema}
                    method="POST"
                />
            )}

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                entityName={deleteEntityName}
                isPending={mutation.isPending}
            />
        </Box>
    );
}
