import { Tabs } from 'expo-router';
import { Home, Users, FileText, UserCircle } from 'lucide-react-native';

export default function TabsLayout() {
    return (
        <Tabs screenOptions={{
            headerShown: false,
            tabBarStyle: {
                backgroundColor: '#000',
                borderTopColor: '#333',
                height: 65,
                paddingBottom: 10,
                paddingTop: 5,
            },
            tabBarActiveTintColor: '#7895CB',
            tabBarInactiveTintColor: '#666',
        }}>
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color }) => <Home size={22} color={color} />
                }}
            />
            <Tabs.Screen
                name="crm"
                options={{
                    title: 'CRM',
                    tabBarIcon: ({ color }) => <Users size={22} color={color} />
                }}
            />
            <Tabs.Screen
                name="builder"
                options={{
                    title: 'Form',
                    tabBarIcon: ({ color }) => <FileText size={22} color={color} />
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <UserCircle size={22} color={color} />
                }}
            />
        </Tabs>
    );
}
