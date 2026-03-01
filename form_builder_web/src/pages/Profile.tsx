import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { Camera, Globe, Link as LinkIcon, Trash2, GripVertical, Loader2, Save, X, ZoomIn, ZoomOut, Copy, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import './Profile.css';

interface SocialLink {
    id: string;
    title: string;
    url: string;
}

interface ProfileData {
    user_id: string;
    username: string;
    name: string;
    bio: string;
    profile_image_url: string;
    cover_image_url: string;
    links: SocialLink[];
}

const Profile: React.FC = () => {
    const { user, signOut } = useAuth();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [name, setName] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [links, setLinks] = useState<SocialLink[]>([]);
    const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [copied, setCopied] = useState(false);

    // Crop modal state
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
    const [cropType, setCropType] = useState<'avatar' | 'cover'>('avatar');
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setProfile(data);
                setName(data.name || '');
                setUsername(data.username || '');
                setBio(data.bio || '');
                setIsPublic(data.is_public || false);
                setLinks(data.links || []);
            }
            setLoading(false);
        };
        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setMsg(null);

        const { error } = await supabase
            .from('profiles')
            .upsert({
                user_id: user.id,
                name,
                username,
                bio,
                is_public: isPublic,
                links,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

        if (error) {
            setMsg({ type: 'error', text: error.message });
        } else {
            setMsg({ type: 'success', text: 'Profile updated successfully!' });
            // Refresh profile data
            const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
            if (data) setProfile(data);
        }
        setSaving(false);
    };

    // Open the crop modal when user selects an image
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            setCropImageSrc(reader.result as string);
            setCropType(type);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCroppedAreaPixels(null);
            setCropModalOpen(true);
        };
        reader.readAsDataURL(file);
        // Reset the input so the same file can be selected again
        e.target.value = '';
    };

    const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
        setCroppedAreaPixels(croppedPixels);
    }, []);

    // Upload the cropped image to Supabase
    const handleCropSave = async () => {
        if (!cropImageSrc || !croppedAreaPixels || !user) return;

        setSaving(true);
        setCropModalOpen(false);

        try {
            const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
            const fileName = `${user.id}/${cropType}_${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('profiles')
                .upload(fileName, croppedBlob, { contentType: 'image/jpeg' });

            if (uploadError) {
                setMsg({ type: 'error', text: uploadError.message });
                setSaving(false);
                return;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('profiles')
                .getPublicUrl(fileName);

            const updateKey = cropType === 'avatar' ? 'profile_image_url' : 'cover_image_url';
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ [updateKey]: publicUrl })
                .eq('user_id', user.id);

            if (updateError) {
                setMsg({ type: 'error', text: updateError.message });
            } else {
                setProfile(prev => prev ? { ...prev, [updateKey]: publicUrl } : null);
                setMsg({ type: 'success', text: `${cropType === 'avatar' ? 'Profile' : 'Cover'} image updated!` });
            }
        } catch (err) {
            console.error('Crop error:', err);
            setMsg({ type: 'error', text: 'Failed to crop image. Please try again.' });
        }
        setSaving(false);
    };

    const closeCropModal = () => {
        setCropModalOpen(false);
        setCropImageSrc(null);
    };

    const addLink = () => {
        const newLink = { id: crypto.randomUUID(), title: '', url: '' };
        setLinks([...links, newLink]);
    };

    const updateLink = (id: string, field: keyof SocialLink, value: string) => {
        setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLink = (id: string) => {
        setLinks(links.filter(l => l.id !== id));
    };
    const copyProfileLink = () => {
        const url = `${window.location.origin}/u/${username}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    if (loading) return <div className="loading-state"><Loader2 className="spin" /> Loading Profile...</div>;

    return (
        <div className="profile-editor-container">
            <div className="profile-editor-header">
                <div>
                    <h1>Edit Profile</h1>
                    {username && (
                        <div className="profile-link-card" onClick={copyProfileLink}>
                            <Globe size={14} />
                            <span>v-xlead.vercel.app/u/{username}</span>
                            {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                        </div>
                    )}
                </div>
                <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                    <span>Save Changes</span>
                </button>
            </div>

            {msg && <div className={`status-msg ${msg.type}`}>{msg.text}</div>}

            <div className="profile-visual-section">
                <div className="cover-upload" style={{ backgroundImage: `url(${profile?.cover_image_url})` }}>
                    <label className="upload-label cover-btn">
                        <Camera size={20} />
                        <input type="file" hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'cover')} />
                    </label>
                </div>
                <div className="avatar-upload-wrapper">
                    <div className="avatar-preview" style={{ backgroundImage: `url(${profile?.profile_image_url})` }}>
                        {!profile?.profile_image_url && name[0]?.toUpperCase()}
                    </div>
                    <label className="upload-label avatar-btn">
                        <Camera size={16} />
                        <input type="file" hidden accept="image/*" onChange={(e) => handleFileSelect(e, 'avatar')} />
                    </label>
                </div>
            </div>

            <div className="editor-grid">
                <div className="editor-section">
                    <h3>Basic Information</h3>
                    <div className="input-group-lg">
                        <label>Display Name</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" />
                    </div>
                    <div className="input-group-lg">
                        <label>Username</label>
                        <div className="username-input">
                            <span>vsleads.com/u/</span>
                            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
                        </div>
                    </div>
                    <div className="input-group-lg">
                        <label>Bio</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." />
                    </div>
                    <div className="privacy-toggle">
                        <div className="toggle-info">
                            <Globe size={20} />
                            <div>
                                <h4>Public Profile</h4>
                                <p>Allow others to see your profile at vsleads.com/u/{username || 'username'}</p>
                            </div>
                        </div>
                        <label className="switch">
                            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
                            <span className="slider"></span>
                        </label>
                    </div>
                </div>

                <div className="editor-section">
                    <div className="section-header">
                        <h3>Social & Custom Links</h3>
                        <button className="add-link-btn" onClick={addLink}>
                            <LinkIcon size={16} /> Add Link
                        </button>
                    </div>
                    <div className="links-manager">
                        {links.map((link) => (
                            <div key={link.id} className="link-editor-item">
                                <GripVertical className="drag-handle" size={18} />
                                <div className="link-fields">
                                    <input
                                        className="link-title"
                                        value={link.title}
                                        onChange={(e) => updateLink(link.id, 'title', e.target.value)}
                                        placeholder="Link Title (e.g. Instagram)"
                                    />
                                    <input
                                        className="link-url"
                                        value={link.url}
                                        onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                                        placeholder="URL (https://...)"
                                    />
                                </div>
                                <button className="delete-link-btn" onClick={() => removeLink(link.id)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="danger-zone-compact">
                <button className="logout-outline-btn" onClick={signOut}>Sign Out</button>
            </div>

            {/* ===== Premium Image Crop Modal ===== */}
            {cropModalOpen && cropImageSrc && (
                <div className="crop-modal-overlay" onClick={closeCropModal}>
                    <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="crop-modal-header">
                            <h2>{cropType === 'avatar' ? 'Adjust Profile Picture' : 'Adjust Cover Image'}</h2>
                            <button className="crop-close-btn" onClick={closeCropModal}>
                                <X size={22} />
                            </button>
                        </div>

                        <div className="crop-area-container">
                            <Cropper
                                image={cropImageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={cropType === 'avatar' ? 1 : 16 / 9}
                                cropShape={cropType === 'avatar' ? 'round' : 'rect'}
                                showGrid={cropType === 'cover'}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>

                        <div className="crop-controls">
                            <ZoomOut size={18} className="zoom-icon" />
                            <input
                                type="range"
                                className="zoom-slider"
                                min={1}
                                max={3}
                                step={0.05}
                                value={zoom}
                                onChange={(e) => setZoom(Number(e.target.value))}
                            />
                            <ZoomIn size={18} className="zoom-icon" />
                        </div>

                        <div className="crop-modal-footer">
                            <button className="crop-cancel-btn" onClick={closeCropModal}>Cancel</button>
                            <button className="crop-save-btn" onClick={handleCropSave} disabled={saving}>
                                {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                                <span>Save</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
