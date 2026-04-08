import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
} from "@mui/material";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useSendDataMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { GenericDataWithId } from "../shared/types";

interface DialogComponentProps<T extends GenericDataWithId> {
    open: boolean;
    handleClose: () => void;
    handleChange: (upadateRows: T) => void;
    rowData?: T; // Hacer que rowData sea opcional
    validationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    endpoint: string; // Nuevo campo para el endpoint
    method: "POST" | "PUT";
}

export default function DialogComponent<T extends GenericDataWithId>({
    open,
    handleClose,
    handleChange,
    rowData,
    validationSchema,
    endpoint,
    method, // Desestructurar el nuevo endpoint
}: DialogComponentProps<T>) {
    // Función para manejar la llamada a la API
    const { sessionCredentials } = useAuth();
    const mutation = useSendDataMutation<Partial<T>, T>(
        endpoint,
        sessionCredentials!,
        method
    );

    const handleApiCall = (values: Partial<T>) => {
        if (method === "PUT") {
            values.id = rowData?.id;
        }
        mutation.mutate(values, {
            //MUTACION
            onSuccess: (data: T) => {
                handleChange(data);
            },
            onError: (error) => {
                console.error(`Error al eliminar la fila con ID: ${values.id}`, error);
            },
        });
    };

    // Generar valores iniciales basados en rowData o vacíos si no está presente
    const initialValues: Partial<T> = rowData
        ? { ...rowData }
        : Object.keys(validationSchema.fields).reduce((acc, key) => {
            (acc as Record<keyof T, any>)[key as keyof T] = "";
            return acc;
        }, {} as Partial<T>);

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            PaperProps={{
                style: {
                    width: "500px", // Cambia el ancho según lo necesites
                    maxWidth: "90%", // Ancho máximo en porcentaje
                },
            }}
        >
            <DialogTitle>Editar Información</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={initialValues} // Usar valores iniciales generados
                    validationSchema={validationSchema}
                    onSubmit={(values) => {
                        const modifiedFields =
                            method === "PUT"
                                ? Object.keys(values).reduce((acc, key) => {
                                    if (rowData && values[key] !== rowData[key]) {
                                        (acc as Record<keyof T, any>)[key as keyof T] = values[key];
                                    }
                                    return acc;
                                }, {} as Partial<T>)
                                : values; // En POST, enviar todos los valores.
                        handleApiCall(modifiedFields);
                        handleClose();
                    }}
                >
                    {({ isSubmitting }) => (
                        <Form>
                            {Object.keys(validationSchema.fields).map((key) => (
                                <div key={key}>
                                    <Field
                                        as={TextField}
                                        name={key}
                                        label={key.charAt(0).toUpperCase() + key.slice(1)}
                                        variant="outlined"
                                        fullWidth
                                        margin="normal"
                                        helperText={<ErrorMessage name={key} />}
                                    />
                                </div>
                            ))}
                            <DialogActions>
                                <Button onClick={handleClose} color="primary">
                                    Cancelar
                                </Button>
                                <Button type="submit" color="primary" disabled={isSubmitting}>
                                    Guardar
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}
