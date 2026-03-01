import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    TextInput,
    ActivityIndicator,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Share
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Settings as SettingsIcon,
    Type,
    Hash,
    Mail,
    Phone,
    Check,
    Save,
    Share2
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

const FIELD_TYPES = [
    { type: 'text', icon: <Type size={18} color="#fff" />, label: 'Text Input' },
    { type: 'number', icon: <Hash size={18} color="#fff" />, label: 'Number' },
    { type: 'email', icon: <Mail size={18} color="#fff" />, label: 'Email' },
    { type: 'phone', icon: <Phone size={18} color="#fff" />, label: 'Phone' },
];

export default function FormEditor() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();

    const [form, setForm] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Field Edit Modal
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [fieldLabel, setFieldLabel] = useState('');
    const [fieldRequired, setFieldRequired] = useState(false);

    // Add Field Modal
    const [showAddFields, setShowAddFields] = useState(false);

    // Settings & Branding Modal
    const [showSettings, setShowSettings] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [pixelId, setPixelId] = useState('');
    const [coverColor, setCoverColor] = useState('#FCEBDE');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (id) fetchForm();
    }, [id]);

    const fetchForm = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('forms')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            Alert.alert('Error', 'Could not load form');
            router.back();
        } else {
            setForm(data);
            setWhatsappNumber(data.settings?.whatsappNumber || '');
            setWhatsappMessage(data.settings?.whatsappMessageTemplate || '');
            setPixelId(data.settings?.pixelId || '');
            setCoverColor(data.branding?.coverColor || '#FCEBDE');
            setDescription(data.description || '');

            // Ensure form has a stage_id if it's missing
            if (!data.stage_id) {
                const { data: stages } = await supabase
                    .from('stages')
                    .select('id')
                    .eq('user_id', user?.id)
                    .order('order_index', { ascending: true })
                    .limit(1);

                if (stages && stages.length > 0) {
                    await supabase
                        .from('forms')
                        .update({ stage_id: stages[0].id })
                        .eq('id', id);
                }
            }
        }
        setLoading(false);
    };

    const saveForm = async (updatedForm = form) => {
        setSaving(true);
        const { error } = await supabase
            .from('forms')
            .update({
                title: updatedForm.title,
                description: description,
                fields: updatedForm.fields,
                branding: { ...updatedForm.branding, coverColor },
                settings: {
                    ...updatedForm.settings,
                    whatsappNumber,
                    whatsappMessageTemplate: whatsappMessage,
                    pixelId
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) Alert.alert('Error', error.message);
        else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSaving(false);
        }
    };

    const addField = (type: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newField = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            label: `New ${type} field`,
            required: false,
            placeholder: ''
        };

        const updatedFields = [...(form.fields || []), newField];
        const updatedForm = { ...form, fields: updatedFields };
        setForm(updatedForm);
        setShowAddFields(false);
        saveForm(updatedForm);
    };

    const removeField = (fieldId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const updatedFields = form.fields.filter((f: any) => f.id !== fieldId);
        const updatedForm = { ...form, fields: updatedFields };
        setForm(updatedForm);
        saveForm(updatedForm);
    };

    const editField = (field: any) => {
        setEditingFieldId(field.id);
        setFieldLabel(field.label);
        setFieldRequired(field.required);
    };

    const updateFieldDetails = () => {
        const updatedFields = form.fields.map((f: any) =>
            f.id === editingFieldId ? { ...f, label: fieldLabel, required: fieldRequired } : f
        );
        const updatedForm = { ...form, fields: updatedFields };
        setForm(updatedForm);
        setEditingFieldId(null);
        saveForm(updatedForm);
    };

    const shareForm = async () => {
        const url = `https://your-form-link.com/f/${id}`;
        await Share.share({
            message: `Please fill out this form: ${url}`,
            url: url
        });
    };

    if (loading || !form) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#4A55A2" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <TextInput
                    style={styles.formTitleInput}
                    value={form.title}
                    onChangeText={(text) => setForm({ ...form, title: text })}
                    onBlur={() => saveForm()}
                    placeholder="Form Title"
                    placeholderTextColor="#666"
                />
                <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.shareBtn}>
                    <SettingsIcon size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={shareForm} style={styles.shareBtn}>
                    <Share2 size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={[styles.coverPreview, { backgroundColor: coverColor }]} />

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <TextInput
                    style={styles.descriptionInput}
                    value={description}
                    onChangeText={setDescription}
                    onBlur={() => saveForm()}
                    placeholder="Add a description..."
                    placeholderTextColor="#444"
                    multiline
                />

                <Text style={styles.sectionTitle}>Form Fields</Text>

                {form.fields && form.fields.length > 0 ? (
                    form.fields.map((field: any) => (
                        <BlurView key={field.id} intensity={10} tint="dark" style={styles.fieldCard}>
                            <View style={styles.fieldHeader}>
                                <View style={styles.fieldTypeIcon}>
                                    {FIELD_TYPES.find(t => t.type === field.type)?.icon}
                                </View>
                                <Text style={styles.fieldLabelText}>{field.label}</Text>
                                {field.required && <Text style={styles.requiredStar}>*</Text>}
                            </View>

                            <View style={styles.fieldActions}>
                                <TouchableOpacity onPress={() => editField(field)} style={styles.fieldBtn}>
                                    <SettingsIcon size={18} color="#aaa" />
                                    <Text style={styles.fieldBtnText}>Settings</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => removeField(field.id)} style={styles.fieldBtn}>
                                    <Trash2 size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No fields added yet. TAP + to add.</Text>
                    </View>
                )}

                <TouchableOpacity style={styles.addFieldBtn} onPress={() => setShowAddFields(true)}>
                    <Plus size={24} color="#fff" />
                    <Text style={styles.addFieldBtnText}>Add New Field</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Save Indicator */}
            {saving && (
                <BlurView intensity={80} tint="dark" style={styles.savingBadge}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.savingText}>Syncing...</Text>
                </BlurView>
            )}

            {/* Add Field Modal */}
            <Modal visible={showAddFields} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAddFields(false)}
                >
                    <BlurView intensity={90} tint="dark" style={styles.addFieldModal}>
                        <Text style={styles.modalTitle}>Choose Field Type</Text>
                        <View style={styles.fieldTypeGrid}>
                            {FIELD_TYPES.map((ft) => (
                                <TouchableOpacity
                                    key={ft.type}
                                    style={styles.fieldTypeBtn}
                                    onPress={() => addField(ft.type)}
                                >
                                    <View style={styles.fieldTypeIconLarge}>{ft.icon}</View>
                                    <Text style={styles.fieldTypeLabel}>{ft.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </BlurView>
                </TouchableOpacity>
            </Modal>

            {/* Settings & Branding Modal */}
            <Modal visible={showSettings} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={100} tint="dark" style={styles.settingsModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Form Settings</Text>
                            <TouchableOpacity onPress={() => { setShowSettings(false); saveForm(); }}>
                                <Check size={24} color="#7895CB" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            <Text style={styles.inputLabel}>WhatsApp Redirect Number</Text>
                            <TextInput
                                style={styles.input}
                                value={whatsappNumber}
                                onChangeText={setWhatsappNumber}
                                placeholder="+919876543210"
                                placeholderTextColor="#666"
                                keyboardType="phone-pad"
                            />

                            <Text style={styles.inputLabel}>WhatsApp Message Template</Text>
                            <TextInput
                                style={[styles.input, { height: 80 }]}
                                value={whatsappMessage}
                                onChangeText={setWhatsappMessage}
                                placeholder="Hello @Name, I have submitted..."
                                placeholderTextColor="#666"
                                multiline
                            />
                            <Text style={styles.hintText}>Use @Label to inject field values.</Text>

                            <View style={styles.divider} />

                            <Text style={styles.inputLabel}>Marketing: Meta Pixel ID</Text>
                            <TextInput
                                style={styles.input}
                                value={pixelId}
                                onChangeText={setPixelId}
                                placeholder="1234567890..."
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                            />
                            <Text style={styles.hintText}>Enter your Meta Pixel ID for ad tracking.</Text>

                            <View style={styles.divider} />

                            <Text style={styles.inputLabel}>Branding: Cover Color</Text>
                            <View style={styles.colorGrid}>
                                {['#FCEBDE', '#E5E0FF', '#D2E9E9', '#F8F6F4', '#000000', '#4A55A2'].map(color => (
                                    <TouchableOpacity
                                        key={color}
                                        style={[styles.colorOption, { backgroundColor: color }, coverColor === color && styles.colorOptionActive]}
                                        onPress={() => setCoverColor(color)}
                                    />
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.saveSettingsBtn}
                            onPress={() => { setShowSettings(false); saveForm(); }}
                        >
                            <Text style={styles.btnText}>Apply Changes</Text>
                        </TouchableOpacity>
                    </BlurView>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    backBtn: { padding: 8 },
    formTitleInput: { flex: 1, color: '#fff', fontSize: 20, fontWeight: 'bold', marginHorizontal: 12 },
    shareBtn: { padding: 8, marginLeft: 4 },
    coverPreview: { height: 100, width: '100%' },
    descriptionInput: { color: '#aaa', fontSize: 14, marginBottom: 20 },
    content: { flex: 1 },
    scrollContent: { padding: 20 },
    sectionTitle: { color: '#aaa', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: '600' },
    fieldCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    fieldHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    fieldTypeIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    fieldLabelText: { color: '#fff', fontSize: 16, fontWeight: '500' },
    requiredStar: { color: '#ef4444', marginLeft: 4 },
    fieldActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 12, gap: 16 },
    fieldBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    fieldBtnText: { color: '#aaa', fontSize: 14 },
    addFieldBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#111', borderWidth: 1, borderStyle: 'dashed', borderColor: '#444', borderRadius: 16, padding: 20, marginTop: 12 },
    addFieldBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#444', fontSize: 14 },
    savingBadge: { position: 'absolute', top: 120, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.6)' },
    savingText: { color: '#fff', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    addFieldModal: { padding: 24, borderRadius: 24, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    fieldTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
    fieldTypeBtn: { width: '45%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 16, alignItems: 'center', gap: 12 },
    fieldTypeIconLarge: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
    fieldTypeLabel: { color: '#aaa', fontSize: 14, fontWeight: '500' },
    editFieldModal: { padding: 24, paddingBottom: 40, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', position: 'absolute', bottom: 0, width: '100%', alignSelf: 'center' },
    settingsModal: { padding: 24, borderRadius: 32, overflow: 'hidden', maxHeight: '80%' },
    inputLabel: { color: '#aaa', fontSize: 12, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 15, color: '#fff', fontSize: 16 },
    hintText: { color: '#666', fontSize: 11, marginTop: 4 },
    divider: { height: 1, backgroundColor: '#222', marginVertical: 20 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
    colorOption: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent' },
    colorOptionActive: { borderColor: '#7895CB' },
    saveSettingsBtn: { backgroundColor: '#4A55A2', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#444', justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#4A55A2', borderColor: '#333' },
    checkboxLabel: { color: '#fff', fontSize: 16 },
    modalButtons: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
    btnCancel: { backgroundColor: '#222' },
    btnSave: { backgroundColor: '#4A55A2' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
