import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, UserCircle, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
    const { user } = useAuth();
    // In a real app, this should be a role in the profiles table.
    // For now, we'll use a specific email or placeholder.
    const isMasterAdmin = user?.email === 'admin@vsleads.com' || user?.email?.includes('vaibhav');

    return (
        <div className="layout-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <div className="logo">CRM</div>
                </div>
                <nav className="sidebar-nav">
                    <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
                        <LayoutDashboard size={24} />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/crm" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={24} />
                        <span>CRM</span>
                    </NavLink>
                    <NavLink to="/builder" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                        <FileText size={24} />
                        <span>Forms</span>
                    </NavLink>

                    {isMasterAdmin && (
                        <NavLink to="/super-admin" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Shield size={24} />
                            <span>Admin</span>
                        </NavLink>
                    )}

                    <NavLink to="/profile" className={({ isActive }) => `nav-item profile-nav-item ${isActive ? 'active' : ''}`}>
                        <UserCircle size={24} />
                        <span>Profile</span>
                    </NavLink>
                </nav>
            </aside>
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
