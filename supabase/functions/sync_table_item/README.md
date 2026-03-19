# sync_table_item Edge Function

## Overview

This Supabase Edge Function handles all offline-to-online synchronization for the LogisCore ERP system. It receives data from the client-side SyncEngine and persists it to the appropriate PostgreSQL table with proper tenant isolation.

## Function Signature

```typescript
interface SyncTableItemRequest {
  p_table: string;          // Table name (e.g., 'products', 'customers', 'invoices')
  p_operation: 'create' | 'update' | 'delete';
  p_data: Record<string, unknown>;  // The data to sync
  p_local_id: string;      // Client-generated UUID
  p_tenant_uuid: string;   // Tenant's UUID (for foreign key relationships)
  p_tenant_slug: string;   // Tenant's slug (for tenant_slug column)
}
```

## Request Example

```json
{
  "p_table": "products",
  "p_operation": "create",
  "p_data": {
    "name": "Pan Francés",
    "sku": "PAN-001",
    "price": 5.50,
    "cost": 2.00,
    "stock": 100
  },
  "p_local_id": "550e8400-e29b-41d4-a716-446655440000",
  "p_tenant_uuid": "123e4567-e89b-12d3-a456-426614174000",
  "p_tenant_slug": "mi-panaderia"
}
```

## Supported Tables

| Table | Operations | Notes |
|-------|------------|-------|
| `products` | create, update, delete | Product catalog |
| `categories` | create, update, delete | Product categories |
| `sales` | create, update | Sales transactions |
| `customers` | create, update, delete | Customer database |
| `invoices` | create, update | Fiscal invoices |
| `purchases` | create, update, delete | Purchase orders |
| `recipes` | create, update, delete | Production recipes |
| `suppliers` | create, update, delete | Supplier database |
| `employees` | create, update, delete | Employee records |
| `taxpayer_info` | create, update | Fiscal information |
| `invoice_settings` | create, update | Invoice numeration |

## Response

### Success Response (200)

```json
{
  "success": true,
  "local_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Error Response (400/500)

```json
{
  "error": "Error message describing what went wrong",
  "code": "ERROR_CODE"
}
```

## Processing Logic

1. **Validation**: Verify required parameters are present
2. **Upsert**: For `create` operations, check if record exists by `local_id`:
   - If exists: update instead (idempotent)
   - If not: insert new record
3. **Tenant Fields**: Automatically add:
   - `tenant_id` (UUID from `p_tenant_uuid`)
   - `tenant_slug` (text from `p_tenant_slug`)
   - `local_id` (client-generated UUID)
4. **Conflict Detection**: Return error if duplicate on unique constraints

## Security

- **Authentication Required**: JWT token must be valid
- **RLS Policies**: The function operates within RLS constraints
- **Audit Trail**: Operations are logged via Supabase logging

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_TABLE` | Table name not in whitelist |
| `INVALID_OPERATION` | Operation not in ['create', 'update', 'delete'] |
| `MISSING_PARAMS` | Required parameters missing |
| `DUPLICATE_ERROR` | Unique constraint violation |
| `NOT_FOUND` | Record not found for update/delete |

## Deployment

```bash
supabase functions deploy sync_table_item
```

## Related Files

- `src/lib/sync/SyncEngine.ts` - Client-side sync engine
- `src/lib/db/index.ts` - Dexie.js local database schema
- `supabase/migrations/001_rls_security_setup.sql` - RLS policies
