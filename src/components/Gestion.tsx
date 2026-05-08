import { DataGrid, GridCellParams, GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import EditarDialog, { FieldConfig } from "./EditarDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import DetalleDialog from "./DetalleDialog";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import * as Yup from "yup";
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from "react";
import { useDeleteByIdMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { useActivity } from "../shared/activity/activityContext";
import { GenericDataWithId } from "../shared/api/types";
import HistoryIcon from "@mui/icons-material/History";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LinkIcon from "@mui/icons-material/Link";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

// ── Error boundary local para aislar fallos del LinkPanel ─────────────────────
interface PanelEBState { hasError: boolean; message: string }
class LinkPanelErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, PanelEBState> {
    state: PanelEBState = { hasError: false, message: "" };
    static getDerivedStateFromError(error: Error): PanelEBState {
        return { hasError: true, message: error.message };
    }
    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[LinkPanel]", error, info.componentStack);
    }
    render() {
        if (this.state.hasError) {
            return (
                <Alert severity="error" sx={{ m: 1 }}
                    action={
                        <Button size="small" onClick={() => { this.setState({ hasError: false, message: "" }); this.props.onReset(); }}>
                            Cerrar
                        </Button>
                    }
                >
                    Error al cargar el panel de vínculos: {this.state.message}
                </Alert>
            );
        }
        return this.props.children;
    }
}

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
    selfId?: string;
    getEntityName?: (row: T) => string;
    defaultValues?: Partial<T>;
    fieldsConfig?: Partial<Record<string, FieldConfig>>;
    entityTypeLabel?: string;
    showDetail?: boolean;
    onCreateSuccess?: (row: T) => void;
    /** When provided, shows a "Vínculos" button that opens a dialog with this content for the selected row. */
    renderLinkPanel?: (row: T) => React.ReactNode;
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
    defaultValues,
    fieldsConfig,
    entityTypeLabel,
    showDetail = false,
    onCreateSuccess,
    renderLinkPanel,
}: GestionProps<T>) {
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<T | null>(null);
    const [openCreate, setOpenCreate] = useState(false);
    const [tableRows, setTableRows] = useState<T[]>(rows);
    const [deleteTarget, setDeleteTarget] = useState<T | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [detailRow, setDetailRow] = useState<T | null>(null);
    const [linkRow, setLinkRow] = useState<T | null>(null);

    const { session } = useAuth();
    const { addEvent } = useActivity();
    const mutation = useDeleteByIdMutation<T>(keyEndpoint, session!);

    const entityLabel = entityTypeLabel || title;

    const resolveEntityName = (row: T) =>
        getEntityName
            ? getEntityName(row)
            : ((row as Record<string, unknown>).name as string) ||
              ((row as Record<string, unknown>).first_name as string) ||
              ((row as Record<string, unknown>).title as string) ||
              `ID ${row.id}`;

    useEffect(() => {
        setTableRows(rows);
    }, [rows]);

    const handleClickOpen = (rowData: T) => {
        setSelectedRow(rowData);
        setOpen(true);
    };

    const handleRequestDelete = (row: T) => {
        setDeleteError(null);
        setDeleteTarget(row);
    };

    const handleConfirmDelete = (_reason: string) => {
        if (!deleteTarget?.id) return;
        const entityName = resolveEntityName(deleteTarget);
        mutation.mutate(deleteTarget.id, {
            onSuccess: () => {
                setTableRows((prev) => prev.filter((row) => row.id !== deleteTarget.id));
                setDeleteTarget(null);
                setDeleteError(null);
                addEvent("deleted", entityLabel, entityName);
            },
            onError: (error) => {
                setDeleteError((error as Error).message || "Error al eliminar");
            },
        });
    };

    const handleEditSuccess = (updatedRow: T) => {
        setTableRows((prev) => {
            const idx = prev.findIndex((row) => row.id === updatedRow.id);
            if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = updatedRow;
                return copy;
            }
            return [...prev, updatedRow];
        });
        addEvent("edited", entityLabel, resolveEntityName(updatedRow));
    };

    const handleCreateSuccess = (newRow: T) => {
        setTableRows((prev) => {
            const idx = prev.findIndex((row) => row.id === newRow.id);
            if (idx !== -1) return prev;
            return [...prev, newRow];
        });
        addEvent("created", entityLabel, resolveEntityName(newRow));
        onCreateSuccess?.(newRow);
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
        canEdit || canDelete || showDetail || renderLinkPanel
            ? [
                  {
                      field: "acciones",
                      headerName: "Acciones",
                      width: (showDetail ? 280 : 220) + (renderLinkPanel ? 110 : 0),
                      sortable: false,
                      renderCell: (params: GridCellParams) => {
                          const entityName = resolveEntityName(params.row);
                          const isSelf = !!selfId && params.row.id === selfId;
                          return (
                              <Box sx={{ display: "flex", gap: 1 }}>
                                  {renderLinkPanel && (
                                      <Button
                                          variant="outlined"
                                          size="small"
                                          startIcon={<LinkIcon />}
                                          onClick={() => setLinkRow(params.row)}
                                          aria-label={`Vincular ${entityLabel.toLowerCase()} ${entityName}`}
                                          sx={{ textTransform: "none", fontWeight: 600, cursor: "pointer" }}
                                      >
                                          Vínculos
                                      </Button>
                                  )}
                                  {showDetail && (
                                      <Button
                                          variant="outlined"
                                          size="small"
                                          startIcon={<InfoOutlinedIcon />}
                                          onClick={() => setDetailRow(params.row)}
                                          aria-label={`Ver detalles de ${entityName}`}
                                          sx={{ textTransform: "none", fontWeight: 600, cursor: "pointer" }}
                                      >
                                          Ver
                                      </Button>
                                  )}
                                  {canEdit && (
                                      <Button
                                          variant="outlined"
                                          size="small"
                                          onClick={() => handleClickOpen(params.row)}
                                          aria-label={`Editar ${entityLabel.toLowerCase()} ${entityName}`}
                                          sx={{ textTransform: "none", fontWeight: 600, cursor: "pointer" }}
                                      >
                                          Editar
                                      </Button>
                                  )}
                                  {canDelete && (
                                      <Button
                                          variant="outlined"
                                          color="error"
                                          size="small"
                                          disabled={isSelf}
                                          onClick={() => handleRequestDelete(params.row)}
                                          aria-label={isSelf ? `No puedes eliminar tu propia cuenta` : `Eliminar ${entityLabel.toLowerCase()} ${entityName}`}
                                          aria-disabled={isSelf}
                                          sx={{ textTransform: "none", fontWeight: 600, cursor: "pointer" }}
                                      >
                                          Eliminar
                                      </Button>
                                  )}
                              </Box>
                          );
                      },
                  },
              ]
            : [];

    const combinedColumns = [...columns, ...actionColumns];

    const deleteEntityName = deleteTarget ? resolveEntityName(deleteTarget) : "";

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
                            aria-label={`Crear nuevo ${entityLabel.toLowerCase()}`}
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                        >
                            Crear
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Filter bar */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <HistoryIcon fontSize="small" color="action" aria-hidden="true" />
                <Typography variant="body2" color="text.secondary" component="label" id="filter-label">
                    Filtrar:
                </Typography>
                <ToggleButtonGroup
                    value={statusFilter}
                    exclusive
                    onChange={(_, val) => { if (val) setStatusFilter(val); }}
                    size="small"
                    aria-labelledby="filter-label"
                    aria-label="Filtrar registros por estado"
                >
                    <ToggleButton 
                        value="all" 
                        sx={{ textTransform: "none", px: 2 }}
                        aria-label={`Mostrar todos los registros (${tableRows.length})`}
                    >
                        Todos ({tableRows.length})
                    </ToggleButton>
                    <ToggleButton 
                        value="active" 
                        sx={{ textTransform: "none", px: 2 }}
                        aria-label={`Mostrar solo activos (${activeCount})`}
                    >
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#10b981", mr: 1 }} aria-hidden="true" />
                        Activos ({activeCount})
                    </ToggleButton>
                    <ToggleButton 
                        value="inactive" 
                        sx={{ textTransform: "none", px: 2 }}
                        aria-label={`Mostrar solo inactivos (${inactiveCount})`}
                    >
                        <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#ef4444", mr: 1 }} aria-hidden="true" />
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
                    handleChange={handleEditSuccess}
                    rowData={selectedRow}
                    validationSchema={editValidationSchema}
                    endpoint={`${keyEndpoint}/${selectedRow.id}`}
                    method="PATCH"
                    fieldsConfig={fieldsConfig}
                />
            )}

            {openCreate && (
                <EditarDialog<T>
                    open={openCreate}
                    handleClose={() => setOpenCreate(false)}
                    handleChange={handleCreateSuccess}
                    endpoint={keyEndpoint + "/"}
                    validationSchema={newValidationSchema}
                    method="POST"
                    defaultValues={defaultValues}
                    fieldsConfig={fieldsConfig}
                />
            )}

            <ConfirmDeleteDialog
                open={!!deleteTarget}
                onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
                onConfirm={handleConfirmDelete}
                entityName={deleteEntityName}
                isPending={mutation.isPending}
                serverError={deleteError}
            />

            {showDetail && (
                <DetalleDialog<T>
                    open={!!detailRow}
                    onClose={() => setDetailRow(null)}
                    row={detailRow}
                    title={`Detalle — ${entityLabel}`}
                />
            )}

            {renderLinkPanel && linkRow && (
                <Dialog
                    open={!!linkRow}
                    onClose={() => setLinkRow(null)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>
                        Vínculos — {resolveEntityName(linkRow)}
                    </DialogTitle>
                    <DialogContent dividers>
                        <LinkPanelErrorBoundary onReset={() => setLinkRow(null)}>
                            {renderLinkPanel(linkRow)}
                        </LinkPanelErrorBoundary>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setLinkRow(null)} sx={{ textTransform: "none" }}>
                            Cerrar
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}

