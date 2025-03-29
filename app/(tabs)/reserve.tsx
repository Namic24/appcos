import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { th } from 'date-fns/locale';

// ประเภทข้อมูลสำหรับการจอง
interface Reservation {
  id: string;
  user_id: string;
  costume_id: number;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  total_price: number;
  deposit_paid: boolean;
  payment_method?: string;
  notes?: string;
  costume?: {
    id: string;
    title: string;
    price: number;
    deposit_amount: number;
    costume_images?: {
      id: string;
      image_url: string;
    }[];
  };
}

export default function ReserveScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { session } = useAuth();
  
  const [activeTab, setActiveTab] = useState('upcoming');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // สีตามธีม
  const bgColor = theme === 'dark' ? '#1E1E2D' : '#FFFFFF';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const cardBgColor = theme === 'dark' ? '#2D2D3A' : '#FFF';
  const cardBorderColor = theme === 'dark' ? '#3A3A4A' : '#FFE6F5';
  const tabActiveBgColor = theme === 'dark' ? '#3A3A4A' : '#FFA7D1';
  const tabInactiveBgColor = theme === 'dark' ? '#2D2D3A' : '#FFE6F5';
  const tabActiveTextColor = theme === 'dark' ? '#FFA7D1' : '#FFFFFF';
  const tabInactiveTextColor = theme === 'dark' ? '#8A8A9A' : '#A0A0A0';
  const separatorColor = theme === 'dark' ? '#3A3A4A' : '#FFE6F5';

  // ดึงข้อมูลการจองจาก Supabase
  const fetchReservations = async () => {
    try {
      if (!session?.user?.id) return;
      
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          costume:costume_id (
            id,
            title,
            price,
            deposit_amount,
            costume_images (
              id,
              image_url
            )
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching reservations:', error);
        return;
      }
      
      setReservations(data || []);
      filterReservations(data || [], activeTab);
    } catch (error) {
      console.error('Error in fetchReservations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // กรองรายการจองตาม tab ที่เลือก
  const filterReservations = (data: Reservation[], tab: string) => {
    const now = new Date();
    
    switch (tab) {
      case 'upcoming':
        // จองที่กำลังจะมาถึงและได้รับการอนุมัติแล้ว
        setFilteredReservations(
          data.filter(res => 
            (res.status === 'approved') && 
            (isAfter(parseISO(res.end_date), now) || isToday(parseISO(res.end_date)))
          )
        );
        break;
      case 'pending':
        // จองที่รอการอนุมัติ
        setFilteredReservations(
          data.filter(res => res.status === 'pending')
        );
        break;
      case 'completed':
        // จองที่เสร็จสิ้นแล้ว หรือวันที่สิ้นสุดผ่านไปแล้ว
        setFilteredReservations(
          data.filter(res => 
            res.status === 'completed' || 
            (res.status === 'approved' && isBefore(parseISO(res.end_date), now) && !isToday(parseISO(res.end_date)))
          )
        );
        break;
      case 'cancelled':
        // จองที่ถูกยกเลิกหรือปฏิเสธ
        setFilteredReservations(
          data.filter(res => 
            res.status === 'cancelled' || 
            res.status === 'rejected'
          )
        );
        break;
      default:
        setFilteredReservations(data);
    }
  };

  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    fetchReservations();
  }, [session]);

  // เรียกใช้ฟังก์ชันกรองข้อมูลเมื่อ tab ที่เลือกเปลี่ยน
  useEffect(() => {
    filterReservations(reservations, activeTab);
  }, [activeTab]);

  // รีเฟรชข้อมูล
  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  // ฟังก์ชันแสดงสถานะการจอง
  const renderStatus = (status: string) => {
    let statusColor = '';
    let statusText = '';
    
    switch (status) {
      case 'pending':
        statusColor = '#F59E0B'; // amber
        statusText = 'รอการยืนยัน';
        break;
      case 'approved':
        statusColor = '#10B981'; // green
        statusText = 'ยืนยันแล้ว';
        break;
      case 'completed':
        statusColor = '#6366F1'; // indigo
        statusText = 'เสร็จสิ้น';
        break;
      case 'cancelled':
        statusColor = '#EF4444'; // red
        statusText = 'ยกเลิก';
        break;
      case 'rejected':
        statusColor = '#EF4444'; // red
        statusText = 'ปฏิเสธ';
        break;
      default:
        statusColor = '#9CA3AF'; // gray
        statusText = 'ไม่ระบุ';
    }
    
    return (
      <View 
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 12,
          backgroundColor: `${statusColor}20`, // สีพื้นหลังโปร่งใส
        }}
      >
        <Text 
          style={{
            fontSize: 12,
            fontWeight: '600',
            color: statusColor,
            fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
          }}
        >
          {statusText}
        </Text>
      </View>
    );
  };

  // ฟังก์ชันจัดรูปแบบวันที่
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'dd MMM yyyy', { locale: i18n.language === 'th' ? th : undefined });
  };

  // สร้าง FlatList Item สำหรับแสดงรายการจอง
  const renderReservationItem = ({ item }: { item: Reservation }) => {
    const imageUrl = item.costume?.costume_images?.[0]?.image_url || 
      'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg';
    
    return (
      <TouchableOpacity
        style={{
          backgroundColor: cardBgColor,
          borderRadius: 16,
          marginBottom: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: cardBorderColor,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        }}
        onPress={() => router.push(`/reservationdetail?id=${item.id}`)}
      >
        <View style={{ flexDirection: 'row' }}>
          {/* รูปภาพชุด */}
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              marginRight: 12,
            }}
            resizeMode="cover"
          />
          
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* ชื่อชุด */}
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: textColor,
                  flex: 1,
                  marginBottom: 4,
                  fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                }}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.costume?.title || 'ไม่ระบุชื่อชุด'}
              </Text>
              
              {/* สถานะการจอง */}
              {renderStatus(item.status)}
            </View>
            
            {/* วันที่เช่า */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={{
                  fontSize: 13,
                  color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                  fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                }}
              >
                {formatDate(item.start_date)} - {formatDate(item.end_date)}
              </Text>
            </View>
            
            {/* ราคารวม */}
            <Text
              style={{
                fontSize: 16,
                fontWeight: '700',
                color: theme === 'dark' ? '#FFA7D1' : '#FFA7D1',
                fontFamily: i18n.language === 'th' ? 'NotoSansThai-Bold' : 'Poppins-Bold',
              }}
            >
              ฿{item.total_price.toLocaleString()}
            </Text>
          </View>
        </View>
        
        {/* ปุ่มดำเนินการ */}
        {(item.status === 'pending' || item.status === 'approved') && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              marginTop: 12,
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: separatorColor,
            }}
          >
            {item.status === 'pending' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#EF4444',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
                onPress={() => console.log('Cancel reservation', item.id)}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 14,
                    marginRight: 4,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                  }}
                >
                  ยกเลิกการจอง
                </Text>
                <Feather name="x-circle" size={14} color="white" />
              </TouchableOpacity>
            )}
            
            {item.status === 'approved' && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginLeft: 8,
                }}
                onPress={() => console.log('Contact shop', item.id)}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 14,
                    marginRight: 4,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                  }}
                >
                  ติดต่อร้านค้า
                </Text>
                <Feather name="message-circle" size={14} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // แสดง Empty State เมื่อไม่มีรายการจอง
  const renderEmptyState = () => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
      <Ionicons
        name={activeTab === 'completed' ? 'checkmark-done-circle' : 'calendar-outline'}
        size={64}
        color={theme === 'dark' ? '#3A3A4A' : '#FFD6EB'}
        style={{ marginBottom: 16 }}
      />
      <Text
        style={{
          fontSize: 18,
          color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
          textAlign: 'center',
          marginBottom: 8,
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
        }}
      >
        {activeTab === 'upcoming' && 'ไม่พบรายการจองที่กำลังจะมาถึง'}
        {activeTab === 'pending' && 'ไม่พบรายการจองที่รอการยืนยัน'}
        {activeTab === 'completed' && 'ไม่พบรายการจองที่เสร็จสิ้นแล้ว'}
        {activeTab === 'cancelled' && 'ไม่พบรายการจองที่ถูกยกเลิก'}
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: theme === 'dark' ? '#6B7280' : '#9CA3AF',
          textAlign: 'center',
          paddingHorizontal: 32,
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
        }}
      >
        {activeTab === 'upcoming' && 'เมื่อคุณจองชุดคอสเพลย์ รายการจองที่ได้รับการยืนยันจะปรากฏที่นี่'}
        {activeTab === 'pending' && 'รายการจองที่รอการยืนยันจะปรากฏที่นี่'}
        {activeTab === 'completed' && 'รายการจองที่เสร็จสิ้นแล้วจะปรากฏที่นี่'}
        {activeTab === 'cancelled' && 'รายการจองที่ถูกยกเลิกหรือปฏิเสธจะปรากฏที่นี่'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t('tabs.reserve'),
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTitleStyle: {
            fontSize: 20,
            color: textColor,
            fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
          },
        }}
      />

      {/* Tab เลือกประเภทการจอง */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
        }}
      >
        {[
          { id: 'upcoming', label: 'ที่จะมาถึง', icon: 'calendar-outline' },
          { id: 'pending', label: 'รอยืนยัน', icon: 'time-outline' },
          { id: 'completed', label: 'เสร็จสิ้น', icon: 'checkmark-done-circle-outline' },
          { id: 'cancelled', label: 'ยกเลิก', icon: 'close-circle-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeTab === tab.id ? tabActiveBgColor : tabInactiveBgColor,
              marginHorizontal: 4,
            }}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? tabActiveTextColor : tabInactiveTextColor}
            />
            <Text
              style={{
                fontSize: 12,
                marginTop: 4,
                color: activeTab === tab.id ? tabActiveTextColor : tabInactiveTextColor,
                fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
              }}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* รายการจอง */}
      {loading && !refreshing ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FFA7D1" />
        </View>
      ) : (
        <FlatList
          data={filteredReservations}
          renderItem={renderReservationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FFA7D1']}
              tintColor="#FFA7D1"
            />
          }
        />
      )}
      
      {/* ปุ่มลอยไว้สำหรับการจองใหม่ */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: '#FFA7D1',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
        }}
        onPress={() => router.push('/home')}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}