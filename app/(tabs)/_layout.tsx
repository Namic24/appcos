import React from "react";
import { Tabs } from "expo-router";
import { icons } from "@/constants";
import { View, Image, Platform } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import Entypo from '@expo/vector-icons/Entypo';
import Ionicons from '@expo/vector-icons/Ionicons';

// สรับปรุง interface ของ TabIcon
interface TabIconProps {
  icon: any;
  color: string;
  focused: boolean;
  size?: "normal" | "large"; // เพิ่ม prop สำหรับกำหนดขนาด
}

// ปรับปรุง TabIcon component
const TabIcon = ({ icon, color, focused, size = "normal" }: TabIconProps) => {
  return (
    <View
      className={`
      flex items-center justify-center
      ${size === "large" ? "-mt-7" : ""}  // ขยับไอคอนขึ้นถ้าเป็นขนาดใหญ่
    `}
    >
      <View
        className={`
        flex items-center justify-center
        ${
          size === "large" ? "bg-secondary-200 p-3 rounded-full" : ""
        }  // เพิ่มพื้นหลังถ้าเป็นขนาดใหญ่
      `}
      >
        <Image
          source={icon}
          resizeMode="contain"
          tintColor={size === "large" ? "#FFFFFF" : color}
          className={size === "large" ? "w-9 h-9" : "w-6 h-8"}
        />
      </View>
    </View>
  );
};

export default function TabLayout() {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  // Define colors based on theme
  const tabBarBackgroundColor = theme === "dark" ? "#1E1E2D" : "#FFFFFF";
  const tabBarBorderColor = theme === "dark" ? "#2D2D3A" : "#FFE6F5";
  const tabBarActiveTintColor = theme === "dark" ? "#FFA7D1" : "#FFA7D1";
  const tabBarInactiveTintColor = theme === "dark" ? "#C5C5FF" : "#CDCDE0";
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarActiveTintColor,
        tabBarInactiveTintColor: tabBarInactiveTintColor,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily:
            i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          marginTop: 5,
        },
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 0,
          borderTopColor: tabBarBorderColor,
          height: Platform.OS === "ios" ? 90 : 70,
          paddingTop: 5,
          paddingBottom: Platform.OS === "ios" ? 30 : 5,
          ...Platform.select({
            ios: {
              height: 90,
              paddingBottom: 35,
              safeAreaInsets: { bottom: 35 },
            },
          }),
        },
      }}
    >
      {/* จัดเรียง tab bar */}
      <Tabs.Screen
        name="home"
        options={{
          title: t("tabs.home"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={icons.home} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: t("tabs.search"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={icons.search} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="reserve"
        options={{
          title: t("tabs.reserve"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={icons.calender} color={color} focused={focused} />
          ),
        }}
      />

      <Tabs.Screen
        name="favorite"
        options={{
          title: t("tabs.favorite"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={icons.bookheart} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={icons.profile} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}