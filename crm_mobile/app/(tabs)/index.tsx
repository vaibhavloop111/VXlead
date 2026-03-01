import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Image,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
    Bell,
    Phone,
    MessageSquare,
    ArrowRightLeft,
    UserPlus,
    Target
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function Dashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        calls: 0,
        messages: 0,
        moves: 0,
        joined: 0,
        followUps: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) fetchStats();
    }, [user]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            // Fetch total leads
            const { count: totalLeads } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user?.id);

            // Fetch leads joined today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: joinedToday } = await supabase
                .from('leads')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user?.id)
                .gte('created_at', today.toISOString());

            // Mocking some stats for the visual (as we don't track calls/messages in DB yet)
            setStats({
                calls: 5,
                messages: 12,
                moves: 2,
                joined: joinedToday || 0,
                followUps: 5
            });
        } catch (error) {
            console.error('Stats error:', error);
        } finally {
            setLoading(false);
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning 👋';
        if (hour < 17) return 'Good Afternoon 👋';
        return 'Good Evening 👋';
    };

    const formatDate = () => {
        return new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header Section */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greetingText}>{getGreeting()}</Text>
                        <Text style={styles.dateText}>{formatDate()}</Text>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell size={22} color="#fff" />
                            <View style={styles.dot} />
                        </TouchableOpacity>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/100' }}
                            style={styles.avatar}
                        />
                    </View>
                </View>

                {/* Overdue Banner */}
                <BlurView intensity={30} tint="dark" style={styles.banner}>
                    <View style={styles.bannerIconBox}>
                        <Bell size={20} color="#FF8A65" />
                    </View>
                    <View style={styles.bannerTextContent}>
                        <Text style={styles.bannerTitle}>{stats.followUps} Follow-ups Today</Text>
                        <Text style={styles.bannerSubtitle}>2 Overdue</Text>
                    </View>
                    <TouchableOpacity>
                        <ArrowRightLeft size={18} color="#aaa" />
                    </TouchableOpacity>
                </BlurView>

                {/* Today's Summary Grid */}
                <Text style={styles.sectionTitle}>TODAY'S SUMMARY</Text>
                <View style={styles.grid}>
                    <SummaryCard
                        icon={<Phone size={20} color="#7895CB" />}
                        value={stats.calls}
                        label="CALLS"
                        color="#7895CB"
                    />
                    <SummaryCard
                        icon={<MessageSquare size={20} color="#A278CB" />}
                        value={stats.messages}
                        label="MESSAGES"
                        color="#A278CB"
                    />
                    <SummaryCard
                        icon={<ArrowRightLeft size={20} color="#CB9B78" />}
                        value={stats.moves}
                        label="MOVES"
                        color="#CB9B78"
                    />
                    <SummaryCard
                        icon={<UserPlus size={20} color="#78CB86" />}
                        value={stats.joined}
                        label="JOINED"
                        color="#78CB86"
                    />
                </View>

                {/* Target Progress Section */}
                <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                        <Target size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.progressTitle}>TARGET PROGRESS</Text>
                    </View>

                    <ProgressBar label="Calls" current={stats.calls} max={20} color="#3B82F6" />
                    <ProgressBar label="Messages" current={stats.messages} max={50} color="#A855F7" />
                    <ProgressBar label="Follow-ups" current={3} max={10} color="#F97316" />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function SummaryCard({ icon, value, label, color }: any) {
    return (
        <BlurView intensity={15} tint="dark" style={styles.card}>
            <View style={[styles.cardIconBox, { backgroundColor: `${color}20` }]}>
                {icon}
            </View>
            <View>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardLabel}>{label}</Text>
            </View>
        </BlurView>
    );
}

function ProgressBar({ label, current, max, color }: any) {
    const progress = (current / max) * 100;
    return (
        <View style={styles.progressRow}>
            <View style={styles.progressLabels}>
                <Text style={styles.labelTitle}>{label}</Text>
                <Text style={styles.labelStats}>{current} / {max}</Text>
            </View>
            <View style={styles.progressBg}>
                <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, marginTop: 10 },
    greetingText: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    dateText: { color: '#666', fontSize: 16, marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { width: 45, height: 45, borderRadius: 23, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    dot: { position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF5252', borderWidth: 1.5, borderColor: '#000' },
    avatar: { width: 45, height: 45, borderRadius: 23, borderWidth: 1, borderColor: '#333' },
    banner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,138,101,0.2)', overflow: 'hidden' },
    bannerIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,138,101,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    bannerTextContent: { flex: 1 },
    bannerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    bannerSubtitle: { color: '#FF8A65', fontSize: 12, marginTop: 2 },
    sectionTitle: { color: '#666', fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginBottom: 15 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
    card: { width: (width - 55) / 2, padding: 20, borderRadius: 24, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    cardValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    cardLabel: { color: '#666', fontSize: 10, fontWeight: '700', marginTop: 2 },
    progressSection: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    progressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    progressTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },
    progressRow: { marginBottom: 18 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    labelTitle: { color: '#aaa', fontSize: 13 },
    labelStats: { color: '#fff', fontSize: 13, fontWeight: '600' },
    progressBg: { height: 6, backgroundColor: '#1a1a1a', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 }
});
