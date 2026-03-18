import { useRef, useLayoutEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  DollarSign,
  RefreshCw,
  Store,
} from "lucide-react";
import {
  Package,
  ShoppingCart,
  LayoutDashboard,
  ShoppingBag,
  ShoppingBasket,
  ChefHat,
  BarChart3,
  Users,
} from "lucide-react";
import Emblema from "@/assets/Emblema.ico";

interface SidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  role: string | null;
  tenant: { name: string; slug: string; modules?: Record<string, boolean | undefined>; config?: Record<string, unknown> } | null;
  permissions: Record<string, boolean | undefined>;
  exchangeRate: { rate: number; updatedAt: Date; source: string } | null;
  setExchangeRate: (rate: { rate: number; updatedAt: Date; source: string } | null) => void;
  isUpdatingRate: boolean;
  setIsUpdatingRate: (updating: boolean) => void;
  handleSignOut: () => void;
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

export function Sidebar({
  activeModule,
  setActiveModule,
  sidebarCollapsed,
  setSidebarCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
  role,
  tenant,
  permissions,
  exchangeRate,
  setExchangeRate,
  isUpdatingRate,
  setIsUpdatingRate,
  handleSignOut,
}: SidebarProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef(0);

  const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    sidebarScrollRef.current = e.currentTarget.scrollTop;
  };

  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = sidebarScrollRef.current;
    }
  });

  const filteredModules = allModules.filter((mod) => {
    if (mod.id === "dashboard" || mod.id === "reports") return true;
    
    if (role === "employee") {
      const permissionKey = `can_access_${mod.id}` as keyof typeof permissions;
      if (mod.id === "pos") {
        return permissions.can_access_pos === true;
      }
      const viewPermissionKey = `can_view_${mod.id}` as keyof typeof permissions;
      return permissions[viewPermissionKey] === true || permissions[permissionKey] === true;
    }
    
    const modules = tenant?.modules as Record<string, boolean> | undefined;
    return modules?.[mod.id] === true;
  });

  const handleUpdateRate = async () => {
    setIsUpdatingRate(true);
    const { updateExchangeRate, getExchangeRate } = await import('@/features/exchange-rate/services/exchangeRate.service');
    await updateExchangeRate();
    const result = await getExchangeRate();
    if (result.ok && result.value) {
      setExchangeRate({ rate: result.value.rate, updatedAt: result.value.updatedAt, source: result.value.source });
    }
    setIsUpdatingRate(false);
  };

  return (
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

      <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {filteredModules.map((mod) => (
            <li key={mod.id}>
              <button
                onClick={() => {
                  setActiveModule(mod.id);
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
                <p className="text-lg font-bold ">
                  Bs. {exchangeRate.rate.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  por $1 • {exchangeRate.source === 'api' ? '🟢 Automático' : '🟡 Manual'}
                </p>
                <button
                  onClick={handleUpdateRate}
                  disabled={isUpdatingRate}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-(--brand-500)/20 hover:bg-(--brand-500)/30 text-(--brand-400) text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isUpdatingRate ? 'animate-spin' : ''}`} />
                  {isUpdatingRate ? 'Actualizando...' : 'Actualizar'}
                </button>
              </>
            ) : (
              <button
                onClick={handleUpdateRate}
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
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) rounded-lg transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center p-2 bg-(--bg-tertiary) hover:bg-(--bg-elevated) text-(--text-secondary) hover:text-(--text-primary) rounded-lg transition-colors"
            title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
}
