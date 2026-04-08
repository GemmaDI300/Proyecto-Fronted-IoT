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
} from "@mui/material";

const Login = () => {
    const { login, sessionCredentials } = useAuth();
    const [username, setUsername] = useState<string>("");
    const [userPassword, setUserPassword] = useState<string>("");
    const navigate = useNavigate();
    const theme = useTheme();

    // Redirecciona si ya hay sesión iniciada
    useEffect(() => {
        if (sessionCredentials) {
            navigate("/");
        }
    }, [sessionCredentials, navigate]);

    const handleLogin = () => {
        login(username, userPassword);
    };

    return (
        <Container
            maxWidth="xs"
            sx={{
                minHeight: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: theme.palette.background.default,
                px: { xs: 2, sm: 4 },
            }}
        >
            <Box
                sx={{
                    width: "100%",
                    maxWidth: "400px",
                    p: { xs: 3, sm: 4, md: 5 },
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "16px",
                    boxShadow: theme.shadows[10],
                    bgcolor: "background.paper",
                    transition: "box-shadow 0.3s ease-in-out",
                    "&:hover": {
                        boxShadow: theme.shadows[15],
                    },
                }}
            >
                <Typography
                    variant="h4"
                    gutterBottom
                    align="center"
                    sx={{
                        fontWeight: "bold",
                        color: theme.palette.primary.main,
                        mb: 3,
                    }}
                >
                    Iniciar Sesión
                </Typography>
                <TextField
                    label="Usuario"
                    name="UserName"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                                borderColor: theme.palette.grey[400],
                            },
                            "&:hover fieldset": {
                                borderColor: theme.palette.primary.main,
                            },
                        },
                    }}
                />
                <TextField
                    label="Contraseña"
                    name="Password"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    fullWidth
                    margin="normal"
                    required
                    sx={{
                        "& .MuiOutlinedInput-root": {
                            "& fieldset": {
                                borderColor: theme.palette.grey[400],
                            },
                            "&:hover fieldset": {
                                borderColor: theme.palette.primary.main,
                            },
                        },
                    }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleLogin}
                    fullWidth
                    sx={{
                        mt: 3,
                        py: 1.5,
                        fontSize: "1rem",
                        fontWeight: "bold",
                        borderRadius: "8px",
                        transition: "transform 0.2s ease-in-out",
                        "&:hover": {
                            transform: "scale(1.05)",
                        },
                    }}
                >
                    Ingresar
                </Button>
            </Box>
        </Container>
    );
};

export default Login;
