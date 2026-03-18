# Spec: Venta por Peso y por Muestra

## Fecha
2026-03-18

## Problema
El sistema actual no soporta productos que se venden por peso (verduras, quesos, charcutería) ni productos con variantes de venta (huevos: cartón, medio cartón, unidad). Se necesita agregar esta funcionalidad al inventario y al POS.

## Solución
Agregar un campo `saleType` a las categorías que determina el comportamiento de venta de todos los productos dentro de esa categoría.

---

## 1. Estructura de Datos

### 1.1 Supabase - Tabla Categories

```sql
ALTER TABLE categories ADD COLUMN sale_type text DEFAULT 'unit';

CREATE TYPE sale_type_enum AS ENUM ('unit', 'weight', 'sample');

ALTER TABLE categories ALTER COLUMN sale_type TYPE sale_type_enum 
USING sale_type::sale_type_enum;
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sale_type` | enum | Tipo de venta: 'unit' (unitario), 'weight' (por peso), 'sample' (por muestra) |

### 1.2 Dexie - Tabla Categories

```typescript
interface Category {
  // ... campos existentes
  saleType: 'unit' | 'weight' | 'sample';
}
```

### 1.3 Dexie - Tabla Products (extendida)

```typescript
interface Product {
  // ... campos existentes
  pricePerKg?: number;        // Solo para categorías 'weight'
  samples?: Sample[];          // Solo para categorías 'sample'
}

interface Sample {
  id: string;
  name: string;                // 'Cartón', 'Medio cartón', 'Unidad'
  quantity: number;           // 1, 0.5, 1 (respectivamente)
  price: number;
}
```

### 1.4 Dexie - Tabla Sales (items extendidos)

```typescript
interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;            // Cantidad (gramos para weight)
  unit: 'kg' | 'g' | 'unit' | 'carton' | 'half';  // Unidad de venta
  unitPrice: number;          // Precio por unidad base
  total: number;
}
```

---

## 2. Servicios

### 2.1 categories.service.ts

```typescript
// Actualizar categoría incluyendo saleType
updateCategory(localId: string, data: Partial<Category>): Promise<Result<Category, AppError>>
```

### 2.2 products.service.ts

```typescript
// Crear producto con pricePerKg y samples
createProduct(data: ProductFormData): Promise<Result<Product, AppError>>

// Actualizar producto incluyendo pricePerKg y samples
updateProduct(localId: string, data: Partial<ProductFormData>): Promise<Result<Product, AppError>>
```

### 2.3 sales.service.ts

```typescript
// Crear venta calculando precio según saleType de categoría
createSale(tenantSlug: string, items: SaleItemInput[], paymentMethod: PaymentMethod): Promise<Result<Sale, AppError>>

---

## 3. Flujo de Negocio

### 3.1 Crear/Editar Categoría

1. Usuario abre modal de categoría
2. Selecciona "Tipo de venta": Unitario / Por Peso / Por Muestra
3. La configuración de precio por kg o muestras se define **en cada producto**, no en la categoría

### 3.2 Crear/Editar Producto (categoría weight/sample)

**Categoría 'weight':**
- Campo adicional "Precio por kilogramo" (opcional)
- Stock se maneja en kilogramos

**Categoría 'sample':**
- Tabla de muestras con columnas: Nombre, Cantidad, Precio
- Agregar/eliminar filas dinámicamente
- **Validación:** Si la categoría es 'sample' pero el producto no tiene muestras definidas, mostrar error al intentar agregar al carrito

### 3.3 Venta en POS

**Categoría 'unit':**
- Comportamiento actual: input de cantidad como entero

**Categoría 'weight':**
- Input numérico para peso en gramos
- Cálculo: `(gramos / 1000) * pricePerKg`
- Redondeo: 2 decimales (Math.round(total * 100) / 100)
- Mínimo: 1 gramo

**Categoría 'sample':**
- Dropdown con opciones de muestras configuradas
- Selector muestra precio automáticamente

### 3.4 Registro en Ventas

```typescript
// Ejemplo: venta de 350g de zanahorias
{
  productId: 'uuid',
  productName: 'Zanahorias',
  quantity: 350,
  unit: 'g',
  unitPrice: 2.50,      // precio por kg / 1000 * 1000 = precio por kg
  total: 0.875          // 0.35 * 2.50
}

// Ejemplo: venta de medio cartón de huevos
{
  productId: 'uuid',
  productName: 'Huevos',
  quantity: 0.5,
  unit: 'half',
  unitPrice: 3.00,
  total: 1.50
}
```

### 3.5 Descuento de Inventario

| Tipo Categoría | Cálculo Descuento |
|----------------|-------------------|
| `unit` | `stock = stock - quantity` |
| `weight` | `stock = stock - (quantity / 1000)` (stock en kg) |
| `sample` | `stock = stock - 1` (por cada venta de muestra) |

---

## 4. UI - Componentes

### 4.1 CategoryForm (modal)

```tsx
// Campos existentes más:
<select 
  value={formData.saleType}
  onChange={(e) => setSaleType(e.target.value)}
>
  <option value="unit">Unitario</option>
  <option value="weight">Por Peso</option>
  <option value="sample">Por Muestra</option>
</select>

// Nota: Los campos de configuración (pricePerKg, samples) están en ProductForm
```

### 4.2 ProductForm (modal)

- Si categoría es 'weight': mostrar campo "Precio por kilogramo"
- Si categoría es 'sample': mostrar tabla de muestras

### 4.3 POS - CartItem

```tsx
// Modo normal
<Input 
  type="number" 
  value={item.quantity}
  onChange={(qty) => updateQuantity(item.productId, qty)}
/>

// Modo weight
<Input 
  type="number"
  placeholder="Gramos"
  value={item.quantity}
  onChange={(grams) => updateWeight(item.productId, grams)}
/>

// Modo sample
<Select 
  options={product.samples}
  value={selectedSample}
  onChange={(sample) => updateSample(item.productId, sample)}
/>
```

---

## 5. Sincronización

El campo `sale_type` se sincroniza igual que los demás campos de categoría a través de SyncEngine.

---

## 6. Testing

### 6.1 Tests de Validación
- Validar que saleType sea uno de los valores permitidos
- Validar que pricePerKg sea > 0 si está presente
- Validar que samples tenga al menos una opción si saleType='sample'
- Validar estructura de samples (name, quantity, price)

### 6.2 Tests de Servicios
- test createCategory con saleType
- test createProduct con pricePerKg y samples
- test calculatePrice para weight y sample
- test sale con descuento de inventario por tipo

### 6.3 Tests de UI
- Test modal de categoría con saleType
- Test POS con input de peso
- Test POS con selector de muestras

---

## 7. Migración Supabase

```sql
-- 1. Agregar columna sale_type
ALTER TABLE categories ADD COLUMN sale_type text DEFAULT 'unit';

-- 2. Crear tipo enumerado
CREATE TYPE sale_type_enum AS ENUM ('unit', 'weight', 'sample');

-- 3. Convertir columna al tipo enumerado
ALTER TABLE categories 
ALTER COLUMN sale_type TYPE sale_type_enum 
USING sale_type::sale_type_enum;

-- 4. Actualizar RLS si es necesario
-- (Ya existe policy para categorías, no requiere cambios)
```

---

## 8. Notas

- El campo `saleType` en Dexie usará strings ('unit', 'weight', 'sample') para compatibilidad con el tipo enumerado de Supabase
- El campo `pricePerKg` y `samples` están definidos en la tabla `products`, no en `categories`
- Para productos de muestra, la cantidad se maneja como número (1 = entero, 0.5 = medio)