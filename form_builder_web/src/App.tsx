import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { BuilderProvider } from './contexts/BuilderContext';
import Layout from './components/Layout/Layout';
import FormEditor from './components/Builder/FormEditor';
import FormPublicView from './pages/FormPublicView';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Profile from './pages/Profile';
import PublicProfile from './pages/PublicProfile';
import Login from './pages/Login';
import Signup from './pages/Signup';

import SuperAdmin from './pages/SuperAdmin';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" />;

    return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/f/:formId" element={<FormPublicView />} />
            <Route path="/u/:username" element={<PublicProfile />} />

            {/* Protected App Routes */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="crm" element={<CRM />} />
                <Route path="builder" element={<FormEditor />} />
                <Route path="profile" element={<Profile />} />
                <Route path="super-admin" element={<SuperAdmin />} />
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BuilderProvider>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </BuilderProvider>
        </AuthProvider>
    );
};

export default App;
