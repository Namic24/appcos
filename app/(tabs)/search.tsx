import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput
} from 'react-native';
import { View, Text } from '@/components/Themed';
import { supabase } from '@/utils/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { useRouter } from 'expo-router';
import SearchInput from '@/components/SearchInput';
import ProductCard from '@/components/ProductCard';
import { Feather } from '@expo/vector-icons';
import _ from 'lodash';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

// กำหนดประเภทของข้อมูลสินค้า
type Costumes = {
  id: number;
  title: string;
  price: number;
  description: string;
  created_at: string;
  location: string;
  costume_images?: {
    image_url: string;
  }[];
};

// ฟังก์ชันสำหรับจัดรูปแบบวันที่
const formatDate = (dateString: string) => {
  try {
    const utcDate = parseISO(dateString);
    const bangkokDate = toZonedTime(utcDate, 'Asia/Bangkok');
    const relativeTime = formatDistanceToNow(bangkokDate, {
      addSuffix: true,
      locale: th,
    });
    return relativeTime;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

export default function Search() {
  const { theme } = useTheme();
  const router = useRouter();
  
  // สถานะสำหรับการค้นหา
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Costumes[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<string[]>([
    'ทั้งหมด', 'อนิเมะ', 'เกม', 'คอสเพลย์', 'ชุดไทย', 'ชุดนักเรียน', 'ชุดทำงาน', 'อื่นๆ'
  ]);
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([
    'ชุดไทย', 'กิโมโน', 'ชุดนักเรียน', 'ยูนิฟอร์ม', 'คาแรคเตอร์ดัง'
  ]);

  // ฟังก์ชันค้นหาจาก Supabase
  const searchCostumes = async (searchText: string, category: string = 'ทั้งหมด') => {
    try {
      setIsSearching(true);
      
      let query = supabase
        .from('costumes')
        .select(`
          *,
          costume_images (
            image_url
          )
        `);
      
      // เพิ่มการกรองด้วยคำค้นหา
      if (searchText.trim() !== '') {
        query = query.ilike('title', `%${searchText}%`);
      }
      
      // เพิ่มการกรองด้วยหมวดหมู่
      if (category !== 'ทั้งหมด') {
        // สมมติว่ามีฟิลด์ category ใน costumes
        query = query.eq('category', category);
      }
      
      // ดึงข้อมูลและเรียงตามวันที่สร้าง
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setSearchResults(data || []);
      
      // บันทึกคำค้นหาล่าสุด
      if (searchText.trim() !== '') {
        setRecentSearches(prev => {
          const updatedSearches = [searchText, ...prev.filter(item => item !== searchText)].slice(0, 5);
          return updatedSearches;
        });
      }
      
    } catch (error) {
      console.error('🔍 ค้นหาผิดพลาด:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // ใช้ debounce เพื่อลดการเรียก API บ่อยเกินไป
  const debouncedSearch = _.debounce((text: string, category: string) => {
    searchCostumes(text, category);
  }, 500);

  // ฟังก์ชันจัดการการค้นหา
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text, selectedCategory);
  };

  // ฟังก์ชันจัดการการกดเลือกหมวดหมู่
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    searchCostumes(searchQuery, category);
  };

  // ฟังก์ชันจัดการการกดสินค้า
  const handleCostumePress = (costume: Costumes) => {
    router.push({
      pathname: '/productdetail',
      params: {
        id: costume.id,
        title: costume.title,
        price: costume.price,
        description: costume.description,
        image: costume.costume_images?.[0]?.image_url,
        created_at: costume.created_at,
        location: costume.location
      }
    });
  };

  // ฟังก์ชันรีเฟรชข้อมูล
  const onRefresh = async () => {
    setRefreshing(true);
    await searchCostumes(searchQuery, selectedCategory);
    setRefreshing(false);
  };

  // ทำการค้นหาเมื่อเข้าหน้า search ครั้งแรก
  useEffect(() => {
    searchCostumes('', 'ทั้งหมด');
  }, []);

  // คอมโพเนนต์ Tag สำหรับแสดงคำค้นหายอดนิยมหรือล่าสุด
  const SearchTag = ({ text, onPress }: { text: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: theme === 'dark' ? '#2D2D3A' : '#FFE6F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ color: theme === 'dark' ? '#FFA7D1' : '#FFA7D1' }}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme === 'dark' ? '#121212' : '#F8F8FC' }}>
      <View className="h-full">
        {/* ส่วนหัว */}
        <View className="px-4 py-4" style={{ backgroundColor: theme === 'dark' ? '#1E1E2D' : '#FFF' }}>
          <Text className="text-xl font-bold mb-4" style={{ color: theme === 'dark' ? '#FFA7D1' : '#FFA7D1' }}>
            ค้นหา
          </Text>
          
          {/* ช่องค้นหา */}
          <SearchInput
            initialQuery={searchQuery}
            onChangeText={handleSearch}
            placeholder="ค้นหาชุด, คาแรคเตอร์, ประเภท..."
          />
        </View>

        {/* แสดงผลลัพธ์การค้นหา */}
        {isSearching ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#FFA7D1" />
            <Text className="mt-3" style={{ color: theme === 'dark' ? '#FFF' : '#333' }}>กำลังค้นหา...</Text>
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={() => (
              <View style={{ backgroundColor: 'transparent' }}>
                {/* หมวดหมู่ */}
                <View className="pt-4" style={{ backgroundColor: 'transparent' }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
                  >
                    {categories.map((category, index) => (
                      <TouchableOpacity
                        key={index}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          marginRight: 8,
                          backgroundColor: selectedCategory === category
                            ? '#FFA7D1'
                            : theme === 'dark' ? '#2D2D3A' : '#FFE6F5',
                        }}
                        onPress={() => handleCategorySelect(category)}
                      >
                        <Text
                          style={{
                            color: selectedCategory === category
                              ? '#FFF'
                              : theme === 'dark' ? '#FFA7D1' : '#FFA7D1',
                            fontWeight: selectedCategory === category ? 'bold' : 'normal',
                          }}
                        >
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* คำค้นหายอดนิยมและล่าสุด - แสดงเฉพาะเมื่อยังไม่ได้ค้นหา */}
                {!searchQuery && (
                  <View className="px-4 pt-2 pb-4" style={{ backgroundColor: 'transparent' }}>
                    {/* คำค้นหาล่าสุด */}
                    {recentSearches.length > 0 && (
                      <View className="mb-4" style={{ backgroundColor: 'transparent' }}>
                        <View className="flex-row justify-between items-center mb-2" style={{ backgroundColor: 'transparent' }}>
                          <Text className="text-base font-semibold" style={{ color: theme === 'dark' ? '#FFF' : '#333' }}>
                            ค้นหาล่าสุด
                          </Text>
                          <TouchableOpacity onPress={() => setRecentSearches([])}>
                            <Text style={{ color: '#FFA7D1' }}>ล้างทั้งหมด</Text>
                          </TouchableOpacity>
                        </View>
                        <View className="flex-row flex-wrap" style={{ backgroundColor: 'transparent' }}>
                          {recentSearches.map((text, index) => (
                            <SearchTag
                              key={`recent-${index}`}
                              text={text}
                              onPress={() => {
                                setSearchQuery(text);
                                searchCostumes(text, selectedCategory);
                              }}
                            />
                          ))}
                        </View>
                      </View>
                    )}

                    {/* คำค้นหายอดนิยม */}
                    <View style={{ backgroundColor: 'transparent' }}>
                      <Text className="text-base font-semibold mb-2" style={{ color: theme === 'dark' ? '#FFF' : '#333' }}>
                        ค้นหายอดนิยม
                      </Text>
                      <View className="flex-row flex-wrap" style={{ backgroundColor: 'transparent' }}>
                        {popularSearches.map((text, index) => (
                          <SearchTag
                            key={`popular-${index}`}
                            text={text}
                            onPress={() => {
                              setSearchQuery(text);
                              searchCostumes(text, selectedCategory);
                            }}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                {/* จำนวนผลลัพธ์ที่พบ - แสดงเฉพาะเมื่อมีการค้นหา */}
                {searchQuery && (
                  <View className="px-4 py-2" style={{ backgroundColor: 'transparent' }}>
                    <Text style={{ color: theme === 'dark' ? '#CCC' : '#666' }}>
                      พบ {searchResults.length} รายการ สำหรับ "{searchQuery}"
                    </Text>
                  </View>
                )}
              </View>
            )}
            data={searchResults}
            keyExtractor={(item) => `costume-${item.id}`}
            renderItem={({ item }) => (
              <ProductCard
                productname={item.title}
                productprice={`฿${item.price.toLocaleString()}`}
                productimage={item.costume_images?.[0]?.image_url || 'https://upload.wikimedia.org/wikipedia/commons/1/14/No_Image_Available.jpg'}
                postDate={formatDate(item.created_at)}
                description={item.description}
                onPress={() => handleCostumePress(item)}
              />
            )}
            ItemSeparatorComponent={() => (
              <View
                className="h-[1px] mx-8"
                style={{ backgroundColor: theme === 'dark' ? '#333' : '#EEE' }}
              />
            )}
            ListEmptyComponent={() => (
              <View className="flex-1 justify-center items-center py-16">
                <Feather name="search" size={48} color={theme === 'dark' ? '#444' : '#DDD'} />
                <Text className="mt-4 text-center px-6" style={{ color: theme === 'dark' ? '#CCC' : '#666' }}>
                  {searchQuery
                    ? `ไม่พบรายการสำหรับ "${searchQuery}"\nลองค้นหาด้วยคำอื่น หรือดูในหมวดหมู่อื่น`
                    : 'เริ่มค้นหาด้วยการพิมพ์คำค้นหา\nหรือเลือกจากคำแนะนำด้านบน'}
                </Text>
              </View>
            )}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FFA7D1']} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}