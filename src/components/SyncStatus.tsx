import { useEffect, useState } from 'react';
import { SyncEngine } from '../services/sync/SyncEngine';
import { SyncQueueItem } from '../services/db';
import { useTenantStore } from '../store/useTenantStore';
import { AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';

export default function SyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<SyncQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const tenant = useTenantStore((state) => state.currentTenant);

  useEffect(() => {
    if (!tenant) return;

    const updateStatus = async () => {
      const pending = await SyncEngine.getPendingCount();
      const conflictList = await SyncEngine.getConflicts();
      setPendingCount(pending);
      setConflicts(conflictList);
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000);

    SyncEngine.start();

    return () => clearInterval(interval);
  }, [tenant]);

  const handleSync = async () => {
    setIsSyncing(true);
    await SyncEngine.syncPending();
    setIsSyncing(false);
  };

  const handleResolve = async (itemId: number, resolution: 'local' | 'server') => {
    await SyncEngine.resolveConflict(itemId, resolution);
    const conflictList = await SyncEngine.getConflicts();
    setConflicts(conflictList);
  };

  if (!tenant) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-4 w-80">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-300">Sincronización</span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="p-1 hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {pendingCount === 0 && conflicts.length === 0 ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Sincronizado</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <RefreshCw className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400">{pendingCount} pendientes</span>
            </>
          ) : null}
        </div>

        {conflicts.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <div className="flex items-center gap-2 text-sm text-red-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{conflicts.length} conflictos</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {conflicts.map((conflict) => (
                <div key={conflict.id} className="bg-slate-800 p-2 rounded text-xs">
                  <div className="text-slate-300">{conflict.tableName}: {conflict.operation}</div>
                  <div className="text-red-400 text-xs mt-1">{conflict.errorMessage}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleResolve(conflict.id!, 'local')}
                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
                    >
                      Mantener local
                    </button>
                    <button
                      onClick={() => handleResolve(conflict.id!, 'server')}
                      className="px-2 py-1 bg-slate-600 hover:bg-slate-700 rounded text-white text-xs"
                    >
                      Usar servidor
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
