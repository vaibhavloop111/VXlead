import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
    Users, ChevronRight, ExternalLink, Edit3,
    Loader2, MessageCircle, Smartphone, Download,
    LayoutDashboard, FileText
} from 'lucide-react';
import './Dashboard.css';


interface Lead {
    id: string;
    name: string;
    stage_id: string;
    created_at: string;
}

interface FormItem {
    id: string;
    title: string;
    is_published: boolean;
    slug?: string;
}


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [totalLeads, setTotalLeads] = useState(0);
    const [newToday, setNewToday] = useState(0);
    const [totalForms, setTotalForms] = useState(0);
    const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
    const [forms, setForms] = useState<FormItem[]>([]);
    const [activeStageId, setActiveStageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [installPrompt, setInstallPrompt] = useState<any>(null);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallPWA = async () => {
        if (!installPrompt) {
            alert("To install the app, please use your browser's 'Add to Home Screen' option.");
            return;
        }
        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
        }
    };

    const fetchAll = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
                leadsRes,
                newTodayRes,
                formsAllRes,
                recentRes,
            ] = await Promise.all([
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('leads').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', today.toISOString()),
                supabase.from('forms').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('leads').select('id, name, stage_id, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3),
            ]);

            setTotalLeads(leadsRes.count || 0);
            setNewToday(newTodayRes.count || 0);
            setTotalForms(formsAllRes.count || 0);
            setRecentLeads(recentRes.data || []);

            const { data: formsList } = await supabase
                .from('forms')
                .select('id, title, is_published, slug')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false })
                .limit(3);
            setForms(formsList || []);

        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good Morning';
        if (hour >= 12 && hour < 17) return 'Good Afternoon';
        if (hour >= 17 && hour < 22) return 'Good Evening';
        return 'Hello';
    };

    const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

    if (loading) {
        return (
            <div className="dash-page">
                <div className="dash-loading">
                    <Loader2 size={32} className="crm-spinner" />
                    <p>Setting up your workspace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dash-page">
            {/* Header / Hero */}
            <header className="dash-hero">
                <div className="dash-hero-content">
                    <h1>{getGreeting()}, {userName}!</h1>
                    <p>Welcome to your VXLeads Control Center.</p>
                </div>
                <div className="dash-hero-badge">Admin Panel</div>
            </header>

            {/* Quick Stats Banner */}
            <div className="dash-stats-banner">
                <div className="banner-item">
                    <span className="banner-val">{totalLeads}</span>
                    <span className="banner-lab">Leads</span>
                </div>
                <div className="banner-divider" />
                <div className="banner-item">
                    <span className="banner-val">{newToday}</span>
                    <span className="banner-lab">New Today</span>
                </div>
                <div className="banner-divider" />
                <div className="banner-item">
                    <span className="banner-val">{totalForms}</span>
                    <span className="banner-lab">Forms</span>
                </div>
            </div>

            {/* Main Tools Grid */}
            <section className="dash-grid">
                {/* CRM Tool */}
                <div className="tool-card premium-gradient" onClick={() => navigate('/crm')}>
                    <div className="tool-icon"><Users size={28} /></div>
                    <div className="tool-info">
                        <h3>Leads CRM</h3>
                        <p>Manage your pipeline, call leads, and track progress.</p>
                        <div className="tool-footer">
                            <span>Open CRM</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* Form Builder Tool */}
                <div className="tool-card premium-gradient" onClick={() => navigate('/builder')}>
                    <div className="tool-icon"><Edit3 size={28} /></div>
                    <div className="tool-info">
                        <h3>Form Builder</h3>
                        <p>Create high-converting lead forms with WhatsApp sync.</p>
                        <div className="tool-footer">
                            <span>Open Builder</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>

                {/* WhatsApp Linker Tool */}
                <div className="tool-card" onClick={() => window.open('https://vaibhav-crm.github.io/whatsapp-linker/', '_blank')}>
                    <div className="tool-icon"><MessageCircle size={28} /></div>
                    <div className="tool-info">
                        <h3>WA Linker</h3>
                        <p>Generate short links and custom messages for WhatsApp.</p>
                        <div className="tool-footer">
                            <span>Open Tool</span>
                            <ExternalLink size={16} />
                        </div>
                    </div>
                </div>

                {/* Profile/Profile Tool */}
                <div className="tool-card" onClick={() => navigate('/profile')}>
                    <div className="tool-icon"><LayoutDashboard size={28} /></div>
                    <div className="tool-info">
                        <h3>Settings</h3>
                        <p>Configure your workspace and admin profile.</p>
                        <div className="tool-footer">
                            <span>Manage</span>
                            <ChevronRight size={16} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Apps & Mobile */}
            <section className="dash-section app-download-card">
                <div className="app-info">
                    <Smartphone size={32} />
                    <div>
                        <h4>VXLeads Mobile CRM</h4>
                        <p>Download the Android app to manage leads on the go.</p>
                    </div>
                </div>
                <button className="download-btn" onClick={handleInstallPWA}>
                    <Smartphone size={18} /> {installPrompt ? 'Install App' : 'Add to Home Screen'}
                </button>
            </section>

            {/* Recent Activity */}
            <div className="dash-activity-grid">
                <section className="dash-section no-margin">
                    <h2 className="dash-section-title">Recent Submissions</h2>
                    <div className="recent-activity-list">
                        {recentLeads.length > 0 ? recentLeads.map(lead => (
                            <div key={lead.id} className="activity-item" onClick={() => navigate('/crm')}>
                                <div className="activity-circle" />
                                <div className="activity-details">
                                    <span className="activity-name">{lead.name}</span>
                                    <span className="activity-time">{new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <ChevronRight size={14} color="#333" />
                            </div>
                        )) : (
                            <p className="no-activity">No recent activity found.</p>
                        )}
                    </div>
                </section>

                <section className="dash-section no-margin">
                    <h2 className="dash-section-title">My Forms</h2>
                    <div className="recent-activity-list">
                        {forms.length > 0 ? forms.map(form => (
                            <div key={form.id} className="activity-item" onClick={() => navigate('/builder')}>
                                <FileText size={16} color="#444" />
                                <div className="activity-details">
                                    <span className="activity-name">{form.title || 'Untitled Form'}</span>
                                    <span className={`activity-status ${form.is_published ? 'published' : 'draft'}`}>
                                        {form.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                <ChevronRight size={14} color="#333" />
                            </div>
                        )) : (
                            <p className="no-activity">No forms created yet.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
