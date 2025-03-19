import { Text as RNText, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/providers/ThemeProvider';

interface CustomTextProps extends TextProps {
  weight?: 'thin' | 'extralight' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'extrabold' | 'black';
}

export function Text({ children, weight = 'regular', style, ...props }: CustomTextProps) {
  const { i18n } = useTranslation();
  const { theme } = useTheme();
  const isThaiLanguage = i18n.language === 'th';

  const getFontFamily = () => {
    const prefix = isThaiLanguage ? 'NotoSansThai' : 'Poppins';
    const capitalizedWeight = weight.charAt(0).toUpperCase() + weight.slice(1);
    return `${prefix}-${capitalizedWeight}`;
  };

  return (
    <RNText
      style={[
        { 
          fontFamily: getFontFamily(),
          color: theme === 'dark' ? '#fff' : '#000'
        }, 
        style
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
} 