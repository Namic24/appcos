// 1. Import dependencies
import i18n from "i18next";                    // ไลบรารีหลักสำหรับ i18n
import { initReactI18next } from "react-i18next"; // adapter สำหรับ React
import AsyncStorage from '@react-native-async-storage/async-storage'; // เก็บค่าภาษาที่เลือก

// 2. Import ไฟล์แปลภาษา
import translationEn from "./locales/en/translation.json"; // ไฟล์ภาษาอังกฤษ
import translationTh from "./locales/th/translation.json"; // ไฟล์ภาษาไทย

// 3. กำหนดรายการภาษาที่รองรับ
const resources = {
  en: { translation: translationEn },  // ข้อความภาษาอังกฤษ
  th: { translation: translationTh },  // ข้อความภาษาไทย
};

// 4. ฟังก์ชันเริ่มต้นการทำงานของ i18n
const initI18n = async () => {
  try {
    // 5. ตรวจจอบภาษาที่เคยบันทึกไว้
    const savedLanguage = await AsyncStorage.getItem('language');
    
    // 6. กำหนดให้ใช้ภาษาไทยเป็นค่าเริ่มต้นเสมอ
    let deviceLanguage = savedLanguage || 'th';

    // 7. ตรวจสอบว่าภาษาที่ได้รองรับหรือไม่
    // ถ้าไม่ใช่ไทยหรืออังกฤษ ให้ใช้ไทย
    if (!['en', 'th'].includes(deviceLanguage)) {
      deviceLanguage = 'th';
    }

    // 8. ตั้งค่า i18n
    await i18n.use(initReactI18next).init({
      compatibilityJSON: 'v4',        // รองรับ JSON format version 4
      resources,                      // ข้อความแปลภาษาต่างๆ
      lng: deviceLanguage,            // ภาษาเริ่มต้น
      fallbackLng: 'th',             // ภาษาสำรองถ้าไม่พบคำแปล
      interpolation: {
        escapeValue: false,          // ไม่ต้อง escape HTML
      },
    });

    // 9. บันทึกภาษาเริ่มต้นถ้ายังไม่เคยบันทึก
    if (!savedLanguage) {
      await AsyncStorage.setItem('language', deviceLanguage);
    }
  } catch (error) {
    console.error('Error initializing i18n:', error);
  }
};

// 10. เริ่มต้นการทำงานทันทีที่ import
initI18n();

export default i18n;