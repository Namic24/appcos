// Import your global CSS file
import "../global.css"
import "@/i18n"
import { useEffect } from "react"
import { Stack } from 'expo-router'
import { useFonts } from 'expo-font'
import { SafeAreaView, StatusBar } from 'react-native'
import { AuthProvider } from '@/providers/AuthProvider'
import { ThemeProvider, useTheme } from '@/providers/ThemeProvider'
import * as NavigationBar from 'expo-navigation-bar'

function RootLayoutNav() {
  const { theme } = useTheme()

  useEffect(() => {
    async function updateNavigationBar() {
      try {
        const navBarColor = theme === 'dark' ? '#161622' : '#ffffff';
        await NavigationBar.setBackgroundColorAsync(navBarColor);
        // Set button style based on theme
        await NavigationBar.setButtonStyleAsync(theme === 'dark' ? 'light' : 'dark');
      } catch (error) {
        console.error('Error setting navigation bar:', error);
      }
    }
    
    updateNavigationBar();
  }, [theme]);

  return(
    <SafeAreaView className={`h-screen ${theme === 'dark' ? 'bg-primary' : 'bg-white'}`}>
      <StatusBar 
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme === 'dark' ? '#161622' : 'white'}
        animated={true}
      />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name='(auth)' options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="productdetail" options={{ headerShown: true }} />
        <Stack.Screen name="editproduct" options={{ headerShown: true }} />
      </Stack>
    </SafeAreaView>
  )
}

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
    "Poppins-Thin": require("../assets/fonts/Poppins-Thin.ttf"),
    "Poppins-ExtraLight": require("../assets/fonts/Poppins-ExtraLight.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-ExtraBold": require("../assets/fonts/Poppins-ExtraBold.ttf"),
    "Poppins-Black": require("../assets/fonts/Poppins-Black.ttf"),
    "NotoSansThai-Thin": require("../assets/fonts/NotoSansThai-Thin.ttf"),
    "NotoSansThai-ExtraLight": require("../assets/fonts/NotoSansThai-ExtraLight.ttf"),
    "NotoSansThai-Light": require("../assets/fonts/NotoSansThai-Light.ttf"),
    "NotoSansThai-Regular": require("../assets/fonts/NotoSansThai-Regular.ttf"),
    "NotoSansThai-Medium": require("../assets/fonts/NotoSansThai-Medium.ttf"),
    "NotoSansThai-SemiBold": require("../assets/fonts/NotoSansThai-SemiBold.ttf"),
    "NotoSansThai-Bold": require("../assets/fonts/NotoSansThai-Bold.ttf"),
    "NotoSansThai-ExtraBold": require("../assets/fonts/NotoSansThai-ExtraBold.ttf"),
    "NotoSansThai-Black": require("../assets/fonts/NotoSansThai-Black.ttf"),
  });

  if (error) throw error;
  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </AuthProvider>
  )
}