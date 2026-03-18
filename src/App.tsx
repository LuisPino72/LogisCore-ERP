import { useEffect, useState, lazy, Suspense, useCallback, useRef } from "react";
import { useTenantStore, TenantThemeConfig } from "@/store/useTenantStore";
import { useThemeStore, applyCssVariables } from "@/store/useThemeStore";
import { Login } from "@/features/auth";
import AdminPanel from "@/features/adminpanel/components/AdminPanel";
import UpdatePassword from "@/features/auth/components/UpdatePassword";
import SyncStatus from "@/features/auth/components/SyncStatus";
import { ToastProvider } from "@/providers/ToastProvider";
import { initializeCatalogs } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { db } from "@/lib/db";
import { SyncEngine } from "@/lib/sync/SyncEngine";
import { isOk } from "@/lib/types/result";
import { logger, logCategories } from "@/lib/logger";
import { verifySession } from "@/features/auth/services/auth.service";
import { Sidebar } from "@/common/Sidebar";
import {
  Loader2,
  Menu,
  X,
} from "lucide-react";
import Emblema from "@/assets/Emblema.ico";

const Inventory = lazy(
  () => import("@/features/inventory/components/Inventory"),
);
const POS = lazy(() =>
  import("@/features/pos").then((m) => ({ default: m.POS })),
);
const Recipes = lazy(() =>
  import("@/features/recipes").then((m) => ({ default: m.Recipes })),
);
const Reports = lazy(() =>
  import("@/features/reports").then((m) => ({ default: m.Reports })),
);
const Purchases = lazy(() =>
  import("@/features/purchases").then((m) => ({ default: m.Purchases })),
);
const Sales = lazy(() =>
  import("@/features/sales").then((m) => ({ default: m.Sales })),
);
const Dashboard = lazy(
  () => import("@/features/dashboard/components/Dashboard"),
);
const Employees = lazy(
  () => import("@/features/employees/components/Employees"),
);

type Module =
  | "dashboard"
  | "sales"
  | "inventory"
  | "pos"
  | "recipes"
  | "reports"
  | "purchases"
  | "employees";

function App() {
  const role = useTenantStore((state) => state.role);
  const tenant = useTenantStore((state) => state.currentTenant);
  const permissions = useTenantStore((state) => state.permissions);
  const isImpersonating = useTenantStore((state) => state.isImpersonating);
  const isAdminPanel = role === "super_admin" && !isImpersonating;
  const stopImpersonation = useTenantStore((state) => state.stopImpersonation);
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const isTenantMode = useThemeStore((state) => state.isTenantMode);
  const applyTenantTheme = useThemeStore((state) => state.applyTenantTheme);
  const [activeModule, setActiveModule] = useState<Module>(() => {
    const saved = localStorage.getItem('lastActiveModule');
    return (saved as Module) || 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; updatedAt: Date; source: string } | null>(null);
  const [isUpdatingRate, setIsUpdatingRate] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const isUpdatePasswordPage = window.location.pathname === "/update-password";

  useEffect(() => {
    applyCssVariables();
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      setIsVerifyingSession(true);
      const result = await verifySession();
      if (!isOk(result) || !result.value) {
        useTenantStore.getState().clear();
      }
      setIsVerifyingSession(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    localStorage.setItem('lastActiveModule', activeModule);
  }, [activeModule]);

  const previousRole = useRef(role);
  useEffect(() => {
    if (!previousRole.current && role) {
      setActiveModule('dashboard');
    }
    previousRole.current = role;
  }, [role]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    useTenantStore.getState().clear();
  }, []);

  useEffect(() => {
    // Aplicar tema del tenant si hay uno configurado
    if (tenant?.config && typeof tenant.config === 'object' && 'themeConfig' in tenant.config) {
      applyTenantTheme(tenant.config.themeConfig as TenantThemeConfig);
    } 
  }, [isImpersonating, tenant, role, applyTenantTheme, isTenantMode]);

  useEffect(() => {
    // Solo aplicar clase .dark si NO es el panel administrativo y NO es el login
    const isSystemView = isAdminPanel || !role;
    
    // Si estamos en vista de sistema y el tema está en dark, forzar light
    if (isSystemView && theme === 'dark') {
      setTheme('light');
    }
    
    document.documentElement.classList.toggle("dark", theme === "dark" && !isSystemView);
  }, [theme, isAdminPanel, role, setTheme]);

  const loadTenantData = useCallback(
    async (tenantSlug: string, _tenantUuid?: string) => {
      const tenantFilter = tenantSlug;
      
      const [localProducts, localSales, localCategories] = await Promise.all([
        db.products.where('tenantId').equals(tenantFilter).count(),
        db.sales.where('tenantId').equals(tenantFilter).count(),
        db.categories.where('tenantId').equals(tenantFilter).count(),
      ]);

      if (localProducts > 0 || localSales > 0 || localCategories > 0) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);
      try {
        const [productsRes, categoriesRes, salesRes, recipesRes, purchasesRes] = await Promise.all([
          supabase.from("products").select("*").eq('tenant_slug', tenantSlug),
          supabase.from("categories").select("*").eq('tenant_slug', tenantSlug),
          supabase.from("sales").select("*").eq('tenant_slug', tenantSlug),
          supabase.from("recipes").select("*").eq('tenant_slug', tenantSlug),
          supabase.from("purchases").select("*").eq('tenant_slug', tenantSlug),
        ]);

        const productsData = productsRes.data || [];
        const categoriesData = categoriesRes.data || [];
        const salesData = salesRes.data || [];
        const recipesData = recipesRes.data || [];
        const purchasesData = purchasesRes.data || [];

        const sanitizeCategory = (c: Record<string, unknown>) => ({
          localId: String(c.local_id ?? c.id ?? ""),
          tenantId: tenantSlug,
          name: String(c.name ?? ""),
          description: c.description ? String(c.description) : undefined,
          createdAt: c.created_at
            ? new Date(c.created_at as string)
            : new Date(),
          syncedAt: c.created_at ? new Date(c.created_at as string) : undefined,
        });

        const sanitizeProduct = (p: Record<string, unknown>) => ({
          localId: String(p.local_id ?? p.id ?? ""),
          tenantId: tenantSlug,
          name: String(p.name ?? ""),
          sku: String(p.sku ?? ""),
          price: Number(p.price) || 0,
          cost: Number(p.cost) || 0,
          stock: Number(p.stock) || 0,
          categoryId: p.category_id ? Number(p.category_id) : undefined,
          imageUrl: p.image_url ? String(p.image_url) : undefined,
          isFavorite: Boolean(p.is_favorite ?? false),
          isActive: Boolean(p.is_active ?? true),
          createdAt: p.created_at
            ? new Date(p.created_at as string)
            : new Date(),
          updatedAt: p.updated_at
            ? new Date(p.updated_at as string)
            : new Date(),
          syncedAt: p.created_at ? new Date(p.created_at as string) : undefined,
        });

        const sanitizeSale = (s: Record<string, unknown>) => ({
          localId: String(s.local_id ?? s.id ?? ""),
          tenantId: tenantSlug,
          items: Array.isArray(s.items) ? s.items : [],
          subtotal: Number(s.subtotal) || 0,
          tax: Number(s.tax) || 0,
          total: Number(s.total) || 0,
          paymentMethod:
            s.payment_method === "cash" || s.payment_method === "card"
              ? s.payment_method
              : "cash",
          status:
            s.status === "completed" ||
            s.status === "cancelled" ||
            s.status === "refunded"
              ? s.status
              : "completed",
          createdAt: s.created_at
            ? new Date(s.created_at as string)
            : new Date(),
          syncedAt: s.created_at ? new Date(s.created_at as string) : undefined,
        });

        const sanitizeRecipe = (r: Record<string, unknown>) => ({
          localId: String(r.local_id ?? r.id ?? ""),
          tenantId: tenantSlug,
          name: String(r.name ?? ""),
          description: r.description ? String(r.description) : undefined,
          productId: String(r.product_id ?? ""),
          ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
          yield: Number(r.yield) || 1,
          isActive: Boolean(r.is_active ?? true),
          createdAt: r.created_at
            ? new Date(r.created_at as string)
            : new Date(),
          syncedAt: r.created_at ? new Date(r.created_at as string) : undefined,
        });

        const sanitizePurchase = (p: Record<string, unknown>) => ({
          localId: String(p.local_id ?? p.id ?? ""),
          tenantId: tenantSlug,
          supplier: String(p.supplier ?? ""),
          invoiceNumber: String(p.invoice_number ?? ""),
          items: Array.isArray(p.items) ? p.items : [],
          subtotal: Number(p.subtotal) || 0,
          tax: Number(p.tax) || 0,
          total: Number(p.total) || 0,
          status:
            p.status === "pending" ||
            p.status === "completed" ||
            p.status === "cancelled"
              ? p.status
              : "pending",
          createdAt: p.created_at
            ? new Date(p.created_at as string)
            : new Date(),
          syncedAt: p.created_at ? new Date(p.created_at as string) : undefined,
        });

        if (categoriesData) {
          await db.categories.bulkPut(categoriesData.map(sanitizeCategory));
        }

        if (productsData) {
          await db.products.bulkPut(productsData.map(sanitizeProduct));
        }

        if (salesData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.sales.bulkPut(salesData.map(sanitizeSale) as any);
        }

        if (recipesData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.recipes.bulkPut(recipesData.map(sanitizeRecipe) as any);
        }

        if (purchasesData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await db.purchases.bulkPut(purchasesData.map(sanitizePurchase) as any);
        }
      } catch (error) {
        logger.error("Error loading tenant data", error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
      } finally {
        setIsLoadingData(false);
      }
    },
    [] // db and supabase are stable references, intentionally excluded
  );

  useEffect(() => {
    if (tenant?.slug) {
      initializeCatalogs(tenant.slug);
      loadTenantData(tenant.slug, tenant.id);
      SyncEngine.start();
      
      (async () => {
        const { getExchangeRate, autoUpdateIfNeeded } = await import('@/features/exchange-rate/services/exchangeRate.service');
        await autoUpdateIfNeeded();
        const result = await getExchangeRate();
        if (isOk(result) && result.value) {
          setExchangeRate({ rate: result.value.rate, updatedAt: result.value.updatedAt, source: result.value.source });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant]); // initializeCatalogs and loadTenantData are stable

  if (isUpdatePasswordPage) {
    return <UpdatePassword />;
  }

  if (isVerifyingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-(--bg-primary)">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-(--brand-500) animate-spin" />
          <span className="text-(--text-secondary)">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  if (!role) {
    return <Login />;
  }

  const moduleLabels: Record<string, string> = {
    dashboard: "Dashboard",
    inventory: "Inventario",
    sales: "Ventas",
    purchases: "Compras",
    pos: "Punto de Venta",
    recipes: "Recetas",
    employees: "Empleados",
    reports: "Reportes",
  };

  const handleSetActiveModule = (module: string) => {
    setActiveModule(module as Module);
  };

  const renderModule = () => {
    if (role === "super_admin" && !isImpersonating) {
      return <AdminPanel />;
    }

    if (role === "super_admin" && isImpersonating && tenant) {
      return (
        <div className="space-y-4">
          {isLoadingData && (
            <div className="flex items-center gap-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <span className="text-blue-400">
                Cargando datos de {tenant.name}...
              </span>
            </div>
          )}
          <div className="flex items-center justify-between bg-(--brand-500)/10 border border-(--brand-500)/30 rounded-lg p-4">
            <div>
              <span className="text-(--brand-400) font-medium">
                Gestionando:
              </span>
              <span className="text-(--text-primary) ml-2 font-semibold">
                {tenant.name}
              </span>
            </div>
            <button
              onClick={stopImpersonation}
              className="px-4 py-2 bg-(--brand-600) hover:bg-(--brand-700) text-white rounded-lg text-sm font-medium transition-colors">
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
          <div className="flex items-center gap-3 bg-(--brand-500)/10 border border-(--brand-500)/30 rounded-lg p-4 mb-4">
            <Loader2 className="w-5 h-5 text-(--brand-400) animate-spin" />
            <span className="text-(--brand-400)">
              Cargando datos de {tenant?.name}...
            </span>
          </div>
        )}
        {renderModulesContent()}
      </>
    );
  };

  const renderModulesContent = () => {
    switch (activeModule) {
      case "dashboard":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Dashboard isLoadingData={isLoadingData} onNavigate={setActiveModule} />
          </Suspense>
        );
      case "sales":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Sales />
          </Suspense>
        );
      case "inventory":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Inventory />
          </Suspense>
        );
      case "pos":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <POS />
          </Suspense>
        );
      case "recipes":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Recipes />
          </Suspense>
        );
      case "reports":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Reports />
          </Suspense>
        );
      case "purchases":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Purchases />
          </Suspense>
        );
      case "employees":
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Employees />
          </Suspense>
        );
      default:
        return (
          <Suspense
            fallback={
              <div className="p-8 text-center text-slate-400">Cargando...</div>
            }>
            <Dashboard onNavigate={setActiveModule} />
          </Suspense>
        );
    }
  };



  return (
    <div className={`min-h-screen ${isAdminPanel || !role ? 'system-fixed-theme' : 'bg-(--bg-primary) text-(--text-primary)'}`}>
      {!isAdminPanel && role && (
        <Sidebar
          activeModule={activeModule}
          setActiveModule={handleSetActiveModule}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          role={role}
          tenant={tenant as { name: string; slug: string; modules?: Record<string, boolean | undefined>; config?: Record<string, unknown> } | null}
          permissions={permissions as Record<string, boolean | undefined>}
          exchangeRate={exchangeRate}
          isUpdatingRate={isUpdatingRate}
          setIsUpdatingRate={setIsUpdatingRate}
          handleSignOut={handleSignOut}
        />
      )}

      <div
        className={`transition-all duration-300 ${isAdminPanel ? "" : sidebarCollapsed ? "lg:ml-16" : "lg:ml-60"}`}>
        {!isAdminPanel && (
          <header className="border-b border-(--border-color) bg-(--bg-secondary)/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
                <div>
                  <h1 className="text-xl font-bold text-(--text-primary)">
                    {moduleLabels[activeModule] || "LogisCore"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">

                <span className="px-3 py-1 bg-(--brand-500)/10 rounded-full text-xs font-medium uppercase tracking-wider text-(--brand-400) border border-(--brand-500)/30">
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
          <header className="border-b border-(--border-color) bg-(--bg-secondary)/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={Emblema}
                  alt="LogisCore"
                  className="w-8 h-8 rounded-lg"
                />
                <div>
                  <h1 className="text-xl font-bold text-(--text-primary)">
                    Administración
                  </h1>
                  <p className="text-xs text-(--text-muted)">
                    Gestión de tenants y sistema
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">

                <span className="px-3 py-1 bg-(--brand-500)/10 rounded-full text-xs font-medium uppercase tracking-wider text-(--brand-400) border border-(--brand-500)/30">
                  {role}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs text-(--text-muted) hover:text-(--text-primary) transition-colors">
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </header>
        )}

        <main className="p-6">{renderModule()}</main>
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
