// rnf
import React from "react"
// import Octicons from "@expo/vector-icons/Octicons"
import { Tabs } from "expo-router"
import { icons } from "@/constants"
import { View, Image, Platform } from "react-native"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'

// function TabBarIcon(props: {
//   name: React.ComponentProps<typeof Octicons>["name"]
//   color: string
// }) {
//   return <Octicons size={24} style={{ marginBottom: 5 }} {...props} />
// }

// สรับปรุง interface ของ TabIcon
interface TabIconProps {
  icon: any
  color: string
  focused: boolean
  size?: 'normal' | 'large'  // เพิ่ม prop สำหรับกำหนดขนาด
}

// ปรับปรุง TabIcon component
const TabIcon = ({ icon, color, focused, size = 'normal' }: TabIconProps) => {
  return (
    <View className={`
      flex items-center justify-center
      ${size === 'large' ? '-mt-7' : ''}  // ขยับไอคอนขึ้นถ้าเป็นขนาดใหญ่
    `}>
      <View className={`
        flex items-center justify-center
        ${size === 'large' ? 'bg-secondary-200 p-3 rounded-full' : ''}  // เพิ่มพื้นหลังถ้าเป็นขนาดใหญ่
      `}>
        <Image
          source={icon}
          resizeMode="contain"
          tintColor={size === 'large' ? '#FFFFFF' : color}
          className={size === 'large' ? 'w-9 h-9' : 'w-6 h-8'}
        />
      </View>
    </View>
  )
}

export default function TabLayout() {
  const { t, i18n } = useTranslation()
  const { theme } = useTheme()

  // Define colors based on theme
  const tabBarBackgroundColor = theme === 'dark' ? '#161622' : '#ffffff'
  const tabBarBorderColor = theme === 'dark' ? '#232533' : '#e0e0e0'
  const tabBarActiveTintColor = theme === 'dark' ? '#FFA001' : '#FFA001'
  const tabBarInactiveTintColor = theme === 'dark' ? '#CDCDE0' : '#8e8e93'

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tabBarActiveTintColor,
        tabBarInactiveTintColor: tabBarInactiveTintColor,
        tabBarShowLabel: true,
        tabBarLabelStyle: { 
          fontSize: 12,
          fontFamily: i18n.language === 'th' ? "NotoSansThai-Regular" : "Poppins-Regular",
          marginTop: 5,
        },
        tabBarStyle: {
          backgroundColor: tabBarBackgroundColor,
          borderTopWidth: 0,
          borderTopColor: tabBarBorderColor,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingTop: 5,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          ...Platform.select({
            ios: {
              height: 90,
              paddingBottom: 35,
              safeAreaInsets: { bottom: 35 }
            }
          })
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('tabs.home'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.home}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="bookmark"
        options={{
          title: t('tabs.bookmark'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.bookmark}
              color={color}
              focused={focused}
            />
          ),
        }}
      />    

      <Tabs.Screen
        name="create"
        options={{
          title: t('tabs.create'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.plus}
              color={color}
              focused={focused}
              size="large"  // กำหนดให้เป็นขนาดใหญ่
            />
          ),
          // tabBarLabel: () => null,  // ซ่อน label สำหรับปุ่มตรงกลาง
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.profile}
              color={color}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="setting"
        options={{
          title: t('tabs.settings'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              icon={icons.setting}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  )
}
