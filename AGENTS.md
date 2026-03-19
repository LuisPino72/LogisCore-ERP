# LogisCore ERP - Guía de Desarrollo

> Este documento es la **fuente de verdad** para todo desarrollo en el proyecto.

## Tech Stack
- **Frontend**: React 19, Vite, Tailwind 4.x, TypeScript strict
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Offline**: Dexie.js (IndexedDB) + SyncEngine
- **State**: Zustand

## Build Commands
```bash
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Run all tests
```

---

# SECCIÓN 1: Identificadores

| Campo | Tipo | Dónde | Descripción |
|-------|------|-------|-------------|
| `tenant_id` | UUID | Supabase (FK) | ID real del tenant |
| `tenant_slug` | text | Supabase + Dexie | Slug amigable para filtrado |
| `tenantId` | text | Dexie | **Siempre guardar el slug, NO UUID** |
| `local_id` | UUID | Supabase | UUID generado en cliente |
| `localId` | string | Dexie | Mismo valor que `local_id` |

### Creación de registro:
```typescript
const localId = crypto.randomUUID();
await db.products.add({ localId, tenantId: currentTenant.slug, name: '...' });
await SyncEngine.addToQueue('products', 'create', product, localId);
```

### Filtrado:
```typescript
// Dexie
db.products.where('tenantId').equals(tenant.slug)

// Supabase (NO usar .or() con null)
supabase.from('products').eq('tenant_slug', tenant.slug)
```

---

# SECCIÓN 2: Arquitectura

## 2.1 Capa de Servicios — SIN EXCEPCIONES
> **NUNCA llames a Supabase o Dexie directamente desde un componente React.**

```
✅ Componente → Servicio → (Dexie + SyncEngine + EventBus)
❌ Componente → Supabase/Dexie directo
```

## 2.2 Patrón Result<T, AppError>
> **Toda función async de servicio debe retornar `Result<T, AppError>`.**

## 2.3 Offline-First (Orden OBLIGATORIO)
```typescript
// 1. Validar localmente
if (!data.name?.trim()) return Err(new ValidationError('...'));
// 2. Guardar en Dexie
await db.products.add(product);
// 3. Encolar sync (CRÍTICO)
await SyncEngine.addToQueue('products', 'create', product, localId);
// 4. Emitir evento
EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
```
> **Si omites el paso 3, los datos NO se sincronizan.**

## 2.4 Transacciones en Dexie
> Para operaciones que modifican múltiples tablas, usar `db.transaction('rw', db.table1, db.table2, ...)`.

## 2.5 Code-Splitting
> Usar `lazy()` para módulos no críticos: `const POS = lazy(() => import('@/features/pos'))`

## 2.6 Métodos de Pago
```typescript
type PaymentMethod = 'cash' | 'card' | 'pago_movil';
```

## 2.7 Ventas Suspendidas
```typescript
// pos.service.ts
saveSuspendedSale(tenantSlug, cart, note?)
getSuspendedSales(tenantSlug)
deleteSuspendedSale(localId)
```

---

# SECCIÓN 3: Sistema de Módulos

## Dependencias entre Módulos

| Módulo | Depende De | Notas |
|--------|-----------|-------|
| `pos` | `inventory` | Requiere productos/categorías |
| `invoicing` | `customers` | Puede vincular clientes |
| `recipes` | `inventory` | Usa productos |
| `purchases` | `inventory` | Afecta stock |
| `sales` | `inventory` | Descuenta stock |
| `dashboard`, `reports`, `exchange-rate` | - | Siempre visibles |

## Helper para Verificar Módulos
```typescript
import { isModuleEnabled, checkModuleDependencies } from '@/store/useTenantStore';

// Verificar módulo y dependencias
const { enabled, missingDependencies } = checkModuleDependencies('pos', tenant);
if (missingDependencies.length > 0) {
  // Mostrar mensaje: "Activa el módulo: inventory"
}
```

## Planes de Suscripción

| Plan | Módulos | Descripción |
|------|---------|-------------|
| **Básico** | dashboard, reports, exchange-rate | Visibilidad y métricas |
| **Inventario** | +inventory | Control de productos |
| **POS** | +pos, sales | Punto de venta con registro |
| **Negocio** | +customers, purchases | Con clientes y compras |
| **Empresa** | +employees, accounting, invoicing, recipes | Control total |

**Dependencias:** `inventory → pos → sales → invoicing` (invoicing requiere customers)

**Configuración por defecto:**
```json
{ "dashboard": true, "reports": true, "exchange_rate": true, "inventory": true }
```

---

# SECCIÓN 4: Login y Carga de Datos

1. Usuario inicia sesión → Supabase Auth valida
2. Consultar `user_roles` del usuario
3. Si `super_admin` → acceso al panel admin
4. Si `owner`/`employee` → cargar tenant relacionado

**Estructura user_roles:**
```sql
user_roles: user_id, role, tenant_id (NULL para super_admin), tenant_slug, permissions
```

**Filtrado por tenant_slug EXACTO:**
```typescript
// ✅ Correcto
supabase.from('products').eq('tenant_slug', tenantSlug)
// ❌ Incorrecto
supabase.from('products').or(`tenant_slug.eq.${tenantSlug},tenant_slug.is.null`)
```

---

# SECCIÓN 5: Sincronización

## Edge Function sync_table_item
Recibe: `p_table`, `p_operation`, `p_data`, `p_local_id`, `p_tenant_uuid`, `p_tenant_slug`

La función debe setear `tenant_id` (UUID) y `tenant_slug` en operaciones create/update.

## Circuit Breaker
```typescript
SyncEngine.getCircuitStatus()           // { status, failures, ... }
SyncEngine.resolveConflict(itemId, 'local' | 'server')
SyncEngine.getConflicts()
SyncEngine.retryFailedItems()
SyncEngine.getSyncStats()                // { pending, failed, conflicts }
```

---

# SECCIÓN 6: RLS (Row Level Security)

> **Toda tabla nueva DEBE tener RLS activado.**

```sql
CREATE POLICY tenant_scoped_access ON public.nueva_tabla
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id));
```

---

# SECCIÓN 7: Calidad

## Notificaciones — SOLO ToastProvider
```typescript
const { showError, showSuccess } = useToast();
showError('Error al guardar');  // ✅
alert('Error');                // ❌ PROHIBIDO
```

## Logger
```typescript
import { logger, logCategories } from '@/lib/logger';
logger.info('Venta creada', { saleId: localId });
logger.error('Error sync', error, { category: logCategories.SYNC });
// Categorías: SYNC, AUTH, INVENTORY, SALES, DATABASE, UI
```

---

# SECCIÓN 8: Patrones React

## useCallback y useMemo
```typescript
// ✅ Correcto
const loadData = useCallback(async () => { ... }, [tenant?.slug, showError]);
useEffect(() => { loadData(); }, [loadData]);

// ❌ Incorrecto
useEffect(() => { async function loadData() { ... } loadData(); }, [tenant?.slug]);
```

## Campos Opcionales en Dexie
> No requieren migraciones. Agregar campo opcional al interface y usar `?.` al guardar.

## UI Collapsible
```tsx
const [showHistory, setShowHistory] = useState(false);
<button onClick={() => setShowHistory(!showHistory)}>
  <ChevronDown className={showHistory ? 'rotate-180' : ''} />
</button>
{showHistory && items.map(item => (...))}
```

---

# SECCIÓN 9: Testing

## Mocks Estándar
```typescript
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: { getState: vi.fn(() => ({ currentTenant: { slug: 'test' } })) },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: { addToQueue: vi.fn().mockResolvedValue(undefined) },
}));
```

## Tests por Feature
Cada módulo debe tener:
- `*.validation.test.ts` - Validaciones
- `*.service.test.ts` - Lógica de negocio

> **Warnings de `any` en tests son intencionales.** NO agregar `eslint-disable`.

## Eventos del Sistema
```typescript
Events.SALE_COMPLETED    // 'sale.completed'
Events.SALE_CANCELLED    // 'sale.cancelled'
Events.INVENTORY_UPDATED // 'inventory.updated'
Events.STOCK_LOW         // 'stock.low'
```

---

# Checklist Pre-PR

- [ ] ¿La lógica está en un servicio, no en el componente?
- [ ] ¿El servicio retorna `Result<T, AppError>`?
- [ ] ¿Las escrituras usan transacción si modifican múltiples tablas?
- [ ] ¿Se usa `useToast()` en lugar de `alert()`?
- [ ] ¿Nueva tabla tiene RLS?
- [ ] ¿Se usa `tenant.slug` para filtrar en Dexie?
- [ ] ¿Se usa `tenant_slug` para filtrar en Supabase?
- [ ] ¿`npm run lint` pasa (0 errores)?
- [ ] ¿`npm run build` pasa?

---

# Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/db/index.ts` | Schema Dexie y tipos |
| `src/types/result.ts` | Result<T>, AppError |
| `src/lib/sync/SyncEngine.ts` | Sincronización offline |
| `src/features/*/services/*.service.ts` | Servicios por módulo |
| `src/App.tsx` | Login, carga de datos |
| Edge Function: `sync_table_item` | Sync a Supabase |

---

# Errores Comunes a Evitar

| ❌ Error | ✅ Corrección |
|----------|---------------|
| `db.table.delete(localId)` | `db.table.where('localId').equals(localId).delete()` |
| Sin transacción | Usar `db.transaction('rw', db.table1, ...)` |
| No deducir stock en ventas | Descontar siempre en `createSale()` |
| Componente → Supabase directo | Siempre pasar por Dexie + SyncEngine |
| Filtrar por `tenant_id` en Supabase | Usar `tenant_slug` |

---

# Estructura de Archivos por Feature

```
src/features/{modulo}/
├── components/     # UI (JSX, handlers simples)
├── services/      # Lógica de negocio (OBLIGATORIO)
├── types/         # Tipos TypeScript
├── hooks/         # Custom hooks
├── test/          # Tests unitarios
└── index.ts       # Exports
```

**services/**: Acceso a Dexie, retorna `Result<T, AppError>`, funciones async
**components/**: Solo JSX, NO accede a `db` directamente
