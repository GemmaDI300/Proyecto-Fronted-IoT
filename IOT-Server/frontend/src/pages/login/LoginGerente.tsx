import LoginBase from "../../components/LoginBase";

const LoginGerente = () => (
    <LoginBase
        config={{
            badge: "Gerente (Manager)",
            emailPlaceholder: "gerente@iot-platform.local",
            warning:
                "Sesión única: Solo una sesión activa permitida (409 Conflict). Usa POST /logout antes de reloguear.",
            apiEndpoint: "auth/login",
            primary: "#059669",
            primaryDark: "#047857",
            primaryLight: "#d1fae5",
            bgGradient:
                "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 50%, #a7f3d0 100%)",
        }}
    />
);

export default LoginGerente;
