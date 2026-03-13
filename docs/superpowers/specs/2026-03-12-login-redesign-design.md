# Login Redesign - Specification

## 1. Overview

Rediseñar el componente Login para darle un aspecto más moderno, mejorar la experiencia de usuario y añadir funcionalidades básicas como el checkbox "Recordarme" y el logo corporativo.

## 2. Visual Design

### Layout
- Full screen centering con flexbox
- Fondo: degradado diagonal sutil (slate-950 → slate-900) + patrón geométrico corporativo muy sutil (opacity 3-5%)

### Tarjeta
- bg-slate-900
- border: border-slate-800
- shadow: shadow-2xl
- rounded-2xl
- padding: p-8
- max-width: max-w-md
- space-y-8 interno

### Logo
- Ubicación: parte superior del formulario, centrado
- Archivo: src/assets/Emblema.png
- Tamaño: 64x64px
- Margen inferior: después del título "LogisCore"

### Título
- h2: text-3xl font-bold tracking-tight text-white
- p: mt-2 text-slate-400 ("Accede a tu panel administrativo")

## 3. Form Components

### Input Fields
- Fondo: bg-slate-800/50
- Border: border-slate-700
- Focus state: border-blue-500 + ring-1 ring-blue-500
- Iconos:
  - Email: Lucide icon "User" o "Mail"
  - Password: Lucide icon "Lock"
- Padding y rounded-lg igual que diseño actual

### Checkbox "Recordarme"
- Ubicación: debajo de contraseña, antes del botón
- Label: text-slate-400 text-sm
- Checkbox: default checkbox stylado con accent-blue-600

### Botón Submit
- variant: primary (bg-blue-600 → hover bg-blue-500)
- w-full, py-3, text-lg font-semibold
- Loading state: spinner o texto con "..."
- Hover: scale(1.02) + shadow-lg

## 4. Animaciones

- Inputs: transition-all duration-200 en border y ring
- Botón: transition-all duration-200, active:scale-95
- Card: entrada sutil con fade-in opcional

## 5. Assets

- Logo: `src/assets/Emblema.png` (importar como Image)
- Iconos: lucide-react (User, Lock)

## 6. Constraints

- No modificar lógica de autenticación
- Mantener funcionalidad existente (signInWithPassword, carga de role/tenant)
- Solo mejorar diseño y UX
- Mantener responsive (mobile-first)
