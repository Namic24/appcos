import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  FlatList,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatDistanceToNow, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { Feather, FontAwesome, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "@/providers/ThemeProvider";
import { supabase } from "@/utils/supabase";
import { useAuth } from "@/providers/AuthProvider";

// ความกว้างของหน้าจอสำหรับรูปภาพ
const { width } = Dimensions.get("window");

// ประเภทข้อมูลสำหรับชุดคอสเพลย์
type CostumeDetail = {
  id: number;
  title: string;
  price: number;
  rent_price_per_day?: number;
  deposit_amount?: number;
  description: string;
  size?: string;
  condition?: string;
  category?: string;
  character_name?: string;
  series_name?: string;
  include_items?: string[];
  created_at: string;
  location: string;
  created_by?: string; // เพิ่ม created_by เพื่อเก็บ ID ของผู้สร้าง
  owner_id?: string;
  owner_display_name?: string;
  owner_avatar_url?: string;
  costume_images?: {
    id: number;
    image_url: string;
  }[];
};

export default function productdetail() {
  const router = useRouter();
  const { theme } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const costumeId = params.id;

  const [costume, setCostume] = useState<CostumeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isOwner, setIsOwner] = useState(false); // เพิ่ม state เพื่อตรวจสอบว่าเป็นเจ้าของหรือไม่

  // ฟังก์ชันสำหรับจัดรูปแบบวันที่
  const formatDate = (dateString: string) => {
    try {
      const utcDate = parseISO(dateString);
      const bangkokDate = toZonedTime(utcDate, "Asia/Bangkok");
      const relativeTime = formatDistanceToNow(bangkokDate, {
        addSuffix: true,
        locale: th,
      });
      return relativeTime;
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString;
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูลชุดคอสเพลย์
  const fetchCostumeDetail = async () => {
    setLoading(true);
    try {
      // แก้ไขการดึงข้อมูลให้เหมาะสมกับโครงสร้างของ Supabase
      const { data, error } = await supabase
        .from("costumes") 
        .select(`
          *,
          costume_images (
            id,
            image_url
          )
        `)
        .eq("id", costumeId)
        .single();
  
      if (error) throw error;
  
      // ต้องปรับให้เข้ากับโครงสร้างข้อมูลของคุณ
      if (data) {
        setCostume({
          ...data,
        });
  
        console.log("Current user ID:", session?.user?.id);
        console.log("Data user ID:", data.user_id || data.created_by || data.owner_id);
  
        // ตรวจสอบว่าผู้ใช้ปัจจุบันเป็นเจ้าของชุดหรือไม่
        // ปรับตามโครงสร้างข้อมูลของคุณ
        if (session?.user?.id) {
          const currentUserId = session.user.id;
          const costumeOwnerId = data.user_id || data.created_by || data.owner_id;
          
          if (currentUserId && costumeOwnerId && String(currentUserId) === String(costumeOwnerId)) {
            console.log("Owner match found!");
            setIsOwner(true);
          } else {
            console.log("Not the owner");
            setIsOwner(false);
          }
        } else {
          console.log("No user session");
          setIsOwner(false);
        }
      }
    } catch (error) {
      console.error("Error fetching costume detail:", error);
      setIsOwner(false);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันการลบชุด
  const handleDelete = () => {
    Alert.alert(
      "ยืนยันการลบ",
      "คุณแน่ใจหรือไม่ว่าต้องการลบชุดนี้? การกระทำนี้ไม่สามารถยกเลิกได้",
      [
        {
          text: "ยกเลิก",
          style: "cancel",
        },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              // ลบรูปภาพก่อน (ถ้ามี)
              if (
                costume?.costume_images &&
                costume.costume_images.length > 0
              ) {
                await supabase
                  .from("costume_images")
                  .delete()
                  .eq("costume_id", costumeId);
              }

              // ลบชุด
              const { error } = await supabase
                .from("costumes") // ปรับเป็นชื่อตารางที่ถูกต้อง
                .delete()
                .eq("id", costumeId);

              if (error) throw error;

              // กลับไปยังหน้าหลัก
              Alert.alert("สำเร็จ", "ลบชุดเรียบร้อยแล้ว");
              router.replace("/profile");
            } catch (error) {
              console.error("Error deleting costume:", error);
              Alert.alert(
                "เกิดข้อผิดพลาด",
                "ไม่สามารถลบชุดได้ โปรดลองอีกครั้งในภายหลัง"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // เริ่มต้นดึงข้อมูล
  useEffect(() => {
    if (costumeId) {
      fetchCostumeDetail();
      
    }
  }, [costumeId, session]);
 
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" color="#FFA7D1" />
      </View>
    );
  }

  if (!costume) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-lg">ไม่พบชุดที่ค้นหา</Text>
        <TouchableOpacity
          className="mt-4 px-4 py-2 bg-pink-300 rounded-full"
          onPress={() => router.back()}
        >
          <Text className="text-white font-medium">กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <ScrollView>
        {/* แสดงรูปภาพแบบสไลด์ */}
        <View className="relative">
          <FlatList
            data={costume.costume_images || []}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.floor(
                event.nativeEvent.contentOffset.x / width
              );
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.image_url }}
                style={{ width, height: width * 0.9 }}
                resizeMode="cover"
              />
            )}
            ListEmptyComponent={() => (
              <Image
                source={{
                  uri: "https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg",
                }}
                style={{ width, height: width * 0.9 }}
                resizeMode="cover"
              />
            )}
          />

          {/* ปุ่มย้อนกลับและปุ่มจัดการ (ถ้าเป็นเจ้าของ) */}
          <View className="absolute top-4 left-4 right-4 flex-row justify-between">
            <TouchableOpacity
              className="w-10 h-10 rounded-full bg-black/30 justify-center items-center"
              onPress={() => router.back()}
            >
              <Feather name="arrow-left" size={24} color="white" />
            </TouchableOpacity>

            {isOwner && (
              <View className="flex-row">
                <TouchableOpacity
                  className="w-10 h-10 rounded-full bg-black/30 justify-center items-center mr-2"
                  onPress={() => router.push(`/editcostume?id=${costume.id}`)}
                >
                  <MaterialIcons name="edit" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-10 h-10 rounded-full bg-red-500/70 justify-center items-center"
                  onPress={handleDelete}
                >
                  <MaterialIcons name="delete" size={22} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ตัวบอกตำแหน่งรูปภาพ */}
          {costume.costume_images && costume.costume_images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center">
              {costume.costume_images.map((_, index) => (
                <View
                  key={index}
                  className={`mx-1 w-2 h-2 rounded-full ${
                    index === currentImageIndex ? "bg-pink-500" : "bg-white/50"
                  }`}
                />
              ))}
            </View>
          )}
        </View>

        {/* ส่วนแสดงแบนเนอร์ว่าเป็นผู้ลงชุด (สำหรับเจ้าของ) */}
        {isOwner && (
          <View className="bg-pink-100 dark:bg-pink-900/30 p-3 m-4 rounded-lg flex-row items-center">
            <MaterialIcons name="info" size={20} color="#FFA7D1" />
            <Text className="ml-2 text-pink-700 dark:text-pink-300">
              คุณเป็นเจ้าของชุดนี้ สามารถแก้ไขหรือลบได้
            </Text>
          </View>
        )}

        {/* รายละเอียดชุดคอสเพลย์ */}
        <View className="p-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-2xl font-bold text-gray-800 dark:text-white">
              {costume.title}
            </Text>
            <Text className="text-xl font-bold text-pink-500">
              ฿
              {costume.rent_price_per_day?.toLocaleString() ||
                costume.price?.toLocaleString()}{" "}
              / วัน
            </Text>
          </View>

          <View className="flex-row items-center mt-2">
            <FontAwesome name="map-marker" size={16} color="#9CA3AF" />
            <Text className="ml-2 text-gray-500 dark:text-gray-400">
              {costume.location || "ไม่ระบุตำแหน่ง"}
            </Text>
            <Text className="ml-auto text-gray-500 dark:text-gray-400">
              {formatDate(costume.created_at)}
            </Text>
          </View>

          {/* รายละเอียดตัวละคร (ถ้ามี) */}
          {(costume.character_name || costume.series_name) && (
            <View className="mt-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                รายละเอียดตัวละคร
              </Text>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-700 dark:text-gray-300">
                  ตัวละคร:
                </Text>
                <Text className="text-gray-700 dark:text-gray-300 font-medium">
                  {costume.character_name || "ไม่ระบุ"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-700 dark:text-gray-300">
                  ซีรีส์:
                </Text>
                <Text className="text-gray-700 dark:text-gray-300 font-medium">
                  {costume.series_name || "ไม่ระบุ"}
                </Text>
              </View>
            </View>
          )}

          {/* รายละเอียดชุด */}
          <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              รายละเอียดชุด
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">ไซส์:</Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.size || "ไม่ระบุ"}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">สภาพ:</Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.condition || "ไม่ระบุ"}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-700 dark:text-gray-300">ประเภท:</Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.category || "ไม่ระบุ"}
              </Text>
            </View>
          </View>

          {/* อุปกรณ์ที่รวมอยู่ในชุด (ถ้ามี) */}
          {costume.include_items && costume.include_items.length > 0 && (
            <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
              <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                อุปกรณ์ที่รวมอยู่ในชุด
              </Text>
              {costume.include_items.map((item, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <FontAwesome name="check" size={16} color="#10B981" />
                  <Text className="ml-2 text-gray-700 dark:text-gray-300">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ราคาเงินมัดจำ */}
          <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              ราคาและเงินมัดจำ
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">
                ค่าเช่าต่อวัน:
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                ฿
                {costume.rent_price_per_day?.toLocaleString() ||
                  costume.price?.toLocaleString()}
              </Text>
            </View>
            {costume.deposit_amount && (
              <View className="flex-row justify-between">
                <Text className="text-gray-700 dark:text-gray-300">
                  เงินมัดจำ:
                </Text>
                <Text className="text-gray-700 dark:text-gray-300 font-medium">
                  ฿{costume.deposit_amount.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* รายละเอียดเพิ่มเติม */}
          <View className="mt-4">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              รายละเอียดเพิ่มเติม
            </Text>
            <Text className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {costume.description || "ไม่มีรายละเอียดเพิ่มเติม"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ปุ่มเช่าชุด (แสดงเฉพาะเมื่อไม่ใช่เจ้าของ) */}
      {!isOwner && (
        <View className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <TouchableOpacity
            className="w-full py-3 bg-pink-500 rounded-full flex-row justify-center items-center"
            onPress={() => router.push("/+not-found")}
          >
            <Text className="text-white font-bold text-lg mr-2">
              เช่าชุดนี้
            </Text>
            <Feather name="arrow-right" size={20} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* ปุ่มแก้ไขสำหรับเจ้าของ */}
      {isOwner && (
        <View className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-full flex-row justify-center items-center"
              onPress={handleDelete}
            >
              <MaterialIcons
                name="delete"
                size={20}
                color={theme === "dark" ? "white" : "black"}
              />
              <Text className="ml-2 font-bold text-gray-800 dark:text-white">
                ลบชุด
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 bg-pink-500 rounded-full flex-row justify-center items-center"
              onPress={() => router.push(`/editcostume?id=${costume.id}`)}
            >
              <MaterialIcons name="edit" size={20} color="white" />
              <Text className="ml-2 text-white font-bold">แก้ไขชุด</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
