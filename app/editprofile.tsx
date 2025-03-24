import React, { useState, useEffect } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  BackHandler,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { View } from "@/components/Themed";
import { Stack, useLocalSearchParams, router } from "expo-router";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import CustomAlert from "@/components/CustomAlert";
import { Text } from "@/components/CustomText";
import CustomButton from "@/components/CustomButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function EditProfile() {
  // 1. Setup & State
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();

  // Profile data states
  const [profile, setProfile] = useState<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    gender: string | null;
    birthday: string | null;
    phone: string | null;
    address: string | null;
  } | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setphone] = useState("");
  const [address, setaddress] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Alert configuration
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(
      date.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}/${date.getFullYear()}`;
  };

  // 2. Effects
  useEffect(() => {
    // Fetch profile data when component mounts
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    (async () => {
      // Request permissions on component mount
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  // Handle back button press
  useEffect(() => {
    const handleBackPress = () => {
      if (hasUnsavedChanges) {
        // Show confirmation dialog before exiting
        showExitConfirmation();
        return true; // Prevent default back action
      }
      return false; // Allow default back action
    };

    // Add event listener for hardware back button press
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    // Clean up the event listener
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  // Track changes in form fields
  useEffect(() => {
    if (profile) {
      const nameChanged = displayName !== (profile.display_name || "");
      const avatarChanged = avatarBase64 !== null;
      const genderChanged = gender !== (profile.gender || "");
      const birthdayChanged = birthday !== (profile.birthday || "");
      const addressChanged = address !== (profile.address || "");

      setHasUnsavedChanges(
        nameChanged ||
          avatarChanged ||
          genderChanged ||
          birthdayChanged ||
          addressChanged
      );
    }
  }, [displayName, avatarBase64, gender, birthday, profile, address]);

  // 3. Data Fetching
  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, display_name, avatar_url, gender, birthday, phone, address"
        )
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      // Add timestamp to avoid caching issues
      if (data.avatar_url) {
        data.avatar_url = `${data.avatar_url}?t=${Date.now()}`;
      }

      setProfile(data);
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url);
      setGender(data.gender || "");
      setBirthday(data.birthday || "");
      setphone(data.phone || "");
      setaddress(data.address || "");
    } catch (error) {
      console.error("Error fetching profile:", error);
      showAlert("common.error", "profile.fetchError");
    } finally {
      setLoading(false);
    }
  };

  // 4. Helper Functions
  const showAlert = (
    titleKey: string,
    messageKey: string,
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: "default" | "cancel" | "destructive";
    }> = []
  ) => {
    setAlertConfig({
      visible: true,
      title: t(titleKey),
      message: t(messageKey),
      buttons:
        buttons.length > 0
          ? buttons
          : [
              {
                text: t("common.ok"),
                onPress: () =>
                  setAlertConfig((prev) => ({ ...prev, visible: false })),
              },
            ],
    });
  };

  const showExitConfirmation = () => {
    setAlertConfig({
      visible: true,
      title: t("common.unsavedChanges"),
      message: t("profile.edit.exitConfirmation"),
      buttons: [
        {
          text: t("profile.edit.saveAndExit"),
          onPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            saveProfile();
          },
        },
        {
          text: t("profile.edit.exitWithoutSaving"),
          style: "destructive",
          onPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            router.back();
          },
        },
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () =>
            setAlertConfig((prev) => ({ ...prev, visible: false })),
        },
      ],
    });
  };

  // 5. Avatar Management
  const selectAvatar = async () => {
    try {
      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const libraryPermission =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      Alert.alert(
        t("profile.avatar.pickTitle"),
        t("profile.avatar.pickMessage"),
        [
          {
            text: t("profile.avatar.camera"),
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.7,
                  base64: true,
                });

                if (
                  !result.canceled &&
                  result.assets &&
                  result.assets[0].base64
                ) {
                  handleImageResult(result);
                }
              } catch (err) {
                console.error("Camera error:", err);
                Alert.alert(t("common.error"), t("profile.avatar.error"));
              }
            },
          },
          {
            text: t("profile.avatar.gallery"),
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.7,
                  base64: true,
                });

                if (
                  !result.canceled &&
                  result.assets &&
                  result.assets[0].base64
                ) {
                  handleImageResult(result);
                }
              } catch (err) {
                console.error("Gallery error:", err);
                Alert.alert(t("common.error"), t("profile.avatar.error"));
              }
            },
          },
          {
            text: t("common.cancel"),
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("Error in selectAvatar:", error);
      Alert.alert(t("common.error"), t("profile.avatar.error"));
    }
  };

  // แก้ไขส่วน handleImageResult เพื่อให้แน่ใจว่าจัดการ base64 ได้ถูกต้อง
  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.assets || !result.assets[0].base64) return;

    try {
      // ตรวจสอบว่ามี base64 จริงๆ
      console.log("Image base64 length:", result.assets[0].base64.length);

      // ใช้ base64 โดยตรงถ้ามีขนาดที่เหมาะสมแล้ว
      const base64Image = result.assets[0].base64;
      setAvatarBase64(base64Image);
      setAvatarUrl(`data:image/jpeg;base64,${base64Image}`);

      // เพิ่ม console.log เพื่อตรวจสอบว่าได้ set ค่าถูกต้อง
      console.log("Avatar URL set:", !!base64Image);
    } catch (error) {
      console.error("Error processing image:", error);
      showAlert("common.error", "profile.avatar.processingError");
    }
  };

  // 6. Profile Update Functions
  const saveProfile = async () => {
    try {
      setLoading(true);

      // Validate form
      if (!displayName.trim()) {
        showAlert("common.error", "profile.edit.nameRequired");
        setLoading(false);
        return;
      }

      let newAvatarUrl = null;

      // 1. Upload new avatar if changed
      if (avatarBase64) {
        // Create a unique filename
        const fileName = `avatar_${session?.user?.id}_${Date.now()}.jpg`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, decode(avatarBase64), {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        newAvatarUrl = data.publicUrl;
      }

      // 2. Update profile in database (both name and avatar if available)
      const updateData: any = {
        display_name: displayName,
        gender: gender,
        birthday: birthday,
        phone: phone, // เพิ่มฟิลด์นี้
        address: address,
        updated_at: new Date().toISOString(),
      };

      // Add avatar URL to update data if we have a new one
      if (newAvatarUrl) {
        updateData.avatar_url = newAvatarUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", session?.user?.id);

      if (error) throw error;

      // ส่งพารามิเตอร์ refresh=true กลับไปยังหน้า Profile เพื่อบอกให้โหลดข้อมูลใหม่
      showAlert("common.success", "profile.edit.success", [
        {
          text: t("common.ok"),
          onPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      showAlert("common.error", "profile.edit.error");
    } finally {
      setLoading(false);
    }
  };

  // Handle the cancel button press
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      showExitConfirmation();
    } else {
      router.back();
    }
  };

  const [currentPassword, setCurrentPassword] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [showPassword, setShowPassword] = useState({
  current: false,
  new: false,
  confirm: false,
});

const changePassword = async () => {
  try {
    setLoading(true);

    // Validate password fields
    if (!currentPassword) {
      showAlert("common.error", "profile.password.currentRequired");
      return;
    }

    if (!newPassword) {
      showAlert("common.error", "profile.password.newRequired");
      return;
    }

    if (newPassword.length < 6) {
      showAlert("common.error", "profile.password.tooShort");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("common.error", "profile.password.mismatch");
      return;
    }

    // Call Supabase API to update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;

    // Show success message
    showAlert("common.success", "profile.password.success", [
      {
        text: t("common.ok"),
        onPress: () => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          // Reset form after successful change
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
      },
    ]);
  } catch (error) {
    console.error("Error changing password:", error);
    showAlert("common.error", "profile.password.error");
  } finally {
    setLoading(false);
  }
};
  // 7. UI Rendering
  return (
    <ScrollView>
      <KeyboardAvoidingView>
        <SafeAreaView
          className="h-full"
          style={{
            backgroundColor: theme === "dark" ? "#000" : "#F8F8FC",
          }}
        >
          <Stack.Screen
            options={{
              headerTitle: t("profile.edit.title"),
              headerTransparent: false,
              headerShadowVisible: false,
              headerTitleStyle: {
                fontSize: 18,
                fontFamily:
                  i18n.language === "th"
                    ? "NotoSansThai-Regular"
                    : "Poppins-Regular",
                color: theme === "dark" ? "#fff" : "#000",
              },
              headerStyle: {
                backgroundColor: "transparent",
              },
              headerTintColor: theme === "dark" ? "#fff" : "#000",
              headerBackVisible: true,
              headerLeft: () => (
                <TouchableOpacity onPress={handleCancel}>
                  <FontAwesome
                    name="arrow-left"
                    size={20}
                    color={theme === "dark" ? "#fff" : "#000"}
                  />
                </TouchableOpacity>
              ),
            }}
          />

          {/* Loading Indicator */}
          {loading && (
            <View className="absolute inset-0 justify-center items-center bg-black bg-opacity-50 z-50">
              <ActivityIndicator size="large" color="#fff" />
            </View>
          )}

          <ScrollView
            className="h-full"
            contentContainerStyle={{
              backgroundColor: theme === "dark" ? "#000" : "#F8F8FC",
              padding: 16,
            }}
          >
            // Changes to improve the profile editing page layout

// 1. Improved Profile Header Section
<View className="flex-row items-center mb-8 px-4 !bg-transparent">
  {/* Profile picture with improved styling */}
  <View className="mr-4 relative">
    <TouchableOpacity 
      onPress={selectAvatar} 
      disabled={loading}
      className="relative"
    >
      <Image
        source={{
          uri: avatarUrl || profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png",
          cache: "reload",
        }}
        className="w-24 h-24 rounded-full"
        style={{
          borderWidth: 2,
          borderColor: theme === "dark" ? "#FFA7D1" : "#FFA7D1", // Pink border for both themes
        }}
      />
      <View
        className="absolute bottom-0 right-0 rounded-full p-2"
        style={{
          backgroundColor: theme === "dark" ? "#222" : "#FFF",
          borderWidth: 1.5,
          borderColor: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 5,
          elevation: 3,
        }}
      >
        <Ionicons
          name="camera-outline"
          size={16}
          color="#FFA7D1"
        />
      </View>
    </TouchableOpacity>
  </View>

  {/* Profile info with better spacing */}
  <View className="flex-1 !bg-transparent">
    <Text weight="semibold" className="text-2xl" style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}>
      Edit Profile
    </Text>
    <Text className="text-lg mt-2" weight="semibold">
      {displayName || profile?.display_name || t("profile.noName")}
    </Text>
    <Text className="text-sm mt-1 opacity-70">
      {session?.user?.email || "email@example.com"}
    </Text>
  </View>
</View>

// 2. Better Section Divider
<View className="mb-6">
  <View
    className="h-1 mx-2 mb-6 rounded-full"
    style={{ backgroundColor: theme === "dark" ? "#333" : "#FFE6F5" }}
  />
</View>

// 3. Improved Section Headers
<View className="mb-2 px-4">
  <Text 
    weight="semibold" 
    className="text-lg" 
    style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
  >
    {t("profile.edit.personalInfo")}
  </Text>
</View>

// 4. Improved Form Fields with Card Look
<View 
  className="mb-6 mx-2 p-4 rounded-xl"
  style={{
    backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
    borderWidth: 1,
    borderColor: theme === "dark" ? "#333" : "#FFE6F5",
    shadowColor: "#000",
    shadowOpacity: theme === "dark" ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  }}
>
  {/* Display Name Input with better styling */}
  <View className="mb-5 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.edit.displayName")}
    </Text>
    <View
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <TextInput
        value={displayName}
        onChangeText={setDisplayName}
        className="p-3.5"
        style={{
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.edit.enterName")}
      />
    </View>
  </View>

  {/* Row layout for gender and birthday with improved spacing */}
  <View className="flex-row space-x-3">
    <View className="flex-1">
      <Text className="mb-2" weight="medium">
        {t("profile.edit.gender")}
      </Text>
      <View
        className="rounded-lg overflow-hidden"
        style={{
          backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
          borderWidth: 1,
          borderColor: theme === "dark" ? "#333" : "#FFD6EB",
        }}
      >
        <TextInput
          value={gender}
          onChangeText={setGender}
          className="p-3.5"
          style={{
            fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
            color: theme === "dark" ? "#fff" : "#000",
          }}
          placeholderTextColor={theme === "dark" ? "#666" : "#999"}
          placeholder={t("profile.edit.enterGender")}
        />
      </View>
    </View>

    <View className="flex-1">
      <Text className="mb-2" weight="medium">
        {t("profile.edit.birthday")}
      </Text>
      <TouchableOpacity
        className="rounded-lg overflow-hidden p-3.5"
        style={{
          backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
          borderWidth: 1,
          borderColor: theme === "dark" ? "#333" : "#FFD6EB",
        }}
        onPress={() => setShowDatePicker(true)}
      >
        <View className="flex-row items-center justify-between">
          <Text
            style={{
              fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
              color: birthday ? (theme === "dark" ? "#fff" : "#000") : (theme === "dark" ? "#666" : "#999"),
            }}
          >
            {birthday ? formatDate(birthday) : t("profile.edit.selectBirthday")}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
        </View>
      </TouchableOpacity>
    </View>
  </View>
</View>

// 5. Contact Information Section
<View className="mb-2 px-4 mt-4">
  <Text 
    weight="semibold" 
    className="text-lg" 
    style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
  >
    {t("profile.edit.contactInfo")}
  </Text>
</View>

<View 
  className="mb-6 mx-2 p-4 rounded-xl"
  style={{
    backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
    borderWidth: 1,
    borderColor: theme === "dark" ? "#333" : "#FFE6F5",
    shadowColor: "#000",
    shadowOpacity: theme === "dark" ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  }}
>
  {/* Phone Input with Icon */}
  <View className="mb-5 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.edit.phone")}
    </Text>
    <View
      className="rounded-lg overflow-hidden flex-row items-center"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <View className="px-3">
        <Ionicons name="call-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
      </View>
      <TextInput
        value={phone}
        onChangeText={setphone}
        className="p-3.5 flex-1"
        keyboardType="phone-pad"
        style={{
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.edit.enterphone")}
      />
    </View>
  </View>

  {/* Email Input (Non-editable) with Icon */}
  <View className="mb-5 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.edit.email")}
    </Text>
    <View
      className="rounded-lg overflow-hidden flex-row items-center"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
        opacity: 0.8,
      }}
    >
      <View className="px-3">
        <Ionicons name="mail-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
      </View>
      <Text
        className="p-3.5 flex-1"
        style={{ 
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#ccc" : "#666" 
        }}
      >
        {session?.user?.email}
      </Text>
      <View className="px-3">
        <Ionicons name="lock-closed" size={16} color={theme === "dark" ? "#666" : "#999"} />
      </View>
    </View>
  </View>
</View>

// 6. Address Section
<View className="mb-2 px-4 mt-4">
  <Text 
    weight="semibold" 
    className="text-lg" 
    style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
  >
    {t("profile.edit.addresshead")}
  </Text>
</View>

<View 
  className="mb-6 mx-2 p-4 rounded-xl"
  style={{
    backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
    borderWidth: 1,
    borderColor: theme === "dark" ? "#333" : "#FFE6F5",
    shadowColor: "#000",
    shadowOpacity: theme === "dark" ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  }}
>
  <View className="!bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.edit.address")}
    </Text>
    <View
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <TextInput
        value={address}
        onChangeText={setaddress}
        className="p-3.5"
        multiline={true}
        numberOfLines={3}
        textAlignVertical="top"
        style={{
          minHeight: 80,
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.edit.enteraddress")}
      />
    </View>
  </View>
</View>

// 7. Password Change Section
<View className="mb-2 px-4 mt-4">
  <Text 
    weight="semibold" 
    className="text-lg" 
    style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
  >
    {t("profile.password.changePassword")}
  </Text>
</View>

<View 
  className="mb-6 mx-2 p-4 rounded-xl"
  style={{
    backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
    borderWidth: 1,
    borderColor: theme === "dark" ? "#333" : "#FFE6F5",
    shadowColor: "#000",
    shadowOpacity: theme === "dark" ? 0.1 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  }}
>
  {/* Current Password */}
  <View className="mb-4 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.password.current")}
    </Text>
    <View
      className="rounded-lg overflow-hidden flex-row items-center"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <View className="px-3">
        <Ionicons name="key-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
      </View>
      <TextInput
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry={!showPassword.current}
        className="p-3.5 flex-1"
        style={{
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.password.enterCurrent")}
      />
      <TouchableOpacity
        onPress={() => setShowPassword({...showPassword, current: !showPassword.current})}
        className="px-3"
      >
        <Ionicons
          name={showPassword.current ? "eye-off" : "eye"}
          size={20}
          color={theme === "dark" ? "#666" : "#999"}
        />
      </TouchableOpacity>
    </View>
  </View>

  {/* New Password */}
  <View className="mb-4 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.password.new")}
    </Text>
    <View
      className="rounded-lg overflow-hidden flex-row items-center"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <View className="px-3">
        <Ionicons name="lock-closed-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
      </View>
      <TextInput
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry={!showPassword.new}
        className="p-3.5 flex-1"
        style={{
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.password.enterNew")}
      />
      <TouchableOpacity
        onPress={() => setShowPassword({...showPassword, new: !showPassword.new})}
        className="px-3"
      >
        <Ionicons
          name={showPassword.new ? "eye-off" : "eye"}
          size={20}
          color={theme === "dark" ? "#666" : "#999"}
        />
      </TouchableOpacity>
    </View>
  </View>

  {/* Confirm Password */}
  <View className="mb-4 !bg-transparent">
    <Text className="mb-2" weight="medium">
      {t("profile.password.confirm")}
    </Text>
    <View
      className="rounded-lg overflow-hidden flex-row items-center"
      style={{
        backgroundColor: theme === "dark" ? "#222" : "#F8F8FC",
        borderWidth: 1,
        borderColor: theme === "dark" ? "#333" : "#FFD6EB",
      }}
    >
      <View className="px-3">
        <Ionicons name="checkmark-circle-outline" size={18} color={theme === "dark" ? "#666" : "#FFA7D1"} />
      </View>
      <TextInput
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showPassword.confirm}
        className="p-3.5 flex-1"
        style={{
          fontFamily: i18n.language === "th" ? "NotoSansThai-Regular" : "Poppins-Regular",
          color: theme === "dark" ? "#fff" : "#000",
        }}
        placeholderTextColor={theme === "dark" ? "#666" : "#999"}
        placeholder={t("profile.password.enterConfirm")}
      />
      <TouchableOpacity
        onPress={() => setShowPassword({...showPassword, confirm: !showPassword.confirm})}
        className="px-3"
      >
        <Ionicons
          name={showPassword.confirm ? "eye-off" : "eye"}
          size={20}
          color={theme === "dark" ? "#666" : "#999"}
        />
      </TouchableOpacity>
    </View>
  </View>

  <CustomButton
    title={t("profile.password.change")}
    handlePress={changePassword}
    isLoading={loading}
    containerStyles="mt-4 bg-primary rounded-lg"
    textStyles="!text-black"
  />
</View>

// 8. Improved Action Buttons
<View className="flex-row mx-2 mb-8 space-x-3">
  <TouchableOpacity
    onPress={handleCancel}
    className="flex-1 py-4 rounded-full items-center justify-center"
    style={{
      backgroundColor: theme === "dark" ? "#333" : "#FFE6F5",
      borderWidth: 1,
      borderColor: theme === "dark" ? "#444" : "#FFD6EB",
    }}
    disabled={loading}
  >
    <Text 
      weight="medium" 
      style={{ color: theme === "dark" ? "#fff" : "#333" }}
    >
      {t("common.cancel")}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={saveProfile}
    className="flex-1 py-4 rounded-full items-center justify-center"
    style={{
      backgroundColor: "#FFA7D1",
      borderWidth: 1,
      borderColor: "#FF9CC6",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2,
    }}
    disabled={loading}
  >
    {loading ? (
      <ActivityIndicator size="small" color="#000" />
    ) : (
      <Text weight="semibold" style={{ color: "#000" }}>
        {t("profile.edit.save")}
      </Text>
    )}
  </TouchableOpacity>
</View>

           
          </ScrollView>

          <CustomAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            buttons={alertConfig.buttons}
            onClose={() =>
              setAlertConfig((prev) => ({ ...prev, visible: false }))
            }
          />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ScrollView>
  );
}
