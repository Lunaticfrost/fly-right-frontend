'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import LoadingButton from './LoadingButton'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/auth/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LoadingButton
      onClick={handleLogout}
      loading={loading}
      loadingText="Logging out..."
      variant="danger"
      size="sm"
      className="text-sm px-3 py-1"
    >
      Logout
    </LoadingButton>
  )
}
