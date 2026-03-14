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
// Dexie (local): filtrar por slug
db.products.where('tenantId').equals(tenant.slug).toArray()

// Supabase (remoto): filtrar por UUID
supabase.from('products').eq('tenant_id', tenant.id)
```

> **tenant_id en Supabase debe ser UUID con FK a tenants.id**

---

## 1.5 RLS (Row Level Security)

> **Toda tabla nueva DEBE tener RLS activado.**

```sql
-- Primero: crear función auxiliar si no existe
CREATE OR REPLACE FUNCTION check_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE tenant_id = target_tenant_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a la tabla
ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_scoped_access ON public.nueva_tabla
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id));
```

---

## 1.6 Notificaciones — SOLO ToastProvider

```typescript
// ✅ Correcto
const { showError, showSuccess, showInfo } = useToast();
showError('Error al guardar');

// ❌ PROHIBIDO
alert('Error al guardar');
confirm('¿Estás seguro?');
```

---

## 1.7 Imports — Usar alias `@/`

```typescript
// ✅ Correcto
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { useTenantStore } from '@/store/useTenantStore';

// ❌ Evitar
import { db } from '../../../lib/db';
```

---

# SECCIÓN 2: Mejoras de Calidad

## 2.1 Logger Estructurado

> Usar el logger en lugar de `console.log/error`.

```typescript
import { logger, logCategories } from '@/lib/logger';

logger.info('Venta creada', { saleId: localId, total });
logger.error('Error sync', error, { category: logCategories.SYNC });
logger.warn('Retry attempt', { attempt: n, category: logCategories.SYNC });
```

**Categorías disponibles:** `SYNC`, `AUTH`, `INVENTORY`, `SALES`, `DATABASE`, `UI`

---

## 2.2 Circuit Breaker en SyncEngine

El SyncEngine incluye protección contra fallos en cascada:

- **closed**: Operación normal
- **open**: Fallos excesivos - rechaza operaciones
- **half-open**: Prueba de recuperación

```typescript
// Estado del circuit breaker
const state = SyncEngine.getCircuitStatus();
// { status: 'closed' | 'open' | 'half-open', failures: number, ... }
```

---

## 2.3 Validación de Inputs en Servicios

> **Todo servicio debe validar inputs antes de procesar.**

```typescript
function validateSaleInput(data: CreateSaleInput): string[] {
  const errors: string[] = [];
  if (!data.items?.length) errors.push('La venta debe tener productos');
  if (data.total < 0) errors.push('Total no puede ser negativo');
  // ...
  return errors;
}
```

---

## 2.4 Índices en Dexie

Los índices se definen en el schema de Dexie:

```typescript
this.version(4).stores({
  products: '++id, localId, tenantId, sku, categoryId, isActive, name',
  sales: '++id, localId, tenantId, status, createdAt, paymentMethod',
  // ...
});
```

---

# SECCIÓN 3: Patrones React

## 3.1 useCallback y useMemo

> **Funciones usadas en useEffect DEBEN estar en useCallback.**

```typescript
// ✅ Correcto
const loadData = useCallback(async () => {
  // ...
}, [tenant?.slug, showError]);

useEffect(() => {
  loadData();
}, [loadData]);  // carga cuando cambia loadData

// ❌ Incorrecto - función inline en useEffect
useEffect(() => {
  async function loadData() { ... }
  loadData();
}, [tenant?.slug]);
```

> **Filters/derivados usar useMemo:**

```typescript
const filteredProducts = useMemo(() => {
  return products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );
}, [products, search]);
```

---

## 3.2 Componentes Optimizados

Los siguientes componentes ya tienen las optimizaciones aplicadas:
- Inventory.tsx
- POS.tsx
- Employees.tsx
- Purchases.tsx
- Recipes.tsx
- Sales.tsx

---

# SECCIÓN 4: Testing

## 4.1 Archivos de Test

```bash
src/test/
├── result-types.test.ts      # Tipos Result<T,E>
├── logger.test.ts           # Logger estructurado
├── circuit-breaker.test.ts  # Circuit breaker
├── service-validation.test.ts # Validaciones
├── tenant-store.test.ts    # Zustand stores
├── theme-store.test.ts      # Tema
├── pos-sales.test.ts       # Lógica POS
├── purchases.test.ts       # Compras
├── recipes-production.test.ts # Recetas
└── reports.test.ts         # Reportes
```

## 4.2 Mocks Estándar

```typescript
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: {
    getState: vi.fn(() => ({
      currentTenant: { id: 'uuid', slug: 'test-tenant' },
    })),
  },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: { addToQueue: vi.fn().mockResolvedValue(undefined) },
}));
```

---

# SECCIÓN 5: Eventos del Sistema

```typescript
import { EventBus, Events } from '@/lib/events/EventBus';

Events.SALE_COMPLETED      // 'sale.completed'
Events.SALE_CANCELLED       // 'sale.cancelled'
Events.INVENTORY_UPDATED    // 'inventory.updated'
Events.STOCK_LOW            // 'stock.low'
Events.SYNC_STATUS_CHANGED // 'sync.status.changed'
Events.CONFLICT_DETECTED   // 'conflict.detected'
Events.TENANT_CHANGED      // 'tenant.changed'
```

---

# Checklist Pre-PR

- [ ] ¿La lógica está en un servicio, no en el componente?
- [ ] ¿El servicio retorna `Result<T, AppError>`?
- [ ] ¿Las escrituras siguen: Validar → Dexie → SyncEngine → EventBus?
- [ ] ¿Se usa `useToast()` en lugar de `alert()`?
- [ ] ¿Nueva tabla tiene RLS con `check_tenant_access`?
- [ ] ¿`tenant_id` en Supabase es UUID?
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
| `src/lib/logger.ts` | Logging estructurado |
| `src/store/useTenantStore.ts` | Tenant + rol |
| `src/store/useThemeStore.ts` | Tema dinámico |
| `src/features/*/services/*.service.ts` | Servicios por módulo |

---

## Módulos

- Login, AdminPanel, Inventory, POS, Sales, Purchases, Recipes, Reports, Employees
