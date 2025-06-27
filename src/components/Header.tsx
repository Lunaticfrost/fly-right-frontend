'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function Header() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser()
      setUserEmail(userData.user?.email || null)
    }
    fetchUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="w-full bg-white border-b shadow-sm px-6 py-3 flex justify-between items-center">
      <div className="space-x-4 text-sm font-medium">
        <Link href="/" className="hover:underline">
          🛫 Search Flights
        </Link>
        <Link href="/my-bookings" className="hover:underline">
          📋 My Bookings
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {userEmail && <span className="text-gray-700">Hi, {userEmail}</span>}
        {userEmail && (
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
        >
          Logout
        </button>
        )}
      </div>
    </header>
  )
}
