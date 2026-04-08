import { GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { CreateUser } from "../shared/api/types"; // Assuming CreateAdmin is defined similarly to CreateUser
import { useGetQuery } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { generateValidationSchema } from "../shared/api/schemas/user";

// Uso de la función para crear cada esquema
const editValidationSchema = generateValidationSchema(false);
const newValidationSchema = generateValidationSchema(true);

const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "Name", headerName: "Nombre", width: 70 },
    { field: "LastName", headerName: "Apellido", width: 70 },
    { field: "UserName", headerName: "Nombre de usuario", width: 1 },
    { field: "Password", headerName: "Contraseña", width: 1 },
    { field: "Email", headerName: "Email", width: 70 },
    { field: "Tel", headerName: "Tel", width: 70 },
];

interface AllAdmins {
    Admins: CreateUser[]; // Array de objetos CreateUserWithId
}
const paginationModel = {
    page: 0,
    pageSize: 5,
};

export default function Administradores() {
    const { sessionCredentials } = useAuth();
    const { data, isLoading, isError, error } = useGetQuery<AllAdmins>(
        "admins/get/",
        sessionCredentials!,
    );

    if (isError) {
        return <p>Error: {error.message}</p>;
    }

    if (isLoading) {
        return <p>Cargando...</p>;
    }
    return (
        <>
            <Gestion<CreateUser>
                keyEndpoint="admins"
                columns={columns}
                rows={data?.Admins || ({} as CreateUser[])} // nombre de la propiedad
                paginationModel={paginationModel}
                title="Administradores" // Título actualizado
                editvalidationSchema={editValidationSchema}
                newvalidationSchema={newValidationSchema}
            />
        </>
    );
}
