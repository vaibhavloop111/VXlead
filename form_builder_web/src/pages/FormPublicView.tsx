import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { FormSchema, FormField } from '../types';
import { supabase } from '../supabaseClient';
import './FormPublicView.css';

declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fbq: any;
    }
}

const injectPixel = (pixelId: string) => {
    if (!pixelId) return;
    const script = document.createElement('script');
    script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
    document.body.appendChild(noscript);
};

const FormPublicView: React.FC = () => {
    const { formId } = useParams<{ formId: string }>();
    const [schema, setSchema] = useState<FormSchema | null>(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [submitted, setSubmitted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const loadSchema = async () => {
            if (formId === 'preview') {
                const saved = localStorage.getItem('form_builder_draft');
                if (saved) {
                    try {
                        setSchema(JSON.parse(saved));
                        setLoading(false);
                        return;
                    } catch (e) {
                        console.error("Failed to parse preview schema", e);
                    }
                }
            }

            const { data, error: fetchError } = await supabase
                .from('forms')
                .select('*')
                .eq('id', formId)
                .single();

            if (fetchError) {
                console.error("Error fetching form:", fetchError);
                setLoading(false);
                return;
            }

            setSchema(data);
            if (data.settings?.pixelEnabled && data.settings?.pixelId) {
                injectPixel(data.settings.pixelId);
            }
            setLoading(false);
        };

        if (formId) loadSchema();
    }, [formId]);

    const handleInputChange = (fieldId: string, value: string | string[]) => {
        setAnswers(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
        setAnswers(prev => {
            const current = (prev[fieldId] as string[]) || [];
            if (checked) {
                return { ...prev, [fieldId]: [...current, option] };
            } else {
                return { ...prev, [fieldId]: current.filter(v => v !== option) };
            }
        });
    };

    const buildWhatsAppUrl = (whatsappNumber: string, template: string, fields: FormField[]): string => {
        let message = template;

        // Replace {{field_key}} variables
        fields.forEach(field => {
            const value = answers[field.id];
            const displayValue = Array.isArray(value) ? value.join(', ') : (value || '');
            const regex = new RegExp(`\\{\\{${field.fieldKey}\\}\\}`, 'gi');
            message = message.replace(regex, displayValue);

            // Also support old @Label format for backward compatibility
            const labelRegex = new RegExp(`@${field.label}`, 'gi');
            message = message.replace(labelRegex, displayValue);
        });

        const encodedMessage = encodeURIComponent(message);
        const cleanNumber = whatsappNumber.replace(/(?!^\+)\D/g, '');
        return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schema) return;
        setSubmitting(true);

        // 1. Save to Supabase as a Lead (not in preview)
        if (formId !== 'preview') {
            try {
                const nameField = schema.fields.find(f => f.label.toLowerCase().includes('name'));
                const phoneField = schema.fields.find(f => f.type === 'phone' || f.label.toLowerCase().includes('phone'));

                const flatAnswers: Record<string, string> = {};
                Object.entries(answers).forEach(([k, v]) => {
                    flatAnswers[k] = Array.isArray(v) ? v.join(', ') : v;
                });

                const leadData = {
                    form_id: schema.id,
                    user_id: schema.user_id,
                    name: nameField ? (flatAnswers[nameField.id] || 'N/A') : 'N/A',
                    phone: phoneField ? (flatAnswers[phoneField.id] || 'N/A') : 'N/A',
                    data: flatAnswers,
                    stage_id: schema.stage_id || null,
                };

                const { error: submitError } = await supabase.from('leads').insert([leadData]);
                if (submitError) {
                    console.error("Submission error:", submitError);
                    throw new Error(submitError.message);
                }

                // Track Meta Pixel
                if (schema.settings?.pixelEnabled && schema.settings?.pixelId && window.fbq) {
                    const eventName = schema.settings.customEventName || 'Lead';
                    window.fbq('track', eventName);
                }
            } catch (err) {
                console.error("Error saving lead:", err);
                alert("Failed to submit form. Please try again.");
                setSubmitting(false);
                return;
            }
        }

        // 2. Redirect Logic
        const mode = schema.settings.redirectMode || 'stay';

        if (mode === 'whatsapp' && schema.settings.whatsappNumber) {
            const url = buildWhatsAppUrl(
                schema.settings.whatsappNumber,
                schema.settings.whatsappMessageTemplate || '',
                schema.fields
            );
            window.location.href = url;
        } else if (mode === 'url' && schema.settings.redirectUrl) {
            window.location.href = schema.settings.redirectUrl;
        } else {
            setSubmitted(true);
        }

        setSubmitting(false);
    };

    const isChatMode = schema?.settings?.formType === 'chat';
    const inputFields = schema?.fields.filter(f => !['heading', 'paragraph', 'divider'].includes(f.type)) || [];
    const isLastStep = currentStep === inputFields.length - 1;

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        const currentField = inputFields[currentStep];
        const value = answers[currentField.id];

        // Simple validation for required fields
        if (currentField.required && (!value || (Array.isArray(value) && value.length === 0))) {
            // Note: In a real app, we'd use a nice toast or inline error
            alert(`Please answer: ${currentField.label}`);
            return;
        }

        if (currentStep < inputFields.length - 1) {
            setCurrentStep(prev => prev + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (loading) {
        return (
            <div className="fpv-wrapper">
                <div className="fpv-loading">
                    <div className="fpv-spinner" />
                    <p>Loading form...</p>
                </div>
            </div>
        );
    }

    if (!schema) {
        return (
            <div className="fpv-wrapper">
                <div className="fpv-error">
                    <h2>Form not found</h2>
                    <p>This form may have been removed or the link is incorrect.</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="fpv-wrapper">
                <div className="fpv-success-card">
                    <div className="fpv-success-icon">✅</div>
                    <h2>{schema.settings.successMessage || 'Thank you! Your response has been recorded.'}</h2>
                </div>
            </div>
        );
    }

    const theme = schema.theme;
    const themeStyle = theme ? {
        '--fpv-bg': theme.backgroundColor,
        '--fpv-text': theme.textColor,
        '--fpv-accent': theme.accentColor,
        '--fpv-btn': theme.buttonColor,
        '--fpv-btn-text': theme.buttonTextColor,
        '--fpv-input-bg': theme.inputBackground,
        '--fpv-input-border': theme.inputBorder,
    } as React.CSSProperties : {};

    return (
        <div className="fpv-wrapper" style={themeStyle}>
            <div className="fpv-form-card">
                {/* Cover */}
                {(schema.branding.coverUrl || schema.branding.coverColor) && (
                    <div
                        className="fpv-cover"
                        style={{
                            backgroundColor: schema.branding.coverColor || '#FCEBDE',
                            backgroundImage: schema.branding.coverUrl ? `url(${schema.branding.coverUrl})` : 'none',
                            backgroundPosition: `50% ${schema.branding.coverPosition || 50}%`
                        }}
                    />
                )}

                <div className="fpv-content">
                    {/* Logo */}
                    {schema.branding.dpUrl && (
                        <div className="fpv-logo" style={{ backgroundImage: `url(${schema.branding.dpUrl})` }} />
                    )}

                    {/* Title */}
                    {schema.title && <h1 className="fpv-title">{schema.title}</h1>}
                    {schema.description && <p className="fpv-description">{schema.description}</p>}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="fpv-form">
                        {isChatMode && (
                            <div className="fpv-progress">
                                <div
                                    className="fpv-progress-bar"
                                    style={{ width: `${((currentStep + 1) / inputFields.length) * 100}%` }}
                                />
                                <span className="fpv-progress-text">{currentStep + 1} of {inputFields.length}</span>
                            </div>
                        )}

                        {schema.fields.map((field) => {
                            if (isChatMode) {
                                const currentInputField = inputFields[currentStep];
                                if (field.id === currentInputField?.id) {
                                    return (
                                        <div key={field.id} className="fpv-step vs-slide-up">
                                            {renderField(field, answers, handleInputChange, handleCheckboxChange)}
                                        </div>
                                    );
                                }
                                return null;
                            }

                            return (
                                <div key={field.id} className={`fpv-field ${field.width === 'half' ? 'half' : ''}`}>
                                    {renderField(field, answers, handleInputChange, handleCheckboxChange)}
                                </div>
                            );
                        })}

                        <div className="fpv-nav-btns" style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            {isChatMode && currentStep > 0 && (
                                <button type="button" className="fpv-back-btn" onClick={handleBack}>
                                    Back
                                </button>
                            )}

                            {isChatMode && !isLastStep ? (
                                <button type="button" className="fpv-next-btn" onClick={handleNext} style={{ flex: 1 }}>
                                    Next →
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="fpv-submit-btn"
                                    disabled={submitting}
                                    style={{
                                        backgroundColor: schema.submitButton?.color || schema.theme?.buttonColor,
                                        color: schema.submitButton?.buttonTextColor || schema.theme?.buttonTextColor,
                                        width: schema.submitButton?.fullWidth ? '100%' : 'auto',
                                        flex: 1
                                    }}
                                >
                                    {submitting ? 'Submitting...' : (schema.submitButton?.text || 'Submit')} →
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

function renderField(
    field: FormField,
    answers: Record<string, string | string[]>,
    onChange: (id: string, value: string) => void,
    onCheckbox: (id: string, option: string, checked: boolean) => void
) {
    // Layout blocks
    if (field.type === 'heading') {
        return <h2 className="fpv-heading">{field.label}</h2>;
    }
    if (field.type === 'paragraph') {
        return <p className="fpv-paragraph">{field.label}</p>;
    }
    if (field.type === 'divider') {
        return <hr className="fpv-divider" />;
    }

    // Input fields
    return (
        <>
            <label className="fpv-label">
                {field.label}
                {field.required && <span className="fpv-required">*</span>}
            </label>

            {field.type === 'textarea' || field.type === 'long_text' ? (
                <textarea
                    className="fpv-textarea"
                    required={field.required}
                    value={(answers[field.id] as string) || ''}
                    onChange={e => onChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Your answer'}
                    rows={4}
                />
            ) : field.type === 'dropdown' ? (
                <select
                    className="fpv-select"
                    required={field.required}
                    value={(answers[field.id] as string) || ''}
                    onChange={e => onChange(field.id, e.target.value)}
                >
                    <option value="">{field.placeholder || 'Select...'}</option>
                    {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                    ))}
                </select>
            ) : field.type === 'radio' ? (
                <div className="fpv-radio-group">
                    {field.options?.map((opt, i) => (
                        <label key={i} className="fpv-radio-item">
                            <input
                                type="radio"
                                name={field.id}
                                value={opt}
                                required={field.required}
                                checked={(answers[field.id] as string) === opt}
                                onChange={() => onChange(field.id, opt)}
                            />
                            <span className="fpv-radio-custom" />
                            {opt}
                        </label>
                    ))}
                </div>
            ) : field.type === 'checkbox' ? (
                <div className="fpv-checkbox-group">
                    {field.options?.map((opt, i) => (
                        <label key={i} className="fpv-checkbox-item">
                            <input
                                type="checkbox"
                                checked={((answers[field.id] as string[]) || []).includes(opt)}
                                onChange={e => onCheckbox(field.id, opt, e.target.checked)}
                            />
                            <span className="fpv-check-custom" />
                            {opt}
                        </label>
                    ))}
                </div>
            ) : field.type === 'file_upload' ? (
                <input
                    className="fpv-input fpv-file-input"
                    type="file"
                    required={field.required}
                    onChange={e => onChange(field.id, e.target.files?.[0]?.name || '')}
                />
            ) : (
                <input
                    className="fpv-input"
                    type={
                        field.type === 'email' ? 'email' :
                            field.type === 'number' ? 'number' :
                                field.type === 'phone' ? 'tel' :
                                    field.type === 'date' ? 'date' :
                                        'text'
                    }
                    required={field.required}
                    value={(answers[field.id] as string) || ''}
                    onChange={e => onChange(field.id, e.target.value)}
                    placeholder={field.placeholder || 'Your answer'}
                />
            )}
        </>
    );
}

export default FormPublicView;
