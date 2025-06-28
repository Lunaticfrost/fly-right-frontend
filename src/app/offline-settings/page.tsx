"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useOfflineData } from "@/hooks/useOfflineData";
import { indexedDBService } from "@/lib/indexedDB";

export default function OfflineSettingsPage() {
  const { isOnline, lastSyncTime, syncData, clearExpiredCache, getDatabaseSize } = useOfflineData();
  const [databaseSize, setDatabaseSize] = useState<number>(0);
  const [isClearing, setIsClearing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchDatabaseSize = async () => {
      try {
        const size = await getDatabaseSize();
        setDatabaseSize(size);
      } catch (error) {
        console.error("Error fetching database size:", error);
      }
    };

    fetchDatabaseSize();
  }, [getDatabaseSize]);

  const handleClearExpiredCache = async () => {
    setIsClearing(true);
    try {
      await clearExpiredCache();
      alert("Expired cache cleared successfully!");
    } catch (error) {
      console.error("Error clearing expired cache:", error);
      alert("Failed to clear expired cache.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleSyncData = async () => {
    if (!isOnline) {
      alert("You are currently offline. Please connect to the internet to sync data.");
      return;
    }

    setIsSyncing(true);
    try {
      await syncData();
      alert("Data synced successfully!");
    } catch (error) {
      console.error("Error syncing data:", error);
      alert("Failed to sync data.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm("Are you sure you want to clear all offline data? This action cannot be undone.")) {
      return;
    }

    try {
      await indexedDBService.clearAllData();
      setDatabaseSize(0);
      alert("All offline data cleared successfully!");
    } catch (error) {
      console.error("Error clearing all data:", error);
      alert("Failed to clear all data.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <>
      <Header />
      <OfflineIndicator />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Offline Settings
            </h1>
            <p className="text-lg text-gray-600">
              Manage your offline data and sync settings
            </p>
          </div>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Connection Status */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🌐</span>
                Connection Status
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    isOnline ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isOnline ? '🟢 Online' : '🔴 Offline'}
                  </span>
                </div>
                {lastSyncTime && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Last Sync:</span>
                    <span className="font-medium text-gray-900">
                      {lastSyncTime.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Storage Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">💾</span>
                Storage Information
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Database Size:</span>
                  <span className="font-medium text-gray-900">
                    {formatBytes(databaseSize)}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  This includes cached flights, bookings, and search results.
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">⚙️</span>
                Actions
              </h2>
              <div className="space-y-4">
                <button
                  onClick={handleSyncData}
                  disabled={!isOnline || isSyncing}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSyncing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Syncing...
                    </>
                  ) : (
                    "🔄 Sync Data"
                  )}
                </button>

                <button
                  onClick={handleClearExpiredCache}
                  disabled={isClearing}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isClearing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Clearing...
                    </>
                  ) : (
                    "🧹 Clear Expired Cache"
                  )}
                </button>

                <button
                  onClick={handleClearAllData}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center"
                >
                  🗑️ Clear All Offline Data
                </button>
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                <span className="mr-2">ℹ️</span>
                About Offline Mode
              </h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Your flight data is automatically cached for offline viewing</p>
                <p>• Search results are cached for 1 hour to improve performance</p>
                <p>• Bookings are synced when you're online</p>
                <p>• You can view your bookings even when offline</p>
                <p>• Expired cache is automatically cleaned up</p>
              </div>
            </div>

            {/* Back Button */}
            <div className="text-center">
              <button
                onClick={() => router.back()}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
              >
                ← Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 