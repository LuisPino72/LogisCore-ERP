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

# SECCIÓN 1: Identificadores de Base de Datos

## 1.1 Estructura de Identificadores

| Campo | Tipo | Dónde se usa | Descripción |
|-------|------|--------------|-------------|
| `tenant_id` | UUID | Supabase (FK) | ID real del tenant (relación a tabla `tenants`) |
| `tenant_slug` | text | Supabase + Dexie | Slug amigable del tenant para filtrado rápido |
| `tenantId` | text | Dexie (local) | **Siempre guardar el `slug`, NO el UUID** |
| `local_id` | UUID | Supabase | UUID generado en cliente antes de sincronizar |
| `localId` | string | Dexie (local) | Mismo valor que `local_id` en Supabase |

### Flujo de creación de registro:
```typescript
// 1. Generar localId
const localId = crypto.randomUUID();

// 2. Guardar en Dexie con tenantId = slug
await db.products.add({
  localId,
  tenantId: currentTenant.slug,  // ← SLUG, NO UUID
  name: '...'
});

// 3. Encolar sync (envía ambos)
await SyncEngine.addToQueue('products', 'create', product, localId);
// SyncEngine envía: p_tenant_uuid (UUID) y p_tenant_slug (slug)
```

### Filtrado correcto:
```typescript
// Dexie: filtrar por slug
db.products.where('tenantId').equals(tenant.slug).toArray()

// Supabase: filtrar por tenant_slug (NO por tenant_id en consultas públicas)
supabase.from('products').eq('tenant_slug', tenant.slug)
```

---

## SECCIÓN 2: Arquitectura (OBLIGATORIAS)

## 2.1 Capa de Servicios — SIN EXCEPCIONES

> **NUNCA llames a Supabase o Dexie directamente desde un componente React.**

```
✅ Componente → Servicio → (Dexie + SyncEngine + EventBus)
❌ Componente → Supabase/Dexie directo
```

## 2.2 Patrón Result<T, AppError>

> **Toda función async de servicio debe retornar `Result<T, AppError>`.**

## 2.3 Offline-First: Orden OBLIGATORIO

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

## 2.4 Transacciones en Dexie

> **Para operaciones que modifican múltiples tablas, usar transacciones.**

## 2.5 Code-Splitting

> **Usar lazy loading para módulos que no son críticos en la carga inicial.**

```typescript
// App.tsx - módulos cargados dinámicamente
const Dashboard = lazy(() => import('@/features/dashboard/components/Dashboard'));
const POS = lazy(() => import('@/features/pos').then(m => ({ default: m.POS })));

// vite.config.ts - separar vendors en chunks
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-supabase': ['@supabase/supabase-js'],
        'vendor-dexie': ['dexie', 'dexie-react-hooks'],
        'vendor-zustand': ['zustand'],
        'vendor-lucide': ['lucide-react'],
      },
    },
  },
},
```

## SECCIÓN 2.5: Métodos de Pago

> **Usar siempre los 3 métodos de pago válidos.**

```typescript
type PaymentMethod = 'cash' | 'card' | 'pago_movil';

// Validación correcta en servicios:
if (!['cash', 'card', 'pago_movil'].includes(data.paymentMethod)) {
  return Err(new ValidationError('Método de pago inválido'));
}
```

## SECCIÓN 2.6: Ventas Suspendidas

```typescript
// Estructura en Dexie (ya existe en db/index.ts)
interface SuspendedSale {
  localId: string;
  tenantId: string;
  cart: CartItem[];  // Incluye productSnapshot para persistencia
  note?: string;
  createdAt: Date;
}

// Servicios en pos.service.ts
saveSuspendedSale(tenantSlug, cart, note?)
getSuspendedSales(tenantSlug)
deleteSuspendedSale(localId)
```

---

## SECCIÓN 3: Login y Carga de Datos

## 3.1 Flujo de Login

1. Usuario inicia sesión con email/password
2. Supabase Auth valida credenciales
3. Se consultan `user_roles` del usuario
4. Si es `super_admin` → acceso al panel de admin (sin tenant)
5. Si es `owner`/`employee` → se carga el `tenant` relacionado

## 3.2 Estructura de user_roles

```sql
-- Un usuario puede tener múltiples registros (uno por empresa)
user_roles:
  - user_id (FK a auth.users)
  - role: 'super_admin' | 'owner' | 'employee'
  - tenant_id: UUID (FK a tenants) - NULL para super_admin
  - tenant_slug: text -冗余 para consultas rápidas
  - permissions: jsonb
```

**Reglas:**
- `super_admin`: `tenant_id = NULL` (acceso a todas las empresas)
- `owner`/`employee`: `tenant_id = UUID` específico de la empresa

## 3.3 Carga de Datos al Iniciar Sesión

```typescript
// App.tsx - loadTenantData
// Consultar Supabase filtrando por tenant_slug EXACTO
supabase.from("products").eq('tenant_slug', tenantSlug)

// IMPORTANTE: No usar .or() con null - puede traer datos incorrectos
// ✅ Correcto
supabase.from("products").eq('tenant_slug', tenantSlug)
// ❌ Incorrecto
supabase.from("products").or(`tenant_slug.eq.${tenantSlug},tenant_slug.is.null`)
```

### Sanitize functions (Mapear de Supabase a Dexie):
```typescript
// Usar local_id como localId (fallback a id para datos antiguos)
const sanitizeProduct = (p: Record<string, unknown>) => ({
  localId: String(p.local_id ?? p.id ?? ""),  // ← local_id primero
  tenantId: tenantSlug,
  // ...
});
```

---

## SECCIÓN 4: Sincronización

## 4.1 Edge Function sync_table_item

La función RPC recibe:
- `p_table`: nombre de la tabla
- `p_operation`: 'create' | 'update' | 'delete'
- `p_data`: datos del registro
- `p_local_id`: UUID local
- `p_tenant_uuid`: UUID del tenant (para FK)
- `p_tenant_slug`: slug del tenant (para columna tenant_slug)

**La función debe:**
1. Agregar `local_id` al datos
2. Agregar `tenant_id` (UUID) en operaciones create/update
3. Agregar `tenant_slug` en operaciones create/update
4. Eliminar `tenant_slug` del payload si existe (evitar duplicado)

## 4.2 Circuit Breaker

```typescript
const state = SyncEngine.getCircuitStatus();
// { status: 'closed' | 'open' | 'half-open', failures: number, ... }
```

---

## SECCIÓN 5: RLS (Row Level Security)

> **Toda tabla nueva DEBE tener RLS activado.**

```sql
CREATE OR REPLACE FUNCTION check_tenant_access(target_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND (role = 'super_admin' OR tenant_id = target_tenant_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.nueva_tabla ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_scoped_access ON public.nueva_tabla
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id));
```

---

## SECCIÓN 6: Mejoras de Calidad

## 6.1 Notificaciones — SOLO ToastProvider
```typescript
const { showError, showSuccess, showInfo } = useToast();
showError('Error al guardar');  // ✅
alert('Error al guardar');     // ❌ PROHIBIDO
```

## 6.2 Imports — Usar alias `@/`
```typescript
import { db } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
```

## 6.3 Logger Estructurado
```typescript
import { logger, logCategories } from '@/lib/logger';
logger.info('Venta creada', { saleId: localId, total });
logger.error('Error sync', error, { category: logCategories.SYNC });
```
**Categorías:** `SYNC`, `AUTH`, `INVENTORY`, `SALES`, `DATABASE`, `UI`

---

## SECCIÓN 7: Patrones React

## 7.1 useCallback y useMemo
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

## SECCIÓN 8: Testing

## 8.1 Mocks Estándar
```typescript
vi.mock('@/store/useTenantStore', () => ({
  useTenantStore: { getState: vi.fn(() => ({ currentTenant: { slug: 'test' } })) },
}));

vi.mock('@/lib/sync/SyncEngine', () => ({
  SyncEngine: { addToQueue: vi.fn().mockResolvedValue(undefined) },
}));
```

## 8.2 Warnings de Lint en Tests

> **Los warnings de `any` en archivos de test son intencionales** para mocks y fixtures de datos. NO agregar `eslint-disable` en tests para estos casos.

```typescript
// ✅ Correcto en tests - no agregar disable
const mockData = { id: 1, name: 'test' } as any;  // warning OK

// ✅ Correcto en código de producción - usar tipos propios
onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
```

## 8.3 Tests Obligatorios por Feature

Cada módulo debe tener:
- `*.validation.test.ts` - Validaciones de entrada
- `*.service.test.ts` - Lógica de negocio
- Tests cubriendo: happy path, edge cases, errores

---

## SECCIÓN 9: Eventos del Sistema

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
- [ ] ¿Se usa `tenant_slug` para filtrar en Supabase?
- [ ] ¿Las sanitize functions usan `local_id` antes que `id`?
- [ ] ¿`npm run lint` pasa (0 errores)?
- [ ] ¿`npm run build` pasa?

---

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/db/index.ts` | Schema Dexie y tipos |
| `src/types/result.ts` | Result<T>, AppError |
| `src/lib/sync/SyncEngine.ts` | Sincronización offline |
| `src/features/*/services/*.service.ts` | Servicios por módulo |
| `src/App.tsx` | Login, carga de datos por tenant |
| Edge Function: `sync_table_item` | Sincronización a Supabase |

---

## Errores Comunes a Evitar

1. **delete() en Dexie**: Usar `db.table.delete(localId)` ❌ → `db.table.where('localId').equals(localId).delete()` ✅
2. **Sin transacción**: Modificar múltiples tablas sin `db.transaction()` ❌
3. **No deducir stock**: En ventas, siempre deducir inventario ✅
4. **Acceso directo a Supabase**: Desde servicios, siempre pasar por Dexie + SyncEngine
5. **Filtrar por tenant_id en Supabase**: Usar `tenant_slug` para consultas públicas ✅
6. **Olvidar tenant_slug en sync**: La edge function debe setear ambos campos ✅

---

## SECCIÓN 10: Estructura de Archivos por Feature

### 10.1 Estructura Obligatoria de Carpetas

```
src/features/{modulo}/
├── components/           # Componentes React (UI only)
│   └── *.tsx
├── services/            # Lógica de negocio (OBLIGATORIO)
│   └── *.service.ts
├── types/               # Tipos específicos del módulo
│   └── *.types.ts
├── hooks/               # Custom hooks reutilizables
│   └── *.ts
├── __tests__/          # Tests unitarios del módulo
│   └── *.test.ts
└── index.ts            # Exports del módulo
```

### 10.2 Reglas de Organización

| Carpeta | Contenido | Ejemplo |
|---------|-----------|---------|
| `components/` | Solo JSX y handlers simples | `Inventory.tsx`, `ProductCard.tsx` |
| `services/` | Lógica de negocio, validaciones, DB | `products.service.ts`, `sales.service.ts` |
| `types/` | Interfaces y tipos TypeScript | `Inventory.types.ts` |
| `hooks/` | Custom hooks reutilizables | `useInventory.ts` |
| `__tests__/` | Tests unitarios | `products-validation.test.ts` |

### 10.3 Responsabilidades

**components/:**
- Solo renderizado de UI
- Usa `useState`, `useEffect`, `useCallback`, `useMemo`
- Llama a servicios para lógica de negocio
- NO accede a `db` (Dexie) directamente

**services/:**
- Toda la lógica de negocio
- Acceso a Dexie, Supabase, SyncEngine
- Retorna `Result<T, AppError>`
- Funciones async