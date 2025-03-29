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

// ประเภทข้อมูลสำหรับชุดคอสเพลย์ - ปรับให้สอดคล้องกับ addcostume.tsx
type CostumeDetail = {
  id: string | number;
  user_id: string;
  title: string;
  price: number;
  test_price?: number | null;
  deposit_amount?: number;
  description?: string | null;
  available_sizes?: string[];
  size_measurements?: string | null;
  available_slots?: number;
  rent_duration?: string | null;
  location?: string | null;
  status?: string;
  additional_notes?: string | null;
  created_at: string;
  updated_at?: string;
  name_th?: string | null;
  name_en?: string | null;
  costume_images?: {
    id: string | number;
    costume_id?: string | number;
    image_url: string;
    created_at?: string;
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
  const [isOwner, setIsOwner] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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
  
      // ปรับข้อมูลให้เข้ากับโครงสร้าง CostumeDetail
      if (data) {
        // สร้างข้อมูลชุดคอสเพลย์จากข้อมูลที่ได้จาก DB
        setCostume({
          ...data,
          // ใช้ name_th เป็น title ถ้า title ไม่มี
          title: data.title || data.name_th || "ไม่มีชื่อ",
          // ใช้ additional_notes เป็น description ถ้าไม่มี description
          description: data.description || data.additional_notes || "",
        });
  
        console.log("Current user ID:", session?.user?.id);
        console.log("Data user ID:", data.user_id);
  
        // ตรวจสอบว่าผู้ใช้ปัจจุบันเป็นเจ้าของชุดหรือไม่
        if (session?.user?.id) {
          const currentUserId = session.user.id;
          const costumeOwnerId = data.user_id;
          
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

  // ฟังก์ชันตรวจสอบว่าชุดนี้อยู่ในรายการโปรดหรือไม่
  const checkIsFavorite = async () => {
    if (!session?.user?.id || !costumeId) return;

    try {
      const { data, error } = await supabase
        .from("costume_bookmarks")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("costume_id", costumeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsFavorite(true);
        setBookmarkId(data.id);
      } else {
        setIsFavorite(false);
        setBookmarkId(null);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  // ฟังก์ชันเพิ่ม/ลบรายการโปรด
  const toggleFavorite = async () => {
    if (!session?.user?.id) {
      Alert.alert("โปรดเข้าสู่ระบบ", "คุณต้องเข้าสู่ระบบก่อนเพิ่มรายการโปรด");
      return;
    }
  
    const parsedCostumeId = costumeId ? String(costumeId) : null;
    
    if (!parsedCostumeId) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่พบข้อมูลชุดคอสเพลย์");
      return;
    }
  
    setFavoriteLoading(true);
    try {
      // ตรวจสอบว่ามีบุ๊กมาร์คอยู่แล้วหรือไม่
      const { data: existingBookmark, error: checkError } = await supabase
        .from("costume_bookmarks")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("costume_id", parsedCostumeId)
        .single();
  
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
  
      if (existingBookmark) {
        // ถ้ามีบุ๊กมาร์คอยู่แล้ว ให้ลบออก
        const { error: deleteError } = await supabase
          .from("costume_bookmarks")
          .delete()
          .eq("id", existingBookmark.id);
  
        if (deleteError) throw deleteError;
  
        setIsFavorite(false);
        setBookmarkId(null);
        Alert.alert("สำเร็จ", "ลบออกจากรายการโปรดแล้ว");
      } else {
        // ถ้ายังไม่มีบุ๊กมาร์ค ให้เพิ่มใหม่
        const { data, error } = await supabase.rpc('insert_costume_bookmark', {
          p_user_id: session.user.id,
          p_costume_id: parsedCostumeId
        });
  
        if (error) {
          console.error('Bookmark Insertion Error:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
          throw error;
        }
  
        setIsFavorite(true);
        setBookmarkId(data);
        Alert.alert("สำเร็จ", "เพิ่มเข้ารายการโปรดแล้ว");
      }
    } catch (error) {
      console.error("Favorite Toggle Error:", JSON.stringify(error, null, 2));
      Alert.alert("เกิดข้อผิดพลาด" );
    } finally {
      setFavoriteLoading(false);
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
                .from("costumes")
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
      if (session?.user?.id) {
        checkIsFavorite();
      }
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

            {isOwner ? (
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
            ) : (
              <TouchableOpacity
                className="w-10 h-10 rounded-full bg-black/30 justify-center items-center"
                onPress={toggleFavorite}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <MaterialIcons
                    name={isFavorite ? "favorite" : "favorite-border"}
                    size={24}
                    color={isFavorite ? "#FFA7D1" : "white"}
                  />
                )}
              </TouchableOpacity>
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
              {costume.title || costume.name_th || "ไม่มีชื่อ"}
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

          {/* ราคาและเงินมัดจำ */}
          <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              ราคาและเงินมัดจำ
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">
                ราคาเทส:
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                ฿{costume.price?.toLocaleString() || "0"}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">
                ราคาไพรเวท:
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                ฿{costume.test_price?.toLocaleString() || "0"}
              </Text>
            </View>
            {costume.deposit_amount !== undefined && (
              <View className="flex-row justify-between">
                <Text className="text-gray-700 dark:text-gray-300">
                  เงินมัดจำ:
                </Text>
                <Text className="text-gray-700 dark:text-gray-300 font-medium">
                  ฿{costume.deposit_amount?.toLocaleString() || "0"}
                </Text>
              </View>
            )}
          </View>

          {/* ไซส์และระยะเวลาเช่า */}
          <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              รายละเอียดชุด
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">ไซส์:</Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.available_sizes && costume.available_sizes.length > 0
                  ? costume.available_sizes.join(", ")
                  : "ไม่ระบุ"}
              </Text>
            </View>
            {costume.size_measurements && (
              <View className="mb-2">
                <Text className="text-gray-700 dark:text-gray-300">รายละเอียดไซส์:</Text>
                <Text className="text-gray-700 dark:text-gray-300 mt-1">
                  {costume.size_measurements}
                </Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-gray-700 dark:text-gray-300">ระยะเวลาเช่า:</Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.rent_duration || "ไม่ระบุ"}
              </Text>
            </View>
          </View>

          {/* จำนวนคิว */}
          <View className="mt-4 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              ข้อมูลการจอง
            </Text>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-700 dark:text-gray-300">
                จำนวนคิวที่รับได้:
              </Text>
              <Text className="text-gray-700 dark:text-gray-300 font-medium">
                {costume.available_slots || "1"}
              </Text>
            </View>
          </View>

          {/* รายละเอียดเพิ่มเติม */}
          <View className="mt-4">
            <Text className="text-lg font-bold text-gray-800 dark:text-white mb-2">
              รายละเอียดเพิ่มเติม
            </Text>
            <Text className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {costume.additional_notes || "ไม่มีรายละเอียดเพิ่มเติม"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ปุ่มเช่าชุด (แสดงเฉพาะเมื่อไม่ใช่เจ้าของ) */}
      {!isOwner && (
        <View className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 rounded-full flex-row justify-center items-center"
              onPress={toggleFavorite}
              disabled={favoriteLoading}
            >
              {favoriteLoading ? (
                <ActivityIndicator size="small" color={theme === "dark" ? "white" : "black"} />
              ) : (
                <>
                  <MaterialIcons
                    name={isFavorite ? "favorite" : "favorite-border"}
                    size={20}
                    color={isFavorite ? "#FFA7D1" : theme === "dark" ? "white" : "black"}
                  />
                  <Text className={`ml-2 font-bold ${isFavorite ? "text-pink-500" : "text-gray-800 dark:text-white"}`}>
                    {isFavorite ? "เก็บแล้ว" : "เก็บไว้"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 bg-pink-500 rounded-full flex-row justify-center items-center"
              onPress={() => router.push("/+not-found")}
            >
              <Text className="text-white font-bold text-lg mr-2">
                เช่าชุดนี้
              </Text>
              <Feather name="arrow-right" size={20} color="white" />
            </TouchableOpacity>
          </View>
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
