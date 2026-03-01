import React, { useRef, useState } from 'react';
import { useBuilder } from '../../contexts/BuilderContext';
import type { FieldType, RedirectMode } from '../../types';
import {
    Type, AlignLeft, Mail, Phone, Hash, Calendar,
    CircleDot, CheckSquare, FileText, Upload,
    Heading, PilcrowSquare, Minus,
    Trash2, GripVertical, Copy, ChevronUp, ChevronDown,
    Image, CircleUser, Link2, ExternalLink,
    MessageSquare, Sparkles, X, Palette, ArrowRight, Plus
} from 'lucide-react';
import Modal from '../UI/Modal';
import './FormEditor.css';
import '../UI/Modal.css';

const fieldTypes: { type: FieldType; label: string; icon: React.ReactNode }[] = [
    { type: 'short_text', label: 'Short Text', icon: <Type size={18} /> },
    { type: 'email', label: 'Email', icon: <Mail size={18} /> },
    { type: 'phone', label: 'Phone', icon: <Phone size={18} /> },
    { type: 'number', label: 'Number', icon: <Hash size={18} /> },
    { type: 'textarea', label: 'Long Text', icon: <AlignLeft size={18} /> },
    { type: 'date', label: 'Date', icon: <Calendar size={18} /> },
    { type: 'dropdown', label: 'Dropdown', icon: <ChevronDown size={18} /> },
    { type: 'radio', label: 'Radio', icon: <CircleDot size={18} /> },
    { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare size={18} /> },
    { type: 'file_upload', label: 'File Upload', icon: <Upload size={18} /> },
    { type: 'heading', label: 'Heading', icon: <Heading size={18} /> },
    { type: 'paragraph', label: 'Paragraph', icon: <PilcrowSquare size={18} /> },
    { type: 'divider', label: 'Divider', icon: <Minus size={18} /> },
];

const FormEditor: React.FC = () => {
    const { schema, setSchema, addField, updateField, removeField, duplicateField, moveField, publishForm } = useBuilder();
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState<{ success?: boolean; id?: string; error?: string }>({});
    const [activeModal, setActiveModal] = useState<'field' | 'branding' | 'settings' | 'title' | null>(null);
    const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
    const [isAdjustingCover, setIsAdjustingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const dpInputRef = useRef<HTMLInputElement>(null);

    const activeField = schema.fields.find(f => f.id === activeFieldId);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverUrl' | 'dpUrl') => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setSchema(prev => ({ ...prev, branding: { ...prev.branding, [field]: url } }));
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        const res = await publishForm();
        setPublishStatus(res);
        setIsPublishing(false);
    };

    const copyLink = () => {
        const id = schema.id || publishStatus.id;
        if (id) {
            navigator.clipboard.writeText(`${window.location.origin}/f/${id}`);
        }
    };

    const getFieldIcon = (type: FieldType) => {
        const found = fieldTypes.find(f => f.type === type);
        return found?.icon || <FileText size={18} />;
    };

    const addFieldAndClose = (type: FieldType) => {
        addField(type);
        setShowFieldPicker(false);
    };

    return (
        <div className="tally-editor">
            {/* ===== TOP BAR ===== */}
            <div className="tally-topbar">
                <div className="tally-topbar-left">
                    <Sparkles size={18} />
                    <ChevronDown size={14} />
                </div>
                <div className="tally-topbar-center">
                    <button className="tally-topbar-link" onClick={() => setActiveModal('settings')}>Customize</button>
                    <a
                        href={schema.id ? `/f/${schema.id}` : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`tally-topbar-link ${!schema.id ? 'disabled' : ''}`}
                    >Preview</a>
                </div>
                <button className="tally-publish-btn" onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? 'Publishing...' : 'Publish'}
                </button>
            </div>

            {/* Publish Status */}
            {publishStatus.success && (
                <div className="tally-banner success">
                    <span>✅ Published!</span>
                    <a href={`/f/${schema.id || publishStatus.id}`} target="_blank" rel="noreferrer">
                        <Link2 size={12} /> Open
                    </a>
                    <button onClick={copyLink}><Copy size={12} /> Copy Link</button>
                </div>
            )}
            {publishStatus.error && (
                <div className="tally-banner error">❌ {publishStatus.error}</div>
            )}

            {/* ===== CANVAS ===== */}
            <div className="tally-canvas-scroll">
                <div className="tally-canvas">
                    {/* Cover Image */}
                    {schema.branding.coverUrl && (
                        <div className={`tally-cover ${isAdjustingCover ? 'adjusting' : ''}`}>
                            <div
                                className="tally-cover-img"
                                style={{
                                    backgroundImage: `url(${schema.branding.coverUrl})`,
                                    backgroundColor: schema.branding.coverColor || '#FCEBDE',
                                    backgroundPosition: `50% ${schema.branding.coverPosition || 50}%`
                                }}
                            />

                            {isAdjustingCover ? (
                                <div className="tally-cover-adjuster">
                                    <div className="adjuster-label">Reposition Cover</div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={schema.branding.coverPosition || 50}
                                        onChange={(e) => setSchema(prev => ({
                                            ...prev,
                                            branding: { ...prev.branding, coverPosition: parseInt(e.target.value) }
                                        }))}
                                    />
                                    <button className="adjuster-done" onClick={() => setIsAdjustingCover(false)}>Done</button>
                                </div>
                            ) : (
                                <div className="tally-cover-actions">
                                    <button className="tally-cover-btn" onClick={() => setIsAdjustingCover(true)}>
                                        <GripVertical size={14} /> Adjust
                                    </button>
                                    <button className="tally-cover-btn" onClick={() => setSchema(prev => ({ ...prev, branding: { ...prev.branding, coverUrl: undefined } }))}>
                                        <X size={14} /> Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Logo */}
                    {schema.branding.dpUrl && (
                        <div className="tally-logo-area">
                            <div className="tally-logo" style={{ backgroundImage: `url(${schema.branding.dpUrl})` }} />
                            <button className="tally-logo-remove" onClick={() => setSchema(prev => ({ ...prev, branding: { ...prev.branding, dpUrl: undefined } }))}><X size={10} /></button>
                        </div>
                    )}

                    {/* Quick Actions — Tally style simple text buttons */}
                    <div className="tally-quick-actions">
                        {!schema.branding.dpUrl && (
                            <button className="tally-action-link" onClick={() => dpInputRef.current?.click()}>
                                <CircleUser size={16} /> Add logo
                            </button>
                        )}
                        {!schema.branding.coverUrl && (
                            <button className="tally-action-link" onClick={() => coverInputRef.current?.click()}>
                                <Image size={16} /> Add cover
                            </button>
                        )}
                        <button className="tally-action-link" onClick={() => setActiveModal('settings')}>
                            <Palette size={16} /> Customize
                        </button>
                    </div>

                    <input type="file" accept="image/*" ref={dpInputRef} hidden onChange={e => handleImageUpload(e, 'dpUrl')} />
                    <input type="file" accept="image/*" ref={coverInputRef} hidden onChange={e => handleImageUpload(e, 'coverUrl')} />

                    {/* Title & Description — Now clickable triggers for Modal */}
                    <div className="tally-form-body">
                        <div
                            className="tally-title-trigger"
                            onClick={() => setActiveModal('title')}
                        >
                            <h1 className="tally-title-preview">
                                {schema.title || 'Untitled Form'}
                            </h1>
                            <p className="tally-desc-preview">
                                {schema.description || 'Add a description...'}
                            </p>
                        </div>

                        {/* Fields */}
                        {schema.fields.map((field) => (
                            <div
                                key={field.id}
                                className={`tally-field vs-field-premium ${activeFieldId === field.id ? 'active' : ''} ${field.type === 'divider' ? 'divider-type' : ''}`}
                                onClick={() => {
                                    setActiveFieldId(field.id);
                                    setActiveModal('field');
                                }}
                            >
                                {field.type === 'divider' ? (
                                    <hr className="tally-hr" />
                                ) : field.type === 'heading' ? (
                                    <div className="tally-field-row">
                                        <span className="tally-drag"><GripVertical size={14} /></span>
                                        <h2 className="vs-heading-preview">{field.label}</h2>
                                    </div>
                                ) : field.type === 'paragraph' ? (
                                    <div className="tally-field-row">
                                        <span className="tally-drag"><GripVertical size={14} /></span>
                                        <p className="vs-para-preview">{field.label}</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Label Row */}
                                        <div className="tally-field-row">
                                            <span className="tally-drag"><GripVertical size={14} /></span>
                                            <span className="vs-label-preview">{field.label}</span>
                                            {field.required && <span className="tally-required">*</span>}
                                        </div>

                                        {/* Input Preview */}
                                        <div className="tally-input-row">
                                            <span className="tally-drag"><GripVertical size={14} /></span>
                                            {field.type === 'file_upload' ? (
                                                <div className="tally-fake-file"><Upload size={14} /> Choose file...</div>
                                            ) : field.type === 'dropdown' ? (
                                                <div className="tally-fake-select">
                                                    <span>{field.placeholder || 'Select...'}</span>
                                                    <ChevronDown size={14} />
                                                </div>
                                            ) : field.type === 'radio' || field.type === 'checkbox' ? (
                                                <div className="tally-options-list">
                                                    {(field.options || []).map((opt, i) => (
                                                        <label key={i} className="tally-opt">
                                                            <span className={field.type === 'radio' ? 'tally-radio-dot' : 'tally-check-box'} />
                                                            {opt}
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="tally-fake-input">
                                                    <span>{field.placeholder || field.label}</span>
                                                    <span className="tally-input-icon">{getFieldIcon(field.type)}</span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Add Field Button */}
                        <div className="vs-add-field-container">
                            <button className="vs-add-field-btn" onClick={() => setShowFieldPicker(!showFieldPicker)}>
                                <Plus size={18} /> Add Question
                            </button>

                            {showFieldPicker && (
                                <div className="vs-field-picker-dropdown">
                                    <div className="vs-picker-header">Select Question Type</div>
                                    <div className="vs-picker-grid">
                                        {fieldTypes.map(ft => (
                                            <button
                                                key={ft.type}
                                                className="vs-picker-item"
                                                onClick={() => addFieldAndClose(ft.type)}
                                            >
                                                <span className="vs-picker-icon">{ft.icon}</span>
                                                <span className="vs-picker-label">{ft.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="tally-submit-area">
                            <button
                                className="tally-submit-preview"
                                style={{
                                    backgroundColor: schema.submitButton.color,
                                    color: schema.theme.buttonTextColor || '#fff',
                                    width: schema.submitButton.fullWidth ? '100%' : 'auto'
                                }}
                            >
                                {schema.submitButton.text || 'Submit'} <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== MODALS ===== */}

            {/* Title & Description Modal */}
            <Modal
                isOpen={activeModal === 'title'}
                onClose={() => setActiveModal(null)}
                title="Edit Header"
                footer={<button className="vs-primary-btn" onClick={() => setActiveModal(null)}>Save Changes</button>}
            >
                <div className="vs-form-group">
                    <label>Form Title</label>
                    <input
                        type="text"
                        className="vs-input"
                        value={schema.title}
                        onChange={e => setSchema(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="e.g. Join Our Team"
                    />
                </div>
                <div className="vs-form-group">
                    <label>Description (Optional)</label>
                    <textarea
                        className="vs-textarea"
                        value={schema.description || ''}
                        onChange={e => setSchema(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tell your users what this form is about..."
                        rows={3}
                    />
                </div>
            </Modal>

            {/* Field Edit Modal */}
            <Modal
                isOpen={activeModal === 'field' && !!activeField}
                onClose={() => {
                    setActiveModal(null);
                    setActiveFieldId(null);
                }}
                title="Edit Question"
                footer={<button className="vs-primary-btn" onClick={() => setActiveModal(null)}>Save Changes</button>}
            >
                {activeField && (
                    <div className="vs-field-editor">
                        <div className="vs-form-group">
                            <label>Question Text</label>
                            <textarea
                                className="vs-textarea"
                                value={activeField.label}
                                onChange={e => updateField(activeField.id, { label: e.target.value })}
                                placeholder="What would you like to ask?"
                                rows={2}
                            />
                        </div>

                        <div className="vs-form-group">
                            <label>Field Type</label>
                            <select
                                className="vs-select"
                                value={activeField.type}
                                onChange={e => updateField(activeField.id, { type: e.target.value as FieldType })}
                            >
                                {fieldTypes.map(ft => (
                                    <option key={ft.type} value={ft.type}>{ft.label}</option>
                                ))}
                            </select>
                        </div>

                        {!['heading', 'paragraph', 'divider'].includes(activeField.type) && (
                            <>
                                <div className="vs-form-group">
                                    <label>Placeholder</label>
                                    <input
                                        type="text"
                                        className="vs-input"
                                        value={activeField.placeholder || ''}
                                        onChange={e => updateField(activeField.id, { placeholder: e.target.value })}
                                        placeholder="e.g. Type your name here"
                                    />
                                </div>

                                <div className="vs-toggle-row">
                                    <span>Required Field</span>
                                    <label className="fb-switch small">
                                        <input
                                            type="checkbox"
                                            checked={activeField.required}
                                            onChange={e => updateField(activeField.id, { required: e.target.checked })}
                                        />
                                        <span className="fb-slider"></span>
                                    </label>
                                </div>
                            </>
                        )}

                        {['dropdown', 'radio', 'checkbox'].includes(activeField.type) && (
                            <div className="vs-form-group" style={{ marginTop: '20px' }}>
                                <label>Options</label>
                                {(activeField.options || []).map((opt, i) => (
                                    <div key={i} className="fb-option-row" style={{ marginBottom: '8px' }}>
                                        <input
                                            type="text"
                                            className="vs-input"
                                            value={opt}
                                            onChange={e => {
                                                const n = [...(activeField.options || [])];
                                                n[i] = e.target.value;
                                                updateField(activeField.id, { options: n });
                                            }}
                                        />
                                        <button
                                            style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer' }}
                                            onClick={() => updateField(activeField.id, {
                                                options: (activeField.options || []).filter((_, j) => j !== i)
                                            })}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className="tally-add-opt"
                                    onClick={() => updateField(activeField.id, {
                                        options: [...(activeField.options || []), `Option ${(activeField.options?.length || 0) + 1}`]
                                    })}
                                >
                                    + Add option
                                </button>
                            </div>
                        )}

                        <div className="vs-modal-actions" style={{ marginTop: '30px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            <button
                                className="vs-secondary-btn"
                                style={{ flex: '1 1 45%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: '#fff', cursor: 'pointer' }}
                                onClick={() => moveField(activeField.id, 'up')}
                            >
                                <ChevronUp size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Move Up
                            </button>
                            <button
                                className="vs-secondary-btn"
                                style={{ flex: '1 1 45%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: '#fff', cursor: 'pointer' }}
                                onClick={() => moveField(activeField.id, 'down')}
                            >
                                <ChevronDown size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Move Down
                            </button>
                            <button
                                className="vs-secondary-btn"
                                style={{ flex: '1 1 45%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: '#fff', cursor: 'pointer' }}
                                onClick={() => {
                                    duplicateField(activeField.id);
                                    setActiveModal(null);
                                }}
                            >
                                <Copy size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Duplicate
                            </button>
                            <button
                                className="vs-danger-btn"
                                style={{ flex: '1 1 45%', padding: '12px', borderRadius: '12px', border: 'none', background: '#fff5f5', color: '#ff4d4d', cursor: 'pointer' }}
                                onClick={() => {
                                    removeField(activeField.id);
                                    setActiveModal(null);
                                    setActiveFieldId(null);
                                }}
                            >
                                <Trash2 size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> Delete
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Branding Modal */}
            <Modal
                isOpen={activeModal === 'branding'}
                onClose={() => setActiveModal(null)}
                title="Branding & Design"
                footer={<button className="vs-primary-btn" onClick={() => setActiveModal(null)}>Save Changes</button>}
            >
                <div className="vs-form-group">
                    <label>Cover Image</label>
                    {schema.branding.coverUrl ? (
                        <div className="vs-image-preview-box">
                            <img src={schema.branding.coverUrl} alt="Cover" />
                            <div className="vs-image-actions">
                                <button className="vs-icon-btn" onClick={() => coverInputRef.current?.click()}><Image size={16} /></button>
                                <button className="vs-icon-btn danger" onClick={() => setSchema(prev => ({ ...prev, branding: { ...prev.branding, coverUrl: '' } }))}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ) : (
                        <button className="vs-upload-placeholder" onClick={() => coverInputRef.current?.click()}>
                            <Image size={24} />
                            <span>Add Cover Image</span>
                        </button>
                    )}
                </div>

                <div className="vs-form-group">
                    <label>Profile Picture (DP)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {schema.branding.dpUrl ? (
                            <div className="vs-dp-preview-edit" onClick={() => dpInputRef.current?.click()}>
                                <img src={schema.branding.dpUrl} alt="DP" />
                                <div className="vs-dp-overlay"><Plus size={16} /></div>
                            </div>
                        ) : (
                            <button className="vs-dp-placeholder" onClick={() => dpInputRef.current?.click()}>
                                <CircleUser size={32} />
                            </button>
                        )}
                        <div style={{ flex: 1 }}>
                            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600 }}>Brand Logo / DP</p>
                            <p style={{ margin: 0, fontSize: '12px', color: '#888' }}>Upload a square image for better results.</p>
                        </div>
                    </div>
                </div>

                <div className="vs-form-group">
                    <label>Accent Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                            type="color"
                            className="vs-color-input"
                            value={schema.theme.accentColor}
                            onChange={e => setSchema(prev => ({ ...prev, theme: { ...prev.theme, accentColor: e.target.value } }))}
                        />
                        <span style={{ fontSize: '14px', fontVariantNumeric: 'tabular-nums' }}>{schema.theme.accentColor.toUpperCase()}</span>
                    </div>
                </div>
            </Modal>

            {/* Settings Modal (Customize) */}
            <Modal
                isOpen={activeModal === 'settings'}
                onClose={() => setActiveModal(null)}
                title="Form Settings"
                footer={<button className="vs-primary-btn" onClick={() => setActiveModal(null)}>Save Settings</button>}
            >
                <div className="vs-modal-tabs" style={{ display: 'flex', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
                    <button style={{ padding: '10px 0', border: 'none', background: 'none', borderBottom: '2px solid #111', fontWeight: 600, cursor: 'pointer' }}>Behaviour</button>
                </div>

                <div className="vs-form-group">
                    <label>Form Type</label>
                    <div className="tally-radio-group">
                        {[
                            { value: 'standard', label: 'Vertical (Standard)', icon: <Heading size={14} /> },
                            { value: 'chat', label: 'Step-by-step (Chat)', icon: <MessageSquare size={14} /> },
                        ].map(opt => (
                            <label key={opt.value} className={`tally-radio-opt ${schema.settings.formType === opt.value ? 'active' : ''}`}>
                                <input type="radio" name="ftype" checked={schema.settings.formType === opt.value} onChange={() => setSchema(prev => ({ ...prev, settings: { ...prev.settings, formType: opt.value as 'standard' | 'chat' } }))} />
                                {opt.icon} {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="vs-form-group">
                    <label>Submit Behavior</label>
                    <div className="tally-radio-group">
                        {[
                            { value: 'stay' as RedirectMode, label: 'Success Message', icon: <CheckSquare size={14} /> },
                            { value: 'url' as RedirectMode, label: 'Redirect URL', icon: <ExternalLink size={14} /> },
                            { value: 'whatsapp' as RedirectMode, label: 'WhatsApp Redirect', icon: <MessageSquare size={14} /> },
                        ].map(opt => (
                            <label key={opt.value} className={`tally-radio-opt ${schema.settings.redirectMode === opt.value ? 'active' : ''}`}>
                                <input type="radio" name="rmode" checked={schema.settings.redirectMode === opt.value} onChange={() => setSchema(prev => ({ ...prev, settings: { ...prev.settings, redirectMode: opt.value } }))} />
                                {opt.icon} {opt.label}
                            </label>
                        ))}
                    </div>
                </div>

                {schema.settings.redirectMode === 'stay' && (
                    <div className="vs-form-group">
                        <label>Success Message</label>
                        <textarea className="vs-textarea" rows={2} value={schema.settings.successMessage || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, successMessage: e.target.value } }))} placeholder="Thank you for your response!" />
                    </div>
                )}

                {schema.settings.redirectMode === 'url' && (
                    <div className="vs-form-group">
                        <label>Redirect URL</label>
                        <input className="vs-input" type="url" value={schema.settings.redirectUrl || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, redirectUrl: e.target.value } }))} placeholder="https://your-website.com/thanks" />
                    </div>
                )}

                {schema.settings.redirectMode === 'whatsapp' && (
                    <>
                        <div className="vs-form-group">
                            <label>WhatsApp Number</label>
                            <input className="vs-input" type="text" value={schema.settings.whatsappNumber || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, whatsappNumber: e.target.value } }))} placeholder="+919876543210" />
                        </div>
                        <div className="vs-form-group">
                            <label>Message Template</label>
                            <textarea className="vs-textarea" rows={3} value={schema.settings.whatsappMessageTemplate || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, whatsappMessageTemplate: e.target.value } }))} placeholder={'Hello {{name}}'} />
                            <p className="tally-hint">Available: {schema.fields.filter(f => !['heading', 'paragraph', 'divider'].includes(f.type)).map(f => `{{${f.fieldKey}}}`).join(', ') || 'Add fields first'}</p>
                        </div>
                    </>
                )}

                <div className="vs-form-group">
                    <label>Meta Pixel</label>
                    <div className="vs-toggle-row" style={{ marginBottom: '10px' }}>
                        <span>Enable Tracking</span>
                        <label className="fb-switch small">
                            <input type="checkbox" checked={schema.settings.pixelEnabled || false} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, pixelEnabled: e.target.checked } }))} />
                            <span className="fb-slider"></span>
                        </label>
                    </div>
                    {schema.settings.pixelEnabled && (
                        <>
                            <input className="vs-input" style={{ marginBottom: '10px' }} type="text" value={schema.settings.pixelId || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, pixelId: e.target.value } }))} placeholder="Pixel ID (e.g. 123456789)" />
                            <input className="vs-input" type="text" value={schema.settings.customEventName || ''} onChange={e => setSchema(prev => ({ ...prev, settings: { ...prev.settings, customEventName: e.target.value } }))} placeholder="Event Name (e.g. Lead)" />
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default FormEditor;
