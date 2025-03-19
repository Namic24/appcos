import { Stack } from "expo-router"
import React from "react"
import { useTranslation } from 'react-i18next'

export default function AuthLayout() {
  const { i18n } = useTranslation()

  return (
    <>
      <Stack screenOptions={{
        headerTitleStyle: {
          fontFamily: i18n.language === 'th' ? "NotoSansThai-Regular" : "Poppins-Regular",
        }
      }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
      </Stack>
    </>
  )
}
