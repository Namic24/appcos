// rnf
import React, { useState, useEffect } from 'react';
import { Image, ScrollView, Pressable, TouchableOpacity, ActivityIndicator, SafeAreaView, TextInput } from 'react-native';
import { View } from '@/components/Themed';
import { FontAwesome } from '@expo/vector-icons';
import { useAuth } from "@/providers/AuthProvider"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "@/utils/supabase"
import { decode } from "base64-arraybuffer"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'
import CustomAlert from '@/components/CustomAlert';
import { Text } from "@/components/CustomText"

export default function Profile() {
  // 1. State Management
  const { session } = useAuth()                    // จัดการ session ผู้ใช้
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)  // เก็บ URL รูปโปรไฟล์
  const [loading, setLoading] = useState(false)    // สถานะ loading
  const [isEditing, setIsEditing] = useState(false) // สถานะการแก้ไขชื่อ
  const [newDisplayName, setNewDisplayName] = useState('') // ชื่อที่จะแก้ไข
  const { t, i18n } = useTranslation()            // จัดการภาษา
  const { theme } = useTheme()                    // จัดการ theme
  
  // 2. Alert Configuration
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{
      text: string;
      onPress: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: []
  });

  // 3. Profile Data
  const [profile, setProfile] = useState<{
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  }>()

  // 4. Core Functions
  useEffect(() => {
    // โหลดข้อมูลโปรไฟล์เมื่อ component ถูกโหลด
    if (session?.user?.id) {
      fetchProfile();
    }
  }, [session?.user?.id]);

  useEffect(() => {
    (async () => {
      // ขอ permission ตั้งแต่เริ่มต้น
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, []);

  const fetchProfile = async () => {
    // ดึงข้อมูลโปรไฟล์จาก Supabase
    try {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setNewDisplayName(data.display_name || '');
      setAvatarUrl(data.avatar_url);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const uploadAvatar = async () => {
    try {
      // ขรวจสอบ permission อีกครั้งก่อนแสดง popup
      const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
      const libraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!cameraPermission.granted && !libraryPermission.granted) {
        // ถ้ายังไม่ได้ permission ให้ขอใหม่
        const newCameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const newLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!newCameraPermission.granted && !newLibraryPermission.granted) {
          setAlertConfig({
            visible: true,
            title: t('common.error'),
            message: t('profile.avatar.permissionError'),
            buttons: [
              {
                text: t('common.ok'),
                onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
              }
            ]
          });
          return;
        }
      }

      // แสดง popup ให้เลือกรูปจากกล้องหรือแกลเลอรี่
      setAlertConfig({
        visible: true,
        title: t('profile.avatar.pickTitle'),
        message: t('profile.avatar.pickMessage'),
        buttons: [
          {
            text: t('profile.avatar.camera'),
            onPress: async () => {
              const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
              if (!cameraPermission.granted) {
                const newPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('profile.avatar.cameraPermissionError'),
                    buttons: [
                      {
                        text: t('common.ok'),
                        onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                      }
                    ]
                  });
                  return;
                }
              }
              // setAlertConfig(prev => ({ ...prev, visible: false }));
              // await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                base64: true,
              });
              setAlertConfig(prev => ({ ...prev, visible: false })); //
              if (!result.canceled) {
                await handleImageResult(result);
              }
            }
          },
          {
            text: t('profile.avatar.gallery'),
            onPress: async () => {
              const libraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
              if (!libraryPermission.granted) {
                const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('profile.avatar.galleryPermissionError'),
                    buttons: [
                      {
                        text: t('common.ok'),
                        onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                      }
                    ]
                  });
                  return;
                }
              }
              // setAlertConfig(prev => ({ ...prev, visible: false }));
              // await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
                base64: true,
              });
              setAlertConfig(prev => ({ ...prev, visible: false })); //
              if (!result.canceled) {
                await handleImageResult(result);
              }
            }
          },
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    } catch (error) {
      console.error('Error in uploadAvatar:', error);
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('profile.avatar.error'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  };

  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    // จัดการอัพโหลดรูปไปยัง Supabase Storage
    if (!result.canceled && result.assets[0].base64) {
      try {
        setLoading(true);

        const fileName = `avatar_${session?.user?.id}_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, decode(result.assets[0].base64), {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        const avatarUrl = data.publicUrl;

        const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
            id: session?.user?.id,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          });

        if (updateError) throw updateError;
        
        // เรียก fetchProfile อีกครั้งหลังจากอัพเดท
        await fetchProfile();
        
      } catch (error) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('profile.avatar.error'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        console.error('Error processing avatar:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const updateDisplayName = async () => {
    // อัพเดทชื่อในฐานข้อมูล
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName })
        .eq('id', session?.user?.id);

      if (error) throw error;

      // อัพเดท local state
      setProfile(prev => prev ? {
        ...prev,
        display_name: newDisplayName
      } : undefined);
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating display name:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 5. UI Components
    <SafeAreaView className="h-full">
      <ScrollView>
        <View className="p-4">
          {/* Profile Info */}
          <View className="items-center mb-6 mt-5">
            <TouchableOpacity onPress={uploadAvatar} disabled={loading}>
              <Image
                source={{ 
                  uri: `${profile?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png'}?t=${Date.now()}`,
                  cache: 'reload'
                }}
                className="w-32 h-32 rounded-full"
              />
              {loading && (
                <View className="absolute w-full h-full items-center justify-center bg-black/30 rounded-full">
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            
            {isEditing ? (
              <View className="mt-4 w-full px-4">
                <TextInput
                  value={newDisplayName}
                  onChangeText={setNewDisplayName}
                  className={`text-2xl text-center p-2 mb-2 rounded-lg border ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-black'
                  }`}
                  style={{ 
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular' 
                  }}
                  placeholderTextColor={theme === 'dark' ? '#9ca3af' : '#4b5563'}
                  autoFocus
                />
                <View className="flex-row justify-center mt-2 mb-4 space-x-2">
                  <TouchableOpacity 
                    onPress={updateDisplayName}
                    className={`px-4 py-2 mr-2 rounded-lg ${
                      theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                    }`}
                  >
                    <Text className="!text-white font-medium">
                      {t('profile.editName.save')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => {
                      setIsEditing(false)
                      setNewDisplayName(session?.user?.user_metadata?.displayName || '')
                    }}
                    className={`px-4 py-2 rounded-lg ${
                      theme === 'dark' ? 'bg-gray-700' : 'bg-gray-500'
                    }`}
                  >
                    <Text className="!text-white font-medium">
                      {t('profile.editName.cancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text 
                  className="text-2xl leading-10 mt-5 text-center" 
                  style={{
                    fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium'
                  }}
                >
                  {profile?.display_name || t('profile.noName')}
                </Text>
                
                <FontAwesome 
                  name="pencil" 
                  size={16} 
                  color={theme === 'dark' ? '#666' : 'gray'} 
                  style={{ position: 'absolute', right: -24, top: '50%' }} 
                />
              </TouchableOpacity>
            )}
            
            <Text className="text-blue-400 text-base">
              {session?.user?.email}
            </Text>
          </View>

          {/* Buttons */}
          <View className="flex-row justify-around mb-6">
            <Pressable 
              className={`items-center p-4 rounded-lg w-5/12 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
              android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
              onPress={() => console.log('Pressed: Saved')}
            >
              <FontAwesome 
                name="heart" 
                size={24} 
                color={theme === 'dark' ? '#fff' : '#4A4A4A'}
              />
              <Text className="mt-2 text-center">{t('profile.buttons.saved')}</Text>
            </Pressable>
            
            <Pressable 
              className={`items-center p-4 rounded-lg w-5/12 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
              android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
              onPress={() => console.log('Pressed: Messages')}
            >
              <FontAwesome 
                name="envelope" 
                size={24} 
                color={theme === 'dark' ? '#fff' : '#4A4A4A'}
              />
              <Text className="mt-2 text-center">{t('profile.buttons.messages')}</Text>
            </Pressable>
          </View>
          <View className="flex-row justify-around mb-6">
            <Pressable 
              className={`items-center p-4 rounded-lg w-5/12 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
              android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
              onPress={() => console.log('Pressed: Reviews')}
            >
              <FontAwesome 
                name="star" 
                size={24} 
                color={theme === 'dark' ? '#fff' : '#4A4A4A'}
              />
              <Text className="mt-2 text-center">{t('profile.buttons.reviews')}</Text>
            </Pressable>
            
            <Pressable 
              className={`items-center p-4 rounded-lg w-5/12 border ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
              android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
              onPress={() => console.log('Pressed: Recent')}
            >
              <FontAwesome 
                name="clock-o" 
                size={24} 
                color={theme === 'dark' ? '#fff' : '#4A4A4A'}
              />
              <Text className="mt-2 text-center">{t('profile.buttons.recent')}</Text>
            </Pressable>
          </View>

          {/* Sections */}
          <Section title={t('profile.sections.selling.title')}>
            <View>
              <SectionItem 
                icon="list" 
                text={t('profile.sections.selling.products')} 
              />
              <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#4B5563' : '#D1D5DB' }} />
              <SectionItem 
                icon="bolt" 
                text={t('profile.sections.selling.quickActions')} 
              />
              <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#4B5563' : '#D1D5DB' }} />
              <SectionItem 
                icon="users" 
                text={t('profile.sections.selling.followers')} 
              />
              <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#4B5563' : '#D1D5DB' }} />
              <SectionItem 
                icon="line-chart" 
                text={t('profile.sections.selling.activities')} 
              />
            </View>
          </Section>

          <Section title={t('profile.sections.settings.title')}>
            <SectionItem 
              icon="cog" 
              text={t('profile.sections.settings.following')} 
            />
          </Section>

          <Section title={t('profile.sections.account.title')}>
            <View>
              <SectionItem 
                icon="map-marker" 
                text={t('profile.sections.account.location')} 
              />
              <View style={{ height: 1, backgroundColor: theme === 'dark' ? '#4B5563' : '#D1D5DB' }} />
              <SectionItem 
                icon="lock" 
                text={t('profile.sections.account.security')} 
              />
            </View>
          </Section>
        </View>
      </ScrollView>
      
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

// 6. Helper Components
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const { theme } = useTheme()
  
  return (
    <View className="my-4">
      <Text className="text-lg text-gray-100 mb-2" weight="medium">{title}</Text>
      <View className={`rounded-xl overflow-hidden border ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}>
        {children}
      </View>
    </View>
  )
}

const SectionItem = ({ icon, text, onPress }: { icon: string, text: string, onPress?: () => void }) => {
  const { theme } = useTheme()
  
  return (
    <Pressable
      className={`
        flex-row items-center justify-between p-4
        ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}
      `}
      onPress={onPress || (() => console.log(`Pressed: ${text}`))}
      android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
    >
      <View className="flex-row items-center flex-1 !bg-transparent">
        <FontAwesome 
          name={icon as any} 
          size={24} 
          color={theme === 'dark' ? '#fff' : '#4A4A4A'} 
          style={{ marginRight: 16 }}
        />
        <Text className="text-base flex-1">{text}</Text>
      </View>
    </Pressable>
  )
}