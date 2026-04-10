import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./authContext";

interface ProtectedRouteProps {
    element: React.FC;
    requiredType?: "administrator" | "manager" | "user";
    requireMaster?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    element: Component,
    requiredType,
    requireMaster,
}) => {
    const { session } = useAuth();

    if (!session) {
        return <Navigate to="/login/admin-master" replace />;
    }

    if (requiredType && session.accountType !== requiredType) {
        return <Navigate to="/" replace />;
    }

    if (requireMaster && !session.isMaster) {
        return <Navigate to="/" replace />;
    }

    return <Component />;
};

export default ProtectedRoute;
