# Inventory Redesign - Specification

## 1. Overview

Rediseño del componente de Inventario con mejoras visuales, vista de grid/cards, y filtros avanzados.

## 2. Search & Filters

### Search Bar
- Input con icono de búsqueda
- Filtro en tiempo real por nombre o SKU

### Filtros Avanzados
- Por categoría (dropdown)
- Por rango de precio (min - max)
- Por stock (todos, en stock, stock bajo, sin stock)
- Por estado (activo/inactivo)

### Toggle View
- Vista tabla (default)
- Vista grid/cards

## 3. Table View (Improved)
- Mejor spacing
- Badges para estado (activo/inactivo)
- Color en stock (verde normal, amber bajo, rojo crítico)
- Indicador de sync mejorado

## 4. Grid/Card View
- Cards con:
  - Imagen placeholder (icono de paquete)
  - Nombre del producto
  - SKU
  - Categoría (badge)
  - Precio
  - Stock con indicador de color
  - Estado
  - Botones de acción

## 5. Empty State
- Icono grande
- Mensaje contextual
- Botón para crear producto

## 6. Constraints
- Mantener toda la lógica de CRUD
- No romper funcionalidades existentes
- Responsive design
