# Dashboard + Sidebar Redesign - Specification

## 1. Overview

Rediseño del Dashboard y creación de un sidebar vertical colapsable con los módulos activos del tenant. Incluye KPIs, gráficos, y accesos directos.

## 2. Sidebar

### 2.1 Layout
- Posición: Fixed left, full height
- Ancho expandido: 240px
- Ancho colapsado: 64px (solo iconos)
- Fondo: bg-slate-900, border-right border-slate-800

### 2.2 Header del Sidebar
- Logo de la empresa (src/assets/Emblema.png) cuando está expandido
- Logo pequeño cuando está colapsado
- Botón toggle para colapsar/expandir

### 2.3 Navegación
- Lista de módulos activos del tenant
- Icono + Label para cada módulo
- Estado activo con bg-blue-600
- Hover: bg-slate-800

### 2.4 Footer del Sidebar
- Información del tenant (nombre)
- Botón de logout
- Estado de impersonation (si aplica)

## 3. Dashboard

### 3.1 Header
- Saludo personalizado con nombre del tenant
- Logo del tenant (config.logoUrl o Emblema.png)
- Fecha actual

### 3.2 KPIs (4 cards)
- Ventas Hoy
- Órdenes Activas
- Productos Low Stock
- Ingresos del Mes

Cada KPI:
- Icono representativo
- Valor grande
- Indicador de tendencia (opcional)
- Color por tipo (verde, azul, amber, rojo)

### 3.3 Gráficos (placeholders futuros)
- Ventas por día (bar chart)
- Productos top (list)
- Categorías (pie)

### 3.4 Módulos Activos
- Cards clickeables para cada módulo activo
- Icono grande + nombre + descripción breve
-带边框的卡片布局

## 4. App.tsx Changes

- Layout con sidebar a la izquierda
- Main content a la derecha
- Responsive: sidebar se oculta en mobile, con toggle para mostrar
- Transiciones suaves para collapse/expand

## 5. Constraints
- Mantener toda la lógica de autenticación y roles
- Mantener funcionalidad de impersonation
- No romper el flujo de datos actual
- Responsive design
