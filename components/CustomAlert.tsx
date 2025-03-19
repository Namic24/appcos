import React from 'react';
import { Modal, View, TouchableOpacity, Pressable, Platform } from 'react-native';
import { Text } from './CustomText';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface AlertButton {
  text: string;
  onPress: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  onClose: () => void;
}

const CustomAlert = ({ visible, title, message, buttons, onClose }: CustomAlertProps) => {
  const { theme } = useTheme();
  const { i18n } = useTranslation();

  const getButtonStyle = (style?: string) => {
    switch (style) {
      case 'destructive':
        return theme === 'dark' ? 'text-red-400' : 'text-red-500';
      case 'cancel':
        return theme === 'dark' ? 'text-gray-400' : 'text-gray-500';
      default:
        return theme === 'dark' ? 'text-blue-400' : 'text-blue-500';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable 
        className="flex-1 justify-center items-center bg-black/50"
        onPress={onClose}
      >
        <View 
          className={`w-[300px] rounded-2xl ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          {/* Title */}
          <View className="px-4 pt-4 pb-2">
            <Text 
              weight="medium"
              className="text-lg text-center"
              style={{ 
                fontFamily: i18n.language === 'th' ? 'NotoSansThai-Medium' : 'Poppins-Medium'
              }}
            >
              {title}
            </Text>
          </View>

          {/* Message */}
          <View className="px-4 pb-4">
            <Text 
              weight="regular"
              className={`text-center ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}
              style={{ 
                fontFamily: i18n.language === 'th' ? 'NotoSansThai-Regular' : 'Poppins-Regular'
              }}
            >
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View className={`border-t ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            {buttons.map((button, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <View className={
                    theme === 'dark' ? 'border-t border-gray-700' : 'border-t border-gray-200'
                  } />
                )}
                {Platform.OS === 'android' ? (
                  <Pressable
                    onPress={button.onPress}
                    className="p-4"
                    android_ripple={{ 
                      color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <Text 
                      weight={button.style === 'cancel' ? 'regular' : 'medium'}
                      className={`text-center ${getButtonStyle(button.style)}`}
                      style={{ 
                        fontFamily: i18n.language === 'th' 
                          ? button.style === 'cancel' ? 'NotoSansThai-Regular' : 'NotoSansThai-Medium'
                          : button.style === 'cancel' ? 'Poppins-Regular' : 'Poppins-Medium'
                      }}
                    >
                      {button.text}
                    </Text>
                  </Pressable>
                ) : (
                  <TouchableOpacity
                    onPress={button.onPress}
                    className="p-4 active:bg-gray-100 dark:active:bg-gray-700"
                    activeOpacity={0.7}
                  >
                    <Text 
                      weight={button.style === 'cancel' ? 'regular' : 'medium'}
                      className={`text-center ${getButtonStyle(button.style)}`}
                      style={{ 
                        fontFamily: i18n.language === 'th' 
                          ? button.style === 'cancel' ? 'NotoSansThai-Regular' : 'NotoSansThai-Medium'
                          : button.style === 'cancel' ? 'Poppins-Regular' : 'Poppins-Medium'
                      }}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                )}
              </React.Fragment>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

export default CustomAlert; 