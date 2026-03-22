import { db, Product, Category, SuspendedSale } from '@/lib/db';
import { Ok, Err, Result, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';
import type { SortConfig, CartItem, SaleItem } from '../types/pos.types';

export type { CartItem, SaleItem } from '../types/pos.types';

export async function loadPOSData(tenantSlug: string): Promise<{ products: Product[]; categories: Category[] }> {
  const [products, categories] = await Promise.all([
    db.products.where("tenantId").equals(tenantSlug).toArray(),
    db.categories.where("tenantId").equals(tenantSlug).toArray(),
  ]);
  return { products, categories };
}

export function getCategorySaleType(categories: Category[], categoryId?: number): 'unit' | 'weight' | 'sample' {
  if (!categoryId) return 'unit';
  const category = categories.find(c => c.id === categoryId);
  return category?.saleType || 'unit';
}

export function filterProducts(
  products: Product[], 
  search: string, 
  selectedCategory: number | string,
  sort?: SortConfig,
  showFavoritesOnly?: boolean
): Product[] {
  const filtered = products
    .filter(p => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(searchLower) || 
        p.sku.toLowerCase().includes(searchLower);
      const matchesCategory = !selectedCategory || p.categoryId === Number(selectedCategory);
      const matchesFavorite = !showFavoritesOnly || p.isFavorite;
      return matchesSearch && matchesCategory && matchesFavorite && p.isActive && p.stock > 0;
    });

  if (sort) {
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
      }
      return sort.direction === 'asc' ? comparison : -comparison;
    });
  } else {
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  return filtered;
}

export function addToCart(cart: CartItem[], product: Product): CartItem[] {
  const existing = cart.find(item => item.product.localId === product.localId);
  if (existing) {
    if (existing.quantity >= product.stock) return cart;
    return cart.map(item => item.product.localId === product.localId ? { ...item, quantity: item.quantity + 1 } : item);
  }
  return [...cart, { product, quantity: 1 }];
}

export function updateCartQuantity(cart: CartItem[], localId: string, delta: number): CartItem[] {
  return cart
    .map(item => {
      if (item.product.localId !== localId) return item;
      const newQty = item.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > item.product.stock) return item;
      return { ...item, quantity: newQty };
    })
    .filter(Boolean) as CartItem[];
}

export function removeFromCart(cart: CartItem[], localId: string): CartItem[] {
  return cart.filter(item => item.product.localId !== localId);
}

export function calculateCartTotals(cart: CartItem[]): { total: number; count: number } {
  const total = cart.reduce((sum, item) => {
    let itemTotal = 0;
    const pricePerKg = item.product.pricePerKg || item.product.price;
    const samples = item.product.samples;
    
    if (item.unit === 'g' && item.product.categoryId) {
      itemTotal = (pricePerKg / 1000) * item.quantity;
    } else if (item.selectedSampleId && samples) {
      const sample = samples.find(s => s.id === item.selectedSampleId);
      itemTotal = sample ? sample.price * item.quantity : item.product.price * item.quantity;
    } else {
      itemTotal = item.product.price * item.quantity;
    }
    
    return sum + itemTotal;
  }, 0);
  
  return {
    total,
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function prepareSaleItems(cart: CartItem[]): SaleItem[] {
  return cart.map(item => {
    let unitPrice = item.product.price;
    let total = item.product.price * item.quantity;
    
    if (item.unit === 'g') {
      const pricePerKg = item.product.pricePerKg || item.product.price;
      unitPrice = pricePerKg / 1000;
      total = unitPrice * item.quantity;
    } else if (item.selectedSampleId && item.product.samples) {
      const sample = item.product.samples.find(s => s.id === item.selectedSampleId);
      if (sample) {
        unitPrice = sample.price;
        total = sample.price * item.quantity;
      }
    }
    
    return {
      productId: item.product.localId,
      productName: item.product.name,
      quantity: item.quantity,
      unit: item.unit || 'unit',
      unitPrice: Math.round(unitPrice * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  });
}

export async function saveSuspendedSale(tenantSlug: string, cart: CartItem[], note?: string, customerId?: string, customerName?: string): Promise<Result<string, AppError>> {
  try {
    const localId = crypto.randomUUID();
    const cartData = cart.map(item => ({
      productId: item.product.localId,
      productName: item.product.name,
      quantity: item.quantity,
      unit: item.unit || 'unit',
      unitPrice: item.product.price,
      total: item.product.price * item.quantity,
      productSnapshot: item.product,
    }));
    
    await db.suspendedSales.add({
      localId,
      tenantId: tenantSlug,
      cart: cartData,
      createdAt: new Date(),
      updatedAt: new Date(),
      note,
      customerId,
      customerName,
    });
    
    return Ok(localId);
  } catch (_error) {
    return Err(new AppError('Error al guardar venta suspendida', 'SAVE_SUSPENDED_SALE_ERROR', 500));
  }
}

export async function getSuspendedSales(tenantSlug: string): Promise<Result<SuspendedSale[], AppError>> {
  try {
    const sales = await db.suspendedSales.where('tenantId').equals(tenantSlug).reverse().sortBy('createdAt');
    return Ok(sales);
  } catch (_error) {
    return Err(new AppError('Error al obtener ventas suspendidas', 'GET_SUSPENDED_SALES_ERROR', 500));
  }
}

export async function loadSuspendedSale(localId: string): Promise<Result<SuspendedSale | undefined, AppError>> {
  try {
    const sale = await db.suspendedSales.where('localId').equals(localId).first();
    
    if (!sale) {
      return Ok(undefined);
    }

    const productIds = sale.cart.map(item => item.productId);
    const currentProducts = await db.products
      .where('localId')
      .anyOf(productIds)
      .toArray();
    
    const productsMap = new Map(currentProducts.map(p => [p.localId, p]));
    
    let hasChanges = false;
    const updatedCart = sale.cart.map(item => {
      const currentProduct = productsMap.get(item.productId);
      
      if (currentProduct) {
        const snapshotChanged = 
          currentProduct.price !== item.productSnapshot.price ||
          currentProduct.name !== item.productSnapshot.name ||
          currentProduct.stock !== item.productSnapshot.stock ||
          currentProduct.isActive !== item.productSnapshot.isActive;
        
        if (snapshotChanged) {
          hasChanges = true;
          return {
            ...item,
            productSnapshot: currentProduct,
            unitPrice: currentProduct.price,
            total: currentProduct.price * item.quantity,
          };
        }
      } else {
        hasChanges = true;
        return {
          ...item,
          productSnapshot: { ...item.productSnapshot, isActive: false },
        };
      }
      
      return item;
    });

    if (hasChanges) {
      await db.suspendedSales.update(sale.id!, {
        cart: updatedCart,
        updatedAt: new Date(),
      });
      
      logger.info('Product snapshots refreshed for suspended sale', { 
        saleId: localId, 
        changesCount: updatedCart.filter((_, i) => updatedCart[i] !== sale.cart[i]).length,
        category: logCategories.SALES 
      });
    }
    
    const updatedSale = await db.suspendedSales.where('localId').equals(localId).first();
    return Ok(updatedSale);
  } catch (_error) {
    return Err(new AppError('Error al cargar venta suspendida', 'LOAD_SUSPENDED_SALE_ERROR', 500));
  }
}

export async function deleteSuspendedSale(localId: string): Promise<Result<void, AppError>> {
  try {
    await db.suspendedSales.where('localId').equals(localId).delete();
    return Ok(undefined);
  } catch (_error) {
    return Err(new AppError('Error al eliminar venta suspendida', 'DELETE_SUSPENDED_SALE_ERROR', 500));
  }
}

export function findProductBySku(products: Product[], sku: string): Product | undefined {
  return products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
}
