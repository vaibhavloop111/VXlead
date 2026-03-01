import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    Users, Shield, ShieldOff, Key, Plus, Trash2,
    Check, X, AlertCircle, Loader2, Search
} from 'lucide-react';
import './SuperAdmin.css';

interface Profile {
    user_id: string;
    username: string;
    full_name: string;
    is_blocked: boolean;
    created_at: string;
}

interface AccessCode {
    id: string;
    code: string;
    created_at: string;
}

interface SystemStats {
    totalUsers: number;
    totalLeads: number;
    totalForms: number;
    activeCodes: number;
}

const SuperAdmin: React.FC = () => {
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState<SystemStats>({ totalUsers: 0, totalLeads: 0, totalForms: 0, activeCodes: 0 });
    const [newCode, setNewCode] = useState('');
    const [isAddingCode, setIsAddingCode] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profilesRes, codesRes, leadsCount, formsCount] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('access_codes').select('*').order('created_at', { ascending: false }),
                supabase.from('leads').select('*', { count: 'exact', head: true }),
                supabase.from('forms').select('*', { count: 'exact', head: true })
            ]);

            if (profilesRes.error) throw profilesRes.error;
            if (codesRes.error) throw codesRes.error;

            setProfiles(profilesRes.data || []);
            setAccessCodes(codesRes.data || []);
            setStats({
                totalUsers: profilesRes.data?.length || 0,
                totalLeads: leadsCount.count || 0,
                totalForms: formsCount.count || 0,
                activeCodes: codesRes.data?.length || 0
            });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlockUser = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_blocked: !currentStatus })
                .eq('user_id', userId);

            if (error) throw error;
            setProfiles(profiles.map(p => p.user_id === userId ? { ...p, is_blocked: !currentStatus } : p));
        } catch (err: any) {
            alert('Error updating user: ' + err.message);
        }
    };

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = 'VS-';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewCode(result);
    };

    const handleAddCode = async () => {
        if (!newCode.trim()) return;
        try {
            const { data, error } = await supabase
                .from('access_codes')
                .insert([{ code: newCode.trim().toUpperCase() }])
                .select();

            if (error) throw error;
            setAccessCodes([data[0], ...accessCodes]);
            setNewCode('');
            setIsAddingCode(false);
        } catch (err: any) {
            alert('Error adding code: ' + err.message);
        }
    };

    const handleDeleteCode = async (id: string) => {
        if (!confirm('Are you sure you want to delete this access code?')) return;
        try {
            const { error } = await supabase
                .from('access_codes')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAccessCodes(accessCodes.filter(c => c.id !== id));
        } catch (err: any) {
            alert('Error deleting code: ' + err.message);
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="super-loading"><Loader2 className="spinner" /> Loading Control Panel...</div>;

    return (
        <div className="super-admin-page">
            <header className="super-header">
                <div>
                    <h1>Super Admin Panel</h1>
                    <p>System-wide user and security management</p>
                </div>
            </header>

            {/* Stats Overview */}
            <div className="super-stats-grid">
                <div className="super-stat-card">
                    <Users size={24} />
                    <div className="stat-info">
                        <span className="stat-label">Total Users</span>
                        <span className="stat-value">{stats.totalUsers}</span>
                    </div>
                </div>
                <div className="super-stat-card">
                    <Shield size={24} />
                    <div className="stat-info">
                        <span className="stat-label">Total Leads</span>
                        <span className="stat-value">{stats.totalLeads}</span>
                    </div>
                </div>
                <div className="super-stat-card">
                    <Key size={24} />
                    <div className="stat-info">
                        <span className="stat-label">Total Forms</span>
                        <span className="stat-value">{stats.totalForms}</span>
                    </div>
                </div>
                <div className="super-stat-card">
                    <Check size={24} />
                    <div className="stat-info">
                        <span className="stat-label">Active Codes</span>
                        <span className="stat-value">{stats.activeCodes}</span>
                    </div>
                </div>
            </div>

            <div className="super-grid">
                {/* User Management */}
                <section className="super-section">
                    <div className="section-header">
                        <div className="title-area">
                            <Users size={20} />
                            <h2>User Management ({profiles.length})</h2>
                        </div>
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="user-list">
                        {filteredProfiles.length > 0 ? filteredProfiles.map(p => (
                            <div key={p.user_id} className={`user-row ${p.is_blocked ? 'blocked' : ''}`}>
                                <div className="user-info">
                                    <span className="user-name">{p.full_name || 'Unnamed User'}</span>
                                    <span className="user-handle">@{p.username || 'no-handle'}</span>
                                </div>
                                <div className="user-actions">
                                    <button
                                        className={`block-btn ${p.is_blocked ? 'unblock' : 'block'}`}
                                        onClick={() => toggleBlockUser(p.user_id, p.is_blocked)}
                                    >
                                        {p.is_blocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                                        {p.is_blocked ? 'Unblock' : 'Block User'}
                                    </button>
                                </div>
                            </div>
                        )) : (
                            <div className="empty-state">No users matching search</div>
                        )}
                    </div>
                </section>

                {/* Access Code Management */}
                <section className="super-section">
                    <div className="section-header">
                        <div className="title-area">
                            <Key size={20} />
                            <h2>Access Codes</h2>
                        </div>
                        <button className="add-code-btn" onClick={() => setIsAddingCode(true)}>
                            <Plus size={16} /> New Code
                        </button>
                    </div>

                    {isAddingCode && (
                        <div className="code-input-overlay">
                            <div className="code-input-card">
                                <h3>Create New Access Code</h3>
                                <div className="code-input-group">
                                    <input
                                        type="text"
                                        placeholder="e.g. VIP-2025"
                                        value={newCode}
                                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                        autoFocus
                                    />
                                    <button className="gen-btn" onClick={generateRandomCode}>
                                        Generate
                                    </button>
                                </div>
                                <div className="code-input-actions">
                                    <button className="cancel" onClick={() => setIsAddingCode(false)}>Cancel</button>
                                    <button className="confirm" onClick={handleAddCode}>Create Code</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="code-list">
                        {accessCodes.map(c => (
                            <div key={c.id} className="code-row">
                                <div className="code-val">
                                    <span className="code-text">{c.code}</span>
                                    <span className="code-date">Created {new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <button className="delete-btn" onClick={() => handleDeleteCode(c.id)}>
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            {error && (
                <div className="super-error-toast">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X size={14} /></button>
                </div>
            )}
        </div>
    );
};

export default SuperAdmin;
