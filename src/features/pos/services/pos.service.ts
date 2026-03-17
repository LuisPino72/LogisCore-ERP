import { db, Product, Category } from '@/lib/db';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export async function loadPOSData(tenantSlug: string): Promise<{ products: Product[]; categories: Category[] }> {
  const [products, categories] = await Promise.all([
    db.products.where("tenantId").equals(tenantSlug).toArray(),
    db.categories.where("tenantId").equals(tenantSlug).toArray(),
  ]);
  return { products, categories };
}

export function filterProducts(products: Product[], search: string, selectedCategory: number | string): Product[] {
  return products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !selectedCategory || p.categoryId === Number(selectedCategory);
      return matchesSearch && matchesCategory && p.isActive && p.stock > 0;
    })
    .sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
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
  return {
    total: cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    count: cart.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function prepareSaleItems(cart: CartItem[]): SaleItem[] {
  return cart.map(item => ({
    productId: item.product.localId,
    productName: item.product.name,
    quantity: item.quantity,
    unitPrice: item.product.price,
    total: item.product.price * item.quantity,
  }));
}
