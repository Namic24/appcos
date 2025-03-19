import { Image, Pressable } from 'react-native';
import { View, Text } from '@/components/Themed';
import React from 'react';
import { useTheme } from '@/providers/ThemeProvider'

export default function ProductCard({
  productname, 
  productprice,
  productimage,
  postDate,
  description,
  onPress,
}: any) {
  const { theme } = useTheme()

  return (
    <Pressable 
      onPress={onPress} 
      className={`flex flex-col border-b ${
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }`}
      android_ripple={{ 
        color: 'rgba(104, 104, 104, 0.3)',
        foreground: true,
        borderless: false
      }}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View className="p-4 !bg-transparent">
        <Image
          source={{uri: productimage}}
          className="w-full h-64 rounded-xl"
          resizeMode="cover"
        />
        <Text
          className="text-xl pt-4"
          fontWeight='medium'
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {productname}
        </Text>
        <View className="flex flex-row justify-between mt-2 !bg-transparent">
          <Text
            className="text-lg !text-gray-400"
            fontWeight='medium'
          >
            {productprice}
          </Text>
          <Text
            className="text-md !text-gray-400 mt-1"
            fontWeight='medium'
          >
            {postDate}
          </Text>
        </View>
        <Text
          className="text-md mt-2"
          fontWeight='regular'
          numberOfLines={3}
          ellipsizeMode="tail"
        >
          {description}
        </Text>
      </View>
    </Pressable>
  );
}