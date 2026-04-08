import { useAuth } from "../shared/auth/authContext";
import { useState } from "react";
import { useSendDataMutation, useGetQuery } from "../shared/api/functions";
import { VincularDispositivo, CreateDevice } from "../shared/api/types";
import {
    Button,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
} from "@mui/material";

interface AllDevices {
    Devices: CreateDevice[]; // Array de objetos CreateDeviceWithId
}

interface DeviceTableProps {
    open: boolean; // Propiedad para manejar la apertura del diálogo
    handleClose: () => void; // Propiedad para manejar el cierre del diálogo
    id: string;
}

export default function SelectDevice({
    open,
    handleClose,
    id,
}: DeviceTableProps) {
    const { sessionCredentials } = useAuth();
    const { data, isLoading, error } = useGetQuery<AllDevices>(
        "devices/unvinculated/",
        sessionCredentials!,
    );

    // FIXME: cambiar el end poit de la API
    const mutation = useSendDataMutation<VincularDispositivo, VincularDispositivo>(
        "devices/vinculate/",
        sessionCredentials!,
        "PUT"
    );

    const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null); // Estado para almacenar el ID del dispositivo seleccionado

    if (isLoading) {
        return <p>Cargando...</p>;
    }

    if (error) {
        return <p>Error al cargar los dispositivos.</p>;
    }

    const handleSave = () => {
        if (selectedDeviceId) {
            const data: VincularDispositivo = {
                id: id,
                id_device: selectedDeviceId,
            };

            mutation.mutate(data);
            console.log(id, selectedDeviceId); // Llamar al callback de guardado con el ID del dispositivo seleccionado
            handleClose(); // Cerrar el diálogo después de guardar
        }
    };

    return (
        <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Seleccionar Dispositivo</DialogTitle>
            <DialogContent>
                <FormControl fullWidth>
                    <InputLabel id="select-device-label">Dispositivo</InputLabel>
                    <Select
                        labelId="simple-select-device-label"
                        id="simple-select-device"
                        value={selectedDeviceId}
                        label="Dispositivo"
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                        {data?.Devices.map((device) => (
                            <MenuItem key={device.id} value={device.id}>
                                {device.UserName}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="primary">
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    color="primary"
                    disabled={!selectedDeviceId}
                >
                    Guardar
                </Button>
            </DialogActions>
        </Dialog>
    );

}
