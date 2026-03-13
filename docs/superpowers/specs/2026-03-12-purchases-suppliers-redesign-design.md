# Purchases + Suppliers Redesign - Specification

## 1. Overview

Rediseño del módulo de Compras incluyendo gestión de proveedores, mejoras visuales, búsqueda/filtros y vista de grid.

## 2. Database Changes

### Suppliers Table (Supabase + Dexie)
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id TEXT UNIQUE,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## 3. UI Components

### 3.1 Tabs
- Compras (historial)
- Proveedores (gestión)

### 3.2 Purchases Tab (Mejoras)
- Search bar
- Filtros: fecha, estado, proveedor
- Toggle Table/Grid view
- KPIs: Total Completado, Pendiente, Total
- Tabla mejorada con badges
- Cards en vista grid

### 3.3 Suppliers Tab (Nuevo)
- CRUD de proveedores
- Tabla con: Nombre, Contacto, Email, Teléfono, Estado, Acciones
- Modal para crear/editar proveedor
- Search y filtros

## 4. Constraints
- Mantener funcionalidad actual de compras
- Agregar sincronización offline para suppliers
- No romper flujos existentes
