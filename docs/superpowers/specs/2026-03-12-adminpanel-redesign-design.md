# AdminPanel Redesign - Specification

## 1. Overview

Rediseño completo del componente AdminPanel para gestión de tenants (negocios). Incluye: tabla moderna, cards con información expandida, búsqueda, y formularios mejorados.

## 2. Components

### 2.1 Search Bar
- Ubicación: arriba de la lista de tenants
- Input con icono de búsqueda (lucide-react Search)
- Filtro en tiempo real por nombre o slug
- Diseño: bg-slate-800/50, border-slate-700, focus:ring-blue-500

### 2.2 Toggle View (Table/Card/Expandable)
- Selector visual para cambiar entre vistas
- 3 iconos: Table, LayoutGrid, ChevronDown
- Estado activo con border-blue-500

### 2.3 Table View (Por defecto)
- Encabezado con fondo bg-slate-800/50
- Filas con hover: bg-slate-800/30
- Columnas: Logo + Nombre/Slug, Módulos, Usuarios, Fecha, Acciones
- Badges para módulos activos (azules)
- Acciones: "Entrar" (amber), "Editar" (outline)

### 2.4 Card/Grid View
- Grid: 1 col mobile, 2 col tablet, 3 col desktop
- Card por tenant:
  - Header: Logo (48x48) + Nombre + Slug
  - Body: Módulos activos (badges), Usuarios (icono + número)
  - Footer: Acciones (Entrar, Editar)
- Estilo: bg-slate-900, border-slate-800, rounded-xl, shadow-lg

### 2.5 Expandable Row View
- Table row clickeable que expande a card completo
- Animación: transition-all duration-200
- Muestra toda la información del tenant

## 3. Formularios

### 3.1 Crear Tenant
- Modal o sección colapsable
- Campos: Nombre Comercial, Slug (auto-generado)
- Diseño mejorado con iconos y mejor spacing

### 3.2 Editar Tenant
- Same as current but with:
  - Input icons (Store, Hash, Users, Palette)
  - Better color picker layout
  - Módulos como toggle switches en lugar de checkboxes
  - Preview del logo

## 4. Empty State
- Icono grande de edificio/Store
- Mensaje: "No hay negocios registrados"
- Botón para crear el primero

## 5. Constraints
- No modificar lógica de negocio
- Mantener todas las funcionalidades actuales
- Solo mejorar UI/UX
- Responsive (mobile-first)
