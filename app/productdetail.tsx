import React, { useEffect, useState } from 'react'
import { ScrollView, Image, TouchableOpacity, Dimensions, Linking, SafeAreaView } from 'react-native'
import { View } from '@/components/Themed'
import ImageView from 'react-native-image-viewing'
import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { useLocalSearchParams } from 'expo-router'
import { supabase } from '@/utils/supabase'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import { th } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { Text } from "@/components/CustomText"
import { useTheme } from '@/providers/ThemeProvider'

interface SellerProfile {
  id: string
  avatar_url: string | null
  display_name: string
  phone: string
  updated_at: string
}

interface ProductDetail {
  id: number
  title: string
  price: number
  description: string
  category_id: number
  condition_id: number
  user_id: string
}

interface ProductImage {
  id: number
  product_id: number
  image_url: string
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

export default function ProductDetail() {
  const { t, i18n } = useTranslation()
  const params = useLocalSearchParams()
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null)
  const [productDetail, setProductDetail] = useState<ProductDetail | null>(null)
  const [productImages, setProductImages] = useState<ProductImage[]>([])
  const [isImageViewVisible, setIsImageViewVisible] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const screenWidth = Dimensions.get('window').width
  const [category, setCategory] = useState<Category | null>(null)
  const [condition, setCondition] = useState<Condition | null>(null)
  const { theme } = useTheme()

  const fetchProductDetail = async () => {
    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', params.id)
        .single()

      if (productError) throw productError
      setProductDetail(productData)

      if (productData?.user_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', productData.user_id)
          .single()

        if (profileError) throw profileError
        setSellerProfile(profileData)
      }
    } catch (error) {
      console.error('Error fetching product detail:', error)
    }
  }

  const fetchProductImages = async () => {
    try {
      const { data: imageData, error: imageError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', params.id)
        .order('id')

      if (imageError) throw imageError
      setProductImages(imageData || [])
    } catch (error) {
      console.error('Error fetching product images:', error)
    }
  }

  const fetchCategoryAndCondition = async () => {
    try {
      if (productDetail?.category_id) {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', productDetail.category_id)
          .single()

        if (categoryError) throw categoryError
        setCategory(categoryData)
      }

      if (productDetail?.condition_id) {
        const { data: conditionData, error: conditionError } = await supabase
          .from('conditions')
          .select('*')
          .eq('id', productDetail.condition_id)
          .single()

        if (conditionError) throw conditionError
        setCondition(conditionData)
      }
    } catch (error) {
      console.error('Error fetching category/condition:', error)
    }
  }

  useEffect(() => {
    fetchProductDetail()
    fetchProductImages()
    if (productDetail) {
      fetchCategoryAndCondition()
    }
  }, [params.id, productDetail])

  const handleContact = () => {
    if (sellerProfile?.phone) {
      Linking.openURL(`tel:${sellerProfile.phone}`)
    }
  }

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset.x
    const imageIndex = Math.round(contentOffset / screenWidth)
    setCurrentImageIndex(imageIndex)
  }

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index)
    setIsImageViewVisible(true)
  }

  const imageViewImages = productImages.map(img => ({
    uri: img.image_url
  }))

  const getLocalizedName = (item: Category | Condition | null) => {
    if (!item) return ''
    return i18n.language === 'th' ? item.name_th : item.name_en
  }

  const formatDate = (dateString: string) => {
    try {
      const utcDate = parseISO(dateString)
      const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok')
      const relativeTime = formatDistanceToNow(bangkokDate, { 
        addSuffix: true,
        locale: th 
      })
      return relativeTime
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  const formatThaiDateTime = (dateString: string) => {
    try {
      const utcDate = parseISO(dateString)
      const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok')
      return format(bangkokDate, 'dd/MM/yyyy HH:mm น.', { locale: th })
    } catch (error) {
      console.error('Error formatting date:', error)
      return dateString
    }
  }

  return (
    <SafeAreaView 
      className="h-full"
      style={{
        backgroundColor: theme === 'dark' ? '#000' : '#fff'
      }}
    >
      <Stack.Screen
        options={{
          headerTitle: params.title as string,
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleStyle: {
            fontSize: 18,
            fontFamily: i18n.language === 'th' ? "NotoSansThai-Regular" : "Poppins-Regular",
            color: theme === 'dark' ? '#fff' : '#000',
          },
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: theme === 'dark' ? '#fff' : '#000',
          headerBackVisible: true,
        }}
      />

      <ScrollView 
        className="h-full"
        contentContainerStyle={{ 
          backgroundColor: theme === 'dark' ? '#000' : '#fff'
        }}
      >
        {/* Image Viewer Modal */}
        <ImageView
          images={imageViewImages}
          imageIndex={currentImageIndex}
          visible={isImageViewVisible}
          onRequestClose={() => setIsImageViewVisible(false)}
          swipeToCloseEnabled={true}
          doubleTapToZoomEnabled={true}
        />

        {/* Product Images Slider */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {productImages.length > 0 ? (
              productImages.map((image, index) => (
                <TouchableOpacity
                  key={image.id}
                  onPress={() => handleImagePress(index)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: image.image_url }}
                    style={{ width: screenWidth, height: 384 }}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))
            ) : (
              <Image
                source={{ 
                  uri: 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
                }}
                style={{ width: screenWidth, height: 384 }}
                resizeMode="cover"
              />
            )}
          </ScrollView>
          
          {/* Image Counter */}
          <View className="absolute bottom-4 right-4 bg-black/50 px-2 py-1 rounded">
            <Text className="text-white">
              {productImages.length > 0 
                ? `${currentImageIndex + 1}/${productImages.length}`
                : '0/0'
              }
            </Text>
          </View>
        </View>

        {/* Product Info */}
        <View className="p-4">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text weight="regular" className="text-2xl leading-9">{params.title as string}</Text>
              <View className="flex-row justify-between items-center mt-1">
                <Text className="text-xl text-secondary-200">
                  ฿{Number(params.price).toLocaleString()}
                </Text>
                <Text className="text-gray-500">
                  {params.location || t('product.noLocation')}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mt-6">
            <Text weight="medium" className="text-lg mb-2">{t('product.description')}</Text>
            <Text className="text-gray-600">
              {params.description as string}
            </Text>

            <Text className="text-lg my-2" weight='medium'>{t('product.condition')}</Text>
            {condition && (
              <Text className="text-gray-600">
                {getLocalizedName(condition)}
              </Text>
            )}

            <Text className="text-lg my-2" weight='medium'>{t('product.category')}</Text>
            {category && (
              <Text className="text-gray-600">
                {getLocalizedName(category)}
              </Text>
            )}

            <Text className="text-lg my-2" weight='medium'>วันที่ลงประกาศ</Text>
            <Text className="text-gray-600">
            {params.created_at ? formatDate(params.created_at as string) : ''} - {params.created_at ? formatThaiDateTime(params.created_at as string) : ''}
            </Text>
          </View>

          {/* Seller Info */}
          <View className="mt-6 mb-8">
            <Text weight="medium" className="text-lg font-medium mb-2">ข้อมูลผู้ขาย</Text>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Image 
                  source={{ 
                    uri: sellerProfile?.avatar_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'
                  }}
                  className="w-10 h-10 rounded-full"
                />
                <View className="ml-4">
                  <Text 
                    weight="semibold"
                    style={{
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-SemiBold' : 'Poppins-SemiBold'
                    }}
                  >
                    {sellerProfile?.display_name || 'ไม่ระบุชื่อ'}
                  </Text>
                  <Text 
                    weight="regular"
                    className="text-gray-500"
                    style={{
                      fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular'
                    }}
                  >
                    {sellerProfile?.phone || 'ไม่ระบุเบอร์โทรศัพท์'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                className="bg-secondary-200 p-2 rounded-lg"
                onPress={handleContact}
              >
                <Text className="!text-white">ติดต่อ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
