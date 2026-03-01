import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";

export default function Layout() {
  const { dark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark ? "#020617" : "#FFFFFF",
          borderTopColor: dark
            ? "rgba(31,41,55,0.8)"
            : "rgba(209,213,219,1)",
          paddingTop: 6,
          paddingBottom: 8,
          height: 64
        } as any,
        tabBarActiveTintColor: dark ? "#60A5FA" : "#2563EB",
        tabBarInactiveTintColor: dark ? "#9CA3AF" : "#6B7280",
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 2,
          color: dark ? "#E5E7EB" : "#111827"
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Humans",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="machines"
        options={{
          title: "Machines",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="hardware-chip-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}
