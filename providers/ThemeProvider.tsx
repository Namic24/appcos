import React, { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useColorScheme } from 'react-native'
import { DarkTheme, DefaultTheme } from '@react-navigation/native'

// 1. Type และ Context
type ThemeContextType = {
  theme: 'light' | 'dark'           // สถานะปัจจุบันของ theme
  toggleTheme: () => void           // ฟังก์ชันสำหรับสลับ theme
  navigationTheme: typeof DefaultTheme  // theme สำหรับ React Navigation
}

// สร้าง Context พร้อมค่าเริ่มต้น
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  navigationTheme: DefaultTheme,
})

// Custom hook สำหรับเข้าถึง theme state จาก component อื่นๆ
export const useTheme = () => useContext(ThemeContext)

// 2. Provider Component
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ดึง theme ของระบบมาใช้เป็นค่าเริ่มต้น ถ้าไม่มีจะใช้ 'light'
  const systemColorScheme = useColorScheme()
  const [theme, setTheme] = useState<'light' | 'dark'>(systemColorScheme || 'light')

  // กำหนด theme สำหรับ React Navigation
  const navigationTheme = theme === 'dark' ? DarkTheme : DefaultTheme

  // 3. โหลด theme จาก AsyncStorage เมื่อ component ถูกโหลด
  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme')
      if (savedTheme) {
        setTheme(savedTheme as 'light' | 'dark')
      }
    } catch (error) {
      console.error('Error loading theme:', error)
    }
  }

  // 4. ฟังก์ชันสำหรับสลับ theme
  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    // บันทึก theme ลง AsyncStorage
    try {
      await AsyncStorage.setItem('theme', newTheme)
    } catch (error) {
      console.error('Error saving theme:', error)
    }
  }

  // 5. ส่งค่าผ่าน Context Provider
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, navigationTheme }}>
      {children}
    </ThemeContext.Provider>
  )
} 