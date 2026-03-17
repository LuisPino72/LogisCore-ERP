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
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  ShoppingBag,
  ShoppingBasket,
  ChefHat,
  BarChart3,
  Loader2,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Store,
  DollarSign,
  RefreshCw,
  Users,
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

  const isUpdatePasswordPage = window.location.pathname === "/update-password";

  useEffect(() => {
    applyCssVariables();
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
          await db.sales.bulkPut(salesData.map(sanitizeSale) as any);
        }

        if (recipesData) {
          await db.recipes.bulkPut(recipesData.map(sanitizeRecipe) as any);
        }

        if (purchasesData) {
          await db.purchases.bulkPut(
            purchasesData.map(sanitizePurchase) as any,
          );
        }
      } catch (error) {
        logger.error("Error loading tenant data", error instanceof Error ? error : undefined, { category: logCategories.DATABASE });
      } finally {
        setIsLoadingData(false);
      }
    },
    [db, supabase]
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
  }, [tenant, initializeCatalogs, loadTenantData]);

  if (isUpdatePasswordPage) {
    return <UpdatePassword />;
  }

  if (!role) {
    return <Login />;
  }

  const allModules = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "inventory", label: "Inventario", icon: Package },
    { id: "sales", label: "Ventas", icon: ShoppingBag },
    { id: "purchases", label: "Compras", icon: ShoppingBasket },
    { id: "pos", label: "Punto de Venta", icon: ShoppingCart },
    { id: "recipes", label: "Recetas", icon: ChefHat },
    { id: "employees", label: "Empleados", icon: Users },
    { id: "reports", label: "Reportes", icon: BarChart3 },
  ] as const;

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
            <Dashboard isLoadingData={isLoadingData} />
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
            <Dashboard />
          </Suspense>
        );
    }
  };



  const Sidebar = () => (
    <aside
      className={`fixed left-0 top-0 h-screen bg-(--bg-secondary) border-r border-(--border-color) flex flex-col transition-all duration-300 z-50 ${
        sidebarCollapsed ? "w-16" : "w-60"
      } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="p-4 flex items-center justify-between border-b border-(--border-color)">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-3">
            <img src={Emblema} alt="LogisCore" className="w-8 h-8 rounded-lg" />
            <span className="font-bold text-(--text-primary)">
              LogisCore
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <img
            src={Emblema}
            alt="LogisCore"
            className="w-8 h-8 rounded-lg mx-auto"
          />
        )}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={`hidden lg:flex items-center justify-center w-6 h-6 rounded-md bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-muted) hover:text-(--text-primary) transition-colors ${sidebarCollapsed ? "absolute -right-3 top-4" : ""}`}>
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {allModules
            .filter((mod) => {
              // Dashboard y Reportes siempre visibles (por defecto)
              if (mod.id === "dashboard" || mod.id === "reports") return true;
              
              // Si es employee, verificar permisos
              if (role === "employee") {
                const permissionKey = `can_access_${mod.id}` as keyof typeof permissions;
                if (mod.id === "pos") {
                  return permissions.can_access_pos === true;
                }
                const viewPermissionKey = `can_view_${mod.id}` as keyof typeof permissions;
                return permissions[viewPermissionKey] === true || permissions[permissionKey] === true;
              }
              
              // Para owners y super_admins, verificar si están activos en el tenant
              const modules = tenant?.modules as
                | Record<string, boolean>
                | undefined;
              return modules?.[mod.id] === true;
            })
            .map((mod) => (
              <li key={mod.id}>
                <button
                  onClick={() => {
                    setActiveModule(mod.id as Module);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    activeModule === mod.id
                      ? "bg-(--brand-600) text-white shadow-lg shadow-(--brand-600)/20"
                      : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-tertiary)"
                  }`}
                  title={sidebarCollapsed ? mod.label : undefined}>
                  <mod.icon className="w-5 h-5 shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="font-medium">{mod.label}</span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      </nav>

      {!sidebarCollapsed && (
        <div className="p-4 border-t border-(--border-color)">
          <div className="bg-(--bg-tertiary)/50 rounded-xl p-3 border border-(--border-color)">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs font-medium text-slate-400 uppercase">Tasa BCV</span>
            </div>
            {exchangeRate ? (
              <>
                <p className="text-lg font-bold text-green-400">
                  Bs. {exchangeRate.rate.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  por $1 • {exchangeRate.source === 'api' ? '🟢 Automático' : '🟡 Manual'}
                </p>
                <button
                  onClick={async () => {
                    setIsUpdatingRate(true);
                    const { updateExchangeRate, getExchangeRate } = await import('@/features/exchange-rate/services/exchangeRate.service');
                    await updateExchangeRate();
                    const result = await getExchangeRate();
                    if (isOk(result) && result.value) {
                      setExchangeRate({ rate: result.value.rate, updatedAt: result.value.updatedAt, source: result.value.source });
                    }
                    setIsUpdatingRate(false);
                  }}
                  disabled={isUpdatingRate}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-(--brand-500)/20 hover:bg-(--brand-500)/30 text-(--brand-400) text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                  {isUpdatingRate ? 'Actualizando...' : 'Actualizar'}
                </button>
              </>
            ) : (
              <button
                onClick={async () => {
                  setIsUpdatingRate(true);
                  const { updateExchangeRate, getExchangeRate } = await import('@/features/exchange-rate/services/exchangeRate.service');
                  await updateExchangeRate();
                  const result = await getExchangeRate();
                  if (isOk(result) && result.value) {
                    setExchangeRate({ rate: result.value.rate, updatedAt: result.value.updatedAt, source: result.value.source });
                  }
                  setIsUpdatingRate(false);
                }}
                disabled={isUpdatingRate}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-(--brand-500)/20 hover:bg-(--brand-500)/30 text-(--brand-400) text-xs rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                {isUpdatingRate ? 'Cargando...' : 'Configurar Tasa'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="p-4 border-t border-(--border-color)">
        {!sidebarCollapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-(--bg-tertiary) rounded-lg flex items-center justify-center overflow-hidden">
                {tenant?.config &&
                typeof tenant.config === "object" &&
                "logoUrl" in tenant.config &&
                tenant.config.logoUrl ? (
                  <img
                    src={String(tenant.config.logoUrl)}
                    alt={tenant.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Store className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-(--text-primary) truncate">
                  {tenant?.name}
                </p>
                <p className="text-xs text-(--text-muted) capitalize">{role}</p>
              </div>
            </div>
            <button
              onClick={() => useTenantStore.getState().clear()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) rounded-lg transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <button
            onClick={() => useTenantStore.getState().clear()}
            className="w-full flex items-center justify-center p-2 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) rounded-lg transition-colors"
            title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen ${isAdminPanel || !role ? 'system-fixed-theme' : 'bg-(--bg-primary) text-(--text-primary)'}`}>
      {!isAdminPanel && role && <Sidebar />}

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
                    {allModules.find((m) => m.id === activeModule)?.label ||
                      "LogisCore"}
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
                  onClick={() => useTenantStore.getState().clear()}
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
