import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ExternalLink, FileText, Loader2, AlertCircle } from 'lucide-react';
import './PublicProfile.css';

interface ProfileData {
    user_id: string;
    username: string;
    name: string;
    bio: string;
    profile_image_url: string;
    cover_image_url: string;
    links: SocialLink[];
}

interface SocialLink {
    id: string;
    title: string;
    url: string;
}

interface FormData {
    id: string;
    title: string;
    user_id: string;
    is_published: boolean;
}

const PublicProfile: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [forms, setForms] = useState<FormData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPublicData = async () => {
            if (!username) return;

            // Fetch Profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('username', username)
                .eq('is_public', true)
                .single();

            if (profileError || !profileData) {
                setError('Profile not found or is private');
                setLoading(false);
                return;
            }

            setProfile(profileData);

            // Fetch Published Forms for this user
            const { data: formsData } = await supabase
                .from('forms')
                .select('*')
                .eq('user_id', profileData.user_id)
                .eq('is_published', true);

            setForms(formsData || []);
            setLoading(false);
        };

        fetchPublicData();
    }, [username]);

    if (loading) return (
        <div className="public-loading">
            <Loader2 className="spin" size={48} />
            <p>Loading Profile...</p>
        </div>
    );

    if (error) return (
        <div className="public-error">
            <AlertCircle size={64} />
            <h1>Oops!</h1>
            <p>{error}</p>
            <button onClick={() => navigate('/')}>Go Home</button>
        </div>
    );

    if (!profile) return null;

    return (
        <div className="public-profile-wrapper">
            <div className="public-cover" style={{ backgroundImage: `url(${profile.cover_image_url})` }}></div>

            <div className="public-container">
                <div className="public-header">
                    <div className="public-avatar" style={{ backgroundImage: `url(${profile.profile_image_url})` }}>
                        {!profile.profile_image_url && profile.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="public-info">
                        <h1>{profile.name}</h1>
                        <p className="public-handle">@{profile.username}</p>
                        {profile.bio && <p className="public-bio">{profile.bio}</p>}
                    </div>
                </div>

                <div className="public-content-grid">
                    <section className="links-section">
                        <h2 className="section-title">Connect</h2>
                        <div className="public-links-list">
                            {profile.links?.map((link) => (
                                <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="public-link-card">
                                    <div className="link-icon-bg">
                                        <ExternalLink size={20} />
                                    </div>
                                    <span className="link-text">{link.title}</span>
                                </a>
                            ))}
                            {(!profile.links || profile.links.length === 0) && (
                                <p className="empty-msg">No links shared yet.</p>
                            )}
                        </div>
                    </section>

                    <section className="forms-section">
                        <h2 className="section-title">Active Forms</h2>
                        <div className="public-forms-grid">
                            {forms.map(form => (
                                <div key={form.id} className="public-form-card" onClick={() => navigate(`/f/${form.id}`)}>
                                    <div className="form-icon">
                                        <FileText size={24} />
                                    </div>
                                    <div className="form-info">
                                        <h3>{form.title}</h3>
                                        <p>Fill out this form</p>
                                    </div>
                                </div>
                            ))}
                            {forms.length === 0 && (
                                <p className="empty-msg">No public forms available.</p>
                            )}
                        </div>
                    </section>
                </div>

                <footer className="public-footer">
                    <p>Powered by <span>VXLeads</span></p>
                </footer>
            </div>
        </div>
    );
};

export default PublicProfile;
