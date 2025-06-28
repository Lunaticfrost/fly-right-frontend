"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

export default function Header() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUserEmail(userData.user?.email || null);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white shadow-lg border-b-4 border-blue-500">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link
              href="/"
              className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
            >
              <span className="text-2xl">✈️</span>
              <span className="text-xl font-bold tracking-wide">FlyRight</span>
            </Link>
            <nav className="hidden md:flex space-x-6 text-sm font-medium">
              <Link
                href="/"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:scale-105"
              >
                <span>🔍</span>
                <span>Search Flights</span>
              </Link>
              <Link
                href="/my-bookings"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:scale-105"
              >
                <span>📋</span>
                <span>My Bookings</span>
              </Link>
              <Link
                href="/offline-settings"
                className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 hover:scale-105"
              >
                <span>⚙️</span>
                <span>Offline Settings</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {userEmail && (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">Welcome back!</p>
                  <p className="text-xs text-blue-100 truncate max-w-32">
                    {userEmail}
                  </p>
                </div>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
