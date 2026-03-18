# Spec: Mejoras a Módulos de Facturación y Clientes

**Fecha:** 2026-03-18
**Estado:** Aprobado
**Módulo(s):** `src/features/invoicing`, `src/features/customers`

---

## Overview

Mejorar la experiencia visual y agregar funcionalidad en los módulos de Facturación y Clientes del ERP LogisCore, enfocado en un negocio venezolano.

## Objetivos

- Mejorar feedback visual y estados de UI
- Agregar funcionalidad de exportación PDF
- Implementar código optimizado con lazy loading
- Corregir bugs existentes

---

## 1. Visual/Diseño

### 1.1 Empty States Mejorados

**Archivo:** `InvoiceList.tsx`, `CustomersList.tsx`

**Antes:** Spinner + texto genérico
**Después:** 
- Ilustración SVG inline (icono del módulo)
- Mensaje contextual
- CTA claro que dirige a la acción

```tsx
// Ejemplo para InvoiceList
{filteredInvoices.length === 0 && !searchQuery && (
  <EmptyState 
    icon={FileText} 
    title="Sin facturas registradas"
    description="Comienza a generar facturas digitales válidas"
    action={{ label: 'Ir al POS', onClick: () => navigate('/pos') }}
  />
)}
```

### 1.2 Skeleton Loading

**Antes:** Spinner con "Cargando..."
**Después:** Skeleton animado con placeholders de filas

```tsx
// En tabla, reemplazar:
{isLoading ? (
  <tr><td colSpan={7}>...</td></tr>
) : paginatedInvoices.map(...)}

// Por skeleton rows:
{isLoading && <TableSkeleton rows={5} cols={7} />}
```

**Archivo:** Crear `src/common/Skeleton.tsx`

### 1.3 Row Hover Feedback

**Antes:** `bg-(--brand-500)/5` hardcodeado
**Después:** Transición suave con `transition-all duration-150`

```tsx
<tr className="border-b border-(--border-color)/50 
  hover:bg-(--bg-tertiary)/50 
  transition-all duration-150 
  group" />
```

### 1.4 Micro-interacciones

**Badges de estado:**
- Emitida: `bg-green-500/10 text-green-400 border-green-500/20`
- Anulada: `bg-red-500/10 text-red-400 border-red-500/20`
- En hover: subtle scale `hover:scale-[1.02]`

**Botones de acción:**
- Opacity transition en group hover
- `active:scale-95` para feedback táctil

### 1.5 Transiciones en Modales

**Archivo:** `InvoiceList.tsx`, `CustomersList.tsx`

```tsx
// Usar animate-in para modales
<div className="fixed inset-0 animate-in fade-in duration-200 ...">
  <div className="animate-in zoom-in-95 slide-in-from-bottom-4 duration-200 ...">
```

---

## 2. Funcionalidad

### 2.1 Exportar PDF Individual

**Ubicación:** `InvoicePreview.tsx`

Agregar botón "Enviar" que:
1. Genera PDF usando `InvoicePDF.tsx` (ya existe)
2. Ofrece opciones: WhatsApp, Email, Descargar

```tsx
const handleExportPDF = async () => {
  const blob = await generatePDF(invoice, taxpayerInfo);
  // Share API o descarga directa
  shareOrDownload(blob, `Factura-${invoice.controlNumber}.pdf`);
};
```

**API a usar:** Web Share API con fallback a descarga

### 2.2 Notas en Clientes

**Agregar campo `notas` a:** `CustomerFormModal.tsx`

```tsx
<div>
  <label className="block text-sm font-medium text-slate-400 mb-1.5">
    Notas
  </label>
  <textarea
    value={form.notas}
    onChange={(e) => setForm({ ...form, notas: e.target.value })}
    placeholder="Recordatorios sobre este cliente..."
    rows={2}
    className="..." />
</div>
```

**Campo en DB (Dexie):** Agregar `notas?: string` a `Customer`

### 2.3 Historial de Anulaciones

**Ubicación:** `InvoiceList.tsx` - columna de estado

Cuando el estado es "ANULADA":
- Mostrar tooltip con motivo y fecha
- Click en row abre modal con detalle completo

```tsx
<td className="py-4 px-4 text-center">
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
    invoice.estatus === 'EMITIDA' ? '...' : '...'
  }`}>
    {invoice.estatus === 'EMITIDA' ? 'Emitida' : 'Anulada'}
  </span>
  {invoice.estatus === 'ANULADA' && invoice.annulledReason && (
    <p className="text-xs text-slate-500 mt-1" title={invoice.annulledReason}>
      {invoice.annulledReason.slice(0, 30)}...
    </p>
  )}
</td>
```

---

## 3. Técnico

### 3.1 Code-Splitting InvoicePreview

**Ubicación:** `InvoiceList.tsx`

```tsx
import { lazy, Suspense } from 'react';

const InvoicePreview = lazy(() => import('./InvoicePreview'));

// Uso:
<Suspense fallback={<ModalLoading />}>
  {selectedInvoice && taxpayerInfo && (
    <InvoicePreview
      invoice={selectedInvoice}
      taxpayerInfo={taxpayerInfo}
      isOpen={true}
      onClose={() => setSelectedInvoice(null)}
    />
  )}
</Suspense>
```

**Beneficio:** Reduce bundle inicial ~1.6MB

### 3.2 Memoización en Hooks

**Archivo:** `useInvoicing.ts`

```tsx
// Memoizar cálculos pesados
const invoiceStats = useMemo(() => {
  if (invoices.length === 0) return null;
  
  const totalEmitidas = invoices.filter(i => i.estatus === 'EMITIDA').length;
  const totalAnuladas = invoices.filter(i => i.estatus === 'ANULADA').length;
  const montoTotal = invoices
    .filter(i => i.estatus === 'EMITIDA')
    .reduce((sum, i) => sum + i.totalFinalBs, 0);
  
  return { totalEmitidas, totalAnuladas, montoTotal };
}, [invoices]);
```

### 3.3 Bug Fix: Date Filter

**Archivo:** `InvoiceList.tsx`

El filtro de fecha actual no aplica correctamente los filtros `fechaDesde` y `fechaHasta`. Corregir:

```tsx
// El filtrado debe incluir dateRange en las dependencias
const filteredInvoices = useMemo(() => {
  return invoices.filter((invoice) => {
    // ... existing filters ...
    
    const invoiceDate = new Date(invoice.createdAt);
    
    if (dateRange.desde && invoiceDate < dateRange.desde) return false;
    if (dateRange.hasta && invoiceDate > dateRange.hasta) return false;
    
    return true;
  });
}, [invoices, searchQuery, statusFilter, docTypeFilter, dateRange]);
```

---

## 4. Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/common/Skeleton.tsx` | Crear componente reutilizable |
| `InvoiceList.tsx` | Empty state, skeleton, date filter fix, lazy load preview |
| `InvoicePreview.tsx` | Export PDF button |
| `CustomerSelector.tsx` | Notas en cliente |
| `CustomersList.tsx` | Empty state, skeleton |
| `useInvoicing.ts` | Memoización, stats |
| `src/lib/db/index.ts` | Agregar `notas?: string` a Customer |

---

## 5. Orden de Implementación

1. **Skeleton.tsx** - Componente reutilizable
2. **InvoiceList.tsx** - Empty states + skeleton loading
3. **CustomersList.tsx** - Empty states + skeleton loading
4. **Date filter fix** - Bug correction
5. **InvoicePreview.tsx** - Export PDF
6. **Customer notas** - DB + UI
7. **Code-splitting** - Lazy loading
8. **Memoización hooks** - Optimización

---

## 6. Criterios de Éxito

- [ ] Empty states visibles con CTAs claros
- [ ] Skeleton loading en lugar de spinners
- [ ] Filtro de fecha funcionando correctamente
- [ ] Botón de exportar PDF visible en preview
- [ ] Campo de notas visible en formulario de cliente
- [ ] InvoicePreview cargado lazily
- [ ] Hook useInvoicing memoizado
