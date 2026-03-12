import { useTenantStore } from '../store/useTenantStore';

export default function Dashboard() {
  const tenant = useTenantStore((state) => state.currentTenant);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-2">Bienvenido a {tenant?.name}</h2>
        <p className="text-slate-400">
          Selecciona un módulo en el menú para comenzar o usa los accesos directos abajo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Placeholder para KPIs futuros */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold text-white">$0.00</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm mb-1">Órdenes Activas</p>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>
    </div>
  );
}
