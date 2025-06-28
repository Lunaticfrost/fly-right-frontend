import { useOfflineData } from '@/hooks/useOfflineData';

export default function OfflineIndicator() {
  const { isOnline, isSyncing, lastSyncTime } = useOfflineData();

  if (isOnline) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <div className="bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-sm font-medium">
            {isSyncing ? 'Syncing...' : 'Online'}
          </span>
        </div>
        {lastSyncTime && (
          <div className="mt-1 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-red-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <div className="w-2 h-2 bg-white rounded-full"></div>
        <span className="text-sm font-medium">Offline</span>
      </div>
      <div className="mt-1 text-xs text-gray-600 bg-white px-2 py-1 rounded shadow">
        Using cached data
      </div>
    </div>
  );
} 