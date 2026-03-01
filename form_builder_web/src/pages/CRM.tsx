import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import {
    Plus, Phone, MessageCircle, ChevronRight, ChevronLeft,
    X, User, Loader2, Search
} from 'lucide-react';
import './CRM.css';

interface Stage {
    id: string;
    name: string;
    user_id: string;
    order_index: number;
}

interface Lead {
    id: string;
    name: string;
    phone: string;
    stage_id: string;
    user_id: string;
    created_at: string;
    follow_up_at?: string;
    data?: Record<string, string>;
}

interface LeadNote {
    id: string;
    lead_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

const CRM: React.FC = () => {
    const { user } = useAuth();
    const [stages, setStages] = useState<Stage[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');

    // Add Lead Modal
    const [showAddLead, setShowAddLead] = useState(false);
    const [newLeadName, setNewLeadName] = useState('');
    const [newLeadPhone, setNewLeadPhone] = useState('');
    const [savingLead, setSavingLead] = useState(false);

    // Add Stage Modal
    const [showAddStage, setShowAddStage] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [savingStage, setSavingStage] = useState(false);

    // Edit Stage
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [editStageName, setEditStageName] = useState('');

    // Delete Stage
    const [deletingStage, setDeletingStage] = useState<Stage | null>(null);

    // Lead Details & Notes
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [leadNotes, setLeadNotes] = useState<LeadNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [followUpDate, setFollowUpDate] = useState('');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .eq('user_id', user.id)
                .order('order_index', { ascending: true });

            if (stagesError) throw stagesError;

            let currentStages = stagesData || [];

            // Auto-create default stages if empty
            if (currentStages.length === 0) {
                const defaults = [
                    { name: 'New', order_index: 0, user_id: user.id },
                    { name: 'Contacted', order_index: 1, user_id: user.id },
                    { name: 'Follow Up', order_index: 2, user_id: user.id },
                    { name: 'Closed', order_index: 3, user_id: user.id },
                ];
                const { data: inserted, error: insError } = await supabase.from('stages').insert(defaults).select();
                if (insError) throw insError;
                currentStages = inserted || [];
            }

            setStages(currentStages);
            if (currentStages.length > 0 && !activeStageId) {
                setActiveStageId(currentStages[0].id);
            }

            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (leadsError) throw leadsError;
            setLeads(leadsData || []);
        } catch (error) {
            console.error('CRM fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, [user, activeStageId]);

    const fetchLeadNotes = async (leadId: string) => {
        const { data, error } = await supabase
            .from('lead_notes')
            .select('*')
            .eq('lead_id', leadId)
            .order('created_at', { ascending: false });

        if (!error) setLeadNotes(data || []);
    };

    useEffect(() => {
        if (selectedLead) {
            fetchLeadNotes(selectedLead.id);
            setFollowUpDate(selectedLead.follow_up_at ? new Date(selectedLead.follow_up_at).toISOString().slice(0, 16) : '');
        }
    }, [selectedLead]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const handleWhatsApp = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${cleanPhone}`, '_blank');
    };

    const moveLead = async (leadId: string, direction: 'next' | 'prev') => {
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) return;

        const currentStageIndex = stages.findIndex(s => s.id === currentLead.stage_id);
        const nextStageIndex = direction === 'next' ? currentStageIndex + 1 : currentStageIndex - 1;

        if (nextStageIndex >= 0 && nextStageIndex < stages.length) {
            const nextStageId = stages[nextStageIndex].id;

            const { error } = await supabase
                .from('leads')
                .update({ stage_id: nextStageId })
                .eq('id', leadId);

            if (!error) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: nextStageId } : l));
            }
        }
    };

    const addLead = async () => {
        if (!newLeadName.trim() || !newLeadPhone.trim() || !activeStageId) return;
        setSavingLead(true);

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                name: newLeadName.trim(),
                phone: newLeadPhone.trim(),
                stage_id: activeStageId,
                user_id: user?.id,
            }])
            .select();

        if (!error && data) {
            setLeads(prev => [data[0], ...prev]);
            setNewLeadName('');
            setNewLeadPhone('');
            setShowAddLead(false);
        }
        setSavingLead(false);
    };

    const addStage = async () => {
        if (!newStageName.trim()) return;
        setSavingStage(true);

        const { data, error } = await supabase
            .from('stages')
            .insert([{
                name: newStageName.trim(),
                order_index: stages.length,
                user_id: user?.id,
            }])
            .select();

        if (!error && data) {
            setStages(prev => [...prev, data[0]]);
            setNewStageName('');
            setShowAddStage(false);
        }
        setSavingStage(false);
    };

    const updateStageName = async () => {
        if (!editingStage || !editStageName.trim()) return;
        setSavingStage(true);

        const { error } = await supabase
            .from('stages')
            .update({ name: editStageName.trim() })
            .eq('id', editingStage.id);

        if (!error) {
            setStages(prev => prev.map(s => s.id === editingStage.id ? { ...s, name: editStageName.trim() } : s));
            setEditingStage(null);
            setEditStageName('');
        }
        setSavingStage(false);
    };

    const deleteStage = async () => {
        if (!deletingStage) return;
        setSavingStage(true);

        // Check if there are leads in this stage
        const stageLeads = leads.filter(l => l.stage_id === deletingStage.id);
        if (stageLeads.length > 0) {
            alert("Cannot delete stage that has leads. Please move or delete leads first.");
            setSavingStage(false);
            return;
        }

        const { error } = await supabase
            .from('stages')
            .delete()
            .eq('id', deletingStage.id);

        if (!error) {
            const newStages = stages.filter(s => s.id !== deletingStage.id);
            setStages(newStages);
            if (activeStageId === deletingStage.id) {
                setActiveStageId(newStages.length > 0 ? newStages[0].id : null);
            }
            setDeletingStage(null);
        }
        setSavingStage(false);
    };

    const addNote = async () => {
        if (!newNote.trim() || !selectedLead) return;
        setSavingNote(true);
        const { data, error } = await supabase
            .from('lead_notes')
            .insert([{
                lead_id: selectedLead.id,
                user_id: user?.id,
                content: newNote.trim()
            }])
            .select();

        if (!error && data) {
            setLeadNotes([data[0], ...leadNotes]);
            setNewNote('');
        }
        setSavingNote(false);
    };

    const updateFollowUp = async (date: string) => {
        if (!selectedLead) return;
        setFollowUpDate(date);
        await supabase
            .from('leads')
            .update({ follow_up_at: date || null })
            .eq('id', selectedLead.id);

        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, follow_up_at: date || undefined } : l));
    };

    const activeStage = stages.find(s => s.id === activeStageId);

    // Filter and Sort Logic
    const processedLeads = leads
        .filter(l => {
            const matchesStage = l.stage_id === activeStageId;
            const matchesSearch =
                l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                l.phone.includes(searchTerm);
            return matchesStage && matchesSearch;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            return 0;
        });

    return (
        <div className="crm-page">
            {/* Header */}
            <header className="crm-header">
                <div className="crm-header-left">
                    <h1>Pipeline</h1>
                    <div className="crm-search-bar">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="crm-header-right">
                    <select
                        className="crm-sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="name">Name (A-Z)</option>
                    </select>
                    <button className="crm-add-stage-btn" onClick={() => setShowAddStage(true)}>
                        <Plus size={18} /> Add Stage
                    </button>
                </div>
            </header>

            {/* Stage Tabs */}
            <div className="crm-stage-scroll">
                {stages.map(stage => {
                    const count = leads.filter(l => l.stage_id === stage.id).length;
                    const isActive = activeStageId === stage.id;
                    return (
                        <button
                            key={stage.id}
                            className={`crm-stage-tab ${isActive ? 'active' : ''}`}
                            onClick={() => setActiveStageId(stage.id)}
                        >
                            <span className="crm-stage-name">{stage.name}</span>
                            <span className="crm-stage-count">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Stage Title */}
            <div className="crm-stage-title">
                <h2>{activeStage?.name || 'Select a Stage'}</h2>
                <span className="crm-leads-count">{processedLeads.length} Leads</span>

                {activeStage && (
                    <div className="crm-stage-actions">
                        <button
                            className="crm-stage-action-btn"
                            onClick={() => {
                                setEditingStage(activeStage);
                                setEditStageName(activeStage.name);
                            }}
                        >
                            Rename
                        </button>
                        <button
                            className="crm-stage-action-btn delete"
                            onClick={() => setDeletingStage(activeStage)}
                        >
                            Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Leads List */}
            <div className="crm-leads-list">
                {loading ? (
                    <div className="crm-loading">
                        <Loader2 size={28} className="crm-spinner" />
                        <p>Loading leads...</p>
                    </div>
                ) : processedLeads.length === 0 ? (
                    <div className="crm-empty">
                        <User size={40} strokeWidth={1} />
                        <p>No leads in this stage</p>
                        <button className="crm-empty-add" onClick={() => setShowAddLead(true)}>
                            <Plus size={16} /> Add Lead
                        </button>
                    </div>
                ) : (
                    processedLeads.map(lead => {
                        const stageIndex = stages.findIndex(s => s.id === lead.stage_id);
                        const canGoPrev = stageIndex > 0;
                        const canGoNext = stageIndex < stages.length - 1;

                        return (
                            <div key={lead.id} className="crm-lead-card" onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                                <div className="crm-lead-info">
                                    <div className="crm-lead-avatar">
                                        <User size={20} />
                                    </div>
                                    <div className="crm-lead-details">
                                        <h4 className="crm-lead-name">{lead.name}</h4>
                                        <p className="crm-lead-phone">{lead.phone}</p>
                                        <p className="crm-lead-date">{new Date(lead.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="crm-lead-actions" onClick={e => e.stopPropagation()}>
                                    <button className="crm-action-btn call" onClick={() => handleCall(lead.phone)} title="Call">
                                        <Phone size={18} />
                                    </button>
                                    <button className="crm-action-btn whatsapp" onClick={() => handleWhatsApp(lead.phone)} title="WhatsApp">
                                        <MessageCircle size={18} />
                                    </button>

                                    <div className="crm-move-group">
                                        <button
                                            className={`crm-move-btn ${!canGoPrev ? 'disabled' : ''}`}
                                            onClick={() => canGoPrev && moveLead(lead.id, 'prev')}
                                            title="Previous Stage"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <div className="crm-move-divider" />
                                        <button
                                            className={`crm-move-btn ${!canGoNext ? 'disabled' : ''}`}
                                            onClick={() => canGoNext && moveLead(lead.id, 'next')}
                                            title="Next Stage"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FAB Add Lead */}
            <button className="crm-fab" onClick={() => setShowAddLead(true)}>
                <Plus size={28} />
            </button>

            {/* Modals */}

            {/* Lead Details Modal */}
            {selectedLead && (
                <div className="crm-modal-overlay" onClick={() => setSelectedLead(null)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <h3>Lead Details</h3>
                            <button className="crm-modal-close" onClick={() => setSelectedLead(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="crm-modal-body crm-scroll-body">
                            <div className="crm-detail-row">
                                <div className="crm-detail-section">
                                    <span className="crm-detail-label">Name</span>
                                    <div className="crm-detail-value">{selectedLead.name}</div>
                                </div>
                                <div className="crm-detail-section">
                                    <span className="crm-detail-label">Phone</span>
                                    <div className="crm-detail-value">{selectedLead.phone}</div>
                                </div>
                            </div>

                            <div className="crm-detail-section">
                                <span className="crm-detail-label">Follow-up Reminder</span>
                                <input
                                    type="datetime-local"
                                    className="crm-input"
                                    value={followUpDate}
                                    onChange={(e) => updateFollowUp(e.target.value)}
                                />
                            </div>

                            {/* Notes System */}
                            <div className="crm-detail-section">
                                <span className="crm-detail-label">Lead Timeline & Notes</span>
                                <div className="crm-notes-input">
                                    <input
                                        type="text"
                                        placeholder="Add a note (e.g. Call tomorrow)..."
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addNote()}
                                    />
                                    <button onClick={addNote} disabled={savingNote || !newNote.trim()}>
                                        {savingNote ? <Loader2 size={16} className="spinner" /> : 'Add'}
                                    </button>
                                </div>

                                <div className="crm-notes-list">
                                    {leadNotes.length > 0 ? leadNotes.map(note => (
                                        <div key={note.id} className="crm-note-card">
                                            <p className="note-content">{note.content}</p>
                                            <span className="note-date">{new Date(note.created_at).toLocaleString()}</span>
                                        </div>
                                    )) : (
                                        <div className="empty-notes">No updates yet</div>
                                    )}
                                </div>
                            </div>

                            {selectedLead.data && Object.keys(selectedLead.data).length > 0 && (
                                <div className="crm-detail-section">
                                    <span className="crm-detail-label">Raw Form Data</span>
                                    <div className="crm-detail-grid">
                                        {Object.entries(selectedLead.data).map(([key, value]) => (
                                            <div key={key} className="crm-detail-item">
                                                <h5>{key}</h5>
                                                <p>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="crm-modal-footer">
                            <button className="crm-modal-btn cancel" onClick={() => setSelectedLead(null)}>Close</button>
                            <button className="crm-modal-btn save" onClick={() => handleWhatsApp(selectedLead.phone)}>WhatsApp</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rename Stage Modal */}
            {editingStage && (
                <div className="crm-modal-overlay" onClick={() => setEditingStage(null)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <h3>Rename Stage</h3>
                            <button className="crm-modal-close" onClick={() => setEditingStage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="crm-modal-body">
                            <label className="crm-input-label">STAGE NAME</label>
                            <input
                                className="crm-input"
                                value={editStageName}
                                onChange={e => setEditStageName(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="crm-modal-footer">
                            <button className="crm-modal-btn cancel" onClick={() => setEditingStage(null)}>Cancel</button>
                            <button className="crm-modal-btn save" onClick={updateStageName} disabled={savingStage}>
                                {savingStage ? 'Updating...' : 'Update Name'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Stage Modal */}
            {deletingStage && (
                <div className="crm-modal-overlay" onClick={() => setDeletingStage(null)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <h3>Delete Stage</h3>
                            <button className="crm-modal-close" onClick={() => setDeletingStage(null)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="crm-modal-body">
                            <p className="crm-delete-warn">
                                Are you sure you want to delete <strong>{deletingStage.name}</strong>?
                                <br /><br />
                                This action cannot be undone. You can only delete stages that are empty.
                            </p>
                        </div>
                        <div className="crm-modal-footer">
                            <button className="crm-modal-btn cancel" onClick={() => setDeletingStage(null)}>Cancel</button>
                            <button
                                className="crm-modal-btn save"
                                style={{ backgroundColor: '#ef4444' }}
                                onClick={deleteStage}
                                disabled={savingStage}
                            >
                                {savingStage ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Lead Modal */}
            {showAddLead && (
                <div className="crm-modal-overlay" onClick={() => setShowAddLead(false)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <h3>Add New Lead</h3>
                            <button className="crm-modal-close" onClick={() => setShowAddLead(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="crm-modal-body">
                            <label className="crm-input-label">FULL NAME</label>
                            <input
                                className="crm-input"
                                placeholder="e.g. Rahul Sharma"
                                value={newLeadName}
                                onChange={e => setNewLeadName(e.target.value)}
                                autoFocus
                            />

                            <label className="crm-input-label">PHONE NUMBER</label>
                            <input
                                className="crm-input"
                                placeholder="+91 98765 43210"
                                type="tel"
                                value={newLeadPhone}
                                onChange={e => setNewLeadPhone(e.target.value)}
                            />
                        </div>

                        <div className="crm-modal-footer">
                            <button className="crm-modal-btn cancel" onClick={() => setShowAddLead(false)}>Cancel</button>
                            <button className="crm-modal-btn save" onClick={addLead} disabled={savingLead}>
                                {savingLead ? 'Saving...' : 'Save Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Stage Modal */}
            {showAddStage && (
                <div className="crm-modal-overlay" onClick={() => setShowAddStage(false)}>
                    <div className="crm-modal" onClick={e => e.stopPropagation()}>
                        <div className="crm-modal-header">
                            <h3>Create New Stage</h3>
                            <button className="crm-modal-close" onClick={() => setShowAddStage(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="crm-modal-body">
                            <label className="crm-input-label">STAGE NAME</label>
                            <input
                                className="crm-input"
                                placeholder="e.g. Day 3 Follow Up"
                                value={newStageName}
                                onChange={e => setNewStageName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="crm-modal-footer">
                            <button className="crm-modal-btn cancel" onClick={() => setShowAddStage(false)}>Cancel</button>
                            <button className="crm-modal-btn save" onClick={addStage} disabled={savingStage}>
                                {savingStage ? 'Creating...' : 'Create Stage'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CRM;
