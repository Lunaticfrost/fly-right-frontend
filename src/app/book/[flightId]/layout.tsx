import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export default async function BookingLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ flightId: string }>
}) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // ignore
          }
        },
      },
    }
  )

  const { flightId } = await params;

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/auth/login?redirectTo=/book/${flightId}`)
  }

  return <>{children}</>;
}
