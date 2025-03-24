/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FFA7D1", // Main pastel pink color - ใช้สำหรับปุ่มหลัก, เน้นข้อความสำคัญ และสัญลักษณ์หลักของแอพ
        secondary: {
          DEFAULT: "#FFFFFF", // White for light theme - ใช้เป็นพื้นหลังของการ์ด หรือพื้นที่เนื้อหา
          100: "#FFF0F9", // Very light pastel pink - ใช้เป็นพื้นหลังรอง หรือพื้นหลังส่วนที่ต้องการเน้นเล็กน้อย
          200: "#FFE6F5", // Light pastel pink - ใช้เป็นพื้นหลังของส่วนที่ต้องการเน้น หรือส่วนหัวของการ์ด
        },
        black: {
          DEFAULT: "#121212", // Not pure black - ใช้สำหรับข้อความสำคัญมากในธีมมืด
          100: "#1E1E2D", // Softer dark - ใช้เป็นพื้นหลังหลักของธีมมืด
          200: "#2D2D3A", // Slightly lighter dark - ใช้เป็นพื้นหลังของการ์ดในธีมมืด
        },
        gray: {
          100: "#F8F8FC", // Very light pastel gray - ใช้เป็นพื้นหลังหลักของธีมสว่าง
        },
        pink: {
          DEFAULT: "#FFA7D1", // Main pastel pink - ใช้สำหรับปุ่มหลักและองค์ประกอบสำคัญ
          dark: "#FF9CC6", // Darker pastel pink - ใช้สำหรับปุ่มหลักในสถานะกด
          light: "#F7BBFF", // Lighter pastel pink - ใช้เป็นพื้นหลังส่วนที่ต้องการเน้นในธีมสว่าง
          100: "#FFE6F5", // Very light pastel pink - ใช้เป็นพื้นหลังของแบนเนอร์หรือส่วนแจ้งเตือนเบาๆ
          200: "#FFD6EB", // Light pastel pink - ใช้สำหรับไอคอนรอง
          300: "#FFC5E3", // Medium light pastel pink - ใช้สำหรับเส้นขอบหรือองค์ประกอบเน้น
          400: "#FFA7D1", // Main pastel pink - ใช้เป็นสีหลักของแอพ (ปุ่มยืนยัน, แถบนำทาง)
          500: "#FF9CC6", // Medium pastel pink - ใช้สำหรับปุ่มกด หรือองค์ประกอบที่กำลังเลือก (active)
          600: "#FF85B9", // Slightly deeper pastel pink - ใช้สำหรับแจ้งเตือนสำคัญแต่ไม่รุนแรง
          700: "#FF6CA8", // Deepest pastel pink - ใช้สำหรับข้อความแจ้งเตือนสำคัญ
        },
        pastel: {
          blue: "#C5C5FF", // Pastel blue - ใช้สำหรับลิงก์ หรือปุ่มทางเลือกที่สอง
          purple: "#F7BBFF", // Pastel purple - ใช้สำหรับแถบ tag หรือ badge
          yellow: "#FFF4BD", // Pastel yellow - ใช้สำหรับข้อความเตือน (warning)
          green: "#BDFFCC", // Pastel green - ใช้สำหรับข้อความสำเร็จ (success)
          peach: "#FFDAC1", // Pastel peach - ใช้สำหรับปุ่มทางเลือกที่สาม
          lavender: "#E6E6FF", // Pastel lavender - ใช้สำหรับส่วนข้อมูลเพิ่มเติม
        }
      },
      fontFamily: {
        sans: ['Poppins-Regular', 'NotoSansThai-Regular'],
        'en-thin': ['Poppins-Thin'],
        'en-extralight': ['Poppins-ExtraLight'],
        'en-light': ['Poppins-Light'],
        'en-regular': ['Poppins-Regular'],
        'en-medium': ['Poppins-Medium'],
        'en-semibold': ['Poppins-SemiBold'],
        'en-bold': ['Poppins-Bold'],
        'en-extrabold': ['Poppins-ExtraBold'],
        'en-black': ['Poppins-Black'],
        'th-thin': ['NotoSansThai-Thin'],
        'th-extralight': ['NotoSansThai-ExtraLight'],
        'th-light': ['NotoSansThai-Light'],
        'th-regular': ['NotoSansThai-Regular'],
        'th-medium': ['NotoSansThai-Medium'],
        'th-semibold': ['NotoSansThai-SemiBold'],
        'th-bold': ['NotoSansThai-Bold'],
        'th-extrabold': ['NotoSansThai-ExtraBold'],
        'th-black': ['NotoSansThai-Black'],
      },
    },
  },
  plugins: [],
}