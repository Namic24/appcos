import { createContext, useContext, useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabase'

// 1. Type และ Context
type AuthContextType = {
  session: Session | null    // เก็บข้อมูล session ของผู้ใช้ที่ login
  loading: boolean          // สถานะการโหลดข้อมูล session
}

// สร้าง Context พร้อมค่าเริ่มต้น
const AuthContext = createContext<AuthContextType>({
  session: null,            // เริ่มต้นไม่มี session
  loading: true,           // เริ่มต้นกำลังโหลด
})

// 2. Provider Component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 3. เช็ค Session เมื่อแอพเริ่มทำงาน
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 4. ติดตามการเปลี่ยนแปลงสถานะการ Authentication
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)  // อัพเดท session เมื่อมีการ login/logout
      setLoading(false)
    })

    // 5. ยกเลิกการติดตามเมื่อ component ถูกทำลาย
    return () => subscription.unsubscribe()
  }, [])

  // 6. ส่งค่าผ่าน Context Provider
  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// 7. Custom Hook สำหรับเข้าถึง Auth State
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 