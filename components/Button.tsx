// Button.tsx
import React from 'react'
import { TouchableOpacity } from 'react-native'
import { Text } from '@/components/CustomText'
import { useTranslation } from 'react-i18next'

interface ButtonProps {
  title: string
  onPress: () => void
}

const Button: React.FC<ButtonProps> = ({ title, onPress }) => {
  const { i18n } = useTranslation()

  return (
    <TouchableOpacity onPress={onPress}>
      <Text 
        weight="bold"
        className="text-lg !text-secondary"
        style={{
          fontFamily: i18n.language === 'th' ? 'NotoSansThai-Bold' : 'Poppins-Bold'
        }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  )
}

export default Button