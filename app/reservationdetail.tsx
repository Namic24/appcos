import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert, StyleSheet, Linking, Platform } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';
import { supabase } from '@/utils/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { Dimensions } from 'react-native';

// ประเภทข้อมูลสำหรับรายละเอียดการจอง
interface ReservationDetail {
  id: string;
  user_id: string;
  costume_id: number;
  owner_id: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  created_at: string;
  total_price: number;
  deposit_paid: boolean;
  payment_method?: string;
  payment_status?: string;
  pickup_method?: string;
  return_method?: string;
  pickup_location?: string;
  return_location?: string;
  notes?: string;
  costume?: {
    id: string;
    title: string;
    price: number;
    deposit_amount: number;
    available_sizes?: string[];
    size_measurements?: string;
    costume_images?: {
      id: string;
      image_url: string;
    }[];
  };
  owner?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    phone?: string;
  };
}

export default function ReservationDetailScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { session } = useAuth();
  const params = useLocalSearchParams();
  const reservationId = params.id as string;
  
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { width } = Dimensions.get('window');

  
  // สีตามธีม
  const bgColor = theme === 'dark' ? '#1E1E2D' : '#FFFFFF';
  const bgSecondary = theme === 'dark' ? '#2D2D3A' : '#F8F8FC';
  const textColor = theme === 'dark' ? '#FFFFFF' : '#000000';
  const textSecondary = theme === 'dark' ? '#B0B0C0' : '#6B7280';
  const cardBgColor = theme === 'dark' ? '#2D2D3A' : '#FFFFFF';
  const cardBorderColor = theme === 'dark' ? '#3A3A4A' : '#FFE6F5';
  const cardHeaderColor = theme === 'dark' ? '#333340' : '#FFE6F5';
  const separatorColor = theme === 'dark' ? '#3A3A4A' : '#FFE6F5';
  const infoBoxBgColor = theme === 'dark' ? '#2A2A38' : '#FFF6FB';
  
  // ดึงข้อมูลรายละเอียดการจอง
  const fetchReservationDetail = async () => {
    try {
      if (!reservationId || !session?.user?.id) return;
      
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
            available_sizes,
            size_measurements,
            costume_images (
              id,
              image_url
            )
          ),
          owner:owner_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq('id', reservationId)
        .eq('user_id', session.user.id)
        .single();
      
      if (error) {
        console.error('Error fetching reservation detail:', error);
        Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลรายละเอียดการจองได้');
        router.back();
        return;
      }
      
      setReservation(data);
    } catch (error) {
      console.error('Error in fetchReservationDetail:', error);
      Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };
  
  // เรียกใช้ฟังก์ชันดึงข้อมูลเมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    fetchReservationDetail();
  }, [reservationId, session]);
  
  // ฟังก์ชันจัดรูปแบบวันที่
  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, 'dd MMMM yyyy', { locale: i18n.language === 'th' ? th : undefined });
  };
  
  // ฟังก์ชันคำนวณจำนวนวัน
  const calculateDays = (startDate: string, endDate: string) => {
    return differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  };
  
  // ฟังก์ชันสำหรับยกเลิกการจอง
  const handleCancelReservation = () => {
    Alert.alert(
      'ยืนยันการยกเลิก',
      'คุณแน่ใจหรือไม่ว่าต้องการยกเลิกการจองนี้? การกระทำนี้ไม่สามารถเปลี่ยนแปลงได้',
      [
        { text: 'ไม่', style: 'cancel' },
        { 
          text: 'ยกเลิกการจอง', 
          style: 'destructive',
          onPress: async () => {
            try {
              if (!reservationId) return;
              
              setCancelLoading(true);
              
              const { error } = await supabase
                .from('reservations')
                .update({ status: 'cancelled' })
                .eq('id', reservationId)
                .eq('user_id', session?.user?.id);
              
              if (error) {
                console.error('Error cancelling reservation:', error);
                Alert.alert('ข้อผิดพลาด', 'ไม่สามารถยกเลิกการจองได้ โปรดลองอีกครั้ง');
                return;
              }
              
              Alert.alert(
                'ยกเลิกสำเร็จ', 
                'การจองของคุณถูกยกเลิกแล้ว',
                [{ text: 'ตกลง', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Error in handleCancelReservation:', error);
              Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการยกเลิกการจอง');
            } finally {
              setCancelLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // ฟังก์ชันสำหรับติดต่อร้านค้า
  const handleContactOwner = () => {
    if (!reservation?.owner?.phone) {
      Alert.alert('ไม่พบข้อมูลติดต่อ', 'ไม่พบเบอร์โทรศัพท์ของร้านค้า');
      return;
    }
    
    Alert.alert(
      'ติดต่อร้านค้า',
      `ต้องการติดต่อ ${reservation.owner.display_name || 'ร้านค้า'} หรือไม่?`,
      [
        { text: 'ยกเลิก', style: 'cancel' },
        { 
          text: 'โทร', 
          onPress: () => {
            Linking.openURL(`tel:${reservation.owner.phone}`);
          }
        },
        { 
          text: 'ส่งข้อความ', 
          onPress: () => {
            // สำหรับ SMS
            if (Platform.OS === 'android') {
              const message = `เกี่ยวกับการจอง #${reservation.id.slice(0, 8)}`;
              Linking.openURL(`sms:${reservation.owner.phone}?body=${encodeURIComponent(message)}`);
            } else {
              // สำหรับ iOS
              const message = `เกี่ยวกับการจอง #${reservation.id.slice(0, 8)}`;
              Linking.openURL(`sms:${reservation.owner.phone}&body=${encodeURIComponent(message)}`);
            }
          }
        }
      ]
    );
  };
  
  // ฟังก์ชันแสดงสถานะการจอง
  const renderStatus = (status: string) => {
    let statusColor = '';
    let statusText = '';
    let statusBg = '';
    
    switch (status) {
      case 'pending':
        statusColor = '#F59E0B'; // amber
        statusBg = '#FEF3C7';
        statusText = 'รอการยืนยัน';
        break;
      case 'approved':
        statusColor = '#10B981'; // green
        statusBg = '#D1FAE5';
        statusText = 'ยืนยันแล้ว';
        break;
      case 'completed':
        statusColor = '#6366F1'; // indigo
        statusBg = '#E0E7FF';
        statusText = 'เสร็จสิ้น';
        break;
      case 'cancelled':
        statusColor = '#EF4444'; // red
        statusBg = '#FEE2E2';
        statusText = 'ยกเลิก';
        break;
      case 'rejected':
        statusColor = '#EF4444'; // red
        statusBg = '#FEE2E2';
        statusText = 'ปฏิเสธ';
        break;
      default:
        statusColor = '#9CA3AF'; // gray
        statusBg = '#F3F4F6';
        statusText = 'ไม่ระบุ';
    }
    
    if (theme === 'dark') {
      statusBg = `${statusColor}20`; // สีพื้นหลังโปร่งใสในโหมดมืด
    }
    
    return (
      <View 
        style={{
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: statusBg,
          alignSelf: 'flex-start',
        }}
      >
        <Text 
          style={{
            fontSize: 14,
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

  // สร้าง Section Header สำหรับใช้ในหน้าจอ
  const SectionHeader = ({ title }: { title: string }) => (
    <View
      style={{
        backgroundColor: cardHeaderColor,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: textColor,
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
        }}
      >
        {title}
      </Text>
    </View>
  );

  // สร้าง Info Item สำหรับข้อมูลแบบคู่คำถาม-คำตอบ
  const InfoItem = ({ label, value, textColor = textColor, valueColor = textColor }: 
    { label: string; value: string | number; textColor?: string; valueColor?: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text
        style={{
          fontSize: 14,
          color: textColor,
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: valueColor,
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
        }}
      >
        {value}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <ActivityIndicator size="large" color="#FFA7D1" />
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }}>
        <Text style={{ color: textColor, fontSize: 16, marginBottom: 16 }}>ไม่พบข้อมูลการจอง</Text>
        <TouchableOpacity
          style={{
            backgroundColor: '#FFA7D1',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 24,
          }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>กลับ</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ข้อมูลรูปภาพชุด
  const images = reservation?.costume?.costume_images || [];
  const imageWidth = images.length > 0 
    ? { width, height: 300 }
    : { width: 120, height: 120, alignSelf: 'center', margin: 16 };
  
  // ข้อมูลวันที่เช่า
  const rentDays = calculateDays(reservation.start_date, reservation.end_date);
  const dailyPrice = reservation.costume?.price || 0;
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }}>
      <Stack.Screen
        options={{
          headerTitle: 'รายละเอียดการจอง',
          headerShown: true,
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: bgColor,
          },
          headerTitleStyle: {
            fontSize: 18,
            color: textColor,
            fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
          },
          headerTintColor: textColor,
          headerLeft: () => (
            <TouchableOpacity 
              style={{ paddingHorizontal: 8 }}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
          ),
        }}
      />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ส่วนรูปภาพชุด */}
        <View style={{ backgroundColor: bgColor }}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const offset = e.nativeEvent.contentOffset.x;
                const index = Math.round(offset / width);
                setCurrentImageIndex(index);
              }}
            >
              {images.map((image, index) => (
                <Image
                  key={index}
                  source={{ uri: image.image_url }}
                  style={{ width, height: 300 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <Image
              source={{ 
                uri: 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
              }}
              style={{ width: 160, height: 160, alignSelf: 'center', margin: 16, borderRadius: 8 }}
              resizeMode="cover"
            />
          )}
          
          {/* ตัวบอกตำแหน่งรูปภาพ */}
          {images.length > 1 && (
            <View 
              style={{ 
                position: 'absolute', 
                bottom: 16, 
                left: 0, 
                right: 0, 
                flexDirection: 'row', 
                justifyContent: 'center' 
              }}
            >
              {images.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginHorizontal: 4,
                    backgroundColor: index === currentImageIndex ? '#FFA7D1' : '#FFFFFF80',
                  }}
                />
              ))}
            </View>
          )}
        </View>
        
        {/* รหัสการจองและสถานะ */}
        <View style={{ padding: 16 }}>
          <View 
            style={{ 
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text 
              style={{ 
                fontSize: 14,
                color: textSecondary,
                fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
              }}
            >
              รหัสการจอง: #{reservation.id.slice(0, 8).toUpperCase()}
            </Text>
            {renderStatus(reservation.status)}
          </View>
          
          {/* ชื่อชุด */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: textColor,
              marginBottom: 4,
              fontFamily: i18n.language === 'th' ? 'NotoSansThai-Bold' : 'Poppins-Bold',
            }}
          >
            {reservation.costume?.title || 'ไม่ระบุชื่อชุด'}
          </Text>
        </View>
        
        {/* ข้อมูลเช่า */}
        <View style={{ padding: 16, marginTop: -8 }}>
          <View 
            style={{ 
              backgroundColor: infoBoxBgColor,
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons 
                name="calendar" 
                size={20} 
                color="#FFA7D1" 
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: textColor,
                  fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                }}
              >
                รายละเอียดการเช่า
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: textSecondary,
                    marginBottom: 4,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                  }}
                >
                  วันที่เริ่มต้น
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: textColor,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                  }}
                >
                  {formatDate(reservation.start_date)}
                </Text>
              </View>
              
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    color: textSecondary,
                    marginBottom: 4,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                  }}
                >
                  วันที่สิ้นสุด
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '500',
                    color: textColor,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                  }}
                >
                  {formatDate(reservation.end_date)}
                </Text>
              </View>
            </View>
            
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: theme === 'dark' ? '#383845' : '#FFF0FA',
                borderRadius: 8,
                padding: 10,
                alignItems: 'center',
                marginTop: 4,
              }}
            >
              <Ionicons 
                name="time-outline" 
                size={18} 
                color="#FFA7D1"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  fontSize: 14,
                  color: textColor,
                  fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                }}
              >
                ระยะเวลาเช่า: <Text style={{ fontWeight: '600' }}>{rentDays} วัน</Text>
              </Text>
            </View>
          </View>
          
          {/* ข้อมูลค่าใช้จ่าย */}
          <View 
            style={{ 
              backgroundColor: cardBgColor,
              borderRadius: 12,
              marginBottom: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: cardBorderColor,
            }}
          >
            <SectionHeader title="รายละเอียดค่าใช้จ่าย" />
            
            <View style={{ padding: 16 }}>
              <InfoItem 
                label="ค่าเช่ารายวัน" 
                value={`฿${dailyPrice.toLocaleString()}`} 
              />
              
              <InfoItem 
                label="จำนวนวัน" 
                value={rentDays} 
              />
              
              {reservation.costume?.deposit_amount ? (
                <InfoItem 
                  label="เงินมัดจำ" 
                  value={`฿${reservation.costume.deposit_amount.toLocaleString()}`} 
                />
              ) : null}
              
              <View 
                style={{ 
                  height: 1, 
                  backgroundColor: separatorColor, 
                  marginVertical: 8 
                }} 
              />
              
              <InfoItem 
                label="รวมทั้งสิ้น" 
                value={`฿${reservation.total_price.toLocaleString()}`}
                valueColor="#FFA7D1"
              />
              
              <View 
                style={{ 
                  marginTop: 12,
                  backgroundColor: reservation.deposit_paid 
                    ? theme === 'dark' ? '#064E3B20' : '#D1FAE5' 
                    : theme === 'dark' ? '#7C2D1220' : '#FEE2E2',
                  borderRadius: 8,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Ionicons 
                  name={reservation.deposit_paid ? "checkmark-circle" : "alert-circle"} 
                  size={20} 
                  color={reservation.deposit_paid ? "#10B981" : "#EF4444"}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: reservation.deposit_paid ? "#10B981" : "#EF4444",
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                  }}
                >
                  {reservation.deposit_paid 
                    ? "ชำระเงินมัดจำแล้ว" 
                    : "ยังไม่ได้ชำระเงินมัดจำ"}
                </Text>
              </View>
            </View>
          </View>
          
          {/* ข้อมูลร้านค้า */}
          {reservation.owner && (
            <View 
              style={{ 
                backgroundColor: cardBgColor,
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: cardBorderColor,
              }}
            >
              <SectionHeader title="ข้อมูลร้านค้า" />
              
              <View 
                style={{ 
                  padding: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Image
                  source={{ 
                    uri: reservation.owner.avatar_url || 
                    'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'
                  }}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    marginRight: 16,
                  }}
                />
                
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: textColor,
                      marginBottom: 4,
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                    }}
                  >
                    {reservation.owner.display_name || 'ไม่ระบุชื่อร้านค้า'}
                  </Text>
                  
                  {reservation.owner.phone && (
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      โทร: {reservation.owner.phone}
                    </Text>
                  )}
                </View>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFA7D1',
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={handleContactOwner}
                >
                  <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          
          {/* สถานที่รับส่ง */}
          {(reservation.pickup_location || reservation.return_location) && (
            <View 
              style={{ 
                backgroundColor: cardBgColor,
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: cardBorderColor,
              }}
            >
              <SectionHeader title="สถานที่รับส่ง" />
              
              <View style={{ padding: 16 }}>
                {reservation.pickup_method && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 4,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      วิธีรับชุด
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: textColor,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                      }}
                    >
                      {reservation.pickup_method}
                    </Text>
                  </View>
                )}
                
                {reservation.pickup_location && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 4,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      สถานที่รับชุด
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons 
                        name="location-outline" 
                        size={16} 
                        color="#FFA7D1" 
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          color: textColor,
                          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                        }}
                      >
                        {reservation.pickup_location}
                      </Text>
                    </View>
                  </View>
                )}
                
                {reservation.return_method && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 4,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      วิธีส่งคืนชุด
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: textColor,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                      }}
                    >
                      {reservation.return_method}
                    </Text>
                  </View>
                )}
                
                {reservation.return_location && (
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 4,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      สถานที่ส่งคืนชุด
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons 
                        name="location-outline" 
                        size={16} 
                        color="#FFA7D1" 
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={{
                          fontSize: 15,
                          color: textColor,
                          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                        }}
                      >
                        {reservation.return_location}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* ขนาดชุด */}
          {((reservation.costume?.available_sizes && reservation.costume.available_sizes.length > 0) || reservation.costume?.size_measurements) && (
            <View 
              style={{ 
                backgroundColor: cardBgColor,
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: cardBorderColor,
              }}
            >
              <SectionHeader title="ขนาดชุด" />
              
              <View style={{ padding: 16 }}>
                {reservation.costume?.available_sizes && reservation.costume.available_sizes.length > 0 && (
                  <View style={{ marginBottom: 12 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 8,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      ไซส์ที่มี
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {reservation.costume.available_sizes.map((size, index) => (
                        <View
                          key={index}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            backgroundColor: theme === 'dark' ? '#333340' : '#FFE6F5',
                            borderRadius: 16,
                            marginRight: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 14,
                              color: textColor,
                              fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium',
                            }}
                          >
                            {size}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                
                {reservation.costume?.size_measurements && (
                  <View>
                    <Text
                      style={{
                        fontSize: 14,
                        color: textSecondary,
                        marginBottom: 4,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                      }}
                    >
                      รายละเอียดการวัดขนาด
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: textColor,
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                        lineHeight: 22,
                      }}
                    >
                      {reservation.costume.size_measurements}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}
          
          {/* บันทึกเพิ่มเติม */}
          {reservation.notes && (
            <View 
              style={{ 
                backgroundColor: cardBgColor,
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: cardBorderColor,
              }}
            >
              <SectionHeader title="บันทึกเพิ่มเติม" />
              
              <View style={{ padding: 16 }}>
                <Text
                  style={{
                    fontSize: 15,
                    color: textColor,
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
                    lineHeight: 22,
                  }}
                >
                  {reservation.notes}
                </Text>
              </View>
            </View>
          )}
          
          {/* ปุ่มชำระเงินหรือยกเลิก */}
          {reservation.status === 'pending' && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#EF4444',
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={handleCancelReservation}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="x-circle" size={18} color="white" style={{ marginRight: 8 }} />
                    <Text
                      style={{
                        color: 'white',
                        fontSize: 16,
                        fontWeight: '600',
                        fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                      }}
                    >
                      ยกเลิกการจอง
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {reservation.status === 'approved' && !reservation.deposit_paid && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#10B981',
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={() => Alert.alert('ชำระเงิน', 'เปิดหน้าชำระเงิน (ไม่ได้พัฒนาในตัวอย่างนี้)')}
              >
                <FontAwesome name="credit-card" size={18} color="white" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                  }}
                >
                  ชำระเงินมัดจำ
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  marginTop: 12,
                }}
                onPress={handleCancelReservation}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text
                    style={{
                      color: '#EF4444',
                      fontSize: 16,
                      fontWeight: '600',
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                    }}
                  >
                    ยกเลิกการจอง
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {reservation.status === 'approved' && reservation.deposit_paid && (
            <View style={{ marginTop: 8, marginBottom: 24 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFA7D1',
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={handleContactOwner}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="white" style={{ marginRight: 8 }} />
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                  }}
                >
                  ติดต่อร้านค้า
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  paddingVertical: 14,
                  borderRadius: 30,
                  alignItems: 'center',
                  marginTop: 12,
                }}
                onPress={handleCancelReservation}
                disabled={cancelLoading}
              >
                {cancelLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text
                    style={{
                      color: '#EF4444',
                      fontSize: 16,
                      fontWeight: '600',
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold',
                    }}
                  >
                    ยกเลิกการจอง
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}