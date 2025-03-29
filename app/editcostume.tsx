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
  View,
  Platform,
} from "react-native";
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

// กำหนด interface สำหรับข้อมูลชุด
interface Costume {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price: number;
  test_price: number | null;
  available_sizes: string[];
  size_measurements: string | null;
  deposit_amount: number;
  rent_duration: string | null;
  available_slots: number;
  location: string | null;
  status: string;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
  
}

// กำหนด interface สำหรับรูปภาพชุด
interface CostumeImage {
  id: string;
  costume_id: string;
  image_url: string;
  created_at: string;
}

export default function EditCostume() {
  // 1. Setup & State
  const params = useLocalSearchParams();
  const { session } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const costumeId = params.id as string;

  // สถานะข้อมูลชุด
  const [costume, setCostume] = useState<Costume>({
    id: "",
    user_id: "",
    title: "",
    description: "",
    price: 0,
    test_price: null,
    available_sizes: [],
    size_measurements: "",
    deposit_amount: 0,
    rent_duration: "",
    available_slots: 1,
    location: "",
    status: "active",
    additional_notes: "",
    created_at: "",
    updated_at: "",
  });
  
  const [costumeImages, setCostumeImages] = useState<CostumeImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // สถานะการจัดการรูปภาพ
  const [uploadedImages, setUploadedImages] = useState<
    { base64: string; uri: string }[]
  >([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  // การตั้งค่าการแจ้งเตือน
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

  // 2. Effects
  useEffect(() => {
    // ขอสิทธิ์การใช้งานกล้องและแกลเลอรี่เมื่อโหลดคอมโพเนนต์
    (async () => {
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();

    // ดึงข้อมูลชุดเมื่อโหลดคอมโพเนนต์
    fetchCostume();
    fetchCostumeImages();
  }, [costumeId]);

  // จัดการปุ่มย้อนกลับ
  useEffect(() => {
    const handleBackPress = () => {
      if (hasUnsavedChanges) {
        // แสดงกล่องยืนยันก่อนออกจากหน้า
        showExitConfirmation();
        return true; // ป้องกันการกลับแบบปกติ
      }
      return false; // อนุญาตให้กลับแบบปกติ
    };

    // เพิ่ม event listener สำหรับปุ่มย้อนกลับฮาร์ดแวร์
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );

    // ล้าง event listener
    return () => backHandler.remove();
  }, [hasUnsavedChanges]);

  // 3. การดึงข้อมูล
  const fetchCostume = async () => {
    try {
      if (!costumeId) {
        router.back();
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("costumes")
        .select("*")
        .eq("id", costumeId)
        .single();

      if (error) throw error;
      setCostume(data);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงข้อมูลชุด:", error);
      showAlert("common.error", "costume.fetchError");
    } finally {
      setLoading(false);
    }
  };

  const fetchCostumeImages = async () => {
    try {
      if (!costumeId) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("costume_images")
        .select("*")
        .eq("costume_id", costumeId);

      if (error) throw error;
      
      // เพิ่ม timestamp เพื่อหลีกเลี่ยงปัญหาการแคช
      const imagesWithTimestamp = data.map(img => ({
        ...img,
        image_url: `${img.image_url}?t=${Date.now()}`
      }));
      
      setCostumeImages(imagesWithTimestamp);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการดึงรูปภาพชุด:", error);
      showAlert("common.error", "costume.imagesError");
    } finally {
      setLoading(false);
    }
  };

  // 4. ฟังก์ชันช่วยเหลือ
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
      message: t("costume.edit.exitConfirmation"),
      buttons: [
        {
          text: t("costume.edit.saveAndExit"),
          onPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            updateCostume();
          },
        },
        {
          text: t("costume.edit.exitWithoutSaving"),
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

  // 5. การจัดการรูปภาพ
  const selectImages = async () => {
    try {
      // ตรวจสอบจำนวนรูปภาพทั้งหมด
      const totalImages = costumeImages.length + uploadedImages.length;
      if (totalImages >= 5) {
        showAlert("common.error", "costume.images.maxLimit");
        return;
      }

      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const libraryPermission =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      Alert.alert(
        "เลือกรูปภาพ",
        "กรุณาเลือกวิธีการอัปโหลดรูปภาพ",
        [
          {
            text: "ถ่ายภาพ",
            onPress: async () => {
              try {
                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  aspect: [4, 3],
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
                console.error("เกิดข้อผิดพลาดกับกล้อง:", err);
                Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถถ่ายภาพได้");
              }
            },
          },
          {
            text: "เลือกจากแกลเลอรี่",
            onPress: async () => {
              try {
                const remainingSlots = 5 - totalImages;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsMultipleSelection: true,
                  quality: 0.7,
                  base64: true,
                  selectionLimit: remainingSlots,
                });

                if (!result.canceled && result.assets) {
                  handleImageResult(result);
                }
              } catch (err) {
                console.error("เกิดข้อผิดพลาดกับแกลเลอรี่:", err);
                Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
              }
            },
          },
          {
            text: "ยกเลิก",
            style: "cancel",
          },
        ]
      );
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเลือกรูปภาพ:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเลือกรูปภาพได้");
    }
  };

  const handleImageResult = (result: ImagePicker.ImagePickerResult) => {
    if (!result.assets) return;

    try {
      const newImages = result.assets
        .filter(asset => asset.base64)
        .map(asset => ({
          base64: asset.base64!,
          uri: asset.uri
        }));
      
      setUploadedImages(prev => [...prev, ...newImages]);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ:", error);
      showAlert("common.error", "costume.images.processingError");
    }
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const removeExistingImage = (imageId: string) => {
    setRemovedImageIds(prev => [...prev, imageId]);
    setCostumeImages(prev => prev.filter(img => img.id !== imageId));
    setHasUnsavedChanges(true);
  };

  // จัดการการกดปุ่มยกเลิก
  const handleCancel = () => {
    if (hasUnsavedChanges) {
      showExitConfirmation();
    } else {
      router.back();
    }
  };

  // แก้ไขฟังก์ชันอัปโหลดรูปภาพเพื่อให้ทำงานได้จริงกับ Supabase
  const uploadAndSaveImages = async (costumeId: string) => {
    try {
      // ตรวจสอบว่ามีรูปภาพที่จะอัปโหลดหรือไม่
      if (uploadedImages.length === 0 && removedImageIds.length === 0) {
        return true; // ไม่มีการเปลี่ยนแปลงรูปภาพ
      }

      // 1. ลบรูปภาพที่ถูกเลือกให้ลบ
      if (removedImageIds.length > 0) {
        // 1.1 ดึงข้อมูล URL รูปภาพเพื่อลบไฟล์จาก storage
        const { data: imagesToRemove, error: fetchError } = await supabase
          .from("costume_images")
          .select("image_url")
          .in("id", removedImageIds);

        if (fetchError) {
          console.error("เกิดข้อผิดพลาดในการดึงข้อมูลรูปภาพที่จะลบ:", fetchError);
          throw fetchError;
        }

        // 1.2 ลบไฟล์จาก storage
        for (const image of imagesToRemove || []) {
          // ดึงเฉพาะส่วนพาธของไฟล์จาก URL
          const filePathMatch = image.image_url.match(/costume-images\/([^?]+)/);
          if (filePathMatch && filePathMatch[1]) {
            const filePath = filePathMatch[1];
            console.log("กำลังลบไฟล์:", filePath);
            
            const { error: removeError } = await supabase.storage
              .from("costume-images")
              .remove([filePath]);
              
            if (removeError) {
              console.error("เกิดข้อผิดพลาดในการลบไฟล์:", removeError);
              // ไม่ throw error เพื่อให้กระบวนการดำเนินต่อไป
            }
          }
        }

        // 1.3 ลบข้อมูลจากตาราง costume_images
        const { error: deleteError } = await supabase
          .from("costume_images")
          .delete()
          .in("id", removedImageIds);

        if (deleteError) {
          console.error("เกิดข้อผิดพลาดในการลบข้อมูลรูปภาพ:", deleteError);
          throw deleteError;
        }
      }

      // 2. อัปโหลดรูปภาพใหม่
      for (const image of uploadedImages) {
        try {
          // 2.1 สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
          const fileName = `costume_${costumeId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}.jpg`;
          
          console.log("กำลังอัปโหลดรูปภาพ:", fileName);
          
          // 2.2 อัปโหลดรูปภาพไปยัง Supabase Storage
          if (!image.base64) {
            console.error("ไม่พบข้อมูล base64 ในรูปภาพ");
            continue;
          }
          
          const base64Data = image.base64.includes('base64,') 
            ? image.base64.split('base64,')[1] 
            : image.base64;
            
          const { error: uploadError, data: uploadData } = await supabase.storage
            .from("costume-images")
            .upload(fileName, decode(base64Data), {
              contentType: "image/jpeg",
              upsert: true,
            });

          if (uploadError) {
            console.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ:", uploadError);
            continue; // ข้ามไปรูปถัดไปแทนที่จะหยุดทั้งหมด
          }

          // 2.3 ดึง URL สาธารณะของรูปภาพ
          const { data: publicUrlData } = supabase.storage
            .from("costume-images")
            .getPublicUrl(fileName);

          if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error("ไม่สามารถดึง URL สาธารณะของรูปภาพได้");
            continue;
          }
          
          console.log("อัปโหลดสำเร็จ, URL:", publicUrlData.publicUrl);

          // 2.4 บันทึกข้อมูลรูปภาพลงในตาราง costume_images
          const { error: insertError } = await supabase
            .from("costume_images")
            .insert({
              costume_id: costumeId,
              image_url: publicUrlData.publicUrl,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error("เกิดข้อผิดพลาดในการบันทึกข้อมูลรูปภาพ:", insertError);
            continue;
          }
        } catch (imageError) {
          console.error("เกิดข้อผิดพลาดในการประมวลผลรูปภาพ:", imageError);
          // ดำเนินการต่อกับรูปถัดไป
        }
      }

      return true;
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ:", error);
      return false;
    }
  };

  // ฟังก์ชันอัปเดตข้อมูลชุด
  const updateCostume = async () => {
    try {
      setLoading(true);

      // ตรวจสอบว่ามี session อย่างรัดกุม
      if (!session || !session.user || !session.user.id) {
        showAlert("common.error", "costume.auth.required");
        setLoading(false);
        return;
      }

      // ตรวจสอบข้อมูลสำคัญต่อไป...
      if (!costume?.title?.trim()) {
        showAlert("common.error", "costume.validation.nameRequired");
        setLoading(false);
        return;
      }

      // อัปโหลดรูปภาพก่อน
      console.log("กำลังอัปโหลดรูปภาพ...");
      const imagesSuccess = await uploadAndSaveImages(costumeId);
      
      if (!imagesSuccess) {
        console.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ");
        throw new Error("ไม่สามารถอัปโหลดรูปภาพได้");
      }
      
      console.log("อัปโหลดรูปภาพสำเร็จ");
      
      // อัปเดตข้อมูลชุด
      const costumeData = {
        user_id: session.user.id,
        title: costume.title, 
        price: costume.price,
        test_price: costume.test_price,
        deposit_amount: costume.deposit_amount,
        available_sizes: costume.available_sizes,
        size_measurements: costume.size_measurements,
        available_slots: costume.available_slots || 1,
        rent_duration: costume.rent_duration,
        location: costume.location,
        additional_notes: costume.additional_notes,
        status: 'active',
        updated_at: new Date().toISOString(),
     
      };
      
      console.log("กำลังอัปเดตชุด ID:", costumeId);
      console.log("ข้อมูลที่จะอัปเดต:", JSON.stringify(costumeData, null, 2));
      
      const { error } = await supabase
        .from('costumes')
        .update(costumeData)
        .eq('id', costumeId);

      if (error) {
        console.error("เกิดข้อผิดพลาดในการอัปเดตชุด:", error);
        console.error("รายละเอียด:", JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log("อัปเดตชุดสำเร็จ");
      
      // แสดงข้อความสำเร็จ
      showAlert("common.success", "costume.edit.success", [
        {
          text: t("common.ok"),
          onPress: () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            router.back();
          },
        },
      ]);
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการอัปเดตชุด:", error);
      console.error("รายละเอียดข้อผิดพลาด:", JSON.stringify(error, null, 2));
      showAlert("common.error", "costume.edit.error");
    } finally {
      setLoading(false);
    }
  };

  // 7. การเรนเดอร์ UI
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme === "dark" ? "#000" : "#F8F8FC",
        }}
      >
        <Stack.Screen
          options={{
            headerTitle: "แก้ไขชุด",
            headerTransparent: false,
            headerShadowVisible: false,
            headerTitleStyle: {
              fontSize: 18,
              fontFamily: "NotoSansThai-Regular",
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

        {/* ตัวแสดงสถานะการโหลด */}
        {loading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 50,
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        <ScrollView
          contentContainerStyle={{
            padding: 16,
            backgroundColor: theme === "dark" ? "#000" : "#F8F8FC",
          }}
        >
          {/* ส่วนของรูปภาพ */}
          <View 
            style={{
              marginBottom: 20,
              backgroundColor: "transparent"
            }}
          >
            <Text
              style={{
                fontSize: 18,
                marginBottom: 10,
                fontWeight: "600",
                color: theme === "dark" ? "#FFA7D1" : "#FFA7D1"
              }}
            >
              รูปภาพชุด
            </Text>
            
            <View
              style={{
                backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: theme === "dark" ? "#333" : "#FFE6F5",
              }}
            >
              {/* ตารางรูปภาพ */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 16,
                  backgroundColor: "transparent"
                }}
              >
                {/* รูปภาพที่มีอยู่แล้ว */}
                {costumeImages.map((image) => (
                  <View
                    key={image.id}
                    style={{
                      width: "30%",
                      aspectRatio: 1,
                      margin: "1.65%",
                      borderRadius: 8,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Image
                      source={{ uri: image.image_url }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeExistingImage(image.id)}
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        borderRadius: 15,
                        width: 25,
                        height: 25,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* รูปภาพที่เพิ่งอัปโหลด */}
                {uploadedImages.map((image, index) => (
                  <View
                    key={`new-${index}`}
                    style={{
                      width: "30%",
                      aspectRatio: 1,
                      margin: "1.65%",
                      borderRadius: 8,
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <Image
                      source={{ uri: image.uri }}
                      style={{ width: "100%", height: "100%" }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removeUploadedImage(index)}
                      style={{
                        position: "absolute",
                        top: 5,
                        right: 5,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        borderRadius: 15,
                        width: 25,
                        height: 25,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* ปุ่มเพิ่มรูปภาพ */}
                {(costumeImages.length + uploadedImages.length) < 5 && (
                  <TouchableOpacity
                    onPress={selectImages}
                    style={{
                      width: "30%",
                      aspectRatio: 1,
                      margin: "1.65%",
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: theme === "dark" ? "#444" : "#FFD6EB",
                      borderStyle: "dashed",
                      justifyContent: "center",
                      alignItems: "center",
                      backgroundColor: theme === "dark" ? "#222" : "#FFE6F5",
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={30}
                      color={theme === "dark" ? "#FFA7D1" : "#FFA7D1"}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Text
                style={{
                  fontSize: 14,
                  color: theme === "dark" ? "#aaa" : "#888",
                  textAlign: "center",
                }}
              >
                กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป (สูงสุด 5 รูป)
              </Text>
            </View>
          </View>

          {/* ส่วนของข้อมูลชุด */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 18,
                marginBottom: 10,
                fontWeight: "600",
                color: theme === "dark" ? "#FFA7D1" : "#FFA7D1"
              }}
            >
              ข้อมูลชุด
            </Text>
            
            <View
              style={{
                backgroundColor: theme === "dark" ? "#1E1E2D" : "#FFF",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: theme === "dark" ? "#333" : "#FFE6F5",
              }}
            >
              {/* ชื่อชุดภาษาไทย */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  ชื่อชุด (ภาษาไทย) *
                </Text>
                <TextInput
                  value={costume?.title || ""}
                  onChangeText={(text) => {
                    setCostume(prev => ({ ...prev!, title: text }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="กรอกชื่อชุดภาษาไทย"
                />
              </View>

              {/* ราคาไพรเวท */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  ราคาเทส (บาท) *
                </Text>
                <TextInput
                  value={costume?.price ? costume.price.toString() : ""}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setCostume(prev =>  ({ ...prev, price: numericValue ? parseInt(numericValue) : 0 }));
                    setHasUnsavedChanges(true);
                  }}
                  
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="0"
                />
              </View>

              {/* ราคาเทสเช่า */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  ราคาไพรเวท (บาท) *
                </Text>
                <TextInput
                  value={costume?.test_price ? costume.test_price.toString() : ""}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setCostume(prev =>  ({ ...prev, test_price: numericValue ? parseInt(numericValue) : 0 }));
                    setHasUnsavedChanges(true);
                  }}
                  
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="0"
                />
              </View>

              {/* เงินมัดจำ */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  เงินมัดจำ (บาท) *
                </Text>
                <TextInput
                  value={costume?.deposit_amount ? costume.deposit_amount.toString() : ""}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setCostume(prev => ({ ...prev, deposit_amount: numericValue ? parseInt(numericValue) : 0 }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="0"
                />
              </View>

              {/* ไซส์ที่มี */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  ไซส์ที่มี *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                  {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Free Size'].map((size) => (
                    <TouchableOpacity
                    key={size}
                    onPress={() => {
                      setCostume(prev => {
                        if (!prev) return prev; // ป้องกันกรณี prev เป็น null
                  
                        const currentSizes = prev.available_sizes || [];
                        let newSizes;
                  
                        if (currentSizes.includes(size)) {
                          newSizes = currentSizes.filter(s => s !== size);
                        } else {
                          newSizes = [...currentSizes, size];
                        }
                  
                        setHasUnsavedChanges(true);
                        return { ...prev, available_sizes: newSizes };
                      });
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginRight: 8,
                      marginBottom: 8,
                      borderRadius: 20,
                      backgroundColor: costume?.available_sizes?.includes(size) 
                        ? "#FFA7D1" 
                        : theme === "dark" ? "#2A2A3A" : "#FFE6F5",
                      borderWidth: 1,
                      borderColor: costume?.available_sizes?.includes(size)
                        ? "#FF9CC6"
                        : theme === "dark" ? "#444" : "#FFD6EB",
                    }}
                  >
                    <Text
                      style={{
                        color: costume?.available_sizes?.includes(size)
                          ? "#000"
                          : theme === "dark" ? "#fff" : "#333",
                      }}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                  
                  ))}
                </View>
                <TextInput
                  value={costume?.size_measurements || ""}
                  onChangeText={(text) => {
                    setCostume(prev =>  ({ ...prev, size_measurements: text }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                    height: 80,
                    textAlignVertical: 'top',
                  }}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="รายละเอียดการวัดขนาด เช่น รอบอก, เอว, สะโพก (ถ้ามี)"
                />
              </View>

              {/* จำนวนคิวที่รับได้ */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  จำนวนคิวที่รับได้ *
                </Text>

                <TextInput
                  value={costume?.available_slots ? costume.available_slots.toString() : ""}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9]/g, '');
                    setCostume(prev =>  ({ ...prev, available_slots: numericValue ? parseInt(numericValue) : 1 }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="1"
                />
              </View>

              {/* ระยะเวลาเช่า */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  ระยะเวลาเช่า
                </Text>
                <TextInput
                  value={costume?.rent_duration || ""}
                  onChangeText={(text) => {
                    setCostume(prev =>({ ...prev, rent_duration: text }));
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="เช่น 3 วัน, 1 สัปดาห์"
                />
              </View>

              {/* สถานที่รับส่ง */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  สถานที่รับส่ง
                </Text>
                <TextInput
                  value={costume?.location || ""}
                  onChangeText={(text) => {
                    setCostume(prev => ({ ...prev, location: text }) );
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                  }}
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="เช่น BTS อโศก, มหาวิทยาลัยธรรมศาสตร์"
                />
              </View>

              {/* รายละเอียดเพิ่มเติม */}
              <View style={{ marginBottom: 8 }}>
                <Text style={{ 
                  fontSize: 16, 
                  marginBottom: 8, 
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500"
                }}>
                  รายละเอียดเพิ่มเติม
                </Text>
                <TextInput
                  value={costume?.additional_notes || ""}
                  onChangeText={(text) => {
                    setCostume(prev => ({ ...prev, additional_notes: text }) );
                    setHasUnsavedChanges(true);
                  }}
                  style={{
                    backgroundColor: theme === "dark" ? "#2A2A3A" : "#FFF",
                    borderWidth: 1,
                    borderColor: theme === "dark" ? "#444" : "#FFE6F5",
                    borderRadius: 8,
                    padding: 12,
                    color: theme === "dark" ? "#fff" : "#333",
                    height: 100,
                    textAlignVertical: 'top',
                  }}
                  multiline
                  numberOfLines={5}
                  placeholderTextColor={theme === "dark" ? "#777" : "#999"}
                  placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับชุด เช่น อุปกรณ์เสริม, ข้อควรระวัง"
                />
              </View>
            </View>
          </View>

          {/* ปุ่มดำเนินการ */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 24,
              marginBottom: 40,
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={handleCancel}
              style={{
                flex: 1,
                marginRight: 8,
                padding: 16,
                borderRadius: 30,
                alignItems: "center",
                backgroundColor: theme === "dark" ? "#333" : "#FFE6F5",
                borderWidth: 1,
                borderColor: theme === "dark" ? "#444" : "#FFD6EB",
              }}
              disabled={loading}
            >
              <Text
                style={{
                  color: theme === "dark" ? "#fff" : "#333",
                  fontWeight: "500",
                }}
              >
                ยกเลิก
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={updateCostume}
              style={{
                flex: 1,
                marginLeft: 8,
                padding: 16,
                borderRadius: 30,
                alignItems: "center",
                backgroundColor: "#FFA7D1",
                borderWidth: 1,
                borderColor: "#FF9CC6",
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={{ color: "#000", fontWeight: "600" }}>
                  อัปเดต
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
          onClose={() => setAlertConfig((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}