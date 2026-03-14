# LogisCore ERP - Quick Reference

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
npm run test:watch # Watch mode
```

## Key Patterns

### Result Type (Error Handling)
```typescript
import { Ok, Err, Result, AppError, ValidationError, isOk } from '@/types/result';

function doSomething(): Result<string, AppError> {
  if (!valid) return Err(new ValidationError('Invalid'));
  return Ok('success');
}
```

### EventBus (Cross-module)
```typescript
import { EventBus, Events } from '@/lib/events/EventBus';
EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
```

### Offline-First
1. Validate locally 2. Save to Dexie 3. Queue sync 4. Emit event

### Multi-Tenancy
```typescript
const tenantId = currentTenant?.slug;
// Always filter by tenantId
db.products.where('tenantId').equals(tenantId).toArray()
```

### Theme (Dynamic Brand Colors)
```typescript
className = "bg-(--brand-600) hover:bg-(--brand-700) text-white"
```

## Key Files
| File | Purpose |
|------|---------|
| `src/lib/db/index.ts` | Dexie schema (Product, Sale, Purchase, etc.) |
| `src/types/result.ts` | Result<T>, AppError, ValidationError |
| `src/store/useTenantStore.ts` | Tenant + role state |
| `src/store/useThemeStore.ts` | Theme + brand colors |
| `src/features/inventory/services/products.service.ts` | Product CRUD |
| `src/test/*.test.ts` | Tests |

## Modules
- Login, AdminPanel, Inventory, POS, Sales, Purchases, Recipes, Reports, Employees
