import { GridCellParams, GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { CreateUser } from "../shared/api/types";
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { Button } from "@mui/material";
import SelectDivice from "../components/VincularDispositivoDialog";
import { useState } from "react";
import { generateValidationSchema } from "../shared/api/schemas/user";

// Uso de la función para crear cada esquema
const editValidationSchema = generateValidationSchema(false);
const newValidationSchema = generateValidationSchema(true);

const paginationModel = {
    page: 0,
    pageSize: 5,
};

interface AllUsers {
    Users: CreateUser[]; // Array de objetos CreateUserWithId
}

// Función para obtener los datos de la API
export default function Usuarios() {
    const { sessionCredentials } = useAuth();
    const [open, setOpen] = useState(false);
    const [id, setId] = useState("");
    const { data, isLoading, isError, error } = useGetQuery<AllUsers>(
        "users/get/",
        sessionCredentials!,
    );

    const handleOpen = (user: CreateUser) => {
        console.log(user);
        setId(user.id!);
        setOpen(true);
    };
    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "Name", headerName: "Nombre", width: 70 },
        { field: "LastName", headerName: "Apellido", width: 70 },
        { field: "UserName", headerName: "Nombre de usuario", width: 1 },
        { field: "Password", headerName: "Contraseña", width: 1 },
        { field: "Email", headerName: "Email", width: 70 },
        { field: "Tel", headerName: "Tel", width: 70 },
        {
            field: "vincular",
            headerName: "Vincular",
            width: 130,
            sortable: false,
            renderCell: (params: GridCellParams) => (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpen(params.row)}
                    sx={{ marginRight: "10px" }}
                >
                    Dispositivo
                </Button>
            ),
        },
    ];

    const handleClose = () => {
        setOpen(false);
    };

    if (isError) {
        return <p>Error: {error.message}</p>;
    }

    if (isLoading) {
        return <p>Cargando...</p>;
    }
    return (
        <>
            <Gestion<CreateUser>
                columns={columns}
                rows={data?.Users || []} // nombre de la propiedad
                paginationModel={paginationModel}
                title="Usuarios"
                editvalidationSchema={editValidationSchema}
                newvalidationSchema={newValidationSchema}
                keyEndpoint="users"
            />
            <SelectDivice open={open} handleClose={handleClose} id={id} />
        </>
    );
}
