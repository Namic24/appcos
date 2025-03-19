// นำเข้า libraries และ components ที่จำเป็น
import React, { useEffect, useState } from "react"
import { FlatList, RefreshControl, Image, ActivityIndicator, TouchableOpacity, SafeAreaView } from "react-native"
import { View, Text } from "@/components/Themed"
import ProductCard from "@/components/ProductCard"
import HorizontalCard from "@/components/HorizontalCard"
import SearchInput from "@/components/SearchInput"
import { useAuth } from "@/providers/AuthProvider"
import { supabase } from "@/utils/supabase"
import { formatDistanceToNow, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'
import { useTheme } from '@/providers/ThemeProvider'
import { useRouter } from 'expo-router'
import _ from 'lodash'
import { LogBox } from 'react-native'

// กำหนดประเภทของข้อมูลสินค้า
type Product = {
  id: number
  title: string
  price: number
  description: string
  created_at: string
  hilight: boolean
  location: string
  product_images?: {
    image_url: string
  }[]
}

// ฟังก์ชันสำหรับจัดรูปแบบวันที่
const formatDate = (dateString: string) => {
  try {
    const utcDate = parseISO(dateString) // แปลงวันที่เป็นวันที่ UTC
    const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok') // แปลงวันที่เป็นวันที่ของไทย
    const relativeTime = formatDistanceToNow(bangkokDate, { 
      addSuffix: true,
      locale: th 
    })
    return relativeTime
  } catch (error) {
    console.error('Error formatting date:', error) // กรณีมีข้อผิดพลาดในการแปลงวันที่
    return dateString // ส่งคืนวันที่เดิมถ้ามีข้อผิดพลาด
  }
}

export default function Home() {
  const { session } = useAuth() // สถานะของผู้ใช้
  const [products, setProducts] = useState<Product[]>([]) // สินค้าทั้งหมด
  const [hilightProducts, setHilightProducts] = useState<Product[]>([]) // สินค้าแนะนำ
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]) // สินค้าที่กรอง
  const [searchQuery, setSearchQuery] = useState("") // คำค้นหา
  const [refreshing, setRefreshing] = useState(false) // สถานะกำลังรีเฟรช
  const { theme } = useTheme() // สถานะของธีม
  const router = useRouter() // เครื่องมือสำหรับการเปลี่ยนหน้า

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables") // กรณีขาดตัวแปรสำหรับ Supabase
  } 

  // สถานะสำหรับจัดการ pagination
  const [page, setPage] = useState(0) // หน้าเริ่มต้น
  const [isLoadingMore, setIsLoadingMore] = useState(false) // สถานะกำลังโหลดเพิ่ม
  const [hasMore, setHasMore] = useState(true) // สถานะว่ายังมีข้อมูลให้โหลดอีกหรือไม่
  const ITEMS_PER_PAGE = 3 // จำนวนรายการที่จะโหลดต่อหน้า

  // เพิ่ม state สำหรับการค้นหา
  const [isSearching, setIsSearching] = useState(false)

  // เพิ่ม state สำหรับเก็บ URL รูปโปรไฟล์
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // เพิ่มฟังก์ชันดึงข้อมูลโปรไฟล์
  const fetchProfile = async () => {
    try {
      if (!session?.user?.id) return

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  // เรียกใช้ฟังก์ชันเมื่อ session เปลี่ยน
  useEffect(() => {
    if (session?.user) {
      fetchProfile()
    }
  }, [session])

  // ฟังก์ชันค้นหาจาก Supabase
  const searchProducts = async (searchText: string) => {
    try {
      setIsSearching(true)
      
      const { data, error, count } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            image_url
          )
        `, { count: 'exact' })
        .ilike('title', `%${searchText}%`)
        .range(0, ITEMS_PER_PAGE - 1)
        .order('created_at', { ascending: false })

      if (error) throw error

      setFilteredProducts(data || [])
      setHasMore(count ? count > ITEMS_PER_PAGE : false)
      setPage(0)
      
    } catch (error) {
      console.error('🔍 ค้นหาผิดพลาด:', error)
    } finally {
      setIsSearching(false)
    }
  }

  // ใช้ debounce เพื่อลดการเรียก API บ่อยเกินไป
  const debouncedSearch = _.debounce((text: string) => {
    searchProducts(text)
  }, 500)

  // ฟังก์ชันจัดการการค้นหา
  const handleSearch = (text: string) => {
    setSearchQuery(text)
    
    if (text.trim() === "") {
      setFilteredProducts(products) // โหลดสินค้าทั้งหมดกลับมา
      setHasMore(true) // รีเซ็ตสถานะว่ามีข้อมูลให้โหลดอีกหรือไม่
      setPage(0) // รีเซ็ตหน้าเริ่มต้น
      return
    }

    debouncedSearch(text)
  }

  // ฟัก์ชันดึงข้อมูลสินค้าแนะนำ
  const fetchHilightProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            image_url
          )
        `)
        .eq('hilight', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setHilightProducts(data || []) // กำหนดค่าเริ่มต้นสำหรับสินค้าแนะนำ
    } catch (error) {
      console.error("Error fetching hilight products:", error)
    }
  }

  // ฟังก์ชันดึงข้อมูลสินค้าพร้อมการจัดการ pagination
  const fetchProducts = async (pageNumber = 0) => {
    try {
      const from = pageNumber * ITEMS_PER_PAGE
      console.log('🔍 กำลังดึงข้อมูลหน้า:', {
        page: pageNumber,
        from,
        to: from + ITEMS_PER_PAGE - 1
      })
      
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })

      console.log('📊 จำนวนสินค้าทั้งหมด:', count)

      if (count && from >= count) {
        console.log('⚠️ ไม่มีข้อมูลเพิ่มเติม')
        setHasMore(false)
        return
      }

      const to = from + ITEMS_PER_PAGE - 1

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images (
            image_url
          )
        `)
        .range(from, to)
        .order('created_at', { ascending: false })

      if (error) throw error

      setHasMore(count ? from + ITEMS_PER_PAGE < count : false)

      if (pageNumber === 0) {
        setProducts(data || []) // กำหนดค่าเริ่มต้นสำหรับสินค้า
      } else {
        setProducts(prev => [...prev, ...(data || [])])
      }
    } catch (error) {
      console.error("❌ เกิดข้อผิดพลาดในการดึงข้อมูล:", error)
      setHasMore(false)
    }
  }

  // ฟังก์ชันโหลดข้อมูลเพิ่มเติมเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
  const loadMore = async () => {
    // ถ้ากำลังโหลดอยู่หรือไม่มีข้อมูลเพิ่มเติม ให้หยุดการทำงาน
    if (isLoadingMore || !hasMore) {
      console.log('🚫 ไม่สามารถโหลดเพิ่มได้:', { 
        isLoadingMore, 
        hasMore,
        currentPage: page 
      })
      return
    }

    console.log('📥 เริ่มโหลดข้อมูลเพิ่มเติม:', {
      currentPage: page,
      nextPage: page + 1
    })

    setIsLoadingMore(true)
    await fetchProducts(page + 1)
    setPage(prev => prev + 1)
    setIsLoadingMore(false)

    console.log('✅ โหลดข้อมูลเพิ่มเติมเสร็จสิ้น:', {
      newPage: page + 1,
      totalItems: products.length
    })
  }

  // ฟังก์ชันรีเฟรชข้อมูลสินค้า
  const onRefresh = async () => {
    setRefreshing(true) // เปลี่ยนสถานะเป็นกำลังรีเฟรช
    setPage(0) // รีเซ็ตหน้าเริ่มต้น
    setHasMore(true) // รีเซ็ตสถานะว่ามีข้อมูลให้โหลดอีกหรือไม่
    await Promise.all([
      fetchProducts(0), // ดึงข้อมูลสินค้าใหม่
      fetchHilightProducts() // ดึงข้อมูลสินค้าแนะนำใหม่
    ])
    setRefreshing(false)
  }

  useEffect(() => {
    setFilteredProducts(products) // กำหนดค่าเริ่มต้นสำหรับสินค้าที่กรอง
  }, [products])

  // ฟังก์ชันจัดการการกดสินค้าแนะนำ
  const handleHorizontalCardPress = (product: Product) => {
    router.push({
      pathname: '/productdetail',
      params: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        image: product.product_images?.[0]?.image_url,
        created_at: product.created_at,
        location: product.location
      }
    })
  }

  // ฟังก์ชันจัดการการกดสินค้า
  const handleProductCardPress = (product: Product) => {
    router.push({
      pathname: '/productdetail',
      params: {
        id: product.id,
        title: product.title,
        price: product.price,
        description: product.description,
        image: product.product_images?.[0]?.image_url,
        created_at: product.created_at,
        location: product.location
      }
    })
  }

  useEffect(() => {
    const initializeProducts = async () => {
      setRefreshing(true); // เปลี่ยนสถานะเป็นกำลังรีเฟรช
      await Promise.all([
        fetchProducts(0), // ดึงข้อมูลสินค้าใหม่
        fetchHilightProducts()
      ]);
      setRefreshing(false); // อัปเดตสถานะเป็นไม่กำลังรีเฟรช
    };

    initializeProducts(); // เรียกใช้ฟังก์ชันเพื่อเริ่มต้นข้อมูล
  }, []);

  LogBox.ignoreAllLogs();

  return (
    <SafeAreaView className="h-full">
      <View className="h-full">
        <FlatList
          ListHeaderComponent={() => (
            <View className="flex py-6 space-y-6">
              <View className="flex justify-between items-start flex-row mb-6 px-4">
                <View>
                  <Text className="font-pmedium text-md text-gray-100">
                    ยินดีต้อนรับ
                  </Text>
                  <Text className="text-2xl text-white">
                    {session?.user?.user_metadata?.displayName || 'บุคคลทั่วไป'}
                  </Text>
                </View>

                <View className="mt-1.5">
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                    <Image
                      source={{ 
                        uri: avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png',
                        cache: 'reload'
                      }}
                      className="w-10 h-10 rounded-full"
                      onError={(e) => {
                        console.error('Image loading error:', e.nativeEvent.error)
                        setAvatarUrl(null)
                      }}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <SearchInput 
                initialQuery={searchQuery} 
                onChangeText={handleSearch}
                placeholder="ค้นหาสินค้า..."
              />

              {isSearching && (
                <View className="py-2 items-center">
                  <ActivityIndicator size="small" color="#0284c7" />
                  <Text className="text-gray-500 mt-1">กำลังค้นหา...</Text>
                </View>
              )}

              {!searchQuery.trim() && (
                <>
                  <View className="w-full flex-1 pt-5 px-4">
                    <Text className="text-lg font-pregular text-gray-100">
                      สินค้าแนะนำ
                    </Text>
                  </View>
                  <FlatList
                    horizontal
                    data={hilightProducts}
                    keyExtractor={(item) => `hilight_${item.id}`}
                    renderItem={({ item }) => (
                      <HorizontalCard
                        image={item.product_images?.[0]?.image_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'}
                        title={item.title}
                        onPress={() => handleHorizontalCardPress(item)}
                      />
                    )}
                    showsHorizontalScrollIndicator={false}
                    className="mt-4"
                    ListEmptyComponent={() => (
                      <View className="px-4">
                        <Text className="text-gray-500">
                          ไม่มีสินค้าแนะนำ
                        </Text>
                      </View>
                    )}
                  />
                </>
              )}
            </View>
          )}
          ItemSeparatorComponent={() => (
            <View 
              className={`h-[1px] mx-8 ${
                theme === 'dark' ? 'bg-gray-200' : 'bg-gray-200'
              }`}
            />
          )}
          data={filteredProducts}
          keyExtractor={(item) => `product_${item.id}`}
          renderItem={({ item }) => (
            <ProductCard
              productname={item.title}
              productprice={`฿${item.price.toLocaleString()}`}
              productimage={item.product_images?.[0]?.image_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'}
              postDate={formatDate(item.created_at)}
              description={item.description}
              onPress={() => handleProductCardPress(item)}
            />
          )}
          ListEmptyComponent={() => (
            <View className="p-4">
              <Text className="text-center">
                {searchQuery.trim() ? 'ไม่พบสินค้าที่ค้นหา' : 'ไม่พบสินค้า'}
              </Text>
            </View>
          )}
          onEndReached={loadMore} // เรียกใช้ฟังก์ชันเพื่อโหลดข้อมูลเพิ่มเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
          onEndReachedThreshold={0.5} // ระยะที่จะเริ่มโหลดข้อมูลเพิ่มเมื่อเลื่อนถึงจุดสิ้นสุดของรายการ
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={() => (
            isLoadingMore ? (
              <View className="py-4">
                <ActivityIndicator size="small" />
              </View>
            ) : null
          )}
        />
      </View>
    </SafeAreaView>
  )
}
