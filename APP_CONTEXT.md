# LogisCore ERP - Contexto del Proyecto

## Stack Tecnológico
- **Frontend**: React 19, Vite, Tailwind CSS 4.x
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Estado**: Zustand (Cliente/Tenant Context)
- **Offline**: Dexie.js (IndexedDB) + SyncEngine
- **Comunicación**: EventBus singleton

## Arquitectura Multi-Tenant
- Schema público: `tenants`, `system_users`, `tenant_members`
- Schemas por tenant: `tenant_{slug}` (aislamiento RLS)
- Roles: `super_admin`, `owner`, `employee`

## Módulos Implementados
| Módulo | Archivo | Descripción |
|--------|---------|-------------|
| **Login** | `src/components/Login.tsx` | Autenticación centralizada |
| **AdminPanel** | `src/components/AdminPanel.tsx` | Gestión global de tenants |
| **Inventario** | `src/components/inventory/Inventory.tsx` | CRUD productos, búsqueda, stock |
| **POS** | `src/components/pos/POS.tsx` | Carrito, checkout, pagos |
| **Compras** | `src/components/purchases/Purchases.tsx` | Proveedores, facturas, abastecimiento |
| **Recetas** | `src/components/recipes/Recipes.tsx` | Gestión de recetas, producción |
| **Reportes** | `src/components/reports/Reports.tsx` | KPIs, ventas, productos top |

## Servicios
- `src/services/db/index.ts` - Dexie.js (IndexedDB local)
- `src/services/events/EventBus.ts` - Comunicación entre módulos
- `src/services/sync/SyncEngine.ts` - Cola de sincronización
- `src/services/products.service.ts` - Lógica de productos
- `src/store/useTenantStore.ts` - Estado global (Zustand)

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
