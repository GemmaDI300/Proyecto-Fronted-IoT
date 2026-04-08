import LoginBase from "../../components/LoginBase";

const LoginAdminNormal = () => (
    <LoginBase
        config={{
            badge: "Admin Normal",
            emailPlaceholder: "admin_normal@iot-platform.local",
            warning:
                "Sesión única: Solo una sesión activa permitida (409 Conflict si ya existe).",
            apiEndpoint: "auth/login",
            primary: "#0891b2",
            primaryDark: "#0e7490",
            primaryLight: "#cffafe",
            bgGradient:
                "linear-gradient(135deg, #ecfeff 0%, #cffafe 50%, #a5f3fc 100%)",
        }}
    />
);

export default LoginAdminNormal;
