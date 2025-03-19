// ไฟล์นี้เป็นจุดเริ่มต้นของแอพ ทำหน้าที่:
// - ตรวจสอบสถานะ login
// - จัดการการ redirect
// - แสดงหน้า Landing
// - รองรับการเปลี่ยนภาษาและ theme

import { Redirect } from 'expo-router'
import React, { useEffect, useState } from 'react'
import CustomButton from '@/components/CustomButton'
import { ScrollView, Image, TouchableOpacity, LogBox, SafeAreaView } from 'react-native'
import { View } from "@/components/Themed"
import { images } from "@/constants"
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTranslation } from 'react-i18next'
import { icons } from '@/constants'
import { Text } from "@/components/CustomText"

export default function Index() {
  // Hooks สำหรับ theme และการแปลภาษา
  const { t, i18n } = useTranslation()

  // State สำหรับเก็บสถานะ login และการโหลดข้อมูล
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false);

  // ตรวจสอบสถานะ login จาก AsyncStorage เมื่อเปิดแอพ
  useEffect(() => {
    const initialize = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');
        console.log('isLoggedIn:', isLoggedIn);
        if (isLoggedIn === 'true') {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Failed to check login status:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize()
  }, [])

  // รอจนกว่าจะโหลดข้อมูลเสร็จ
  if (!isInitialized) return null

  // ฟังก์ชันสลับภาษา
  const toggleLanguage = () => {
    const newLang = i18n.language === 'th' ? 'en' : 'th'
    AsyncStorage.setItem('language', newLang)
    i18n.changeLanguage(newLang)
  }

  LogBox.ignoreAllLogs();

  return (
    <>
      {/* ถ้า login แล้ว redirect ไปหน้า home */}
      { isLoggedIn &&  <Redirect href="/(tabs)/home" /> }
      
      {/* ถ้ายังไม่ login แสดงหน้า Landing */}
      { !isLoggedIn && <SafeAreaView className="h-full">
          <ScrollView contentContainerStyle={{height: '100%'}}>
            {/* ปุ่มเปลี่ยนภาษา */}
            <TouchableOpacity 
              onPress={toggleLanguage}
              className="absolute top-4 right-4 z-10 bg-gray-700 p-2 rounded-full"
            >
              <View className="flex-row items-center gap-2 !bg-transparent px-2">
                <Image
                  source={i18n.language === 'th' ? icons.flagen : icons.flagth}
                  className="w-6 h-6"
                  resizeMode="contain"
                />
                <Text className="!text-white text-sm">
                  {i18n.language === 'th' ? 'EN' : 'ไทย'}
                </Text>
              </View>
            </TouchableOpacity>

            <View className="w-full flex justify-center items-center h-full px-8">
              {/* Logo */}
              <Image
                source={images.logo}
                className="h-[84px]"
                resizeMode="contain"
              />

              {/* รูปภาพประกอบ */}
              <Image
                source={images.cards}
                className="max-w-[380px] w-full h-[298px]"
                resizeMode="contain"
              />

              {/* Slogan */}
              <View className="relative mt-5">
                <Text weight="bold" className="text-3xl text-center dark:text-white leading-10">
                  {t('landing.slogan.line1')}{"\n"}
                  {t('landing.slogan.line2')}{" "}
                  <Text weight="bold" className="text-secondary-200">AuraShop</Text>
                </Text>
                <Image
                  source={images.path}
                  className="w-[120px] h-[15px] absolute -bottom-4 -right-8"
                  resizeMode="contain"
                />
              </View>

              {/* คำอธิบาย */}
              <Text weight="regular" className="text-md mt-7 text-center dark:text-white">
                {t('landing.description')}
              </Text>

              {/* ปุ่มไปหน้า Login */}
              <CustomButton
                title={t('landing.button')}
                handlePress={() => { 
                  router.push("/login");
                }}  
                containerStyles="w-full mt-7"
                textStyles="!text-white"
              />

            </View>
          </ScrollView>
        </SafeAreaView> 
      }
    </>
  )
}