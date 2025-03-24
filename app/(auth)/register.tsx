import {
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from "react-native";
import { View } from "@/components/Themed";
import FormField from "@/components/FormField";
import { useRouter } from "expo-router";
import Button from "@/components/Button";
import CustomButton from "@/components/CustomButton";
import { images } from "@/constants";
import { useState } from "react";
import { supabase } from "@/utils/supabase";
import { useTranslation } from "react-i18next";
import CustomAlert from "@/components/CustomAlert";
import { Text } from "@/components/CustomText";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { th, enUS } from "date-fns/locale";
import i18n from "@/i18n";

type GenderType = "male" | "female" | "other" | null;

export default function register() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState(""); //ชื่อผู้ใช้
  const [phone, setPhone] = useState(""); //เบอรืโทร
  const [email, setEmail] = useState(""); //อีเมล
  const [password, setPassword] = useState(""); //รหัสผ่าน

  const [error, setError] = useState("");

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

  // Handle register
  const handleRegister = async () => {
    setError("");

    // Check if all fields are filled
    if (!displayName || !email || !password || !phone) {
      setAlertConfig({
        visible: true,
        title: t("auth.register.validation.incomplete"),
        message: t("auth.register.validation.invalidData"),
        buttons: [
          {
            text: t("common.ok"),
            onPress: () =>
              setAlertConfig((prev) => ({ ...prev, visible: false })),
          },
        ],
      });
      return;
    }

    try {
      // 1. สร้างผู้ใช้ใหม่
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            displayName,
          },
        },
      });

      if (authError) throw authError;

      // 2. สร้าง/อัปเดตข้อมูลในตาราง profiles
      if (authData.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          display_name: displayName,
          phone: phone,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        });

        if (profileError) throw profileError;
      }

      setAlertConfig({
        visible: true,
        title: t("auth.register.alerts.success"),
        message: t("auth.register.alerts.successMessage"),
        buttons: [
          {
            text: t("auth.register.alerts.ok"),
            onPress: () => {
              setAlertConfig((prev) => ({ ...prev, visible: false }));
              router.replace("/login");
            },
          },
        ],
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  return (
    <SafeAreaView className="h-full">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView>
          <View
            className="w-full flex justify-center h-full px-4 py-10"
            style={{
              minHeight: Dimensions.get("window").height,
            }}
          >
            <View className="flex items-center">
              <Image
                source={images.coslogo}
                resizeMode="contain"
                className="h-[150px]"
              />
            </View>

            <Text weight="medium" className="text-2xl mt-10">
              {t("auth.register.title")}
            </Text>

            <FormField
              title={t("auth.register.displayNameTitle")}
              placeholder={t("auth.register.displayNamePlaceholder")}
              value={displayName}
              handleChangeText={setDisplayName}
              otherStyles="mt-10"
            />

            <FormField
              title={t("auth.register.phoneTitle")}
              placeholder={t("auth.register.phonePlaceholder")}
              value={phone}
              handleChangeText={setPhone}
              otherStyles="mt-7"
              keyboardType="phone-pad"
            />

            <FormField
              title={t("auth.register.emailPlaceholder")}
              placeholder={t("auth.register.emailPlaceholder")}
              value={email}
              handleChangeText={setEmail}
              otherStyles="mt-7"
              keyboardType="email-address"
            />

            <FormField
              title={t("auth.register.passwordPlaceholder")}
              placeholder={t("auth.register.passwordPlaceholder")}
              value={password}
              handleChangeText={setPassword}
              otherStyles="mt-7"
            />

            {error ? <Text className="text-red-500 mt-4">{error}</Text> : null}

            <CustomButton
              title={t("auth.register.button")}
              handlePress={handleRegister}
              containerStyles="mt-7 bg-primary"
              textStyles="!text-black"
            />

            <View className="flex justify-center pt-5 flex-row gap-2  text-pink-600">
              <Text weight="regular" className="text-lg text-pink-400">
                {t("auth.register.hasAccount")}
              </Text>
              <Text
                onPress={() => router.replace("/login")}
                weight="medium"
                className="text-primary">
                {t("auth.register.loginButton")}
                
              </Text>
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
