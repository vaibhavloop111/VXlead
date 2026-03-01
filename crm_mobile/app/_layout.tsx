import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
    return (
        <AuthProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
                <Stack.Screen name="auth/signup" options={{ title: 'Signup' }} />
                <Stack.Screen name="(tabs)" options={{ title: 'Dashboard' }} />
            </Stack>
        </AuthProvider>
    );
}
