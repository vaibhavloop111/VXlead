export type FieldType =
    | 'short_text'
    | 'long_text'
    | 'email'
    | 'phone'
    | 'number'
    | 'date'
    | 'dropdown'
    | 'radio'
    | 'checkbox'
    | 'textarea'
    | 'heading'
    | 'paragraph'
    | 'divider'
    | 'file_upload';

export interface FormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    fieldKey: string;
    width: 'full' | 'half';
    options?: string[]; // for dropdown, radio, checkbox
}

export interface FormBranding {
    coverUrl?: string;
    dpUrl?: string;
    coverColor?: string;
    coverPosition?: number; // 0 to 100 for vertical alignment
}

export type RedirectMode = 'stay' | 'url' | 'whatsapp';

export interface SubmitButtonConfig {
    text: string;
    color: string;
    buttonTextColor?: string;
    fullWidth: boolean;
}

export interface FormTheme {
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    buttonColor: string;
    buttonTextColor: string;
    inputBackground: string;
    inputBorder: string;
}

export interface FormSettings {
    redirectMode: RedirectMode;
    redirectUrl?: string;
    whatsappNumber?: string;
    whatsappMessageTemplate?: string;
    pixelId?: string;
    pixelEnabled?: boolean;
    customEventName?: string;
    successMessage?: string;
    formType: 'standard' | 'chat';
}

export interface FormSchema {
    id: string;
    user_id?: string;
    title: string;
    description?: string;
    branding: FormBranding;
    fields: FormField[];
    settings: FormSettings;
    submitButton: SubmitButtonConfig;
    theme: FormTheme;
    stage_id?: string;
}
