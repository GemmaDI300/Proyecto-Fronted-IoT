import { useState } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Typography,
    Box,
    Alert,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface ConfirmDeleteDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    entityName: string;
    isPending?: boolean;
}

export default function ConfirmDeleteDialog({
    open,
    onClose,
    onConfirm,
    entityName,
    isPending = false,
}: ConfirmDeleteDialogProps) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState(false);

    const handleConfirm = () => {
        if (reason.trim().length < 3) {
            setError(true);
            return;
        }
        onConfirm(reason.trim());
        setReason("");
        setError(false);
    };

    const handleClose = () => {
        setReason("");
        setError(false);
        onClose();
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <WarningAmberIcon color="error" />
                <span>Confirmar eliminación</span>
            </DialogTitle>
            <DialogContent>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Esta acción no se puede deshacer.
                </Alert>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    ¿Está seguro que desea eliminar <strong>{entityName}</strong>?
                </Typography>
                <Box>
                    <TextField
                        label="Motivo de eliminación"
                        placeholder="Ingrese el motivo..."
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (e.target.value.trim().length >= 3) setError(false);
                        }}
                        error={error}
                        helperText={error ? "El motivo debe tener al menos 3 caracteres" : ""}
                        fullWidth
                        multiline
                        rows={2}
                        size="small"
                    />
                </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleClose} disabled={isPending}>
                    Cancelar
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleConfirm}
                    disabled={isPending}
                >
                    {isPending ? "Eliminando..." : "Eliminar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
