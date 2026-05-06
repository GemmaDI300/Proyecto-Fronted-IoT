import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Typography,
    InputAdornment,
    IconButton,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { useSendDataMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { GenericDataWithId } from "../shared/api/types";

export interface FieldConfig {
    type?: "text" | "password" | "date" | "select" | "number" | "boolean";
    hidden?: boolean;
    options?: Array<{ label: string; value: string | number | boolean }>;
    helperText?: string;
}

interface DialogComponentProps<T extends GenericDataWithId> {
    open: boolean;
    handleClose: () => void;
    handleChange: (updatedRow: T) => void;
    rowData?: T;
    validationSchema: Yup.ObjectSchema<Partial<Omit<T, "id">>>;
    endpoint: string;
    method: "POST" | "PATCH";
    defaultValues?: Partial<T>;
    fieldsConfig?: Partial<Record<string, FieldConfig>>;
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
    password: "Contraseña",
    curp: "CURP",
    rfc: "RFC",
    name: "Nombre",
    brand: "Marca",
    model: "Modelo",
    serial_number: "Número de serie",
    ip: "Dirección IP",
    mac: "Dirección MAC",
    // Service & Application
    description: "Descripción",
    administrator_id: "ID del administrador",
    version: "Versión",
    url: "URL",
    port: "Puerto",
    api_key: "API Key",
    is_active: "Estado",
    // Tickets
    title: "Título",
    user_role_id: "ID de rol de usuario",
    status_id: "ID de estado",
    service_id: "ID de servicio",
    priority: "Prioridad (low/medium/high/critical)",
    manager_service_id: "ID de manager-servicio",
};

// Fields considered sensitive personal data — shown masked by default in edit mode
const SENSITIVE_PERSONAL_KEYS = new Set([
    "email", "phone", "address", "city", "state",
    "postal_code", "birth_date", "curp", "rfc",
]);

export default function EditarDialog<T extends GenericDataWithId>({
    open,
    handleClose,
    handleChange,
    rowData,
    validationSchema,
    endpoint,
    method,
    defaultValues,
    fieldsConfig,
}: DialogComponentProps<T>) {
    const { session } = useAuth();
    const [apiError, setApiError] = useState<string | null>(null);
    const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());
    const toggleReveal = (fieldKey: string) => {
        setRevealedFields(prev => {
            const next = new Set(prev);
            if (next.has(fieldKey)) next.delete(fieldKey); else next.add(fieldKey);
            return next;
        });
    };
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
        : {
            ...Object.keys(validationSchema.fields).reduce((acc, key) => {
                (acc as Record<string, unknown>)[key] = "";
                return acc;
            }, {} as Partial<T>),
            ...(defaultValues || {}),
          };

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
                                const val = (values as Record<string, unknown>)[key];
                                const original = (rowData as Record<string, unknown>)[key];
                                if (val === original) return acc; // unchanged
                                if (val === "" || val === undefined) return acc; // skip empty
                                (acc as Record<string, unknown>)[key] = val;
                                return acc;
                            }, {} as Partial<T>);
                        } else {
                            // For POST: omit empty strings so optional fields use backend defaults
                            payload = Object.keys(values).reduce((acc, key) => {
                                const val = (values as Record<string, unknown>)[key];
                                if (val !== "") {
                                    (acc as Record<string, unknown>)[key] = val;
                                }
                                return acc;
                            }, {} as Partial<T>);
                        }
                        handleApiCall(payload);
                    }}
                >
                    {({ isSubmitting, errors, touched, handleChange: formikChange, handleBlur, values, setFieldValue }) => (
                        <Form>
                            {apiError && (
                                <Alert 
                                    severity="error" 
                                    sx={{ mb: 2 }} 
                                    onClose={() => setApiError(null)}
                                    role="alert"
                                    aria-live="assertive"
                                >
                                    <Typography variant="body2" fontWeight={600}>Error al guardar</Typography>
                                    <Typography variant="caption">{apiError}</Typography>
                                </Alert>
                            )}
                            {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
                                <Alert 
                                    severity="warning" 
                                    sx={{ mb: 2 }}
                                    role="alert"
                                    aria-live="polite"
                                >
                                    <Typography variant="caption">
                                        Por favor corrige los errores antes de continuar
                                    </Typography>
                                </Alert>
                            )}
                            {Object.keys(validationSchema.fields).map((key) => {
                                const fc = fieldsConfig?.[key];
                                // Skip hidden fields
                                if (fc?.hidden) return null;
                                // In edit mode, skip the password field (use change-password button)
                                if (!isCreate && key === "password") return null;

                                const fieldError =
                                    (touched as Record<string, boolean>)[key] &&
                                    (errors as Record<string, string>)[key];
                                const label = fieldLabels[key] || key;
                                const currentValue = (values as Record<string, unknown>)[key] ?? "";

                                // Auto-helperText for fields the API doesn't return in edit mode
                                const absentFromResponse =
                                    !isCreate &&
                                    rowData != null &&
                                    (rowData as Record<string, unknown>)[key] == null;
                                const autoHelperText = absentFromResponse
                                    ? "Dejar vacío para no modificar"
                                    : undefined;

                                // Boolean select (is_active) — stores boolean, renders as string internally
                                if (fc?.type === "boolean") {
                                    return (
                                        <FormControl
                                            key={key}
                                            fullWidth
                                            margin="normal"
                                            size="small"
                                            error={!!fieldError}
                                        >
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                name={key}
                                                value={String(currentValue)}
                                                onChange={(e) => setFieldValue(key, e.target.value === "true")}
                                                onBlur={handleBlur}
                                                label={label}
                                            >
                                                {fc.options?.map((opt) => (
                                                    <MenuItem key={String(opt.value)} value={String(opt.value)}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {(fieldError || fc.helperText) && (
                                                <FormHelperText>
                                                    {fieldError || fc.helperText}
                                                </FormHelperText>
                                            )}
                                        </FormControl>
                                    );
                                }

                                // Select field
                                if (fc?.type === "select") {
                                    return (
                                        <FormControl
                                            key={key}
                                            fullWidth
                                            margin="normal"
                                            size="small"
                                            error={!!fieldError}
                                        >
                                            <InputLabel>{label}</InputLabel>
                                            <Select
                                                name={key}
                                                value={currentValue}
                                                onChange={formikChange}
                                                onBlur={handleBlur}
                                                label={label}
                                            >
                                                {fc.options?.map((opt) => (
                                                    <MenuItem key={String(opt.value)} value={opt.value as string | number}>
                                                        {opt.label}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                            {(fieldError || fc.helperText || autoHelperText) && (
                                                <FormHelperText>
                                                    {fieldError || fc.helperText || autoHelperText}
                                                </FormHelperText>
                                            )}
                                        </FormControl>
                                    );
                                }

                                // All other fields (text, password, date, number)
                                const isSensitive = !isCreate && SENSITIVE_PERSONAL_KEYS.has(key);
                                const isRevealed = revealedFields.has(key);

                                let inputType: string;
                                if (key === "password") {
                                    inputType = "password";
                                } else if (isSensitive && !isRevealed) {
                                    inputType = "password"; // mask sensitive fields by default
                                } else if (key === "birth_date") {
                                    inputType = "date";
                                } else if (fc?.type === "number") {
                                    inputType = "number";
                                } else {
                                    inputType = "text";
                                }

                                return (
                                    <div key={key}>
                                        <TextField
                                            name={key}
                                            label={label}
                                            type={inputType}
                                            InputLabelProps={
                                                key === "birth_date" || (isSensitive && !isRevealed && absentFromResponse)
                                                    ? { shrink: true }
                                                    : undefined
                                            }
                                            InputProps={isSensitive ? {
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleReveal(key)}
                                                            edge="end"
                                                            aria-label={isRevealed ? `Ocultar ${label}` : `Mostrar ${label}`}
                                                            title={isRevealed ? "Ocultar" : "Mostrar dato"}
                                                            tabIndex={-1}
                                                        >
                                                            {isRevealed
                                                                ? <VisibilityOffIcon fontSize="small" />
                                                                : <VisibilityIcon fontSize="small" />
                                                            }
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            } : undefined}
                                            variant="outlined"
                                            fullWidth
                                            margin="normal"
                                            size="small"
                                            value={String(currentValue)}
                                            onChange={formikChange}
                                            onBlur={handleBlur}
                                            error={!!fieldError}
                                            helperText={fieldError || fc?.helperText || autoHelperText || ""}
                                            placeholder={isSensitive && !isRevealed && absentFromResponse ? "••••••••" : undefined}
                                        />
                                    </div>
                                );
                            })}
                            {!isCreate && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                                    Para cambiar la contraseña usa el icono 🔒 en la barra superior.
                                </Typography>
                            )}
                            <DialogActions>
                                <Button 
                                    onClick={handleClose}
                                    aria-label="Cancelar y cerrar el diálogo"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isSubmitting || mutation.isPending}
                                    aria-label={isCreate ? "Crear nuevo registro" : "Guardar cambios"}
                                    aria-disabled={isSubmitting || mutation.isPending}
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
