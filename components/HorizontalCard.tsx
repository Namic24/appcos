import { Image, Pressable } from 'react-native';
import { Text } from '@/components/Themed';
import React from 'react';

export default function HorizontalCard({ image, title, onPress }: any) {
  return (
    <Pressable
      onPress={onPress}
      className="ml-4 rounded-xl"
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
      <Image
        source={{ uri: image }}
        className="w-48 h-64 rounded-lg"
        resizeMode="cover"
      />
      <Text className="text-md mt-2 w-48" fontWeight="light" numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </Pressable>
  )
} 