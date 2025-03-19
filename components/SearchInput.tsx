import { useState } from "react";
import { router, usePathname } from "expo-router";
import { View, TouchableOpacity, Image, TextInput } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { useTheme } from '@/providers/ThemeProvider'
import { icons } from "../constants";
import CustomAlert from '@/components/CustomAlert';

interface SearchInputProps {
  initialQuery?: string
  onChangeText: (text: string) => void
  placeholder?: string
}

const SearchInput = ({ initialQuery = '', onChangeText, placeholder }: SearchInputProps) => {
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery || "");
  const { theme } = useTheme();
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

  const handleSearch = () => {
    if (query.trim() === "") {
      setAlertConfig({
        visible: true,
        title: "ไม่พบคำค้นหา",
        message: "กรุณาระบุคำค้นหา",
        buttons: [
          {
            text: "ตกลง",
            onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
          }
        ]
      });
      return;
    }

    onChangeText(query)

    if (pathname.startsWith("/search")) {
      router.setParams({ query });
    }
  }

  const handleClear = () => {
    setQuery('')
    onChangeText('')
  }

  return (
    <>
      <View className={`flex flex-row items-center h-16 px-4 mx-4 rounded-xl border ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-gray-100 border-gray-200'
      }`}>
        <TextInput
          className="flex-1 text-lg"
          value={query}
          placeholder={placeholder}
          placeholderTextColor={theme === 'dark' ? '#9ca3af' : '#6b7280'}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          style={{ 
            fontFamily: 'NotoSansThai-Regular',
            color: theme === 'dark' ? '#fff' : '#000'
          }}
        />

        {query ? (
          <TouchableOpacity onPress={handleClear} className="mr-2">
            <FontAwesome 
              name="times-circle" 
              size={20} 
              color={theme === 'dark' ? '#9ca3af' : '#6b7280'} 
            />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={handleSearch}>
          <Image 
            source={icons.search} 
            className="w-5 h-5" 
            resizeMode="contain"
            style={{
              tintColor: theme === 'dark' ? '#9ca3af' : '#6b7280'
            }}
          />
        </TouchableOpacity>
      </View>

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
};

export default SearchInput;