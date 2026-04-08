import { useEffect, useState } from "react";
import { useAuth } from "../shared/auth/authContext";
import { useNavigate } from "react-router-dom";
import {
    Container,
    Typography,
    Button,
    Box,
    TextField,
    useTheme,
    Alert,
    CircularProgress,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const Login = () => {
    const { login, session, loginError, isLoggingIn } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        if (session) {
            navigate("/");
        }
    }, [session, navigate]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim() && password.trim()) {
            login(email.trim(), password);
        }
    };

    return (
        <Container
            maxWidth="xs"
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.main} 100%)`,
                px: { xs: 2, sm: 4 },
            }}
        >
            <Box
                component="form"
                onSubmit={handleLogin}
                sx={{
                    width: "100%",
                    maxWidth: 420,
                    p: { xs: 3, sm: 4, md: 5 },
                    borderRadius: 4,
                    boxShadow: theme.shadows[20],
                    bgcolor: "background.paper",
                    textAlign: "center",
                }}
            >
                <Box
                    sx={{
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        bgcolor: theme.palette.primary.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 2,
                    }}
                >
                    <LockOutlinedIcon sx={{ fontSize: 32, color: "#fff" }} />
                </Box>

                <Typography
                    variant="h4"
                    gutterBottom
                    sx={{ fontWeight: "bold", color: theme.palette.primary.main }}
                >
                    IoT Server
                </Typography>
                <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
                    Panel de Administración
                </Typography>

                {loginError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {loginError}
                    </Alert>
                )}

                <TextField
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    autoComplete="email"
                    autoFocus
                />
                <TextField
                    label="Contraseña"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    autoComplete="current-password"
                />
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                    disabled={isLoggingIn}
                    sx={{
                        mt: 3,
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: "bold",
                        borderRadius: 2,
                    }}
                >
                    {isLoggingIn ? <CircularProgress size={24} color="inherit" /> : "Ingresar"}
                </Button>
            </Box>
        </Container>
    );
};

export default Login;
