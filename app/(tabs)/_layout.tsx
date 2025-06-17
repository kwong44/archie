import { Tabs } from 'expo-router';
import { Circle, BookOpen, BarChart3, Settings } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';

const TabBarIcon = ({ IconComponent, color, size }: { IconComponent: any, color: string, size: number }) => (
  <View style={styles.iconContainer}>
    <IconComponent color={color} size={size} strokeWidth={2} />
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#121820',
          borderTopColor: '#2A2E37',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#FFC300',
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Regular',
          fontSize: 12,
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workshop',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon IconComponent={Circle} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="lexicon"
        options={{
          title: 'Lexicon',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon IconComponent={BookOpen} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon IconComponent={BarChart3} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon IconComponent={Settings} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});