import LoginBase from "../../components/LoginBase";

const LoginUsuarioControlIndustrial = () => (
    <LoginBase
        config={{
            badge: "Usuario (User)",
            serviceBadge: "Control Industrial",
            emailPlaceholder: "user1.ind@iot-platform.local",
            warning:
                "Acceso exclusivo para Usuarios. Sesión única: Solo una sesión activa permitida (409 Conflict). Usa POST /logout antes de reloguear.",
            apiEndpoint: "auth-rc/user/login",
            requiredAccountType: "user",
            primary: "#7c3aed",
            primaryDark: "#6d28d9",
            primaryLight: "#ede9fe",
            bgGradient:
                "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 50%, #ddd6fe 100%)",
        }}
    />
);

export default LoginUsuarioControlIndustrial;

