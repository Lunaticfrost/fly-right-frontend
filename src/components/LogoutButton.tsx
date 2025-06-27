'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
    >
      Logout
    </button>
  )
}
