// ไฟล์นี้เป็นจุดเริ่มต้นของแอพ ทำหน้าที่:
// - ตรวจสอบสถานะ login
// - จัดการการ redirect
// - แสดงหน้า Landing
// - รองรับการเปลี่ยนภาษาและ theme

import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import CustomButton from "@/components/CustomButton";
import {
  ScrollView,
  Image,
  TouchableOpacity,
  LogBox,
  SafeAreaView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { View } from "@/components/Themed";
import { images } from "@/constants";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { icons } from "@/constants";
import { Text } from "@/components/CustomText";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/providers/ThemeProvider";

export default function Index() {
  // Hooks สำหรับ theme และการแปลภาษา
  const { t, i18n } = useTranslation();
  const { theme } = useTheme(); // เพิ่ม theme จาก useTheme

  // State สำหรับเก็บสถานะ login และการโหลดข้อมูล
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const screenHeight = Dimensions.get("window").height;

  // ตรวจสอบสถานะ login จาก AsyncStorage เมื่อเปิดแอพ
  useEffect(() => {
    const initialize = async () => {
      try {
        const isLoggedIn = await AsyncStorage.getItem("isLoggedIn");
        console.log("isLoggedIn:", isLoggedIn);
        if (isLoggedIn === "true") {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error("Failed to check login status:", error);
      } finally {
        setIsInitialized(true);
      }
    };

    initialize();
  }, []);

  // รอจนกว่าจะโหลดข้อมูลเสร็จ
  if (!isInitialized) return null;

  // ฟังก์ชันสลับภาษา
  const toggleLanguage = () => {
    const newLang = i18n.language === "th" ? "en" : "th";
    AsyncStorage.setItem("language", newLang);
    i18n.changeLanguage(newLang);
  };

  LogBox.ignoreAllLogs();

  return (
    <ImageBackground
      source={{
        uri: "https://i.pinimg.com/736x/2e/fe/69/2efe69fb43e839e7371ac87eb0f5885e.jpg",
      }}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      {/* ถ้า login แล้ว redirect ไปหน้า home */}
      {isLoggedIn && <Redirect href="/(tabs)/home" />}

      {/* ถ้ายังไม่ login แสดงหน้า Landing */}
      {!isLoggedIn && (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)" }}
        >
          <StatusBar style="light" />

          <View
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 10,
              backgroundColor: "transparent",
            }}
          >
            <TouchableOpacity
              onPress={toggleLanguage}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: 8,
                borderRadius: 9999,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.3)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                  backgroundColor: "transparent",
                }}
              >
                <Image
                  source={i18n.language === "th" ? icons.flagen : icons.flagth}
                  style={{ width: 20, height: 20 }}
                  resizeMode="contain"
                />
                <Text
                  style={{ color: "white", fontSize: 14, fontWeight: "500" }}
                >
                  {i18n.language === "th" ? "EN" : "ไทย"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={{
              flex: 1,
              justifyContent: "space-between",
              paddingHorizontal: 32,
              backgroundColor: "transparent",
              paddingTop: screenHeight * 0.1,
              paddingBottom: screenHeight * 0.08,
            }}
          >
            {/* Top Section */}
            <View
              style={{
                alignItems: "center",
                backgroundColor: "transparent",
              }}
            >
              <Image
                source={images.coslogo}
                style={{ height: 120, marginBottom: 16 }}
                resizeMode="contain"
              />

              <Text
                weight="bold"
                style={{
                  fontSize: 32,
                  textAlign: "center",
                  color: "white",
                  marginTop: 16,
                }}
              >
                COSPLAYING
              </Text>

              <Text
                weight="regular"
                style={{
                  fontSize: 16,
                  textAlign: "center",
                  color: "rgba(255, 255, 255, 0.8)",
                  marginTop: 8,
                }}
              >
                ร้านเช่าชุดคอสเพลย์
              </Text>
            </View>

            {/* Bottom Section */}
            <View style={{ backgroundColor: "transparent" }}>
              <Text
                weight="medium"
                style={{
                  fontSize: 18,
                  textAlign: "center",
                  color: "white",
                  marginBottom: 24,
                }}
              >
                สัมผัสประสบการณ์เช่าชุดคอสเพลย์ที่ดีที่สุด
              </Text>

              <CustomButton
                title="เริ่มต้นใช้งาน"
                handlePress={() => {
                  router.push("/register");
                }}
                containerStyles="w-full bg-white rounded-3xl py-4 mb-4"
                textStyles="text-[#222] font-semibold"
              />

              <TouchableOpacity
                onPress={() => router.push("/login")}
                style={{ backgroundColor: "transparent" }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 16,
                    textAlign: "center",
                    textDecorationLine: "underline",
                    fontWeight: "500",
                    marginTop: 8,
                  }}
                >
                  ฉันมีบัญชีอยู่แล้ว
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      )}
    </ImageBackground>
  );
}
