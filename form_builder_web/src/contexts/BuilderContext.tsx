import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { FormSchema, FormField, FieldType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabaseClient';

interface BuilderContextType {
    schema: FormSchema;
    setSchema: React.Dispatch<React.SetStateAction<FormSchema>>;
    addField: (type: FieldType) => void;
    updateField: (id: string, updates: Partial<FormField>) => void;
    removeField: (id: string) => void;
    duplicateField: (id: string) => void;
    moveField: (id: string, direction: 'up' | 'down') => void;
    reorderFields: (activeId: string, overId: string) => void;
    publishForm: () => Promise<{ success: boolean; id?: string; error?: string }>;
}

const generateFieldKey = (label: string): string => {
    return label
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '')
        || 'field';
};

const getDefaultLabel = (type: FieldType): string => {
    const labels: Record<FieldType, string> = {
        short_text: 'Name',
        long_text: 'Message',
        email: 'Email',
        phone: 'WhatsApp Number',
        number: 'Number',
        date: 'Date',
        dropdown: 'Select Option',
        radio: 'Choose One',
        checkbox: 'Select All That Apply',
        textarea: 'Your Message',
        heading: 'Section Title',
        paragraph: 'Add some description text here...',
        divider: '',
        file_upload: 'Upload File',
    };
    return labels[type];
};

const defaultSchema: FormSchema = {
    id: '',
    title: '',
    description: '',
    branding: {
        coverColor: '#FCEBDE',
    },
    fields: [],
    settings: {
        redirectMode: 'stay',
        successMessage: 'Thank you! Your response has been recorded.',
        whatsappMessageTemplate: 'Hello,\nMy name is {{name}}\nI am interested in your services.',
        formType: 'standard',
    },
    submitButton: {
        text: 'Submit',
        color: '#7895CB',
        fullWidth: true,
    },
    theme: {
        backgroundColor: '#ffffff',
        textColor: '#1a1a1a',
        accentColor: '#7895CB',
        buttonColor: '#7895CB',
        buttonTextColor: '#ffffff',
        inputBackground: '#f5f5f5',
        inputBorder: '#e0e0e0',
    },
};

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

export const BuilderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [schema, setSchema] = useState<FormSchema>(() => {
        const saved = localStorage.getItem('form_builder_draft');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Migrate old schemas
                if (!parsed.settings?.redirectMode) {
                    parsed.settings = { ...parsed.settings, redirectMode: 'stay' };
                }
                if (!parsed.settings?.formType) {
                    parsed.settings = { ...parsed.settings, formType: 'standard' };
                }
                if (parsed.fields) {
                    parsed.fields = parsed.fields.map((f: FormField) => ({
                        ...f,
                        fieldKey: f.fieldKey || generateFieldKey(f.label),
                        width: f.width || 'full',
                    }));
                }
                // Migrate: add submitButton if missing
                if (!parsed.submitButton) {
                    parsed.submitButton = defaultSchema.submitButton;
                }
                // Migrate: add theme if missing
                if (!parsed.theme) {
                    parsed.theme = defaultSchema.theme;
                }
                return parsed;
            } catch (e) {
                console.error("Failed to parse saved schema", e);
            }
        }
        return defaultSchema;
    });

    React.useEffect(() => {
        localStorage.setItem('form_builder_draft', JSON.stringify(schema));
    }, [schema]);

    const addField = (type: FieldType) => {
        const label = getDefaultLabel(type);
        const newField: FormField = {
            id: uuidv4(),
            type,
            label,
            fieldKey: generateFieldKey(label),
            required: false,
            width: 'full',
            options: ['dropdown', 'radio', 'checkbox'].includes(type) ? ['Option 1', 'Option 2'] : undefined,
        };
        setSchema(prev => ({ ...prev, fields: [...prev.fields, newField] }));
    };

    const updateField = (id: string, updates: Partial<FormField>) => {
        setSchema(prev => ({
            ...prev,
            fields: prev.fields.map(f => {
                if (f.id !== id) return f;
                const updated = { ...f, ...updates };
                if (updates.label !== undefined) {
                    updated.fieldKey = generateFieldKey(updates.label);
                }
                return updated;
            })
        }));
    };

    const removeField = (id: string) => {
        setSchema(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== id)
        }));
    };

    const duplicateField = (id: string) => {
        setSchema(prev => {
            const idx = prev.fields.findIndex(f => f.id === id);
            if (idx === -1) return prev;
            const original = prev.fields[idx];
            const clone: FormField = {
                ...original,
                id: uuidv4(),
                label: `${original.label} (copy)`,
                fieldKey: generateFieldKey(`${original.label} copy`),
            };
            const newFields = [...prev.fields];
            newFields.splice(idx + 1, 0, clone);
            return { ...prev, fields: newFields };
        });
    };

    const moveField = (id: string, direction: 'up' | 'down') => {
        setSchema(prev => {
            const idx = prev.fields.findIndex(f => f.id === id);
            if (idx === -1) return prev;
            const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= prev.fields.length) return prev;

            const newFields = [...prev.fields];
            [newFields[idx], newFields[targetIdx]] = [newFields[targetIdx], newFields[idx]];
            return { ...prev, fields: newFields };
        });
    };

    const reorderFields = (activeId: string, overId: string) => {
        setSchema(prev => {
            const oldIndex = prev.fields.findIndex(f => f.id === activeId);
            const newIndex = prev.fields.findIndex(f => f.id === overId);
            if (oldIndex === -1 || newIndex === -1) return prev;

            const newFields = [...prev.fields];
            const [movedField] = newFields.splice(oldIndex, 1);
            newFields.splice(newIndex, 0, movedField);

            return { ...prev, fields: newFields };
        });
    };

    const publishForm = async () => {
        try {
            // Validation
            const inputFields = schema.fields.filter(f => !['heading', 'paragraph', 'divider'].includes(f.type));
            if (inputFields.length === 0) {
                return { success: false, error: 'Add at least 1 input field before publishing.' };
            }
            if (schema.settings.redirectMode === 'whatsapp' && !schema.settings.whatsappNumber?.trim()) {
                return { success: false, error: 'WhatsApp number is required for WhatsApp redirect.' };
            }

            let slug = schema.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
            if (!slug) slug = `form-${uuidv4().slice(0, 8)}`;

            const formData = {
                title: schema.title || 'Untitled Form',
                slug: slug,
                fields: schema.fields,
                branding: schema.branding,
                settings: schema.settings,
                submit_button: schema.submitButton,
                theme: schema.theme,
                is_published: true,
                updated_at: new Date().toISOString()
            };

            let result;
            if (schema.id) {
                result = await supabase.from('forms').update(formData).eq('id', schema.id).select();
            } else {
                result = await supabase.from('forms').insert([formData]).select();
            }

            if (result.error) throw result.error;

            const publishedForm = result.data[0];
            setSchema(prev => ({ ...prev, id: publishedForm.id, user_id: publishedForm.user_id }));

            return { success: true, id: publishedForm.id };
        } catch (error: unknown) {
            console.error("Error publishing form:", error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    };

    return (
        <BuilderContext.Provider value={{ schema, setSchema, addField, updateField, removeField, duplicateField, moveField, reorderFields, publishForm }}>
            {children}
        </BuilderContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useBuilder = () => {
    const context = useContext(BuilderContext);
    if (!context) throw new Error('useBuilder must be used within a BuilderProvider');
    return context;
};
