import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
} from "@mui/material";
import { Formik, Form, ErrorMessage } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { useSendDataMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { GenericDataWithId } from "../shared/api/types";

interface DialogComponentProps<T extends GenericDataWithId> {
    open: boolean;
    handleClose: () => void;
    handleChange: (updatedRow: T) => void;
    rowData?: T;
    validationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    endpoint: string;
    method: "POST" | "PATCH";
}

const fieldLabels: Record<string, string> = {
    first_name: "Nombre",
    last_name: "Apellido paterno",
    second_last_name: "Apellido materno",
    phone: "Teléfono",
    address: "Dirección",
    city: "Ciudad",
    state: "Estado",
    postal_code: "Código postal",
    birth_date: "Fecha de nacimiento",
    email: "Correo electrónico",
    password_hash: "Contraseña",
    curp: "CURP",
    rfc: "RFC",
    name: "Nombre",
    brand: "Marca",
    model: "Modelo",
    serial_number: "Número de serie",
    ip: "Dirección IP",
    mac: "Dirección MAC",
    location: "Ubicación",
};

export default function EditarDialog<T extends GenericDataWithId>({
    open,
    handleClose,
    handleChange,
    rowData,
    validationSchema,
    endpoint,
    method,
}: DialogComponentProps<T>) {
    const { session } = useAuth();
    const [apiError, setApiError] = useState<string | null>(null);
    const mutation = useSendDataMutation<Partial<T>, T>(
        endpoint,
        session!,
        method
    );

    const handleApiCall = (values: Partial<T>) => {
        setApiError(null);
        mutation.mutate(values, {
            onSuccess: (data: T) => {
                handleChange(data);
                handleClose();
            },
            onError: (error) => {
                console.error("Error en la operación:", error);
                setApiError(error instanceof Error ? error.message : "Error desconocido");
            },
        });
    };

    const initialValues: Partial<T> = rowData
        ? { ...rowData }
        : Object.keys(validationSchema.fields).reduce((acc, key) => {
              (acc as Record<string, unknown>)[key] = "";
              return acc;
          }, {} as Partial<T>);

    const isCreate = method === "POST";

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{isCreate ? "Crear nuevo" : "Editar información"}</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={initialValues}
                    validationSchema={validationSchema}
                    onSubmit={(values) => {
                        let payload: Partial<T>;
                        if (method === "PATCH" && rowData) {
                            payload = Object.keys(values).reduce((acc, key) => {
                                if (values[key] !== rowData[key]) {
                                    (acc as Record<string, unknown>)[key] = values[key];
                                }
                                return acc;
                            }, {} as Partial<T>);
                        } else {
                            payload = values;
                        }
                        handleApiCall(payload);
                    }}
                >
                    {({ isSubmitting, errors, touched, handleChange: formikChange, handleBlur, values }) => (
                        <Form>
                            {apiError && (
                                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setApiError(null)}>
                                    {apiError}
                                </Alert>
                            )}
                            {Object.keys(validationSchema.fields).map((key) => {
                                const fieldError = (touched as Record<string, boolean>)[key] && (errors as Record<string, string>)[key];
                                return (
                                    <div key={key}>
                                        <TextField
                                            name={key}
                                            label={fieldLabels[key] || key}
                                            type={key === "password_hash" ? "password" : key === "birth_date" ? "date" : "text"}
                                            InputLabelProps={key === "birth_date" ? { shrink: true } : undefined}
                                            variant="outlined"
                                            fullWidth
                                            margin="normal"
                                            size="small"
                                            value={(values as Record<string, string>)[key] ?? ""}
                                            onChange={formikChange}
                                            onBlur={handleBlur}
                                            error={!!fieldError}
                                            helperText={fieldError || ""}
                                        />
                                    </div>
                                );
                            })}
                            <DialogActions>
                                <Button onClick={handleClose}>Cancelar</Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isSubmitting || mutation.isPending}
                                >
                                    {isCreate ? "Crear" : "Guardar"}
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}
