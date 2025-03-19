import React, { useEffect, useState, useRef } from 'react'
import { FlatList, RefreshControl, TouchableOpacity, SafeAreaView } from 'react-native'
import { View } from '@/components/Themed'
import ProductBookmarkCard from '@/components/ProductBookmarkCard'
import { supabase } from "@/utils/supabase"
import { useAuth } from "@/providers/AuthProvider"
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'expo-router'
import i18n from '@/i18n'
import { Swipeable } from 'react-native-gesture-handler'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import CustomAlert from '@/components/CustomAlert'
import { Text } from "@/components/CustomText"

// เพิ่ม interface สำหรับข้อมูลสินค้า
interface Product {
  id: number
  title: string
  price: number
  description: string
  category_id: number
  condition_id: number
  user_id: string
  created_at: string
  location: string
  product_images?: {
    image_url: string
  }[]
}

// เพิ่ม interface สำหรับ Condition
interface Condition {
  id: number
  name_th: string
  name_en: string
  status: boolean
}

export default function Bookmark() {
  const { session } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { t } = useTranslation()
  const { theme } = useTheme()
  const router = useRouter()
  const [conditions, setConditions] = useState<Condition[]>([])
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({})
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

  // ฟังก์ชันดึงข้อมูลสินค้า
  const fetchUserProducts = async () => {
    try {
      if (!session?.user) return

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            id,
            image_url
          )
        `)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error("Error fetching user products:", error)
    }
  }

  // ดังก์ชันดึงข้อมูล conditions
  const fetchConditions = async () => {
    try {
      const { data, error } = await supabase
        .from('conditions')
        .select('*')

      if (error) throw error
      setConditions(data || [])
    } catch (error) {
      console.error("Error fetching conditions:", error)
    }
  }

  // ดึงข้อมูลเมื่อ component โหลดหรือ session เปลี่ยน
  useEffect(() => {
    fetchUserProducts()
    fetchConditions()
  }, [session])

  // เพิ่มฟังก์ช onRefresh
  const onRefresh = async () => {
    setRefreshing(true)
    await fetchUserProducts()
    setRefreshing(false)
  }

  // เพิ่มฟังก์ชันสำหรับการนำทางไปยังหน้า ProductDetail
  const handleProductPress = (product: Product) => {
    // ปิด swipeable ที่เปิดอยู่
    closeSwipeable(product.id);

    // นำทางไปยังหน้า ProductDetail
    router.push({
      pathname: '/productdetail',
      params: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        category_id: product.category_id,
        condition_id: product.condition_id,
        user_id: product.user_id,
        created_at: product.created_at,
        location: product.location,
      }
    });
  }

  // ฟังก์ชันสำหรับแสดงชื่อ condition ตามภาษา
  const getLocalizedConditionName = (conditionId: number) => {
    const condition = conditions.find(cond => cond.id === conditionId)
    return condition ? (i18n.language === 'th' ? condition.name_th : condition.name_en) : t('bookmark.product.status.available')
  }

  // ฟังก์ชันสำหรับลบสินค้า
  const handleDeleteProduct = async (productId: number) => {
    setAlertConfig({
      visible: true,
      title: t('bookmark.deleteAlert.title'),
      message: t('bookmark.deleteAlert.message'),
      buttons: [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setAlertConfig(prev => ({ ...prev, visible: false }));
            try {
              const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId)

              if (error) throw error

              // ลบรายการออกจาก state
              setProducts(products.filter(product => product.id !== productId))
            } catch (error) {
              console.error("Error deleting product:", error)
              setAlertConfig({
                visible: true,
                title: t('common.error'),
                message: t('bookmark.deleteAlert.error'),
                buttons: [
                  {
                    text: t('common.ok'),
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
                  }
                ]
              });
            }
          }
        }
      ]
    });
  }

  // ฟังก์ชันสำหรับแก้ไขสินค้า
  const handleEditProduct = (product: Product) => {
    // นำทางไปยังหน้าแก้ไขสินค้า
    router.push({
      pathname: '/editproduct',
      params: { id: product.id }
    })
  }

  const renderRightActions = (product: Product) => (
    <View className="flex-row">
      <TouchableOpacity
        className="bg-blue-500 justify-center items-center w-20"
        onPress={() => handleEditProduct(product)}
      >
        <Text className="!text-white">{t('bookmark.actions.edit')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        className="bg-red-500 justify-center items-center w-20"
        onPress={() => handleDeleteProduct(product.id)}
      >
        <Text className="!text-white">{t('bookmark.actions.delete')}</Text>
      </TouchableOpacity>
    </View>
  )

  // ฟังก์ชันสำหรับปิด swipeable ที่เปิดอยู่
  const closeSwipeable = (productId: number) => {
    Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
      if (Number(key) !== productId && ref) {
        ref.close();
      }
    });
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView className="h-full">
        <View className="h-full">
          <FlatList
            refreshControl={
              <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
            />
          }
          ListHeaderComponent={() => (
            <View className={`w-full flex-1 py-4 px-4 ${
              theme === 'dark' ? 'bg-primary' : 'bg-white'
            }`}>
              <Text weight="medium" className="text-xl">
                {t('bookmark.title')}
              </Text>
            </View>
          )}
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Swipeable
              ref={ref => swipeableRefs.current[item.id] = ref}
              renderRightActions={() => renderRightActions(item)}
              onSwipeableOpen={() => closeSwipeable(item.id)}
            >
              <ProductBookmarkCard
                image={item.product_images?.[0]?.image_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'}
                title={item.title}
                price={`฿${item.price.toLocaleString()}`}
                status={getLocalizedConditionName(item.condition_id)}
                onPress={() => handleProductPress(item)}
                theme={theme}
              />
            </Swipeable>
          )}
          ListEmptyComponent={() => (
            <View className={`p-4 ${
              theme === 'dark' ? 'bg-primary' : 'bg-white'
            }`}>
              <Text weight="regular" className="text-center">
                {t('bookmark.empty')}
              </Text>
            </View>
          )}
          contentContainerStyle={{
            backgroundColor: theme === 'dark' ? '#161622' : '#fff'
          }}
          />
        </View>

        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          buttons={alertConfig.buttons}
          onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}