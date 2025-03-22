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
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import i18n from "@/i18n";

type GenderType = 'male' | 'female' | 'other' | null;

export default function register() {
  const router = useRouter();
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");  //ชื่อผู้ใช้
  const [phone, setPhone] = useState(""); //เบอรืโทร
  const [email, setEmail] = useState("");  //อีเมล
  const [password, setPassword] = useState(""); //รหัสผ่าน
  const [address, setAddress] = useState("");  //ที่อยู่
  const [birthday, setBirthday] = useState<Date | null>(null);  //วันเกิด
  const [showDatePicker, setShowDatePicker] = useState(false);  //วันเกิด
  const [gender, setGender] = useState<GenderType>(null);
  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
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

   // ฟังก์ชันจัดการการเปลี่ยนวันเกิด
   const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthday(selectedDate);
    }
  };

  // ฟังก์ชันแสดง DatePicker
  const showDatePickerModal = () => {
    setShowDatePicker(true);
  };

  // ฟอร์แมตวันที่เพื่อแสดงผล
  const formatBirthday = () => {
    if (!birthday) return '';
    
    // ใช้ locale ตามภาษาที่เลือก
    const locale = i18n.language === 'th' ? th : enUS;
    return format(birthday, 'dd MMMM yyyy', { locale });
  };

  // Handle register
  const handleRegister = async () => {
    setError("");

    // Check if all fields are filled
    if (!displayName || !email || !password || !phone || !birthday || !address || !gender) {
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
          gender: gender,
          phone: phone,
          birthday: birthday ? birthday.toISOString() : null,
          address: address, // เพิ่มการบันทึกที่อยู่
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
                source={images.logo}
                resizeMode="contain"
                className="h-[34px]"
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

<View className="mt-7">
  <Text weight="medium" className="text-base mb-2">
    {t("auth.register.genderTitle") || "เพศ"}
  </Text>
  <View className="relative">
    <TouchableOpacity
      onPress={() => setShowGenderDropdown(!showGenderDropdown)}
      className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
      style={{ borderColor: '#ffff' }}
    >
      <Text className={`${!gender ? 'text-gray-400' : ''}`}>
        {gender 
          ? (gender === 'male' ? t("auth.register.male") || "ชาย" 
            : gender === 'female' ? t("auth.register.female") || "หญิง" 
            : t("auth.register.other") || "อื่นๆ") 
          : t("auth.register.genderPlaceholder") || "เลือกเพศ"}
      </Text>
      <Text>{showGenderDropdown ? '▲' : '▼'}</Text>
    </TouchableOpacity>
    
    {showGenderDropdown && (
      <View className="absolute top-full left-0 right-0 mt-1 border border-gray-300 rounded-lg bg-white z-10" style={{ borderColor: '#ffff' }}>
        {["male", "female", "other"].map(g => (
          <TouchableOpacity 
            key={g}
            className="p-3 border-b border-gray-200"
            style={g === "other" ? { borderBottomWidth: 0 } : {}}
            onPress={() => {
              setGender(g as GenderType);
              setShowGenderDropdown(false);
            }}
          >
            <Text>
              {t(`auth.register.${g}`) || (g === "male" ? "ชาย" : g === "female" ? "หญิง" : "อื่นๆ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    )}
  </View>
</View>

            {/* เพิ่มฟิลด์เลือกวันเกิด */}
            <View className="mt-7">
              <Text weight="medium" className="text-base mb-2">
                {t("auth.register.birthdayTitle") || "วันเกิด"}
              </Text>
              <TouchableOpacity
                onPress={showDatePickerModal}
                className="border border-gray-300 rounded-lg p-3 flex-row justify-between items-center"
                style={{ borderColor: '#886953' }}
              >
                <Text className={`${!birthday ? 'text-gray-400' : ''}`}>
                  {birthday ? formatBirthday() : t("auth.register.birthdayPlaceholder") || "เลือกวันเกิด"}
                </Text>
                <Text className="text-primary">🗓️</Text>
              </TouchableOpacity>
            </View>

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
              title={t("auth.register.addressTitle") || "ที่อยู่"}
              placeholder={t("auth.register.addressPlaceholder") || "กรอกที่อยู่ของคุณ"}
              value={address}
              handleChangeText={setAddress}
              otherStyles="mt-7"
              multiline={true}
              numberOfLines={3}
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
              containerStyles="mt-7"
              textStyles="!text-white"
            />

            <View className="flex justify-center pt-5 flex-row gap-2">
              <Text weight="regular" className="text-lg text-gray-100">
                {t("auth.register.hasAccount")}
              </Text>
              <Button
                title={t("auth.register.loginButton")}
                onPress={() => router.replace("/login")}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

        {/* DatePicker สำหรับ Android */}
        {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={birthday || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* DatePicker สำหรับ iOS */}
      {Platform.OS === 'ios' && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View className="flex-1 justify-end">
            <View 
              className="bg-white rounded-t-lg p-4"
              style={{ backgroundColor: '#886953' }}
            >
              <View className="flex-row justify-between mb-4">
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text 
                    className="text-lg"
                    style={{ color: '#886953' }}
                  >
                    {t("common.cancel") || "ยกเลิก"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text 
                    className="text-lg"
                    style={{ color: '#886953' }}
                  >
                    {t("common.done") || "เสร็จสิ้น"}
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={birthday || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={{ height: 200 }}
                maximumDate={new Date()}
                themeVariant={'light'}
              />
            </View>
          </View>
        </Modal>
      )}

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