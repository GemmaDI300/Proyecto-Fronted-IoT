import LoginBase from "../../components/LoginBase";

const LoginAdminNormal = () => (
    <LoginBase
        config={{
            badge: "Admin Normal",
            emailPlaceholder: "admin_normal@iot-platform.local",
            warning:
                "Acceso exclusivo para Administradores (no master). Sesión única: Solo una sesión activa permitida (409 Conflict si ya existe).",
            apiEndpoint: "auth-rc/admin/login",
            requiredAccountType: "administrator",
            requiredIsMaster: false,
            primary: "#0891b2",
            primaryDark: "#0e7490",
            primaryLight: "#cffafe",
            bgGradient:
                "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
        }}
    />
);

export default LoginAdminNormal;

