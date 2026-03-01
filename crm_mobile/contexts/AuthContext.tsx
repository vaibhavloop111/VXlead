import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuthStateChange(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuthStateChange(session);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const handleAuthStateChange = async (newSession: Session | null) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
            // 1. Check if blocked
            const { data: profile } = await supabase
                .from('profiles')
                .select('is_blocked')
                .eq('user_id', newSession.user.id)
                .single();

            if (profile?.is_blocked) {
                Alert.alert('Blocked', 'Your account has been suspended by the administrator.');
                await supabase.auth.signOut();
                return;
            }

            // 2. Register for push notifications
            registerForPushNotificationsAsync(newSession.user.id);
        }

        setLoading(false);
    };

    const registerForPushNotificationsAsync = async (userId: string) => {
        if (!Device.isDevice) return;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;

        // Save to profiles
        await supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('user_id', userId);
    };

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === 'auth';

        if (!session && !inAuthGroup) {
            router.replace('/auth/login');
        } else if (session && inAuthGroup) {
            router.replace('/(tabs)/crm');
        }
    }, [session, segments, loading]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
