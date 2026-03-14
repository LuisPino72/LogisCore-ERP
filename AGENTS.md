# LogisCore ERP - Agent Guidelines

This file provides comprehensive guidelines and context for AI agents working on this codebase.

## Project Overview

LogisCore ERP is a multi-tenant ERP system built with React 19, TypeScript, Supabase (backend), and Dexie.js (offline-first with IndexedDB). The app uses Zustand for state management and follows an offline-first architecture with sync capabilities.

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State**: Zustand (Client/Tenant Context)
- **Offline**: Dexie.js (IndexedDB) + SyncEngine
- **Communication**: EventBus singleton
- **Types**: TypeScript strict mode

## Architecture - Multi-Tenant & Sync

- **Isolation**: Row Level Security (RLS) in Supabase filtered by `tenant_id`
- **Local Database**: Dexie.js with schema mirroring Supabase (tables: `products`, `categories`, `sales`, `purchases`, `recipes`, `production_logs`, `suppliers`)
- **SyncEngine**: Queue system (`syncQueue`) for bidirectional offline-first sync with exponential retries
- **Roles**: `super_admin`, `owner`, `employee` managed in `user_roles` table

## Build Commands

```bash
npm run dev        # Start development server (Vite)
npm run build      # Production build (tsc -b && vite build)
npm run lint       # Run ESLint
npm run preview    # Preview production build
npm run test       # Run all tests (Vitest)
npm run test:watch # Run tests in watch mode
```

**Running a single test:**

```bash
# Run a specific test file
npm test -- src/test/components.test.tsx

# Run tests matching a pattern
npm test -- --grep "debe calcular"

# Run a specific test by name
npm test -- -t "debe calcular el total"
```

## Project Structure

```
src/
├── common/                    # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── index.ts
│
├── features/                  # Feature-based modules
│   ├── adminpanel/
│   │   ├── components/AdminPanel.tsx
│   │   └── index.ts
│   ├── auth/
│   │   ├── components/Login.tsx
│   │   ├── components/UpdatePassword.tsx
│   │   ├── components/SyncStatus.tsx
│   │   └── index.ts
│   ├── dashboard/
│   │   ├── components/Dashboard.tsx
│   │   └── index.ts
│   ├── inventory/
│   │   ├── components/Inventory.tsx
│   │   ├── services/products.service.ts
│   │   └── index.ts
│   ├── pos/
│   │   ├── components/POS.tsx
│   │   └── index.ts
│   ├── sales/
│   │   ├── components/Sales.tsx
│   │   └── index.ts
│   ├── purchases/
│   │   ├── components/Purchases.tsx
│   │   └── index.ts
│   ├── recipes/
│   │   ├── components/Recipes.tsx
│   │   └── index.ts
│   ├── reports/
│   │   ├── components/Reports.tsx
│   │   └── index.ts
│   └── employees/
│       ├── components/Employees.tsx
│       └── index.ts
│
├── lib/                       # Infrastructure
│   ├── supabase.ts           # Supabase client
│   ├── db/                   # Dexie.js (IndexedDB)
│   │   └── index.ts         # Schema + initializeCatalogs
│   ├── sync/
│   │   └── SyncEngine.ts    # Sync queue
│   └── events/
│       └── EventBus.ts       # Cross-module communication
│
├── providers/                # Context Providers
│   └── ToastProvider.tsx
│
├── store/                    # Zustand stores
│   ├── useTenantStore.ts
│   └── useThemeStore.ts
│
├── types/                    # Global types
│   └── result.ts             # Result<T>, AppError, etc.
│
├── services/                 # Legacy services (being migrated)
│   ├── products.service.ts
│   ├── supabase.ts
│   ├── sync/
│   │   └── SyncEngine.ts
│   └── events/
│       └── EventBus.ts
│
├── assets/                   # Static assets
│   └── Emblema.ico
│
├── test/                     # Test files
│   ├── setup.ts
│   ├── components.test.tsx
│   ├── business-logic.test.ts
│   └── EventBus.test.ts
│
├── App.tsx                  # Main app component
├── main.tsx                 # Entry point
└── index.css               # Global styles
```

## Modules

| Module | Location | Description |
|--------|----------|-------------|
| **Login** | `src/features/auth/components/Login.tsx` | Authentication & redirect |
| **AdminPanel** | `src/components/AdminPanel.tsx` | Global tenant & plan management |
| **Inventory** | `src/features/inventory/components/Inventory.tsx` | Product CRUD, categories, search, stock |
| **POS/Sales** | `src/components/pos/POS.tsx` | Point of sale, cart, payments |
| **Purchases** | `src/components/purchases/Purchases.tsx` | Supplier & restocking management |
| **Production** | `src/components/recipes/Recipes.tsx` | Recipes, ingredients, history |
| **Reports** | `src/components/reports/Reports.tsx` | KPIs & analytics |

---

# Code Style Guidelines

## General Principles

- Use TypeScript strict mode (enabled in tsconfig.json)
- Follow existing patterns in the codebase
- Keep functions small and focused
- Use descriptive names

## TypeScript

- Always use explicit types for function parameters and return types
- Use `interface` for object shapes, `type` for unions/aliases
- Enable strict null checks
- Use the `@/` path alias for imports (configured in tsconfig.json)

## Imports

Order imports as:
1. External libraries (React, Zustand, etc.)
2. Internal services/lib (db, supabase, sync, events)
3. Internal types
4. Components from features
5. Common UI components

```typescript
// Good
import { useState } from 'react';
import { create } from 'zustand';
import { db, Product } from '@/lib/db';
import { SyncEngine } from '@/lib/sync/SyncEngine';
import { EventBus, Events } from '@/lib/events/EventBus';
import { useTenantStore, useThemeStore } from '@/store/useTenantStore';
import { Ok, Err, Result, AppError } from '@/types/result';
import Button from '@/common/Button';
```

## Naming Conventions

- **Files**: PascalCase for components (Button.tsx), camelCase for services/utilities (products.service.ts, eventBus.ts)
- **Components**: PascalCase (Button, Inventory, POS)
- **Hooks**: camelCase with `use` prefix (useTenantStore)
- **Interfaces**: PascalCase (Product, TenantConfig)
- **Constants**: UPPER_SNAKE_CASE for static values (Events.SALE_COMPLETED)
- **Variables/Functions**: camelCase

## Error Handling

Use the Result type pattern from `@/types/result`:

```typescript
import { Ok, Err, Result, AppError, ValidationError, isOk } from '@/types/result';

// In functions that can fail
async function createProduct(data: ProductData): Promise<Result<string, AppError>> {
  if (!data.name?.trim()) {
    return Err(new ValidationError('El nombre es requerido'));
  }
  
  try {
    // ... operation
    return Ok(productId);
  } catch (error) {
    if (error instanceof AppError) return Err(error);
    return Err(new AppError('Error al crear producto', 'CREATE_ERROR', 500));
  }
}

// Usage
const result = await createProduct(data);
if (!isOk(result)) {
  showError(result.error.message);
  return;
}
const productId = result.value;
```

## React Patterns

- Use functional components with hooks
- Use forwardRef for components that need ref forwarding
- Define displayName for all components
- Use defaultProps via function parameters with destructuring and defaults

```typescript
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, ...props }, ref) => {
    // ...
  }
);
Button.displayName = 'Button';
```

## State Management

- Use Zustand for global client state
- Use React useState for local component state
- Access Zustand store directly in services (not hooks) for offline operations

```typescript
// In services (not components)
const { currentTenant } = useTenantStore.getState();
```

## Tailwind CSS

- Use Tailwind 4.x classes
- Keep className strings concise using template literals
- Define variants/sizes objects for reusable component patterns
- **IMPORTANT**: Use CSS variables `--brand-*` for brand colors instead of hardcoded colors

```typescript
// Use dynamic brand colors (recommended)
const variants = {
  primary: 'bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white shadow-lg shadow-[var(--brand-600)]/20',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600',
};

// For accent elements
className = "bg-(--brand-500)/10 text-(--brand-400) border-(--brand-500)/20"
```

## Multi-Tenancy

Always include tenant filtering in database operations:

```typescript
const tenantId = currentTenant?.slug;
// Use tenantId in all DB queries
const products = await db.products.where('tenantId').equals(tenantId).toArray();
```

## Per-Tenant Theme Customization

Each tenant can have its own brand color and theme settings. Configuration is stored in `tenant.config` (JSONB).

### TenantThemeConfig Interface

```typescript
interface TenantThemeConfig {
  themeColor: string;          // Hex color (e.g., "#8B4513")
  themeColorSecondary?: string; // Optional secondary hex
  mode: 'dark' | 'light' | 'system';
  accentIntensity: 'subtle' | 'normal' | 'bold';
}
```

### Session-Based Theme Application

When impersonating a tenant, the theme automatically applies:
- **Admin Panel** → System default (blue)
- **Impersonating tenant** → Tenant's brand colors
- **Stop impersonating** → Back to system default

### Using Dynamic Brand Colors

All brand colors are available as CSS variables. Use these instead of hardcoded colors:

```typescript
// Use brand colors in components
className = "bg-(--brand-600) hover:bg-(--brand-700) text-white"
className = "text-(--brand-400)"
className = "bg-(--brand-500)/10 text-(--brand-400) border-(--brand-500)/20"
className = "shadow-lg shadow-(--brand-500)/20"
```

### CSS Variables Available

- `--brand-50` through `--brand-950` (full palette)
- `--brand-400`, `--brand-500`, `--brand-600`, etc.
- `--brand-bg`, `--brand-bg-hover`, `--brand-bg-active`

### Example: Updating Components for Brand Colors

```typescript
// Bad - hardcoded blue
className = "bg-blue-600 text-white"

// Good - dynamic brand color
className = "bg-(--brand-600) text-white"
```

### Theme Store Methods

```typescript
import { useThemeStore } from '@/store/useThemeStore';

const { theme, themeColor, isTenantMode, applyTenantTheme, resetToSystem } = useThemeStore();
```

## Event Communication

Use EventBus for cross-module communication:

```typescript
import { EventBus, Events } from '@/lib/events/EventBus';

// Emit events
EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });

// Subscribe
const unsubscribe = EventBus.on(Events.SALE_COMPLETED, (data) => {
  // handle
});
```

Available events:
- `Events.SALE_COMPLETED` - 'sale.completed'
- `Events.SALE_CANCELLED` - 'sale.cancelled'
- `Events.INVENTORY_UPDATED` - 'inventory.updated'
- `Events.STOCK_LOW` - 'stock.low'
- `Events.SYNC_STATUS_CHANGED` - 'sync.status.changed'
- `Events.CONFLICT_DETECTED` - 'conflict.detected'
- `Events.TENANT_CHANGED` - 'tenant.changed'

## Offline-First Pattern

1. Validate locally (Dexie.js)
2. Save locally
3. Queue sync operation via SyncEngine
4. Emit event for UI update

```typescript
// Example: Create product (offline-first)
async function createProduct(data) {
  // 1. Validate
  if (!data.name?.trim()) return Err(new ValidationError('Name required'));
  
  // 2. Save locally
  const localId = crypto.randomUUID();
  await db.products.add({ ...data, localId, tenantId });
  
  // 3. Queue sync
  await SyncEngine.addToQueue('products', 'create', product, localId);
  
  // 4. Emit event
  EventBus.emit(Events.INVENTORY_UPDATED, { action: 'create', product });
  
  return Ok(localId);
}
```

## Testing

- Tests are in `src/test/` directory
- Use Vitest with jsdom environment
- Test file naming: `*.test.ts` or `*.test.tsx`
- Use Spanish descriptions (existing pattern)
- Mock Dexie and crypto as shown in setup.ts

```typescript
vi.mock('dexie', () => ({ default: class Dexie { ... } }));
```

## Environment Variables

Create `.env` with:
```
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
```

## Linting

ESLint is configured. Run `npm run lint` before committing.

## Important Notes

- Do NOT commit secrets or API keys
- Use Result types for all service functions that can fail
- Always handle errors gracefully with user feedback
- Test offline scenarios when modifying sync logic
- All database operations must filter by tenantId
