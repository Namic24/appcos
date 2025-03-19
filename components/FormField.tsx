import { useState } from "react";
import { TextInput, TouchableOpacity, Image } from "react-native";
import { View } from "@/components/Themed";
import { icons } from "../constants";
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { Text } from './CustomText';

interface FormFieldProps {
  title: string;
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
  otherStyles?: string;
  className?: string;
  [key: string]: any;
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  otherStyles,
  className,
  ...props
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const { theme } = useTheme();
  const { i18n } = useTranslation();

  const inputClassName = [
    "flex-1",
    "text-base",
    theme === 'dark' ? 'text-white placeholder:text-gray-400' : 'text-black placeholder:text-gray-600',
    "py-4"
  ].join(" ");

  return (
    <View className={`space-y-2 ${otherStyles}`}>
      <Text 
        weight="medium"
        className="text-base my-2"
        style={{
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium'
        }}
      >
        {title}
      </Text>

      <View className={`w-full px-4 mb-2 rounded-lg border flex flex-row items-start ${
        theme === 'dark' 
          ? 'border-gray-700 bg-gray-800' 
          : 'border-gray-300 bg-white'
      } ${className}`}>
        <TextInput
          className={inputClassName}
          style={{ 
            fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular',
            color: theme === 'dark' ? '#fff' : '#000',
          }}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={theme === 'dark' ? '#9ca3af' : '#4b5563'}
          onChangeText={handleChangeText}
          secureTextEntry={(title === "รหัสผ่าน" || title === "Password") && !showPassword}
          {...props}
        />

        {(title === "รหัสผ่าน" || title === "Password") && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6 mt-4"
              style={{
                tintColor: theme === 'dark' ? '#9ca3af' : '#4b5563'
              }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default FormField;