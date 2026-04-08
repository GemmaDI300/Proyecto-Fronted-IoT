import { DataGrid, GridCellParams, GridColDef } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import DialogComponent from "./EditarDialog";
import Box from "@mui/material/Box";
import * as Yup from "yup";
import { useState, useEffect } from "react";
import { useDeleteByIdMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { GenericDataWithId } from "../shared/types";

interface GestionProps<T extends GenericDataWithId> {
    columns: GridColDef[];
    rows: T[];
    paginationModel: { page: number; pageSize: number };
    title: string;
    editvalidationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    newvalidationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    keyEndpoint: string;
}

export default function Gestion<T extends GenericDataWithId>({
    columns,
    rows,
    paginationModel,
    title,
    editvalidationSchema,
    newvalidationSchema,
    keyEndpoint,
}: GestionProps<T>) {
    const [open, setOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState<T | null>(null);
    const [openCreate, setOpenCreate] = useState<boolean>(false);
    const [tableRows, setTableRows] = useState<T[]>(rows);

    const { sessionCredentials } = useAuth();
    const mutation = useDeleteByIdMutation<T>(
        `${keyEndpoint}/delete`,
        sessionCredentials!
    );

    // Efecto para sincronizar tableRows con las filas recibidas por las props
    useEffect(() => {
        setTableRows(rows);
    }, [rows]);

    const handleClickOpen = (rowData: T) => {
        setSelectedRow(rowData);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleDelete = (id: string) => {
        mutation.mutate(id, {
            onSuccess: () => {
                setTableRows((prevRows) => prevRows.filter((row) => row.id !== id));
            },
            onError: (error) => {
                console.error(`Error al eliminar la fila con ID: ${id}`, error);
            },
        });
    };
    const handleChange = (updatedRow: T) => {
        setTableRows((prevRows) => {
            // Verificar si la fila con el ID ya existe
            const existingRowIndex = prevRows.findIndex(
                (row) => row.id === updatedRow.id
            );

            if (existingRowIndex !== -1) {
                // Si existe, reemplazarla con updatedRow
                const updatedRows = [...prevRows];
                updatedRows[existingRowIndex] = updatedRow;
                return updatedRows;
            } else {
                // Si no existe, agregar updatedRow
                return [...prevRows, updatedRow];
            }
        });
    };

    // Función para actualizar las filas después de crear un nuevo elemento
    const handleCreateClose = () => {
        setOpenCreate(false);
    };

    const editar: GridColDef[] = [
        {
            field: "acciones",
            headerName: "Acciones",
            width: 250,
            sortable: false,
            renderCell: (params: GridCellParams) => (
                <Box>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={() => handleClickOpen(params.row)}
                        sx={{ marginRight: "10px" }}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleDelete(params.row.id)}
                    >
                        Eliminar
                    </Button>
                </Box>
            ),
        },
    ];

    const combinedColumns = [...columns, ...editar];

    return (
        <div>
            <h1>{title}</h1>
            <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
                <Button
                    variant="contained"
                    color="success"
                    onClick={() => setOpenCreate(true)}
                >
                    Crear
                </Button>
            </Box>
            <Paper sx={{ height: 400, width: "100%" }}>
                <DataGrid
                    rows={tableRows}
                    columns={combinedColumns}
                    initialState={{ pagination: { paginationModel } }}
                    pageSizeOptions={[5, 10]}
                    sx={{ border: 0 }}
                />
            </Paper>

            {selectedRow && (
                <DialogComponent<T>
                    open={open}
                    handleClose={handleClose}
                    handleChange={handleChange}
                    rowData={selectedRow}
                    validationSchema={editvalidationSchema}
                    endpoint={`${keyEndpoint}/update/`}
                    method="PUT"
                />
            )}

            {openCreate && (
                <DialogComponent<T>
                    open={openCreate}
                    handleClose={handleCreateClose}
                    handleChange={handleChange}
                    endpoint={`${keyEndpoint}/create/`}
                    validationSchema={newvalidationSchema}
                    method="POST"
                />
            )}
        </div>
    );
}
