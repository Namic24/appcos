// 1. Import dependencies
import "react-native-url-polyfill/auto"    // แก้ปัญหา URL ใน React Native
import AsyncStorage from "@react-native-async-storage/async-storage"  // เก็บ session
import { createClient } from "@supabase/supabase-js"  // สร้าง Supabase client

// 2. ดึงค่า environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL      // URL ของ Supabase project
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY  // Public API key

// 3. ตรวจสอบว่ามีค่า environment variables ครบไหม
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

// 4. สร้าง Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,         // เก็บ session ใน AsyncStorage
    autoRefreshToken: true,       // รีเฟรช token อัตโนมัติเมื่อหมดอายุ
    persistSession: true,         // เก็บ session ไว้หลังปิดแอพ
    detectSessionInUrl: false,    // ไม่ต้องตรวจหา session จาก URL (เพราะเป็น mobile)
  },
})
