import { useEffect, useState, lazy, Suspense, useCallback } from 'react';
import { useTenantStore } from './store/useTenantStore';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import SyncStatus from './components/SyncStatus';
import { ToastProvider } from './components/ui/Toast';
import { initializeCatalogs } from './services/db';
import { supabase } from './services/supabase';
import { db } from './services/db';
import { 
  Package, ShoppingCart, ShoppingBasket, Menu, X, LayoutDashboard, 
  ChefHat, BarChart3, Loader2, ChevronLeft, ChevronRight, LogOut,
  Store, ShoppingBag
} from 'lucide-react';
import Emblema from './assets/Emblema.ico';

const Inventory = lazy(() => import('./components/inventory/Inventory'));
const POS = lazy(() => import('./components/pos/POS'));
const Recipes = lazy(() => import('./components/recipes/Recipes'));
const Reports = lazy(() => import('./components/reports/Reports'));
const Purchases = lazy(() => import('./components/purchases/Purchases'));
const Sales = lazy(() => import('./components/sales/Sales'));
const Dashboard = lazy(() => import('./components/Dashboard'));

type Module = 'dashboard' | 'sales' | 'inventory' | 'pos' | 'recipes' | 'reports' | 'purchases';

function App() {
  const role = useTenantStore((state) => state.role);
  const tenant = useTenantStore((state) => state.currentTenant);
  const isImpersonating = useTenantStore((state) => state.isImpersonating);
  const stopImpersonation = useTenantStore((state) => state.stopImpersonation);
  const [activeModule, setActiveModule] = useState<Module>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const loadTenantData = useCallback(async (tenantSlug: string) => {
    setIsLoadingData(true);
    try {
      const [productsRes, categoriesRes, salesRes, recipesRes, purchasesRes] = await Promise.all([
        supabase.from('products').select('*').eq('tenant_id', tenantSlug),
        supabase.from('categories').select('*').eq('tenant_id', tenantSlug),
        supabase.from('sales').select('*').eq('tenant_id', tenantSlug),
        supabase.from('recipes').select('*').eq('tenant_id', tenantSlug),
        supabase.from('purchases').select('*').eq('tenant_id', tenantSlug),
      ]);

      const sanitizeCategory = (c: Record<string, unknown>) => ({
        localId: String(c.id ?? ''),
        tenantId: tenantSlug,
        name: String(c.name ?? ''),
        description: c.description ? String(c.description) : undefined,
        createdAt: c.created_at ? new Date(c.created_at as string) : new Date(),
        syncedAt: c.created_at ? new Date(c.created_at as string) : undefined,
      });

      const sanitizeProduct = (p: Record<string, unknown>) => ({
        localId: String(p.id ?? ''),
        tenantId: tenantSlug,
        name: String(p.name ?? ''),
        sku: String(p.sku ?? ''),
        price: Number(p.price) || 0,
        cost: Number(p.cost) || 0,
        stock: Number(p.stock) || 0,
        categoryId: p.category_id ? Number(p.category_id) : undefined,
        isActive: Boolean(p.is_active ?? true),
        createdAt: p.created_at ? new Date(p.created_at as string) : new Date(),
        updatedAt: p.updated_at ? new Date(p.updated_at as string) : new Date(),
        syncedAt: p.created_at ? new Date(p.created_at as string) : undefined,
      });

      const sanitizeSale = (s: Record<string, unknown>) => ({
        localId: String(s.id ?? ''),
        tenantId: tenantSlug,
        items: Array.isArray(s.items) ? s.items : [],
        subtotal: Number(s.subtotal) || 0,
        tax: Number(s.tax) || 0,
        total: Number(s.total) || 0,
        paymentMethod: (s.payment_method === 'cash' || s.payment_method === 'card') ? s.payment_method : 'cash',
        status: (s.status === 'completed' || s.status === 'cancelled' || s.status === 'refunded') ? s.status : 'completed',
        createdAt: s.created_at ? new Date(s.created_at as string) : new Date(),
        syncedAt: s.created_at ? new Date(s.created_at as string) : undefined,
      });

      const sanitizeRecipe = (r: Record<string, unknown>) => ({
        localId: String(r.id ?? ''),
        tenantId: tenantSlug,
        name: String(r.name ?? ''),
        description: r.description ? String(r.description) : undefined,
        productId: String(r.product_id ?? ''),
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        yield: Number(r.yield) || 1,
        isActive: Boolean(r.is_active ?? true),
        createdAt: r.created_at ? new Date(r.created_at as string) : new Date(),
        syncedAt: r.created_at ? new Date(r.created_at as string) : undefined,
      });

      const sanitizePurchase = (p: Record<string, unknown>) => ({
        localId: String(p.id ?? ''),
        tenantId: tenantSlug,
        supplier: String(p.supplier ?? ''),
        invoiceNumber: String(p.invoice_number ?? ''),
        items: Array.isArray(p.items) ? p.items : [],
        subtotal: Number(p.subtotal) || 0,
        tax: Number(p.tax) || 0,
        total: Number(p.total) || 0,
        status: (p.status === 'pending' || p.status === 'completed' || p.status === 'cancelled') ? p.status : 'pending',
        createdAt: p.created_at ? new Date(p.created_at as string) : new Date(),
        syncedAt: p.created_at ? new Date(p.created_at as string) : undefined,
      });

      if (categoriesRes.data) {
        await db.categories.bulkPut(categoriesRes.data.map(sanitizeCategory));
      }

      if (productsRes.data) {
        await db.products.bulkPut(productsRes.data.map(sanitizeProduct));
      }

      if (salesRes.data) {
        await db.sales.bulkPut(salesRes.data.map(sanitizeSale) as any);
      }

      if (recipesRes.data) {
        await db.recipes.bulkPut(recipesRes.data.map(sanitizeRecipe) as any);
      }

      if (purchasesRes.data) {
        await db.purchases.bulkPut(purchasesRes.data.map(sanitizePurchase) as any);
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setIsLoadingData(false);
    }
  }, [db, supabase]);

  useEffect(() => {
    if (tenant?.slug) {
      initializeCatalogs(tenant.slug);
      loadTenantData(tenant.slug);
    }
  }, [tenant, initializeCatalogs, loadTenantData]);

  if (!role) {
    return <Login />;
  }

  const allModules = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales', label: 'Ventas', icon: ShoppingBag },
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
      case 'sales':
        return (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Sales />
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
          <Suspense fallback={<div className="p-8 text-center text-slate-400">Cargando...</div>}>
            <Dashboard />
          </Suspense>
        );
    }
  };

  const isAdminPanel = role === 'super_admin' && !isImpersonating;

  const Sidebar = () => (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 z-50 ${
        sidebarCollapsed ? 'w-16' : 'w-60'
      } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
    >
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <img src={Emblema} alt="LogisCore" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-white">LogisCore</span>
          </div>
        )}
        {sidebarCollapsed && (
          <img src={Emblema} alt="LogisCore" className="w-8 h-8 rounded-lg mx-auto" />
        )}
        <button 
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ${sidebarCollapsed ? 'absolute -right-3 top-4' : ''}`}
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {allModules.filter(mod => {
            if (mod.id === 'dashboard' || mod.id === 'reports') return true;
            const moduleMap: Record<string, string> = {
              inventory: 'inventory',
              sales: 'sales',
              purchases: 'purchases',
              recipes: 'recipes',
            };
            const tenantModule = moduleMap[mod.id];
            const modules = tenant?.modules as Record<string, boolean> | undefined;
            return tenantModule && modules?.[tenantModule];
          }).map((mod) => (
            <li key={mod.id}>
              <button
                onClick={() => {
                  setActiveModule(mod.id as Module);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  activeModule === mod.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={sidebarCollapsed ? mod.label : undefined}
              >
                <mod.icon className="w-5 h-5 shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{mod.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                {tenant?.config?.logoUrl ? (
                  <img src={tenant.config.logoUrl} alt={tenant.name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{tenant?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={() => useTenantStore.getState().clear()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <button
            onClick={() => useTenantStore.getState().clear()}
            className="w-full flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {!isAdminPanel && <Sidebar />}
      
      <div className={`transition-all duration-300 ${isAdminPanel ? '' : (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60')}`}>
        {!isAdminPanel && (
          <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {allModules.find(m => m.id === activeModule)?.label || 'LogisCore'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium uppercase tracking-wider text-blue-400 border border-blue-500/30">
                  {role}
                </span>
                {isImpersonating && (
                  <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded border border-amber-500/30">
                    Impersonando
                  </span>
                )}
              </div>
            </div>
          </header>
        )}

        {isAdminPanel && (
          <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={Emblema} alt="LogisCore" className="w-8 h-8 rounded-lg" />
                <div>
                  <h1 className="text-xl font-bold text-white">Administración</h1>
                  <p className="text-xs text-slate-400">Gestión de tenants y sistema</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-medium uppercase tracking-wider text-purple-400 border border-purple-500/30">
                  {role}
                </span>
                <button
                  onClick={() => useTenantStore.getState().clear()}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="p-6">
          {renderModule()}
        </main>
        {!isAdminPanel && <SyncStatus />}
      </div>

      {mobileMenuOpen && !isAdminPanel && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

function AppWrapper() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export default AppWrapper;
