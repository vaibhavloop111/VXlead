import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    Image,
    ScrollView,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
    User,
    Shield,
    Settings as SettingsIcon,
    RefreshCw,
    LogOut,
    ChevronRight,
    AtSign
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../contexts/AuthContext';

export default function Profile() {
    const { user, signOut } = useAuth();

    const handleResetData = () => {
        Alert.alert(
            "Reset Demo Data",
            "Are you sure you want to reset all data? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", style: "destructive", onPress: () => console.log("Resetting...") }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.headerTitle}>Profile</Text>

                {/* User Card */}
                <BlurView intensity={20} tint="dark" style={styles.userCard}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/150' }}
                        style={styles.avatar}
                    />
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Marketer Pro</Text>
                        <View style={styles.emailRow}>
                            <AtSign size={14} color="#666" style={{ marginRight: 4 }} />
                            <Text style={styles.userEmail}>{user?.email}</Text>
                        </View>
                        <View style={styles.premiumBadge}>
                            <Text style={styles.premiumText}>PREMIUM PLAN</Text>
                        </View>
                    </View>
                </BlurView>

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>SETTINGS</Text>
                <View style={styles.settingsGroup}>
                    <SettingItem
                        icon={<User size={20} color="#7895CB" />}
                        label="Account Details"
                    />
                    <SettingItem
                        icon={<Shield size={20} color="#78CB86" />}
                        label="Privacy & Security"
                    />
                    <SettingItem
                        icon={<SettingsIcon size={20} color="#A278CB" />}
                        label="App Preferences"
                    />
                </View>

                {/* Danger Zone */}
                <Text style={styles.sectionTitle}>DANGER ZONE</Text>
                <View style={styles.settingsGroup}>
                    <TouchableOpacity style={styles.settingItem} onPress={handleResetData}>
                        <View style={styles.settingIconBox}>
                            <RefreshCw size={20} color="#FF8A65" />
                        </View>
                        <Text style={[styles.settingLabel, { color: '#FF8A65' }]}>Reset Demo Data</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.settingItem} onPress={signOut}>
                        <View style={styles.settingIconBox}>
                            <LogOut size={20} color="#FF5252" />
                        </View>
                        <Text style={[styles.settingLabel, { color: '#FF5252' }]}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function SettingItem({ icon, label }: any) {
    return (
        <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIconBox}>
                {icon}
            </View>
            <Text style={styles.settingLabel}>{label}</Text>
            <ChevronRight size={18} color="#444" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollContent: { padding: 20 },
    headerTitle: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginBottom: 25, marginTop: 10 },
    userCard: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, marginBottom: 35, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    avatar: { width: 80, height: 80, borderRadius: 40, marginRight: 20, borderWidth: 1, borderColor: '#333' },
    userInfo: { flex: 1 },
    userName: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
    emailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    userEmail: { color: '#666', fontSize: 14 },
    premiumBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,193,7,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,193,7,0.2)' },
    premiumText: { color: '#FFC107', fontSize: 10, fontWeight: '800' },
    sectionTitle: { color: '#666', fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginBottom: 15, marginLeft: 5 },
    settingsGroup: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 8, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    settingItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    settingIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    settingLabel: { color: '#fff', fontSize: 16, fontWeight: '600' }
});
