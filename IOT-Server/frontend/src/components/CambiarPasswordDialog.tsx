import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Alert,
    Typography,
    Box,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { useSendDataMutation } from "../shared/api/functions";
import { useAuth } from "../shared/auth/authContext";
import { validatePasswordStrength } from "../shared/api/schemas/validation";

const schema = Yup.object({
    current_password: Yup.string()
        .min(8, "Mínimo 8 caracteres")
        .required("Campo obligatorio"),
    new_password: Yup.string()
        .min(8, "Mínimo 8 caracteres")
        .max(128, "Máximo 128 caracteres")
        .test(
            "strong-password",
            "La contraseña debe contener mayúscula, minúscula, número y carácter especial (!@#$%^&*)",
            (value) => {
                if (!value) return true;
                return validatePasswordStrength(value);
            }
        )
        .required("Campo obligatorio"),
    confirm_password: Yup.string()
        .oneOf([Yup.ref("new_password")], "Las contraseñas no coinciden")
        .required("Confirma la nueva contraseña"),
});

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function CambiarPasswordDialog({ open, onClose }: Props) {
    const { session } = useAuth();
    const [apiError, setApiError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const mutation = useSendDataMutation<
        { current_password: string; new_password: string },
        { message: string }
    >("auth/change-password", session!, "PATCH");

    const handleClose = () => {
        setApiError(null);
        setSuccess(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <LockOutlinedIcon fontSize="small" />
                    Cambiar contraseña
                </Box>
            </DialogTitle>
            <DialogContent>
                {success ? (
                    <>
                        <Alert severity="success" sx={{ mt: 1 }}>
                            Contraseña actualizada correctamente.
                        </Alert>
                        <DialogActions sx={{ px: 0, pt: 2, pb: 0 }}>
                            <Button onClick={handleClose} variant="contained">
                                Cerrar
                            </Button>
                        </DialogActions>
                    </>
                ) : (
                    <Formik
                        initialValues={{
                            current_password: "",
                            new_password: "",
                            confirm_password: "",
                        }}
                        validationSchema={schema}
                        onSubmit={(values, { setSubmitting, resetForm }) => {
                            setApiError(null);
                            mutation.mutate(
                                {
                                    current_password: values.current_password,
                                    new_password: values.new_password,
                                },
                                {
                                    onSuccess: () => {
                                        setSuccess(true);
                                        resetForm();
                                        setSubmitting(false);
                                    },
                                    onError: (err) => {
                                        setApiError(
                                            err instanceof Error
                                                ? err.message
                                                : "Error al cambiar contraseña"
                                        );
                                        setSubmitting(false);
                                    },
                                }
                            );
                        }}
                    >
                        {({ isSubmitting, errors, touched, values, handleChange, handleBlur }) => (
                            <Form>
                                {apiError && (
                                    <Alert
                                        severity="error"
                                        sx={{ mb: 1 }}
                                        onClose={() => setApiError(null)}
                                    >
                                        {apiError}
                                    </Alert>
                                )}
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 1, mt: 1 }}
                                >
                                    Ingresa tu contraseña actual para confirmar tu identidad.
                                </Typography>
                                <TextField
                                    name="current_password"
                                    label="Contraseña actual"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    size="small"
                                    value={values.current_password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.current_password && !!errors.current_password}
                                    helperText={touched.current_password && errors.current_password}
                                />
                                <TextField
                                    name="new_password"
                                    label="Nueva contraseña"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    size="small"
                                    value={values.new_password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.new_password && !!errors.new_password}
                                    helperText={touched.new_password && errors.new_password}
                                />
                                <TextField
                                    name="confirm_password"
                                    label="Confirmar nueva contraseña"
                                    type="password"
                                    fullWidth
                                    margin="normal"
                                    size="small"
                                    value={values.confirm_password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    error={touched.confirm_password && !!errors.confirm_password}
                                    helperText={
                                        touched.confirm_password && errors.confirm_password
                                    }
                                />
                                <DialogActions sx={{ px: 0, pb: 0, pt: 1 }}>
                                    <Button onClick={handleClose}>Cancelar</Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={isSubmitting || mutation.isPending}
                                    >
                                        Cambiar contraseña
                                    </Button>
                                </DialogActions>
                            </Form>
                        )}
                    </Formik>
                )}
            </DialogContent>
        </Dialog>
    );
}
