import { Image, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Switch, StyleSheet, View as RNView, Dimensions } from "react-native";
import { View } from "@/components/Themed";
import { FontAwesome, Feather, Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/utils/supabase";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/ThemeProvider";
import CustomAlert from "@/components/CustomAlert";
import { Text } from "@/components/CustomText";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';

// เพิ่ม interface สำหรับข้อมูลชุด
interface Costume {
  id: string;
  title: string;
  price: number;
  description: string | null;
  status: string;
  created_at: string;
}

// กำหนด interface สำหรับรูปภาพชุด
interface CostumeImage {
  id: string;
  costume_id: string;
  image_url: string;
}

// อินเตอร์เฟซสำหรับชุดที่มีรูปภาพด้วย
interface CostumeWithImage extends Costume {
  costume_images: CostumeImage[];
}

export default function Profile() {
  // State Management
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");

  // เพิ่ม state สำหรับเก็บข้อมูลชุด
  const [costumes, setCostumes] = useState<CostumeWithImage[]>([]);
  const [loadingCostumes, setLoadingCostumes] = useState(false);
  
  // คำนวณขนาดรูปภาพในกริด
  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - 50) / 3; // 3 คอลัมน์ padding 16x2 และ gap 2px

  // Alert Configuration
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

  // Profile Data
  const [profile, setProfile] = useState<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    gender: string | null;
    birthday: string | null;
    phone: string | null;
    address: string | null;
  }>();

  // ฟังก์ชันดึงข้อมูลชุดของผู้ใช้
  const fetchUserCostumes = async () => {
    try {
      if (!session?.user?.id) return;
      setLoadingCostumes(true);

      const { data, error } = await supabase
        .from('costumes')
        .select(`
          *,
          costume_images (
            id,
            image_url,
            created_at
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("ดึงข้อมูลชุดสำเร็จ:", data?.length || 0, "รายการ");
      setCostumes(data || []);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลชุด:", error);
    } finally {
      setLoadingCostumes(false);
    }
  };

  // Fetch Profile Data
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        console.log("Fetching profile on focus");
        fetchProfile();
        fetchUserCostumes(); // เรียกใช้ฟังก์ชันดึงข้อมูลชุดเมื่อหน้าโปรไฟล์ได้รับโฟกัส
      }
    }, [session?.user?.id])
  );

  // ดึงชื่อผู้ใช้จาก metadata ของ session
  useEffect(() => {
    console.log("Session info:", {
      userId: session?.user?.id,
      email: session?.user?.email,
      userData: session?.user?.user_metadata,
    });
    
    if (session?.user?.user_metadata?.display_name) {
      setDisplayName(session.user.user_metadata.display_name);
    } else if (session?.user?.email) {
      setDisplayName(session.user.email);
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) return;

      setLoading(true);
      console.log("กำลังดึงข้อมูลโปรไฟล์สำหรับผู้ใช้:", session.user.id);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, gender, birthday, phone, address")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;
      console.log("Profile data from Supabase:", data);
      setProfile(data);
      
      // ตั้งค่า displayName จากข้อมูลโปรไฟล์
      if (data?.display_name) {
        console.log("ตั้งค่า display_name เป็น:", data.display_name);
        setDisplayName(data.display_name);
      } else if (session?.user?.email) {
        console.log("ไม่พบ display_name ใช้อีเมลแทน:", session.user.email);
        setDisplayName(session.user.email);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to Edit Profile
  const navigateToEditProfile = () => {
    router.push("/editprofile");
  };

  // Navigate to Add Costume
  const navigateToAddCostume = () => {
    router.push("/addcostume");
  };

  // Navigate to Edit Costume
  const navigateToEditCostume = (costumeId: string) => {
    router.push({
      pathname: "/productdetail",
      params: { id: costumeId }
    });
  };

  // ฟังก์ชันออกจากระบบ
  const handleLogout = async () => {
    setAlertConfig({
      visible: true,
      title: t("settings.logout.confirmTitle"),
      message: t("settings.logout.confirmMessage"),
      buttons: [
        {
          text: t("common.cancel"),
          style: "cancel",
          onPress: () =>
            setAlertConfig((prev) => ({ ...prev, visible: false })),
        },
        {
          text: t("common.confirm"),
          style: "destructive",
          onPress: async () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                setAlertConfig({
                  visible: true,
                  title: t("common.error"),
                  message: error.message,
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
              await AsyncStorage.removeItem("isLoggedIn");
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Failed to logout:", error);
              setAlertConfig({
                visible: true,
                title: t("common.error"),
                message: t("settings.logout.error"),
                buttons: [
                  {
                    text: t("common.ok"),
                    onPress: () =>
                      setAlertConfig((prev) => ({ ...prev, visible: false })),
                  },
                ],
              });
            }
          },
        },
      ],
    });
  };

  // ฟังก์ชันแสดงตัวเลือกภาษา
  const showLanguageOptions = () => {
    // ตรวจสอบว่า alert ก่อนหน้าปิดแล้ว
    if (!alertConfig.visible) {
      setAlertConfig({
        visible: true,
        title: "เลือกภาษา / Select Language",
        message: "",
        buttons: [
          {
            text: "ไทย",
            onPress: async () => {
              await changeLanguage("th");
            },
          },
          {
            text: "English",
            onPress: async () => {
              await changeLanguage("en");
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
    }
  };
  
  // เพิ่มฟังก์ชันเปลี่ยนภาษา
  const changeLanguage = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang);
      await AsyncStorage.setItem("userLanguage", lang);
      setAlertConfig((prev) => ({ ...prev, visible: false }));
    } catch (error) {
      console.error("Error changing language:", error);
      setAlertConfig({
        visible: true,
        title: t("common.error"),
        message: "ไม่สามารถเปลี่ยนภาษาได้",
        buttons: [
          {
            text: t("common.ok"),
            onPress: () =>
              setAlertConfig((prev) => ({ ...prev, visible: false })),
          },
        ],
      });
    }
  };
  
  // คอมโพเนนต์สำหรับรายการในส่วนตั้งค่า
  const SectionItem = ({
    icon,
    text,
    onPress,
    iconColor,
    rightElement,
  }: {
    icon: any;
    text: string;
    onPress: () => void;
    iconColor?: string;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between py-4 border-b"
      style={{
        borderBottomColor: theme === "dark" ? "#333" : "#eee",
      }}
    >
      <View 
        className="flex-row items-center" 
        style={{ backgroundColor: "transparent" }}
      >
        <Feather
          name={icon}
          size={20}
          color={iconColor || (theme === "dark" ? "#fff" : "#000")}
          style={{ marginRight: 12 }}
        />
        <Text style={{ color: iconColor || (theme === "dark" ? "#fff" : "#000") }}>
          {text}
        </Text>
      </View>
      {rightElement || (
        <Feather
          name="chevron-right"
          size={18}
          color={theme === "dark" ? "#666" : "#999"}
        />
      )}
    </TouchableOpacity>
  );

  // เพิ่มฟังก์ชันสำหรับแสดงวันที่ในรูปแบบที่อ่านง่าย
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`;
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{
        backgroundColor: theme === "dark" ? "#121212" : "#F8F8FC",
      }}
    >
      <ScrollView className="flex-1">
        {/* Profile Header - ปรับปรุงใหม่ */}
        <View 
          className="pb-6 pt-2"
          style={{
            backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
            borderBottomLeftRadius: 25,
            borderBottomRightRadius: 25,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === "dark" ? 0.3 : 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <View className="px-4 flex-row justify-between items-center mb-4">
            <Text
              className="text-xl"
              weight="bold"
              style={{
                color: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
              }}
            >
              {t("profile.myProfile")}
            </Text>
            <TouchableOpacity
              onPress={() => {}}
              className="p-2"
            >
              <Feather
                name="bell"
                size={22}
                color={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
              />
            </TouchableOpacity>
          </View>

          {/* Profile Card */}
          <View
            className="mx-4 px-5 py-6 rounded-xl"
            style={{
              backgroundColor: theme === "dark" ? "#2D2D3A" : "#FFF0F9",
              borderWidth: 1,
              borderColor: theme === "dark" ? "#333" : "#FFD6EB",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: theme === "dark" ? 0.3 : 0.1,
              shadowRadius: 5,
              elevation: 3,
              borderRadius: 5
            }}
          >
            <View className="flex-row ">
              {/* Avatar */}
              <View className="mr-4">
                <View className="relative">
                  <Image
                    source={{
                      uri: `${profile?.avatar_url || "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png"}?t=${Date.now()}`,
                      cache: "reload",
                    }}
                    className="w-24 h-24 rounded-full"
                    style={{
                      borderWidth: 3,
                      borderColor: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
                    }}
                  />
                  {loading && (
                    <View className="absolute w-full h-full items-center justify-center bg-black/30 rounded-full">
                      <ActivityIndicator color="#FFA7D1" />
                    </View>
                  )}
                </View>
              </View>

              {/* User Info */}
              <View className="flex-1 justify-center" style={{ backgroundColor: "transparent" }}>
                <Text
                  className="text-lg mb-1"
                  weight="bold"
                  style={{ color: theme === "dark" ? "#fff" : "#000" }}
                >
                  {displayName || profile?.display_name || t("profile.noName")}
                </Text>
                <Text
                  className="text-sm mb-2"
                  style={{ color: theme === "dark" ? "#ccc" : "#666" }}
                >
                  {session?.user?.email}
                </Text>
                <View className="flex-row items-center mt-1" style={{ backgroundColor: "transparent" }}>
                  <Ionicons 
                    name="call-outline" 
                    size={14} 
                    color={theme === "dark" ? "#FFA7D1" : "#FFA7D1"} 
                    style={{ marginRight: 5 }}
                  />
                  <Text 
                    className="text-sm"
                    style={{ color: theme === "dark" ? "#ccc" : "#666" }}
                  >
                    {profile?.phone || t("profile.noPhone")}
                  </Text>
                </View>
              </View>
            </View>

            {/* Stats Badges */}
            <View
              className="flex-row justify-around mt-6 pt-5 border-t"
              style={{ 
                backgroundColor: "transparent",
                borderTopColor: theme === "dark" ? "#444" : "#FFE6F5",
              }}
            >
              <View
                className="items-center"
                style={{ backgroundColor: "transparent" }}
              >
                <Text
                  className="text-lg"
                  weight="bold"
                  style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
                >
                  {costumes.length}
                </Text>
                <Text className="text-xs mt-1" style={{ color: theme === "dark" ? "#ccc" : "#666" }}>
                  คอสตูม
                </Text>
              </View>
              <View
                className="items-center"
                style={{ backgroundColor: "transparent" }}
              >
                <Text
                  className="text-lg"
                  weight="bold"
                  style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
                >
                  35
                </Text>
                <Text className="text-xs mt-1" style={{ color: theme === "dark" ? "#ccc" : "#666" }}>
                  คอสเพลย์
                </Text>
              </View>
              <View
                className="items-center"
                style={{ backgroundColor: "transparent" }}
              >
                <Text
                  className="text-lg"
                  weight="bold"
                  style={{ color: theme === "dark" ? "#FFA7D1" : "#FFA7D1" }}
                >
                  8
                </Text>
                <Text className="text-xs mt-1" style={{ color: theme === "dark" ? "#ccc" : "#666" }}>
                  เลเวล
                </Text>
              </View>
            </View>

            {/* Edit Profile Button */}
            <TouchableOpacity
              className="mt-6 py-3 rounded-full"
              style={{
                backgroundColor: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
              onPress={navigateToEditProfile}
            >
              <Text
                className="text-center text-black"
                weight="semibold"
              >
                {t("profile.editProfile")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* คอสตูมของฉันส่วนคล้าย Instagram */}
        <View 
          className="mx-4 mt-6 p-4 rounded-xl"
          style={{
            backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
            borderWidth: 1,
            borderColor: theme === "dark" ? "#333" : "#FFE6F5",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === "dark" ? 0.2 : 0.05,
            shadowRadius: 5,
            elevation: 2,
          }}
        >
          <View className="flex-row justify-between items-center mb-4">
            <Text
              weight="bold"
              style={{
                color: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
                fontSize: 18,
              }}
            >
               {t("profile.myCostume")}
            </Text>
            <TouchableOpacity
              onPress={navigateToAddCostume}
              style={{
                backgroundColor: theme === "dark" ? "#333" : "#FFE6F5",
                borderRadius: 20,
                padding: 8,
              }}
            >
              <Ionicons name="add" size={18} color={theme === "dark" ? "#FFA7D1" : "#FFA7D1"} />
            </TouchableOpacity>
          </View>

          {loadingCostumes ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator color="#FFA7D1" size="large" />
              <Text className="mt-2" style={{ color: theme === "dark" ? "#ccc" : "#666" }}>
                กำลังโหลดข้อมูล...
              </Text>
            </View>
          ) : costumes.length > 0 ? (
            <View className="flex-row flex-wrap">
              {costumes.map((costume) => (
                <TouchableOpacity
                  key={costume.id}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    margin: 1,
                  }}
                  onPress={() => navigateToEditCostume(costume.id)}
                >
                  <Image
                    source={{
                      uri: costume.costume_images && costume.costume_images.length > 0
                        ? costume.costume_images[0].image_url
                        : "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg",
                      cache: "reload",
                    }}
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                    resizeMode="cover"
                  />
                  {costume.costume_images && costume.costume_images.length > 1 && (
                    <View
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="copy-outline" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="py-8 items-center justify-center">
              <Ionicons 
                name="images-outline" 
                size={50} 
                color={theme === "dark" ? "#444" : "#FFE6F5"} 
              />
              <Text 
                className="mt-2 text-center" 
                style={{ color: theme === "dark" ? "#ccc" : "#666" }}
              >
               {t("profile.addyourcostume")} 
              </Text>
            </View>
          )}
        </View>

        {/* Settings Section */}
        <View 
          className="mx-4 mt-6 p-4 rounded-xl"
          style={{
            backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
            borderWidth: 1,
            borderColor: theme === "dark" ? "#333" : "#FFE6F5",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme === "dark" ? 0.2 : 0.05,
            shadowRadius: 5,
            elevation: 2,
          }}
        >
          <Text
            className="mb-3 px-1"
            weight="bold"
            style={{
              color: theme === "dark" ? "#FFA7D1" : "#FFA7D1",
              fontSize: 18,
            }}
          >
            {t("profile.settings")}
          </Text>

          <View style={{ backgroundColor: "transparent" }}>
            {/* Theme Toggle */}
            <SectionItem
              icon={theme === "dark" ? "moon" : "sun"}
              text={t("settings.appearance.title")}
              onPress={toggleTheme}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
              rightElement={
                <Switch
                  trackColor={{ false: "#767577", true: "#FFC5E3" }}
                  thumbColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
                  ios_backgroundColor="#3e3e3e"
                  onValueChange={toggleTheme}
                  value={theme === "dark"}
                />
              }
            />

            {/* Language */}
            <SectionItem
              icon="globe"
              text={`${t("settings.language")} (${
                i18n.language === "th" ? "ไทย" : "English"
              })`}
              onPress={showLanguageOptions}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
            />

            {/* Privacy */}
            <SectionItem
              icon="lock"
              text={t("settings.privacy.title")}
              onPress={() => {}}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
            />

            {/* Notifications */}
            <SectionItem
              icon="bell"
              text={t("settings.notifications")}
              onPress={() => {}}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
            />

            {/* Help & Support */}
            <SectionItem
              icon="help-circle"
              text={t("settings.support")}
              onPress={() => {}}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
            />

            {/* About */}
            <SectionItem
              icon="info"
              text={t("settings.about")}
              onPress={() => {}}
              iconColor={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
            />

            {/* Logout Button */}
            <SectionItem
              icon="log-out"
              text={t("settings.logout.logout")}
              onPress={handleLogout}
              iconColor="#FF0000"
            />
          </View>
        </View>

        {/* Additional space at bottom */}
        <View style={{ height: 40, backgroundColor: "transparent" }} />
      </ScrollView>

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