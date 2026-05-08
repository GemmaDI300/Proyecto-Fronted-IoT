import { useEffect } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from "../shared/auth/authContext";
import {
    Container,
    Typography,
    Box,
    Card,
    CardActionArea,
    CardContent,
    Grid,
    IconButton,
    Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ThermostatIcon from "@mui/icons-material/Thermostat";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";

interface ServiceCard {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    devices: string;
}

const services: ServiceCard[] = [
    {
        id: "monitoreo-ambiental",
        name: "Monitoreo Ambiental",
        description:
            "Temperatura, humedad y calidad del aire — sensores ambientales en tiempo real",
        icon: <ThermostatIcon sx={{ fontSize: 44 }} />,
        devices: "3 dispositivos",
    },
    {
        id: "control-industrial",
        name: "Control Industrial",
        description:
            "Actuadores, motores y cámaras — automatización y seguridad industrial",
        icon: <PrecisionManufacturingIcon sx={{ fontSize: 44 }} />,
        devices: "3 dispositivos",
    },
];

const PRIMARY = "#7c3aed";
const PRIMARY_LIGHT = "#ede9fe";

const LoginUsuarioServices = () => {
    const { session } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (session) navigate("/");
    }, [session, navigate]);

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                py: 4,
                position: "relative",
            }}
        >
            {/* Back to role selector */}
            <IconButton
                component={RouterLink}
                to="/login"
                sx={{
                    position: "absolute",
                    top: 24,
                    left: 24,
                    color: PRIMARY,
                    bgcolor: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    "&:hover": { bgcolor: PRIMARY_LIGHT },
                }}
            >
                <ArrowBackIcon />
            </IconButton>

            <Container maxWidth="sm">
                <Box textAlign="center" mb={4}>
                    {/* Icon */}
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: "50%",
                            bgcolor: PRIMARY_LIGHT,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            mx: "auto",
                            mb: 2,
                            boxShadow: `0 4px 16px ${PRIMARY}33`,
                        }}
                    >
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill={PRIMARY}
                        >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </Box>

                    <Typography
                        variant="h4"
                        sx={{ fontWeight: 800, color: "#1e293b" }}
                    >
                        IoT Platform
                    </Typography>
                    <Typography
                        variant="body2"
                        sx={{ color: "#64748b", mt: 0.5, mb: 1.5 }}
                    >
                        Plataforma de Gestión IoT Empresarial
                    </Typography>
                    <Chip
                        label="Usuario (User)"
                        sx={{
                            bgcolor: PRIMARY_LIGHT,
                            color: PRIMARY,
                            fontWeight: 700,
                            fontSize: 13,
                            mb: 2,
                            px: 1,
                        }}
                    />
                    <Typography
                        variant="body2"
                        sx={{ color: "#64748b", mt: 1 }}
                    >
                        Selecciona el servicio al que estás asignado
                    </Typography>
                </Box>

                <Grid container spacing={3} justifyContent="center">
                    {services.map((svc, idx) => (
                        <Grid item xs={12} sm={6} key={svc.id}>
                            <Card
                                elevation={0}
                                sx={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: 3,
                                    transition: "box-shadow 0.25s ease, border-color 0.25s ease",
                                    cursor: "pointer",
                                    animation: "fadeSlideUp 0.4s ease both",
                                    animationDelay: `${idx * 0.1}s`,
                                    "&:hover": {
                                        boxShadow: `0 8px 28px ${PRIMARY}28`,
                                        borderColor: PRIMARY,
                                    },
                                }}
                            >
                                <CardActionArea
                                    onClick={() =>
                                        navigate(`/login/usuario/${svc.id}`)
                                    }
                                    sx={{ p: 2 }}
                                >
                                    <CardContent
                                        sx={{ textAlign: "center", p: 1 }}
                                    >
                                        <Box
                                            sx={{
                                                width: 76,
                                                height: 76,
                                                borderRadius: "50%",
                                                bgcolor: PRIMARY_LIGHT,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                mx: "auto",
                                                mb: 2,
                                                color: PRIMARY,
                                            }}
                                        >
                                            {svc.icon}
                                        </Box>
                                        <Typography
                                            variant="h6"
                                            sx={{
                                                fontWeight: 700,
                                                color: PRIMARY,
                                                mb: 0.5,
                                                fontSize: "1rem",
                                            }}
                                        >
                                            {svc.name}
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: "#64748b",
                                                fontSize: 12,
                                                mb: 1,
                                                lineHeight: 1.5,
                                            }}
                                        >
                                            {svc.description}
                                        </Typography>
                                        <Chip
                                            label={svc.devices}
                                            size="small"
                                            sx={{
                                                bgcolor: "#f3f4f6",
                                                color: "#6b7280",
                                                fontSize: 11,
                                                fontWeight: 600,
                                            }}
                                        />
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Container>
        </Box>
    );
};

export default LoginUsuarioServices;
