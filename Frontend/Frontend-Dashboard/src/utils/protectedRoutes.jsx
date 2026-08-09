import React, { useContext } from 'react'; 
import { Navigate } from 'react-router-dom';
import { UserContext } from '../global/UserContext';
import UnauthorizedPage from '../pages/unauthorized/UnauthorizedPage';

const ProtectedRoutes = ({ children, allowRoles, redirectPath = '/auth/login' }) => {
    const { user, loading } = useContext(UserContext);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to={redirectPath} replace />;
    }

    if (allowRoles && allowRoles.length > 0) {

        const hasRole = allowRoles.includes(user.role); 
        
        if (!hasRole) {
            return <UnauthorizedPage />;
        }
    }

    return children;
};

export default ProtectedRoutes;