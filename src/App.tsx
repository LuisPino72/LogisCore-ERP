import { useEffect, useState, lazy, Suspense } from 'react';
import { useTenantStore } from './store/useTenantStore';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import SyncStatus from './components/SyncStatus';
import { initializeCatalogs } from './services/db';
import { Package, ShoppingCart, ShoppingBasket, Menu, X, LayoutDashboard, ChefHat, BarChart3 } from 'lucide-react';

const Inventory = lazy(() => import('./components/inventory/Inventory'));
const POS = lazy(() => import('./components/pos/POS'));
const Recipes = lazy(() => import('./components/recipes/Recipes'));
const Reports = lazy(() => import('./components/reports/Reports'));
const Purchases = lazy(() => import('./components/purchases/Purchases'));

type Module = 'dashboard' | 'inventory' | 'pos' | 'recipes' | 'reports' | 'purchases';

function App() {
  const role = useTenantStore((state) => state.role);
  const tenant = useTenantStore((state) => state.currentTenant);
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (tenant?.slug) {
      initializeCatalogs(tenant.slug);
    }
  }, [tenant]);

  if (!role) {
    return <Login />;
  }

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
    { id: 'recipes', label: 'Recetas', icon: ChefHat },
    { id: 'reports', label: 'Reportes', icon: BarChart3 },
    { id: 'purchases', label: 'Compras', icon: ShoppingBasket },
  ] as const;

  const renderModule = () => {
    if (role === 'super_admin') {
      return <AdminPanel />;
    }

    switch (activeModule) {
      case 'inventory':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Inventory />
          </Suspense>
        );
      case 'pos':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <POS />
          </Suspense>
        );
      case 'recipes':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Recipes />
          </Suspense>
        );
      case 'reports':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Reports />
          </Suspense>
        );
      case 'purchases':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Purchases />
          </Suspense>
        );
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.filter(m => m.id !== 'dashboard').map((mod) => (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id as Module)}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-blue-500 hover:bg-slate-700/50 transition-all text-left"
              >
                <mod.icon className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold text-white">{mod.label}</h3>
                <p className="text-sm text-slate-400">Acceder al módulo</p>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold italic">
                LogisCore <span className="text-blue-500">ERP</span>
              </h1>
              <p className="text-xs text-slate-400">
                {role === 'super_admin' ? 'Administrador Global' : tenant?.name}
              </p>
            </div>

            {role !== 'super_admin' && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>

          {role !== 'super_admin' && (
            <nav className={`lg:flex items-center gap-1 mt-4 ${mobileMenuOpen ? 'flex flex-col absolute left-0 right-0 bg-slate-900 p-4 border-b border-slate-800' : 'hidden'}`}>
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => {
                    setActiveModule(mod.id as Module);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeModule === mod.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <mod.icon className="w-4 h-4" />
                  {mod.label}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="px-6 py-2 flex items-center justify-between border-t border-slate-800">
          <span className="px-2 py-1 bg-slate-800 rounded-full text-xs font-medium uppercase tracking-wider text-blue-400 border border-blue-500/30">
            {role}
          </span>
          <button
            onClick={() => useTenantStore.getState().clear()}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      <main className="p-6">
        {role === 'super_admin' ? (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Administración General</h2>
            <AdminPanel />
          </div>
        ) : (
          renderModule()
        )}
      </main>
      <SyncStatus />
    </div>
  );
}

export default App;
