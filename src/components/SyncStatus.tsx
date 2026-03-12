import { useEffect, useState } from 'react';
import { SyncEngine } from '../services/sync/SyncEngine';
import { useTenantStore } from '../store/useTenantStore';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    if (!tenant) return;

    const updateStatus = async () => {
      const pending = await SyncEngine.getPendingCount();
      setPendingCount(pending);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    SyncEngine.start();

    return () => clearInterval(interval);
  }, [tenant]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await SyncEngine.syncPending();
    setIsSyncing(false);
  };

  if (!tenant) return null;

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (pendingCount > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getIcon = () => {
    if (!isOnline) return <WifiOff className="w-3 h-3 text-white" />;
    if (isSyncing || pendingCount > 0) return <RefreshCw className="w-3 h-3 text-white animate-spin" />;
    return <Wifi className="w-3 h-3 text-white" />;
  };

  return (
    <div 
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className={`${getStatusColor()} p-2 rounded-full shadow-lg hover:scale-110 transition-transform`}
        title={!isOnline ? 'Sin conexión' : `${pendingCount} pendientes`}
      >
        {getIcon()}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full right-0 mb-2 bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[180px]">
          <div className="text-sm font-medium text-white mb-2">
            {isOnline ? 'Conectado' : 'Sin conexión'}
          </div>
          <div className="text-xs text-slate-400">
            {pendingCount > 0 ? `${pendingCount} cambios pendientes` : 'Todo sincronizado'}
          </div>
          {pendingCount > 0 && isOnline && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="mt-2 w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded transition-colors"
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
