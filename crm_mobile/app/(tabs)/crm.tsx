import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Linking,
    ActivityIndicator,
    Modal,
    TextInput,
    Dimensions,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
    Phone,
    MessageCircle,
    ChevronRight,
    ChevronLeft,
    Plus,
    User as UserIcon,
    Settings,
    X
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function CRMLeads() {
    const { user } = useAuth();
    const [stages, setStages] = useState<any[]>([]);
    const [leads, setLeads] = useState<any[]>([]);
    const [activeStageId, setActiveStageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [showAddLead, setShowAddLead] = useState(false);
    const [showAddStage, setShowAddStage] = useState(false);
    const [newLeadName, setNewLeadName] = useState('');
    const [newLeadPhone, setNewLeadPhone] = useState('');
    const [newStageName, setNewStageName] = useState('');
    const [newStageTemplate, setNewStageTemplate] = useState('');

    useEffect(() => {
        if (user) fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .eq('user_id', user?.id)
                .order('order_index', { ascending: true });

            if (stagesError) throw stagesError;

            let currentStages = stagesData;

            if (stagesData.length === 0) {
                const defaults = [
                    { name: 'New', order_index: 0, user_id: user?.id },
                    { name: 'Contacted', order_index: 1, user_id: user?.id },
                    { name: 'Follow Up', order_index: 2, user_id: user?.id },
                    { name: 'Closed', order_index: 3, user_id: user?.id }
                ];
                const { data: inserted, error: insError } = await supabase.from('stages').insert(defaults).select();
                if (insError) throw insError;
                currentStages = inserted;
            }

            setStages(currentStages);
            if (currentStages.length > 0 && !activeStageId) {
                setActiveStageId(currentStages[0].id);
            }

            const { data: leadsData, error: leadsError } = await supabase
                .from('leads')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (leadsError) throw leadsError;
            setLeads(leadsData);

        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phone: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL(`tel:${phone}`);
    };

    const handleWhatsApp = (phone: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const cleanPhone = phone.replace(/\D/g, '');
        Linking.openURL(`whatsapp://send?phone=${cleanPhone}`);
    };

    const moveLead = async (leadId: string, direction: 'next' | 'prev') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) return;

        const currentStageIndex = stages.findIndex(s => s.id === currentLead.stage_id);
        let nextStageIndex = direction === 'next' ? currentStageIndex + 1 : currentStageIndex - 1;

        if (nextStageIndex >= 0 && nextStageIndex < stages.length) {
            const nextStageId = stages[nextStageIndex].id;

            const { error } = await supabase
                .from('leads')
                .update({ stage_id: nextStageId })
                .eq('id', leadId);

            if (!error) {
                setLeads(leads.map(l => l.id === leadId ? { ...l, stage_id: nextStageId } : l));
            }
        }
    };

    const addLead = async () => {
        if (!newLeadName || !newLeadPhone || !activeStageId) return;

        const { data, error } = await supabase
            .from('leads')
            .insert([{
                name: newLeadName,
                phone: newLeadPhone,
                stage_id: activeStageId,
                user_id: user?.id
            }])
            .select();

        if (!error && data) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setLeads([data[0], ...leads]);
            setNewLeadName('');
            setNewLeadPhone('');
            setShowAddLead(false);
        }
    };

    const addStage = async () => {
        if (!newStageName) return;

        const { data, error } = await supabase
            .from('stages')
            .insert([{
                name: newStageName,
                order_index: stages.length,
                user_id: user?.id
                // Note: user needs to add message_template column in Supabase dashboard
            }])
            .select();

        if (!error && data) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStages([...stages, data[0]]);
            setNewStageName('');
            setNewStageTemplate('');
            setShowAddStage(false);
        }
    };

    const activeLeads = leads.filter(l => l.stage_id === activeStageId);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Pipeline Stages</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.iconBtn}>
                        <Settings size={22} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => setShowAddStage(true)}>
                        <Plus size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stage Cards List */}
            <View style={styles.stageScrollContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageScroll}>
                    {stages.map((stage) => {
                        const count = leads.filter(l => l.stage_id === stage.id).length;
                        const isActive = activeStageId === stage.id;

                        return (
                            <TouchableOpacity
                                key={stage.id}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveStageId(stage.id);
                                }}
                                style={[styles.stageCard, isActive && styles.stageCardActive]}
                            >
                                <Text style={[styles.stageName, isActive && styles.stageNameActive]}>{stage.name}</Text>
                                <View style={[styles.stageCountBox, isActive && styles.stageCountBoxActive]}>
                                    <Text style={[styles.stageCountText, isActive && styles.stageCountTextActive]}>{count}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Leads List */}
            {loading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color="#7895CB" />
                </View>
            ) : (
                <ScrollView style={styles.leadList} contentContainerStyle={styles.leadListContent}>
                    {activeLeads.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No leads in this stage</Text>
                        </View>
                    ) : (
                        activeLeads.map((lead) => (
                            <BlurView key={lead.id} intensity={15} tint="dark" style={styles.leadCard}>
                                <View style={styles.leadInfo}>
                                    <View style={styles.avatar}>
                                        <UserIcon size={20} color="#fff" />
                                    </View>
                                    <View style={styles.leadDetails}>
                                        <Text style={styles.leadName}>{lead.name}</Text>
                                        <Text style={styles.leadPhone}>{lead.phone}</Text>
                                        <Text style={styles.leadDate}>{new Date(lead.created_at).toLocaleDateString()}</Text>
                                    </View>
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity onPress={() => handleCall(lead.phone)} style={styles.actionBtn}>
                                        <Phone size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleWhatsApp(lead.phone)} style={styles.actionBtn}>
                                        <MessageCircle size={20} color="#fff" />
                                    </TouchableOpacity>

                                    <View style={styles.moveActions}>
                                        <TouchableOpacity onPress={() => moveLead(lead.id, 'prev')} style={styles.moveBtn}>
                                            <ChevronLeft size={20} color="#aaa" />
                                        </TouchableOpacity>
                                        <View style={styles.moveDivider} />
                                        <TouchableOpacity onPress={() => moveLead(lead.id, 'next')} style={styles.moveBtn}>
                                            <ChevronRight size={20} color="#aaa" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </BlurView>
                        ))
                    )}
                </ScrollView>
            )}

            <TouchableOpacity style={styles.fab} onPress={() => setShowAddLead(true)}>
                <Plus size={32} color="#fff" />
            </TouchableOpacity>

            {/* Create New Lead Modal */}
            <Modal visible={showAddLead} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Lead</Text>
                            <TouchableOpacity onPress={() => setShowAddLead(false)}>
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>FULL NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. John Doe"
                            placeholderTextColor="#444"
                            value={newLeadName}
                            onChangeText={setNewLeadName}
                        />

                        <Text style={styles.inputLabel}>PHONE NUMBER</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 98765 43210"
                            placeholderTextColor="#444"
                            keyboardType="phone-pad"
                            value={newLeadPhone}
                            onChangeText={setNewLeadPhone}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setShowAddLead(false)} style={[styles.modalBtn, styles.btnCancel]}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addLead} style={[styles.modalBtn, styles.btnSave]}>
                                <Text style={styles.btnText}>Save Lead</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </KeyboardAvoidingView>
            </Modal>

            {/* Create New Stage Modal */}
            <Modal visible={showAddStage} transparent animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create New Stage</Text>
                            <TouchableOpacity onPress={() => setShowAddStage(false)}>
                                <X size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>STAGE NAME</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Day 3 Follow Up"
                            placeholderTextColor="#444"
                            value={newStageName}
                            onChangeText={setNewStageName}
                        />

                        <Text style={styles.inputLabel}>MESSAGE TEMPLATE</Text>
                        <View style={styles.tagRow}>
                            {['@name', '@phone', '@city', '@age'].map(tag => (
                                <TouchableOpacity key={tag} style={styles.tag} onPress={() => setNewStageTemplate(newStageTemplate + ' ' + tag)}>
                                    <Text style={styles.tagText}>{tag}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Hi {{name}}, how are you doing in {{city}}?"
                            placeholderTextColor="#444"
                            multiline
                            numberOfLines={4}
                            value={newStageTemplate}
                            onChangeText={setNewStageTemplate}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity onPress={() => setShowAddStage(false)} style={[styles.modalBtn, styles.btnCancel]}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={addStage} style={[styles.modalBtn, styles.btnSave]}>
                                <Text style={styles.btnText}>Create Stage</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', marginTop: 10 },
    headerTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
    headerActions: { flexDirection: 'row' },
    iconBtn: { width: 45, height: 45, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    stageScrollContainer: { height: 75, marginBottom: 15 },
    stageScroll: { paddingHorizontal: 15, alignItems: 'center' },
    stageCard: { minWidth: 100, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, marginRight: 12, backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', flexDirection: 'row', alignItems: 'center' },
    stageCardActive: { backgroundColor: '#7895CB', borderColor: '#7895CB' },
    stageName: { color: '#666', fontSize: 14, fontWeight: '700' },
    stageNameActive: { color: '#fff' },
    stageCountBox: { marginLeft: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    stageCountBoxActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
    stageCountText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
    stageCountTextActive: { color: '#fff' },
    leadList: { flex: 1 },
    leadListContent: { padding: 15, paddingBottom: 100 },
    leadCard: { borderRadius: 24, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    leadInfo: { flexDirection: 'row', marginBottom: 18 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    leadDetails: { justifyContent: 'center' },
    leadName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    leadPhone: { color: '#666', fontSize: 14, marginTop: 2 },
    leadDate: { color: '#444', fontSize: 11, marginTop: 4 },
    actionRow: { flexDirection: 'row', alignItems: 'center' },
    actionBtn: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    moveActions: { flexDirection: 'row', marginLeft: 'auto', backgroundColor: '#111', borderRadius: 16, padding: 4, alignItems: 'center' },
    moveBtn: { padding: 8 },
    moveDivider: { width: 1, height: 20, backgroundColor: '#222' },
    fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#7895CB', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#7895CB', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 12 },
    emptyState: { padding: 80, alignItems: 'center' },
    emptyText: { color: '#444', fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    modalContent: { padding: 24, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    inputLabel: { color: '#666', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginLeft: 5 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, color: '#fff', fontSize: 16, marginBottom: 20 },
    textArea: { minHeight: 120, textAlignVertical: 'top' },
    tagRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.08)' },
    tagText: { color: '#aaa', fontSize: 12, fontWeight: '600' },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalBtn: { flex: 1, padding: 18, borderRadius: 16, alignItems: 'center' },
    btnCancel: { backgroundColor: '#1a1a1a' },
    btnSave: { backgroundColor: '#7895CB' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
