# LogisCore ERP - Guía de Desarrollo

> Este documento es la **fuente de verdad** para todo desarrollo en el proyecto.
> Todo agente debe seguir estas reglas estrictamente.

---

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind 4.x, TypeScript strict
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Offline**: Dexie.js (IndexedDB) + SyncEngine
- **State**: Zustand

---

## Build Commands
```bash
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run all tests
npm run test:watch # Watch mode
```

---

# SECCIÓN 1: Reglas de Arquitectura (OBLIGATORIAS)

## 1.1 Capa de Servicios — SIN EXCEPCIONES

> **NUNCA llames a Supabase o Dexie directamente desde un componente React.**

```
✅ Componente → Servicio → (Dexie + SyncEngine + EventBus)
❌ Componente → Supabase/Dexie directo
```

```typescript
// ✅ Correcto - en el componente
const result = await createProduct(data);

// ✅ Correcto - en products.service.ts
await db.products.add(product);           // 1. Guardar local
await SyncEngine.addToQueue(...);        // 2. Encolar sync
EventBus.emit(Events.INVENTORY_UPDATED);  // 3. Notificar
```

---

## 1.2 Patrón Result<T, AppError>

> **Toda función async de servicio debe retornar `Result<T, AppError>`.**

```typescript
import { Ok, Err, Result, AppError, ValidationError, isOk } from '@/types/result';

export async function createProduct(data: ProductData): Promise<Result<string, AppError>> {
  try {
    if (!data.name?.trim()) return Err(new ValidationError('El nombre es requerido'));
    
    await db.products.add(product);
    await SyncEngine.addToQueue(...);
    
    return Ok(localId);
  } catch (error) {
    return Err(new AppError('Error al crear', 'CREATE_ERROR', 500));
  }
}

// ✅ Uso correcto en componente
const result = await createProduct(data);
if (!isOk(result)) {
  showError(result.error.message);  // NUNCA alert()
  return;
}
```

---

## 1.3 Offline-First: Orden OBLIGATORIO

```typescript
// 1. Validar localmente
if (!data.name?.trim()) return Err(new ValidationError('...'));

// 2. Guardar en Dexie (IndexedDB)
await db.products.add(product);

// 3. Encolar en SyncEngine
await SyncEngine.addToQueue('products', 'create', product, localId);

// 4. Emitir evento
EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
```

> **Si omites el paso 3, los datos NO se sincronizan con Supabase.**

---

## 1.4 Multi-Tenencia

```typescript
// Dexie (local): filtrar por slug (tenantId = tenant.slug)
db.products.where('tenantId').equals(tenant.slug).toArray()

// Supabase (remoto): filtrar por tenant_slug (texto)
supabase.from('products').eq('tenant_slug', tenant.slug)
```

> **CRÍTICO: El campo `tenantId` en Dexie debe almacenar el `slug` del tenant, NO el UUID.**
> **En Supabase, usar la columna `tenant_slug` para filtrar, no `tenant_id`.**

---

## 1.5 Transacciones en Dexie

> **Para operaciones que modifican múltiples tablas, usar transacciones.**

```typescript
await db.transaction('rw', db.sales, db.products, async () => {
  for (const item of data.items) {
    const product = await db.products.where('localId').equals(item.productId).first();
    if (!product || product.stock < item.quantity) {
      throw new ValidationError(`Stock insuficiente para ${item.productName}`);
    }
    await db.products.put({ ...product, stock: product.stock - item.quantity });
  }
  await db.sales.add(sale);
});
```

---

## 1.6 Sincronización con Supabase

```typescript
// Al encolar para sync
await SyncEngine.addToQueue('products', 'create', product, localId);

// Función RPC: sync_table_item(p_table, p_operation, p_data, p_local_id, p_tenant_slug)
```

---

## 1.7 RLS (Row Level Security)

> **Toda tabla nueva DEBE tener RLS activado.**

```sql
CREATE OR REPLACE FUNCTION check_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles WHERE tenant_id = target_tenant_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_scoped_access ON public.nueva_tabla
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id));
```

---

## 1.8 Notificaciones — SOLO ToastProvider

```typescript
// ✅ Correcto
const { showError, showSuccess, showInfo } = useToast();
showError('Error al guardar');

// ❌ PROHIBIDO
alert('Error al guardar');
```

---

## 1.9 Imports — Usar alias `@/`

```typescript
// ✅ Correcto
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';

// ❌ Evitar
import { db } from '../../../lib/db';
```

---

# SECCIÓN 2: Mejoras de Calidad

## 2.1 Logger Estructurado

```typescript
import { logger, logCategories } from '@/lib/logger';

logger.info('Venta creada', { saleId: localId, total });
logger.error('Error sync', error, { category: logCategories.SYNC });
```

**Categorías:** `SYNC`, `AUTH`, `INVENTORY`, `SALES`, `DATABASE`, `UI`

---

## 2.2 Circuit Breaker en SyncEngine

```typescript
const state = SyncEngine.getCircuitStatus();
// { status: 'closed' | 'open' | 'half-open', failures: number, ... }
```

---

## 2.3 Validación de Inputs

```typescript
function validateSaleInput(data: CreateSaleInput): string[] {
  const errors: string[] = [];
  if (!data.items?.length) errors.push('La venta debe tener productos');
  if (data.total < 0) errors.push('Total no puede ser negativo');
  return errors;
}
```

---

## 2.4 Índices en Dexie

```typescript
this.version(5).stores({
  products: '++id, localId, tenantId, sku, categoryId, isActive, name',
  sales: '++id, localId, tenantId, status, createdAt, paymentMethod',
  employees: '++id, localId, tenantId, role',
  // ...
});
```

---

# SECCIÓN 3: Patrones React

## 3.1 useCallback y useMemo

```typescript
// ✅ Correcto
const loadData = useCallback(async () => {
  // ...
}, [tenant?.slug, showError]);

useEffect(() => {
  loadData();
}, [loadData]);

// ❌ Incorrecto
useEffect(() => {
  async function loadData() { ... }
  loadData();
}, [tenant?.slug]);
```

---

# SECCIÓN 4: Testing

## 4.1 Archivos de Test

```bash
src/test/
├── products.service.test.ts    # Productos
├── images.service.test.ts      # Imágenes
├── employees.service.test.ts  # Empleados
├── circuit-breaker.test.ts    # Circuit breaker
├── pos-sales.test.ts          # Lógica POS
└── ...
```

## 4.2 Mocks Estándar

```typescript
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: { getState: vi.fn(() => ({ currentTenant: { slug: 'test' } })) },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: { addToQueue: vi.fn().mockResolvedValue(undefined) },
}));
```

---

# SECCIÓN 5: Eventos del Sistema

```typescript
Events.SALE_COMPLETED     // 'sale.completed'
Events.SALE_CANCELLED     // 'sale.cancelled'
Events.INVENTORY_UPDATED  // 'inventory.updated'
Events.STOCK_LOW          // 'stock.low'
Events.SYNC_STATUS_CHANGED // 'sync.status.changed'
Events.CONFLICT_DETECTED // 'conflict.detected'
```

---

# Checklist Pre-PR

- [ ] ¿La lógica está en un servicio, no en el componente?
- [ ] ¿El servicio retorna `Result<T, AppError>`?
- [ ] ¿Las escrituras usan transacción si modifican múltiples tablas?
- [ ] ¿Se usa `useToast()` en lugar de `alert()`?
- [ ] ¿Nueva tabla tiene RLS?
- [ ] ¿Se usa `tenant.slug` para filtrar en Dexie?
- [ ] ¿Hay test para el servicio?
- [ ] ¿`npm run lint` pasa (0 errores)?
- [ ] ¿`npm run test` pasa?
- [ ] ¿`npm run build` pasa?

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/db/index.ts` | Schema Dexie |
| `src/types/result.ts` | Result<T>, AppError |
| `src/lib/sync/SyncEngine.ts` | Sincronización offline |
| `src/features/*/services/*.service.ts` | Servicios por módulo |

---

## Errores Comunes a Evitar

1. **delete() en Dexie**: Usar `db.table.delete(localId)` ❌ → `db.table.where('localId').equals(localId).delete()` ✅
2. **Sin transacción**: Modificar múltiples tablas sin `db.transaction()` ❌
3. **No deducir stock**: En ventas, siempre deducir inventario ✅
4. **Acceso directo a Supabase**: Desde servicios, siempre pasar por Dexie + SyncEngine
