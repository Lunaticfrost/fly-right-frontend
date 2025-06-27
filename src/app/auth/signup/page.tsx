'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) {
      alert(signUpError.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (userId) {
      const { error: insertError } = await supabase
        .from('users')
        .insert([{ id: userId, name, email }])

      if (insertError) {
        alert(`Signup succeeded, but profile insert failed: ${insertError.message}`)
      }
    }

    alert('Signup successful!')
    router.push('/auth/login')
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl font-bold mb-4">Sign Up</h1>
      <input
        className="w-full p-2 mb-2 border"
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="w-full p-2 mb-2 border"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        className="w-full p-2 mb-2 border"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        disabled={loading}
        onClick={handleSignUp}
        className="w-full bg-blue-600 text-white py-2 rounded mt-2"
      >
        {loading ? 'Signing up...' : 'Sign Up'}
      </button>
    </div>
  )
}
