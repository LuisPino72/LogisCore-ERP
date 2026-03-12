import { useEffect, useState, lazy, Suspense } from 'react';
import { useTenantStore } from './store/useTenantStore';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import SyncStatus from './components/SyncStatus';
import { initializeCatalogs } from './services/db';
import { supabase } from './services/supabase';
import { db } from './services/db';
import { Package, ShoppingCart, ShoppingBasket, Menu, X, LayoutDashboard, ChefHat, BarChart3, Loader2 } from 'lucide-react';

const Inventory = lazy(() => import('./components/inventory/Inventory'));
const POS = lazy(() => import('./components/pos/POS'));
const Recipes = lazy(() => import('./components/recipes/Recipes'));
const Reports = lazy(() => import('./components/reports/Reports'));
const Purchases = lazy(() => import('./components/purchases/Purchases'));
const Dashboard = lazy(() => import('./components/Dashboard'));

type Module = 'dashboard' | 'inventory' | 'pos' | 'recipes' | 'reports' | 'purchases';

function App() {
  const role = useTenantStore((state) => state.role);
  const tenant = useTenantStore((state) => state.currentTenant);
  const isImpersonating = useTenantStore((state) => state.isImpersonating);
  const stopImpersonation = useTenantStore((state) => state.stopImpersonation);
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (tenant?.slug) {
      initializeCatalogs(tenant.slug);
      loadTenantData(tenant.slug);
    }
  }, [tenant]);

  const loadTenantData = async (tenantSlug: string) => {
    setIsLoadingData(true);
    try {
      const [productsRes, categoriesRes, salesRes, recipesRes, purchasesRes] = await Promise.all([
        supabase.from('products').select('*').eq('tenant_id', tenantSlug),
        supabase.from('categories').select('*').eq('tenant_id', tenantSlug),
        supabase.from('sales').select('*').eq('tenant_id', tenantSlug),
        supabase.from('recipes').select('*').eq('tenant_id', tenantSlug),
        supabase.from('purchases').select('*').eq('tenant_id', tenantSlug),
      ]);

      if (categoriesRes.data) {
        await db.categories.bulkPut(categoriesRes.data.map(c => ({
          ...c,
          localId: c.id,
          tenantId: tenantSlug,
          createdAt: new Date(c.created_at),
        })));
      }

      if (productsRes.data) {
        await db.products.bulkPut(productsRes.data.map(p => ({
          ...p,
          localId: p.id,
          tenantId: tenantSlug,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at),
        })));
      }

      if (salesRes.data) {
        await db.sales.bulkPut(salesRes.data.map(s => ({
          ...s,
          localId: s.id,
          tenantId: tenantSlug,
          createdAt: new Date(s.created_at),
        })));
      }

      if (recipesRes.data) {
        await db.recipes.bulkPut(recipesRes.data.map(r => ({
          ...r,
          localId: r.id,
          tenantId: tenantSlug,
          createdAt: new Date(r.created_at),
        })));
      }

      if (purchasesRes.data) {
        await db.purchases.bulkPut(purchasesRes.data.map(p => ({
          ...p,
          localId: p.id,
          tenantId: tenantSlug,
          createdAt: new Date(p.created_at),
        })));
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

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
    if (role === 'super_admin' && !isImpersonating) {
      return <AdminPanel />;
    }

    if (role === 'super_admin' && isImpersonating && tenant) {
      return (
        <div className="space-y-4">
          {isLoadingData && (
            <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-400">Cargando datos de {tenant.name}...</span>
            </div>
          )}
          <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div>
              <span className="text-blue-400 font-medium">Gestionando:</span>
              <span className="text-white ml-2 font-semibold">{tenant.name}</span>
            </div>
            <button
              onClick={stopImpersonation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Volver al Panel Admin
            </button>
          </div>
          {renderModulesContent()}
        </div>
      );
    }

    return (
      <>
        {isLoadingData && (
          <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <span className="text-blue-400">Cargando datos de {tenant?.name}...</span>
          </div>
        )}
        {renderModulesContent()}
      </>
    );
  };

  const renderModulesContent = () => {
    switch (activeModule) {
      case 'dashboard':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Dashboard />
          </Suspense>
        );
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

            {role !== 'super_admin' || isImpersonating ? (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-slate-800 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            ) : null}
          </div>

          {(role !== 'super_admin' || isImpersonating) && (
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
        {renderModule()}
      </main>
      <SyncStatus />
    </div>
  );
}

export default App;
