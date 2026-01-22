import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { loading } = useAuth();

    if (loading) {
        // You might want a better loading spinner here
        return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }

    // 개발 환경에서는 로그인 없이 바로 접근 허용
    if (import.meta.env.DEV) {
        return <>{children}</>;
    }

    // 프로덕션 환경에서는 로그인 체크
    const { user } = useAuth();
    if (!user) {
        toast.error("로그인이 필요합니다.", { duration: 2000 });
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
