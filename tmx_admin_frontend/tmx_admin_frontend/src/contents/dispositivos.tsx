import { GridCellParams, GridColDef } from "@mui/x-data-grid";
import Gestion from "../components/Gestion";
import { CreateDevice } from "../shared/api/types"; // Importar la interfaz CreateDevice
import { useGetQuery } from "../shared/api/functions";
import * as Yup from "yup";
import { useAuth } from "../shared/auth/authContext";
import { Button } from "@mui/material";

const generateValidationSchema = (isRequired = false) => {
    return Yup.object().shape({
        Type: Yup.string()
            //.oneOf(
            //["vehiculo"], // cambiar por los tipos de izaac
            //"El campo Type debe ser vehiculo'"
            //)
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Type es obligatorio"),
                otherwise: (schema) => schema.optional(),
            }),

        UserName: Yup.string()
            .min(4, "El nombre de usuario debe tener al menos 4 caracteres")
            .max(20, "El nombre de usuario no puede tener más de 20 caracteres")
            .matches(
                /^[a-zA-Z0-9_.-]*$/,
                "El nombre de usuario solo puede contener letras, números, puntos y guiones"
            )
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo UserName es obligatorio"),
                otherwise: (schema) => schema.optional(),
            }),

        Password: Yup.string()
            .min(8, "La contraseña debe tener al menos 8 caracteres")
            .max(100, "La contraseña no puede tener más de 100 caracteres")
            .matches(
                /[A-Z]/,
                "La contraseña debe contener al menos una letra mayúscula"
            )
            .matches(
                /[a-z]/,
                "La contraseña debe contener al menos una letra minúscula"
            )
            .matches(/[0-9]/, "La contraseña debe contener al menos un número")
            .matches(
                /[@$!%*?&]/,
                "La contraseña debe contener al menos un carácter especial (@, $, !, %, *, ?, &)"
            )
            .when([], {
                is: () => isRequired,
                then: (schema) => schema.required("El campo Password es obligatorio"),
                otherwise: (schema) => schema.optional(),
            }),

        Propierty: Yup.string()
            .min(3, "El campo Propierty debe tener al menos 3 caracteres")
            .max(50, "El campo Propierty no puede tener más de 50 caracteres")
            .optional(),
    });
};

// Esquema de validación para edición (campos opcionales)
const editValidationSchema = generateValidationSchema(false);

// Esquema de validación para creación (campos requeridos)
const newValidationSchema = generateValidationSchema(true);

// Estado para el modelo de paginación
const paginationModel = {
    page: 0,
    pageSize: 5,
};

interface AllDevices {
    Devices: CreateDevice[]; // Array de objetos CreateDeviceWithId
}

export default function Dispositivos() {
    const { sessionCredentials } = useAuth();
    const { data, isLoading, isError, error } = useGetQuery<AllDevices>(
        "devices/get/",
        sessionCredentials!,
    );
    const handleDesvincular = async (id: string) => {
        console.log("ID:", id);
        // try {
        //   // Hacemos la llamada a la API usando fetch
        //   const response = await fetch(`http://192.168.62.96:5007/devices/devinculate/${id}`, {
        //     method: 'GET',
        //     headers: {
        //       "X-Session": sessionCredentials!.ID_Session,
        //     },
        //   });
        //   const data = await response.json();
        //   console.log("Dispositivo desvinculado:", data);
        // } catch (err) {
        //   console.error("Error al desvincular el dispositivo:", err);
        // }
        // const devinculateFn = Get<AllDevices>(`devices/devinculate/${id}`, sessionCredentials!);
        // await devinculateFn()
    };

    // Definir las columnas para el DataGrid
    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 70 },
        { field: "Type", headerName: "Tipo", width: 70 },
        { field: "UserName", headerName: "Nombre de usuario", width: 70 },
        { field: "Password", headerName: "Contraseña", width: 70 },
        { field: "Propierty", headerName: "Propiedad", width: 70 },
        {
            field: "Desvincular",
            headerName: "Desvincular",
            width: 130,
            sortable: false,
            renderCell: (params: GridCellParams) => (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleDesvincular(params.row.id)}
                    sx={{ marginRight: "10px" }}
                >
                    Desvincular
                </Button>
            ),
        },
    ];

    if (isError) {
        return <p>Error: {error.message}</p>;
    }

    if (isLoading) {
        return <p>Cargando...</p>;
    }

    return (
        <>
            <Gestion<CreateDevice>
                keyEndpoint="devices"
                columns={columns}
                rows={data?.Devices || ({} as CreateDevice[])} // nombre de la propiedad
                paginationModel={paginationModel}
                title="Dispositivos" // Título
                editvalidationSchema={editValidationSchema}
                newvalidationSchema={newValidationSchema}
            />
        </>
    );
}
