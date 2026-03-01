import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    RefreshControl,
    Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, FileText, Copy, Trash2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function FormBuilder() {
    const { user } = useAuth();
    const router = useRouter();
    const [forms, setForms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (user) fetchForms();
    }, [user]);

    const fetchForms = async () => {
        if (!refreshing) setLoading(true);
        try {
            const { data, error } = await supabase
                .from('forms')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setForms(data || []);
        } catch (error) {
            console.error('Fetch forms error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchForms();
    };

    const createForm = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const { data, error } = await supabase
                .from('forms')
                .insert([{
                    title: 'Untitled Form',
                    user_id: user?.id,
                    fields: [
                        { id: '1', type: 'text', label: 'FullName', required: true },
                        { id: '2', type: 'phone', label: 'PhoneNumber', required: true }
                    ],
                    branding: { coverColor: '#7895CB' }
                }])
                .select();

            if (error) throw error;
            if (data) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.push(`/builder/${data[0].id}`);
            }
        } catch (error) {
            console.error('Create error:', error);
            Alert.alert('Error', 'Failed to create form');
        }
    };

    const deleteForm = (id: string) => {
        Alert.alert('Delete Form', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    const { error } = await supabase.from('forms').delete().eq('id', id);
                    if (!error) {
                        setForms(forms.filter(f => f.id !== id));
                    }
                }
            }
        ]);
    };

    const copyLink = (id: string) => {
        const url = `https://your-app-web.vercel.app/form/${id}`;
        Clipboard.setStringAsync(url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied', 'Form link copied to clipboard');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Forms</Text>
                <TouchableOpacity style={styles.iconBtn} onPress={createForm}>
                    <Plus size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#7895CB" />
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={styles.list}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#7895CB" />}
                    >
                        {forms.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No forms created yet. Tap + to create one.</Text>
                            </View>
                        ) : (
                            forms.map((form) => (
                                <BlurView key={form.id} intensity={15} tint="dark" style={styles.formCard}>
                                    <TouchableOpacity
                                        style={styles.formInfo}
                                        onPress={() => router.push(`/builder/${form.id}`)}
                                    >
                                        <View style={[styles.formIcon, { backgroundColor: form.branding?.coverColor || '#1a1a1a' }]}>
                                            <FileText size={20} color="#fff" />
                                        </View>
                                        <View style={styles.details}>
                                            <Text style={styles.formTitle}>{form.title}</Text>
                                            <Text style={styles.formSubtitle}>{form.fields?.length || 0} fields • {new Date(form.created_at).toLocaleDateString()}</Text>
                                        </View>
                                    </TouchableOpacity>

                                    <View style={styles.actions}>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => copyLink(form.id)}>
                                            <Copy size={18} color="#666" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.actionBtn} onPress={() => deleteForm(form.id)}>
                                            <Trash2 size={18} color="#FF5252" />
                                        </TouchableOpacity>
                                    </View>
                                </BlurView>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center', marginTop: 10 },
    headerTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
    iconBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { color: '#444', fontSize: 16, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
    list: { paddingHorizontal: 20, paddingBottom: 50 },
    formCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    formInfo: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    formIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    details: { flex: 1 },
    formTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    formSubtitle: { color: '#666', fontSize: 12, marginTop: 4 },
    actions: { flexDirection: 'row', gap: 10 },
    actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', justifyContent: 'center', alignItems: 'center' }
});
