# LogisCore ERP - Contexto del Proyecto

## Stack Tecnológico
- **Frontend**: React 19, Vite, Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estado**: Zustand (Cliente/Tenant Context)
- **Offline**: Dexie.js (IndexedDB) + SyncEngine
- **Comunicación**: EventBus singleton
- **Tipos**: TypeScript strict mode

## Arquitectura Multi-Tenant & Sincronización
- **Aislamiento**: Row Level Security (RLS) en Supabase para filtrado por `tenant_id`.
- **Base de Datos Local**: Dexie.js con esquema espejo de Supabase (tablas: `products`, `categories`, `sales`, `purchases`, `recipes`, `production_logs`, `suppliers`).
- **SyncEngine**: Sistema de cola (`syncQueue`) para sincronización bidireccional offline-first con reintentos exponenciales.
- **Roles**: `super_admin`, `owner`, `employee` gestionados en la tabla `user_roles`.

## Estructura del Proyecto

```
src/
├── common/                    # Componentes UI reutilizables
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── index.ts
│
├── features/                  # Lógica de negocio encapsulada por dominio
│   ├── auth/
│   │   ├── components/Login.tsx
│   │   └── index.ts
│   ├── inventory/
│   │   ├── components/Inventory.tsx
│   │   ├── services/products.service.ts
│   │   ├── hooks/            # (reservado)
│   │   ├── types/            # (reservado)
│   │   └── index.ts
│   ├── pos/
│   ├── sales/
│   ├── purchases/
│   ├── recipes/
│   ├── reports/
│   └── employees/
│
├── lib/                       # Infraestructura
│   ├── supabase.ts           # Cliente Supabase
│   ├── db/                   # Dexie.js (IndexedDB)
│   │   └── index.ts         # Schema + initializeCatalogs
│   ├── sync/
│   │   └── SyncEngine.ts    # Cola de sincronización
│   └── events/
│       └── EventBus.ts       # Comunicación entre módulos
│
├── providers/                  # Context Providers
│   └── ToastProvider.tsx
│
├── store/                      # Estado global (Zustand)
│   └── useTenantStore.ts
│
├── types/                      # Tipos globales
│   └── result.ts              # Result<T>, AppError, etc.
│
├── pages/                      # (reservado para rutas futuras)
├── layouts/                    # (reservado para layouts)
└── hooks/                      # (reservado para hooks globales)
```

## Módulos

| Módulo | Ubicación | Descripción |
|--------|-----------|-------------|
| **Login** | `src/features/auth/components/Login.tsx` | Autenticación y redirección |
| **AdminPanel** | `src/components/AdminPanel.tsx` | Gestión global de tenants y planes |
| **Inventario** | `src/features/inventory/components/Inventory.tsx` | CRUD productos, categorías, búsqueda y stock |
| **POS / Ventas** | `src/components/pos/POS.tsx` | Punto de venta, carrito, pagos |
| **Compras** | `src/components/purchases/Purchases.tsx` | Gestión de proveedores y abastecimiento |
| **Producción** | `src/components/recipes/Recipes.tsx` | Recetas, ingredientes e historial |
| **Reportes** | `src/components/reports/Reports.tsx` | KPIs y analíticas |

## Patrones de Código

### Multi-Tenancy
```typescript
const { currentTenant } = useTenantStore.getState();
const tenantId = currentTenant?.slug;
```

### Manejo de Errores (Result Types)
```typescript
const result = await createProduct(data);
if (!isOk(result)) {
  showError(result.error.message);
  return;
}
```

### Offline-First
1. Validar en Dexie.js (IndexedDB local)
2. Guardar operación localmente
3. SyncEngine sincroniza con servidor
4. EventBus comunica cambios entre módulos

## Testing
- Vitest configurado
- 27 tests passing
- Ejecutar: `npm test`

## Comandos
```bash
npm run dev      # Desarrollo
npm run build    # Producción
npm test         # Tests
```

## Variables de Entorno
```bash
VITE_SUPABASE_URL=<url>
VITE_SUPABASE_ANON_KEY=<key>
```
