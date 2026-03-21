import type { MovementCategory, MovementPaymentMethod } from '@/lib/db';

export const CATEGORIES: { value: MovementCategory; label: string }[] = [
  { value: 'sale', label: 'Venta' },
  { value: 'purchase', label: 'Compra' },
  { value: 'production', label: 'Producción' },
  { value: 'refund', label: 'Reembolso' },
  { value: 'adjustment', label: 'Ajuste' },
  { value: 'salary', label: 'Salario' },
  { value: 'rent', label: 'Alquiler' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'investment', label: 'Inversión' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'other', label: 'Otro' },
];

export const PAYMENT_METHODS: { value: MovementPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'pago_movil', label: 'Pago Móvil' },
  { value: 'bank_transfer', label: 'Transferencia' },
];

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}
