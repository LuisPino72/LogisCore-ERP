import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Product, Category, SuspendedSale } from "@/lib/db";
import { useTenantStore, checkModuleDependencies } from "@/store/useTenantStore";
import { createSale } from "@/features/sales/services/sales.service";
import { getExchangeRate, formatBs } from "@/features/exchange-rate/services/exchangeRate.service";
import { getDailyStats } from "@/features/sales/services/sales.service";
import { isOk } from "@/lib/types/result";
import { useToast } from "@/providers/ToastProvider";
import {
  loadPOSData,
  filterProducts,
  addToCart as addToCartUtil,
  updateCartQuantity,
  removeFromCart as removeFromCartUtil,
  calculateCartTotals,
  prepareSaleItems,
  CartItem,
  saveSuspendedSale,
  getSuspendedSales,
  deleteSuspendedSale,
} from "../services/pos.service";
import { useInvoicingForPOS, CustomerSelector } from "@/features/invoicing";
import { logger, logCategories } from "@/lib/logger";
import { ConfirmationModal } from "@/common/ConfirmationModal";
import { ShoppingCart, AlertTriangle } from "lucide-react";
import type { SortField, PaymentMethod } from "../types/pos.types";

import DailyStatsCard from "./DailyStatsCard";
import ProductFilters from "./ProductFilters";
import ProductGrid from "./ProductGrid";
import CartSummary from "./CartSummary";
import SuspendedSalesModal from "./SuspendedSalesModal";
import SuspendInputModal from "./SuspendInputModal";
import InvoicePromptModal from "./InvoicePromptModal";

const InvoicePreview = lazy(() =>
  import("@/features/invoicing/components/InvoicePreview").then((m) => ({ default: m.InvoicePreview }))
);

const InvoicePreviewFallback = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="flex items-center gap-3 bg-(--bg-secondary) px-6 py-4 rounded-xl shadow-2xl">
      <div className="w-6 h-6 border-2 border-(--brand-500) border-t-transparent rounded-full animate-spin" />
      <span className="text-(--text-primary)">Cargando factura...</span>
    </div>
  </div>
);

export default function POS() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [showCheckout, setShowCheckout] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [sort, setSort] = useState<{ field: SortField; direction: "asc" | "desc" }>({
    field: "name",
    direction: "asc",
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showSuspendedListModal, setShowSuspendedListModal] = useState(false);
  const [suspendedSales, setSuspendedSales] = useState<SuspendedSale[]>([]);
  const [dailyStats, setDailyStats] = useState<{
    totalSales: number;
    totalAmount: number;
    transactionCount: number;
    averageTicket: number;
    paymentMethodBreakdown: { cash: number; card: number; pago_movil: number };
  } | null>(null);
  const [suspendNote, setSuspendNote] = useState("");
  const [showSuspendInputModal, setShowSuspendInputModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; localId: string | null }>({
    isOpen: false,
    localId: null,
  });

  const tenant = useTenantStore((state) => state.currentTenant);
  const { showError, showSuccess } = useToast();

  const {
    isEnabled: invoicingEnabled,
    showCustomerSelector,
    showInvoicePreview,
    invoice: currentInvoice,
    taxpayerInfo,
    prepareAndOpen,
    closeCustomerSelector,
    onCustomerSelected,
    closeInvoicePreview,
  } = useInvoicingForPOS();

  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [lastSaleCart, setLastSaleCart] = useState<CartItem[]>([]);

  const { missingDependencies } = checkModuleDependencies("pos", tenant);

  useEffect(() => {
    getExchangeRate().then((result) => {
      if (isOk(result) && result.value) setExchangeRate(result.value.rate);
    });
  }, []);

  useEffect(() => {
    if (!tenant?.slug) return;

    const { enabled } = checkModuleDependencies("pos", tenant);
    if (!enabled) return;

    loadPOSData(tenant.slug).then((data) => {
      setProducts(data.products);
      setCategories(data.categories);
    });
    loadDailyStats();
    loadSuspended();
  }, [tenant?.slug]);

  const loadDailyStats = async () => {
    try {
      const stats = await getDailyStats();
      setDailyStats(stats);
    } catch {
      /* ignore */
    }
  };

  const loadSuspended = useCallback(async () => {
    if (!tenant?.slug) return;
    try {
      const result = await getSuspendedSales(tenant.slug);
      if (result.ok) {
        setSuspendedSales(result.value);
      } else {
        logger.error("Error loading suspended sales", result.error, { category: logCategories.SYNC });
        showError("Error al cargar ventas suspendidas");
      }
    } catch (error) {
      logger.error("Error loading suspended sales", error as Error, { category: logCategories.SYNC });
      showError("Error al cargar ventas suspendidas");
    }
  }, [tenant?.slug, showError]);

  const filteredProducts = useMemo(
    () => filterProducts(products, search, selectedCategory, sort, showFavoritesOnly),
    [products, search, selectedCategory, sort, showFavoritesOnly]
  );
  const { total: cartTotal, count: cartCount } = useMemo(() => calculateCartTotals(cart), [cart]);

  const handleSort = useCallback(
    (field: SortField) => {
      setSort((prev) => ({
        field,
        direction: prev.field === field && prev.direction === "desc" ? "asc" : "desc",
      }));
    },
    []
  );

  const toggleFavorite = useCallback(async (_e: React.MouseEvent, product: Product) => {
    const { db } = await import("@/lib/db");
    const newFavorite = !product.isFavorite;
    await db.products.update(product.localId, { isFavorite: newFavorite });
    setProducts((prev) =>
      prev.map((p) => (p.localId === product.localId ? { ...p, isFavorite: newFavorite } : p))
    );
  }, []);

  const addToCart = useCallback(
    (product: Product) => {
      const existingInCart = cart.find((item) => item.product.localId === product.localId);
      if (existingInCart) {
        if (existingInCart.quantity >= product.stock) {
          showError("No hay suficiente stock disponible");
          return;
        }
      }
      if (product.stock <= 0) {
        showError("Producto sin stock");
        return;
      }
      setCart((prev) => addToCartUtil(prev, product));
    },
    [cart, showError]
  );

  const updateQuantity = useCallback(
    (localId: string, delta: number) => setCart((prev) => updateCartQuantity(prev, localId, delta)),
    []
  );
  const removeFromCart = useCallback(
    (localId: string) => setCart((prev) => removeFromCartUtil(prev, localId)),
    []
  );

  const getSaleType = useCallback(
    (categoryId?: number): "unit" | "weight" | "sample" => {
      if (!categoryId) return "unit";
      const category = categories.find((c) => c.id === categoryId);
      return (category?.saleType as "unit" | "weight" | "sample") || "unit";
    },
    [categories]
  );

  const updateWeight = useCallback((localId: string, grams: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.localId === localId ? { ...item, quantity: grams, unit: "g" as const } : item
      )
    );
  }, []);

  const selectSample = useCallback((localId: string, sampleId: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.localId !== localId) return item;
        const sample = item.product.samples?.find((s) => s.id === sampleId);
        return {
          ...item,
          quantity: sample?.quantity || 1,
          unit: "unit" as const,
          selectedSampleId: sampleId,
        };
      })
    );
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!tenant) return;
    try {
      const saleItems = prepareSaleItems(cart);
      const saleResult = await createSale({
        items: saleItems,
        subtotal: cartTotal,
        tax: 0,
        total: cartTotal,
        paymentMethod,
        exchangeRate: exchangeRate > 0 ? exchangeRate : undefined,
        exchangeRateSource: exchangeRate > 0 ? "api" : undefined,
      });
      if (!isOk(saleResult)) {
        showError(saleResult.error.message);
        return;
      }

      const saleId = saleResult.value;
      setCart([]);
      setShowCheckout(false);
      showSuccess("Venta registrada exitosamente!");
      loadDailyStats();
      const data = await loadPOSData(tenant.slug);
      setProducts(data.products);

      if (invoicingEnabled) {
        setLastSaleId(saleId);
        setLastSaleCart([...cart]);
      }
    } catch {
      showError("Error al registrar la venta");
    }
  }, [tenant, cart, cartTotal, paymentMethod, exchangeRate, showError, showSuccess, invoicingEnabled]);

  const handleGenerateInvoice = useCallback(() => {
    if (lastSaleId && lastSaleCart.length > 0) {
      prepareAndOpen(lastSaleCart, lastSaleId);
    }
  }, [lastSaleId, lastSaleCart, prepareAndOpen]);

  const handleInvoiceSuccess = useCallback(() => {
    setLastSaleId("");
    setLastSaleCart([]);
  }, []);

  const handleSuspend = useCallback(async () => {
    if (!tenant?.slug || cart.length === 0) return;
    const result = await saveSuspendedSale(tenant.slug, cart, suspendNote || undefined);
    if (!result.ok) {
      showError("Error al suspender venta");
      return;
    }
    setCart([]);
    setSuspendNote("");
    setShowSuspendInputModal(false);
    showSuccess("Venta suspendida");
    loadSuspended();
  }, [tenant, cart, suspendNote, showSuccess, loadSuspended]);

  const handleResumeSale = useCallback(
    async (sale: SuspendedSale) => {
      const cartItems: CartItem[] = sale.cart.map((item) => ({
        product: item.productSnapshot,
        quantity: item.quantity,
      }));
      setCart(cartItems);
      setShowSuspendedListModal(false);
      showSuccess("Venta restaurada");
    },
    [showSuccess]
  );

  const handleDeleteSuspended = useCallback((localId: string) => {
    setConfirmDelete({ isOpen: true, localId });
  }, []);

  const confirmDeleteSuspended = useCallback(async () => {
    if (!confirmDelete.localId) return;
    const result = await deleteSuspendedSale(confirmDelete.localId);
    if (!result.ok) {
      showError("Error al eliminar venta suspendida");
      return;
    }
    loadSuspended();
    showSuccess("Venta eliminada");
    setConfirmDelete({ isOpen: false, localId: null });
  }, [confirmDelete.localId, loadSuspended, showSuccess]);

  const getStockStatus = (stock: number) =>
    stock === 0 || stock <= 5 ? "text-red-400" : stock <= 10 ? "text-amber-400" : "text-slate-500";

  return (
    <div className="space-y-4">
      {missingDependencies.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Módulo requerído desactivado</p>
            <p className="text-amber-300/70 text-sm mt-1">
              Para usar el Punto de Venta, necesitas activar el módulo:{" "}
              <span className="font-semibold">{missingDependencies.join(", ")}</span>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <h2
            className="text-2xl font-bold text-(--text-primary) flex items-center gap-2"
            title="Punto de venta - Realizar cobros"
          >
            <ShoppingCart className="w-6 h-6" />
            Punto de Venta
          </h2>
        </div>
        <DailyStatsCard
          totalAmount={dailyStats?.totalAmount || 0}
          transactionCount={dailyStats?.transactionCount || 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <ProductFilters
            search={search}
            selectedCategory={selectedCategory}
            sort={sort}
            showFavoritesOnly={showFavoritesOnly}
            suspendedCount={suspendedSales.length}
            categories={categories}
            onSearchChange={setSearch}
            onCategoryChange={setSelectedCategory}
            onSort={handleSort}
            onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onOpenSuspended={() => {
              loadSuspended();
              setShowSuspendedListModal(true);
            }}
          />

          <ProductGrid
            products={filteredProducts}
            exchangeRate={exchangeRate}
            onProductClick={addToCart}
            onToggleFavorite={toggleFavorite}
            getStockStatus={getStockStatus}
          />
        </div>

        <div className="flex flex-col">
          <CartSummary
            cart={cart}
            cartTotal={cartTotal}
            cartCount={cartCount}
            exchangeRate={exchangeRate}
            showCheckout={showCheckout}
            paymentMethod={paymentMethod}
            onUpdateQuantity={updateQuantity}
            onUpdateWeight={updateWeight}
            onSelectSample={selectSample}
            onRemoveFromCart={removeFromCart}
            onClearCart={() => setCart([])}
            onSuspend={() => setShowSuspendInputModal(true)}
            onShowCheckout={() => setShowCheckout(true)}
            onCancelCheckout={() => setShowCheckout(false)}
            onConfirmCheckout={handleCheckout}
            onPaymentMethodChange={setPaymentMethod}
            getSaleType={getSaleType}
            formatBs={formatBs}
          />
        </div>
      </div>

      <SuspendedSalesModal
        isOpen={showSuspendedListModal}
        sales={suspendedSales}
        onClose={() => setShowSuspendedListModal(false)}
        onResume={handleResumeSale}
        onDelete={handleDeleteSuspended}
      />

      <SuspendInputModal
        isOpen={showSuspendInputModal}
        note={suspendNote}
        onClose={() => setShowSuspendInputModal(false)}
        onNoteChange={setSuspendNote}
        onSuspend={handleSuspend}
      />

      <InvoicePromptModal
        isOpen={invoicingEnabled && !!lastSaleId}
        onDecline={handleInvoiceSuccess}
        onGenerate={handleGenerateInvoice}
      />

      {showCustomerSelector && (
        <CustomerSelector
          isOpen={showCustomerSelector}
          onClose={closeCustomerSelector}
          onSelect={onCustomerSelected}
        />
      )}

      {showInvoicePreview && currentInvoice && taxpayerInfo && (
        <Suspense fallback={<InvoicePreviewFallback />}>
          <InvoicePreview
            isOpen={showInvoicePreview}
            invoice={currentInvoice}
            taxpayerInfo={taxpayerInfo}
            onClose={() => {
              closeInvoicePreview();
              handleInvoiceSuccess();
            }}
          />
        </Suspense>
      )}

      <ConfirmationModal
        isOpen={confirmDelete.isOpen}
        message="¿Eliminar esta venta suspendida?"
        title="Eliminar Venta Suspendida"
        confirmText="Eliminar"
        onConfirm={confirmDeleteSuspended}
        onCancel={() => setConfirmDelete({ isOpen: false, localId: null })}
      />
    </div>
  );
}
