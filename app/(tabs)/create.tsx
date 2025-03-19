// rnf
import React, { useState, useEffect } from "react"
import {
  Modal,
  Pressable,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView
} from "react-native"
import { View } from "@/components/Themed"
import CustomTextField from "@/components/FormField"
import { FontAwesome } from "@expo/vector-icons"
import * as ImagePicker from "expo-image-picker"
import { supabase } from "@/utils/supabase"
import { decode } from "base64-arraybuffer"
import CustomButton from "@/components/CustomButton"
import { useAuth } from "@/providers/AuthProvider"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'
import * as ImageManipulator from 'expo-image-manipulator';
import CustomAlert from "@/components/CustomAlert"
import { Text } from "@/components/CustomText"

interface ProductForm {
  title: string
  price: string
  description: string
  category_id: number
  condition_id: number
  location: string
  images: string[]
}

interface Category {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

interface Condition {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

const MAX_IMAGES = 5;  // เพิ่มค่าคงที่

export default function Create() {
  const { session } = useAuth() // กำหนดตัวแปรใช้งานการตรวจสอบสถานะของผู้ใช้
  const { t, i18n } = useTranslation() // กำหนดตัวแปรใช้งานภาษา
  const { theme } = useTheme() // กำหนดตัวแปรใช้งานธีม
  const [categories, setCategories] = useState<Category[]>([]) // กำหนดตัวแปรใช้งานหมวดหมู่
  const [conditions, setConditions] = useState<Condition[]>([]) // กำหนดตัวแปรใช้งานสภาพสินค้า
  const [form, setForm] = useState<ProductForm>({
    title: "",
    price: "",
    description: "",
    category_id: 0,
    condition_id: 0,
    location: "",
    images: []
  });
  const [imageUris, setImageUris] = useState<string[]>([]); // กำหนดตัวแปรใช้งานรูปภาพ
  const [categoryModalVisible, setCategoryModalVisible] = useState(false) // กำหนดตัวแปรใช้งานหมวดหมู่
  const [conditionModalVisible, setConditionModalVisible] = useState(false) // กำหนดตัวแปรใช้งานสภาพสินค้า
  const [loading, setLoading] = useState(false) // กำหนดตัวแปรใช้งานสถานะการโหลด
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

  useEffect(() => {
    // Call async functions inside an IIFE
    (async () => {
      await fetchCategories() // ดึงข้อมูลหมวดหมู่
      await fetchConditions() // ดึงข้อมูลสภาพสินค้า
      // ขอ permission ตั้งแต่เริ่มต้น
      await ImagePicker.requestCameraPermissionsAsync();
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    })();
  }, [])

  // ฟังก์ชันดึงข้อมูลหมวดหมู่จาก Supabase
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('status', true)
        .order('id')
      
      if (error) throw error
      setCategories(data)
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  // ฟังก์ชันดึงข้อมูลสภาพสินค้าจาก Supabase
  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .select('*')
        .eq('status', true)
        .order('id')
      
      if (error) throw error
      setConditions(data)
    } catch (error) {
      console.error('Error fetching conditions:', error)
    }
  }

  // ฟังก์ชันดึงรูปภาพ
  const pickImage = async () => {
    try {
      if (imageUris.length >= MAX_IMAGES) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('create.validation.maxImages'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        return;
      }

      // ปรวจสอบ permission ก่อนแสดง popup
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
            message: t('create.imagePicker.permissionError'),
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

      // ปิด alert ก่อน (ถ้ามี)
      setAlertConfig(prev => ({ ...prev, visible: false }));
      
      // รอให้ alert ปิดสมบูรณ์
      await new Promise(resolve => setTimeout(resolve, 500));

      setAlertConfig({
        visible: true,
        title: t('create.imagePicker.title'),
        message: t('create.imagePicker.message'),
        buttons: [
          {
            text: t('create.imagePicker.camera'),
            onPress: async () => {
              const cameraPermission = await ImagePicker.getCameraPermissionsAsync();
              if (!cameraPermission.granted) {
                const newPermission = await ImagePicker.requestCameraPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('create.imagePicker.cameraPermissionError'),
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
               setAlertConfig(prev => ({ ...prev, visible: false }));
               await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.5,
                base64: true,
              });
              if (!result.canceled) {
                handleImageResult(result);
              }
            }
          },
          {
            text: t('create.imagePicker.library'),
            onPress: async () => {
              const libraryPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
              if (!libraryPermission.granted) {
                const newPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!newPermission.granted) {
                  setAlertConfig({
                    visible: true,
                    title: t('common.error'),
                    message: t('create.imagePicker.galleryPermissionError'),
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
              setAlertConfig(prev => ({ ...prev, visible: false }));
               await new Promise(resolve => setTimeout(resolve, 500));
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: true,
                quality: 0.5,
                base64: true,
                selectionLimit: MAX_IMAGES - imageUris.length,
              });
              
              if (!result.canceled) {
                handleImageResult(result);
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
      console.error('Error picking image:', error);
      
      // รอสักครู่ก่อนแสดง error alert
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.imagePicker.error'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    }
  };

  // ฟังก์ชันจัดการรูปภาพ
  const handleImageResult = async (result: ImagePicker.ImagePickerResult) => {
    if (!result.assets) {
      return;
    }

    try {
      const resizedImages = await Promise.all(
        result.assets.map(async (asset: ImagePicker.ImageInfo) => {
          const { width, height } = asset;
          const aspectRatio = width / height;
          const targetSize = 1024;

          let cropSize;
          if (aspectRatio > 1) {
            cropSize = height;
            const offsetX = (width - height) / 2;
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                { crop: { originX: offsetX, originY: 0, width: cropSize, height: cropSize } },
                { resize: { width: targetSize, height: targetSize } }
              ],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            // เก็บทั้ง uri และ base64
            return {
              uri: manipResult.uri,
              base64: manipResult.base64 || ''
            };
          } else {
            cropSize = width;
            const offsetY = (height - width) / 2;
            const manipResult = await ImageManipulator.manipulateAsync(
              asset.uri,
              [
                { crop: { originX: 0, originY: offsetY, width: cropSize, height: cropSize } },
                { resize: { width: targetSize, height: targetSize } }
              ],
              { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
            );
            // เก็บทั้ง uri และ base64
            return {
              uri: manipResult.uri,
              base64: manipResult.base64 || ''
            };
          }
        })
      );

      // แยกการอัพเดท state ของ base64 และ uri
      setForm(prev => ({
        ...prev,
        images: [...(prev.images || []), ...resizedImages.map(img => img.base64)]
      }));

      setImageUris(prev => [...prev, ...resizedImages.map(img => img.uri)]);

    } catch (error) {
      console.error('Error processing images:', error);
      Alert.alert(t('common.error'), t('create.imagePicker.error'));
    }
  };

  // ฟังก์ชันตรวจสอบข้อมูลที่กรอกในฟอร์ม
  const validateForm = () => {
    if (!form.title.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.title'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.price.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.price'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    const price = parseFloat(form.price)
    if (isNaN(price) || price <= 0) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.price.invalid'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.description.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.description'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.category_id) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.category'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.condition_id) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.condition'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.location.trim()) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.location'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    if (!form.images?.length) {
      setAlertConfig({
        visible: true,
        title: t('common.error'),
        message: t('create.validation.image'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return false;
    }

    return true;
  };

  // ฟังก์ชันจัดการการส่งข้อมูลสินค้า
  const handleSubmit = async () => {
    try {
      if (!session?.user) {
        setAlertConfig({
          visible: true,
          title: t('common.error'),
          message: t('create.messages.loginRequired'),
          buttons: [
            {
              text: t('common.ok'),
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            }
          ]
        });
        return;
      }

      if (!validateForm()) return;

      setLoading(true);

      // 1. สร้างข้อมูลสินค้าก่อน
      const productToInsert = {
        user_id: session.user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price),
        condition_id: form.condition_id,
        category_id: form.category_id,
        location: form.location.trim(),
      }

      console.log('Inserting product:', productToInsert)

      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert([productToInsert])
        .select()
        .single()

      if (productError) {
        console.error('Product insert error:', productError)
        throw productError
      }

      // อัพโหลดรูปภาพทั้งหมด
      if (form.images?.length) {
        const imageUrls = await Promise.all(
          form.images.map(async (base64, index) => {
            const fileName = `${Date.now()}_${index}.jpg`
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from("product-images")
              .upload(fileName, decode(base64), {
                contentType: "image/jpeg",
              })

            if (uploadError) throw uploadError

            return `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${uploadData.path}`
          })
        )

        // บันทึกข้อมูลรูปภาพทั้งหมด
        const { error: imageError } = await supabase
          .from("product_images")
          .insert(
            imageUrls.map(url => ({
              product_id: productData.id,
              image_url: url,
            }))
          )

        if (imageError) throw imageError
      }

      // Reset form
      setForm({
        title: "",
        price: "",
        description: "",
        category_id: 0,
        condition_id: 0,
        location: "",
        images: [],
      })
      setImageUris([])
      
      // รอสักครู่ก่อนแสดง success alert
      await new Promise(resolve => setTimeout(resolve, 500));

      setAlertConfig({
        visible: true,
        title: t('common.success'),
        message: t('create.messages.success'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              clearForm();
            }
          }
        ]
      });
      
    } catch (error) {
      console.error("Error creating product:", error)

      // รอสักครู่ก่อนแสดง error alert
      await new Promise(resolve => setTimeout(resolve, 500));

      setAlertConfig({
        visible: true,
        title: t('create.alerts.error'),
        message: t('create.messages.error'),
        buttons: [
          {
            text: t('common.ok'),
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันล่าง��ุดสำหรับล่างฟอร์ม
  const clearForm = () => {
    setForm({
      title: "",
      price: "",
      description: "",
      category_id: 0,
      condition_id: 0,
      location: "",
      images: []
    });
    setImageUris([]);
  };

  // สร้างก์ชันช่วยสำหรับแสดงชื่อตามภาษา
  const getLocalizedName = (item: Category | Condition) => {
    return i18n.language === 'th' ? item.name_th : item.name_en
  }

  return (
    <SafeAreaView className="h-full">
      {loading && (
        <View className="absolute inset-0 bg-black/50 z-50 items-center justify-center">
          <View className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <ActivityIndicator color={theme === 'dark' ? '#fff' : '#0000ff'} />
            <Text className="mt-2">{t('create.buttons.saving')}</Text>
          </View>
        </View>
      )}
      <ScrollView className="h-full">
        <View className="px-4 pb-5">
          {/* แสดงรูปภาพที่เลือก */}
          <ScrollView horizontal className="h-64 mb-4 mt-4">
            {imageUris.map((uri, index) => (
              <View key={index} className="relative mr-2">
                <Image
                  source={{ uri }}
                  className="w-64 h-64 rounded-lg"
                />
                <TouchableOpacity
                  className="absolute top-4 right-4 bg-black/50 rounded-full p-2"
                  onPress={() => {
                    setImageUris(prev => prev.filter((_, i) => i !== index))
                    setForm(prev => ({
                      ...prev,
                      images: prev.images?.filter((_, i) => i !== index)
                    }))
                  }}
                >
                  <FontAwesome name="times" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            {/* ซ่อนปุ่มเพิ่มรูปภาพเมื่อครบ 5 รูป */}
            {imageUris.length < MAX_IMAGES && (
              <TouchableOpacity
                onPress={pickImage}
                className={`w-64 h-64 rounded-lg border items-center justify-center ${
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
                }`}
              >
                <FontAwesome 
                  name="camera" 
                  size={64} 
                  color={theme === 'dark' ? '#666' : 'gray'} 
                />
              </TouchableOpacity>
            )}
          </ScrollView>

          <CustomTextField
            title={t('create.fields.title')}
            value={form.title}
            placeholder={t('create.placeholders.title')}
            handleChangeText={(text: any) => setForm({ ...form, title: text })}
          />
          <CustomTextField
            title={t('create.fields.price')}
            placeholder={t('create.placeholders.price')}
            value={form.price}
            keyboardType="numeric"
            handleChangeText={(text: any) => setForm({ ...form, price: text })}
          />
          <CustomTextField
            title={t('create.fields.description')}
            value={form.description}
            placeholder={t('create.placeholders.description')}
            multiline
            textAlignVertical="top"
            className="!h-auto min-h-[128px] py-2"
            handleChangeText={(text: any) => setForm({ ...form, description: text })}
          />
          <CustomTextField
            title={t('create.fields.location')}
            value={form.location}
            placeholder={t('create.placeholders.location')}
            handleChangeText={(text: any) => setForm({ ...form, location: text })}
          />

          <Text className="text-md mt-2 font-pregular">{t('create.fields.category')}</Text>

          <Pressable
            className={`flex-row items-center my-2 py-4 px-4 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setCategoryModalVisible(true)}
            android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
          >
            <Text className="flex-1">
              {form.category_id 
                ? categories.find(c => c.id === form.category_id)
                  ? getLocalizedName(categories.find(c => c.id === form.category_id)!)
                  : t('create.placeholders.category')
                : t('create.placeholders.category')
              }
            </Text>
            <FontAwesome 
              name="chevron-down" 
              size={10} 
              color={theme === 'dark' ? '#fff' : '#000'}
            />
          </Pressable>

          <Text className="text-md mt-2 font-pregular">{t('create.fields.condition')}</Text>
          
          <Pressable
            className={`flex-row items-center my-2 px-4 py-4 mb-6 rounded-lg border ${
              theme === 'dark' 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}
            onPress={() => setConditionModalVisible(true)}
            android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
          >
            <Text className="flex-1">
              {form.condition_id
                ? conditions.find(c => c.id === form.condition_id)
                  ? getLocalizedName(conditions.find(c => c.id === form.condition_id)!)
                  : t('create.placeholders.condition')
                : t('create.placeholders.condition')
              }
            </Text>
            <FontAwesome 
              name="chevron-down" 
              size={10} 
              color={theme === 'dark' ? '#fff' : '#000'}
            />
          </Pressable>

          <View className="flex-row mt-4">
            <CustomButton
              title={t('common.clear')}
              handlePress={clearForm}
              containerStyles="!bg-transparent border border-gray-200 flex-[0.3] mr-2"
              textStyles="!text-gray-400"
            />

            <CustomButton
              title={t('create.buttons.save')}
              handlePress={handleSubmit}
              isLoading={loading}
              containerStyles={`flex-[0.7] p-4 rounded-lg ${
                theme === 'dark' 
                  ? loading ? 'bg-blue-800 opacity-50' : 'bg-blue-600'
                  : loading ? 'bg-blue-500 opacity-50' : 'bg-blue-500'
              }`}
              textStyles="!text-white"
            >
              <Text className="text-center text-lg !text-white" weight="bold">
                {loading ? t('create.buttons.saving') : t('create.buttons.save')}
              </Text>
            </CustomButton>
          </View>

          {/* Category Modal */}
          <Modal
            visible={categoryModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setCategoryModalVisible(false)}
          >
            <Pressable 
              className="flex-1"
              onPress={() => setCategoryModalVisible(false)}
            >
              <View className="flex-1 justify-end !bg-black/50">
                <View className={`rounded-t-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <View className={`p-4 border-b flex-row justify-between items-center ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <Text weight="medium" className="text-lg">
                      {t('create.modal.category.title')}
                    </Text>
                    <Pressable onPress={() => setCategoryModalVisible(false)}>
                      <FontAwesome 
                        name="times" 
                        size={20} 
                        color={theme === 'dark' ? '#fff' : '#000'}
                      />
                    </Pressable>
                  </View>
                  
                  <View className="p-4">
                    {categories.map((category) => (
                      <Pressable
                        key={category.id}
                        onPress={() => {
                          setForm({ ...form, category_id: category.id })
                          setCategoryModalVisible(false)
                        }}
                        className={`py-3 border-b ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                        }`}
                        android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
                      >
                        <Text weight="regular">
                          {getLocalizedName(category)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          </Modal>

          {/* Condition Modal */}
          <Modal
            visible={conditionModalVisible}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setConditionModalVisible(false)}
          >
            <Pressable 
              className="flex-1"
              onPress={() => setConditionModalVisible(false)}
            >
              <View className="flex-1 justify-end !bg-black/50">
                <View className={`rounded-t-3xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <View className={`p-4 border-b flex-row justify-between items-center ${
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <Text className="text-lg font-medium">
                      {t('create.modal.condition.title')}
                    </Text>
                    <Pressable onPress={() => setConditionModalVisible(false)}>
                      <FontAwesome 
                        name="times" 
                        size={20} 
                        color={theme === 'dark' ? '#fff' : '#000'}
                      />
                    </Pressable>
                  </View>

                  <View className="p-4">
                    {conditions.map((condition) => (
                      <Pressable
                        key={condition.id}
                        onPress={() => {
                          setForm({ ...form, condition_id: condition.id })
                          setConditionModalVisible(false)
                        }}
                        className={`py-3 border-b ${
                          theme === 'dark' ? 'border-gray-700' : 'border-gray-100'
                        }`}
                        android_ripple={{ color: 'rgba(104, 104, 104, 0.3)' }}
                      >
                        <Text>{getLocalizedName(condition)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            </Pressable>
          </Modal>
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
  )
}
