import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

interface ProtectedRouteProps {
    element: React.FC;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    element: Component,
    ...rest
}) => {
    const { sessionCredentials } = useAuth();

    if (sessionCredentials) {
        return <Component {...rest} />;
    }

    return <Navigate to="/login" replace />;
};

export default ProtectedRoute;
