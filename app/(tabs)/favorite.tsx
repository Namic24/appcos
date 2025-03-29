import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { formatDistanceToNow, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";

// ประเภทข้อมูลสำหรับชุดคอสเพลย์ที่บันทึกเป็นรายการโปรด
type FavoriteCostume = {
  id: number;
  title: string;
  price: number;
  location: string;
  created_at: string;
  bookmark_id: string; // ID ของบุคมาร์ค (สำหรับการลบ)
  costume_images?: {
    id: number;
    image_url: string;
  }[];
};

export default function Favorite() {
  const router = useRouter();
  const { session } = useAuth();
  const { theme } = useTheme();
  const [favorites, setFavorites] = useState<FavoriteCostume[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ฟังก์ชันสำหรับจัดเวลาเป็นรูปแบบ "2 วันที่แล้ว" เป็นต้น
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

  // ฟังก์ชันดึงข้อมูลรายการโปรด
  const fetchFavorites = async () => {
    if (!session?.user?.id) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('costume_bookmarks')
        .select(`
          id,
          costume_id,
          costumes (
            id,
            title, 
            price, 
            location,
            created_at,
            costume_images (
              id,
              image_url
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // แปลงข้อมูลให้อยู่ในรูปแบบที่ต้องการใช้
      const formattedData: FavoriteCostume[] = data.map(item => ({
        id: item.costumes.id,
        title: item.costumes.title,
        price: item.costumes.price,
        location: item.costumes.location,
        created_at: item.costumes.created_at,
        bookmark_id: item.id,
        costume_images: item.costumes.costume_images
      }));

      setFavorites(formattedData);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลรายการโปรดได้');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ฟังก์ชันลบรายการโปรด
  const removeFromFavorites = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('costume_bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;

      // อัพเดทรายการหลังจากลบ
      setFavorites(favorites.filter(item => item.bookmark_id !== bookmarkId));
      Alert.alert('สำเร็จ', 'ลบออกจากรายการโปรดแล้ว');
    } catch (error) {
      console.error('Error removing from favorites:', error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถลบรายการโปรดได้');
    }
  };

  // ฟังก์ชัน refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  // ดึงข้อมูลเมื่อเข้าหน้านี้
  useEffect(() => {
    fetchFavorites();
  }, [session]);

  // แสดงตัว loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA7D1" />
      </View>
    );
  }

  // แสดงข้อความเมื่อไม่มีรายการโปรด
  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>รายการโปรดของฉัน</Text>
        </View>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="favorite-border" size={80} color="#D1D5DB" />
          <Text style={styles.emptyText}>คุณยังไม่มีรายการโปรด</Text>
          <Text style={styles.emptySubText}>
            กดที่ไอคอนหัวใจบนหน้ารายละเอียดชุดเพื่อเพิ่มในรายการโปรด
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.browseButtonText}>เริ่มการค้นหา</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>รายการโปรดของฉัน</Text>
      </View>

      <FlatList
        data={favorites}
        keyExtractor={(item) => item.bookmark_id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA7D1']} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/productdetail?id=${item.id}`)}
          >
            <Image
              source={{
                uri: item.costume_images && item.costume_images.length > 0
                  ? item.costume_images[0].image_url
                  : 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
              }}
              style={styles.image}
              resizeMode="cover"
            />
            <View style={styles.cardContent}>
              <View style={styles.titleContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'ลบออกจากรายการโปรด',
                      'คุณต้องการลบชุดนี้ออกจากรายการโปรดหรือไม่?',
                      [
                        { text: 'ยกเลิก', style: 'cancel' },
                        { text: 'ลบ', style: 'destructive', onPress: () => removeFromFavorites(item.bookmark_id) }
                      ]
                    );
                  }}
                >
                  <MaterialIcons name="favorite" size={24} color="#FFA7D1" />
                </TouchableOpacity>
              </View>
              <Text style={styles.price}>
              ฿{item.price.toLocaleString()} / วัน
              </Text>
              <View style={styles.locationContainer}>
                <Feather name="map-pin" size={14} color="#9CA3AF" />
                <Text style={styles.locationText}>{item.location || 'ไม่ระบุที่อยู่'}</Text>
                <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 40,
  },
  browseButton: {
    marginTop: 24,
    backgroundColor: '#FFA7D1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  browseButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 180,
  },
  cardContent: {
    padding: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA7D1',
    marginTop: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});