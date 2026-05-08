import LoginBase from "../../components/LoginBase";

const LoginAdminMaster = () => (
    <LoginBase
        config={{
            badge: "Admin Master",
            emailPlaceholder: "admin@iot-platform.local",
            warning:
                "Acceso exclusivo para Administradores Master. Política de sesión única: Solo una sesión activa permitida. Si hay sesión activa, recibirás error 409.",
            apiEndpoint: "auth-rc/master/login",
            requiredAccountType: "administrator",
            requiredIsMaster: true,
            primary: "#2563eb",
            primaryDark: "#1d4ed8",
            primaryLight: "#dbeafe",
            bgGradient:
                "linear-gradient(135deg, #f0f4ff 0%, #e0eaff 50%, #dbeafe 100%)",
        }}
    />
);

export default LoginAdminMaster;

