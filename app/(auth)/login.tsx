import {
  Dimensions,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { View } from "@/components/Themed";
import images from "@/constants/images";
import CustomButton from "@/components/CustomButton";
import FormField from "@/components/FormField";
import { useState } from "react";
import Button from "@/components/Button";
import { router } from "expo-router";
import { supabase } from "@/utils/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert";
import { Text } from "@/components/CustomText";

export default function login() {
  const { t } = useTranslation();

  // กำหนดตัวแปร State สำหรับเก็บค่าของ Email และ Password
  const [form, setForm] = useState({
    email: "q@gmail.com",
    password: "123456",
  });

  // กำหนดตัวแปรเก็บสถานะการ submit ข้อมูล
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add alert config state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "cancel" | "destructive";
    }>;
  }>({
    visible: false,
    title: "",
    message: "",
    buttons: [],
  });

  // ฟังก์ชัน submit form สำหรับการเข้าสู่ระบบ
  const submit = async () => {
    setIsSubmitting(true);

    if (form.email === "" || form.password === "") {
      setAlertConfig({
        visible: true,
        title: t("auth.login.validation.incomplete"),
        message: t("auth.login.validation.invalidData"),
        buttons: [
          {
            text: t("common.ok"),
            onPress: () =>
              setAlertConfig((prev) => ({ ...prev, visible: false })),
          },
        ],
      });
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    if (error) {
      setAlertConfig({
        visible: true,
        title: t("auth.login.alerts.error"),
        message: error.message,
        buttons: [
          {
            text: t("common.ok"),
            onPress: () =>
              setAlertConfig((prev) => ({ ...prev, visible: false })),
          },
        ],
      });
    } else {
      // console.log('Token:', data.session?.access_token) // แสดง Token

      // บันทึก Token ลงใน AsyncStorage
      await AsyncStorage.setItem("token", data.session?.access_token);
      // บันทึกสถานะการเข้าสู่ระบบลงใน AsyncStorage
      await AsyncStorage.setItem("isLoggedIn", "true");

      setAlertConfig({
        visible: true,
        title: t("auth.login.alerts.success"),
        message: t("auth.login.alerts.successMessage"),
        buttons: [
          {
            text: t("auth.login.alerts.ok"),
            onPress: () => {
              setAlertConfig((prev) => ({ ...prev, visible: false }));
              router.replace("/(tabs)/home");
            },
          },
        ],
      });
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView className="h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="h-full"
      >
        <ScrollView contentContainerStyle={{ height: "100%" }}>
          <View
            className="w-full flex justify-center h-full px-4"
            style={{
              minHeight: Dimensions.get("window").height,
            }}
          >
            <View className="flex items-center">
              <Image
                source={images.logo}
                resizeMode="contain"
                className="h-[34px]"
              />
            </View>

            <Text weight="medium" className="text-2xl mt-10">
              {t("auth.login.title")}
            </Text>

            <FormField
              title={t("auth.login.emailPlaceholder")}
              placeholder={t("auth.login.emailPlaceholder")}
              value={form.email}
              handleChangeText={(e: any) => setForm({ ...form, email: e })}
              otherStyles="mt-7 dark:text-white"
              keyboardType="email-address"
            />

            <FormField
              title={t("auth.login.passwordPlaceholder")}
              placeholder={t("auth.login.passwordPlaceholder")}
              value={form.password}
              handleChangeText={(e: any) => setForm({ ...form, password: e })}
              otherStyles="mt-7"
            />

            <CustomButton
              title={t("auth.login.button")}
              handlePress={submit}
              containerStyles="mt-7"
              textStyles="!text-white"
              isLoading={isSubmitting}
            />

            <View className="flex justify-center pt-5 flex-row gap-2">
              <Text weight="regular" className="text-lg">
                {t("auth.login.noAccount")}
              </Text>
              <Button
                title={t("auth.login.registerButton")}
                onPress={() => router.replace("/register")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}
