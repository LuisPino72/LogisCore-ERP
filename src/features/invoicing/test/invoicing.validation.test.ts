import { describe, it, expect } from 'vitest';
import { validateInvoiceInput } from '../services/invoicing.service';
import { calculateTotals } from '../services/invoicing.service';
import { formatRif } from '../services/invoicing.service';
import type { CreateInvoiceInput } from '../types/invoicing.types';
import type { InvoiceItem } from '@/lib/db';

describe('validateInvoiceInput', () => {
  it('should return empty array for valid input', () => {
    const input: CreateInvoiceInput = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: 'V-12345678-9',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 2,
          precioUnitarioUsd: 1.10,
          alicuotaIva: 16,
          exento: false,
        },
      ],
    };

    const errors = validateInvoiceInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should return error for empty client name', () => {
    const input = {
      clienteNombre: '',
      clienteRifCedula: 'V-12345678-9',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 2,
          precioUnitarioUsd: 1.10,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('El nombre del cliente es requerido');
  });

  it('should return error for empty RIF', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: '',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 2,
          precioUnitarioUsd: 1.10,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('El RIF/Cédula del cliente es requerido');
  });

  it('should return error for invalid RIF format', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: '12345',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 2,
          precioUnitarioUsd: 1.10,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('El formato del RIF/Cédula no es válido');
  });

  it('should accept valid J RIF format', () => {
    const input = {
      clienteNombre: 'Empresa C.A.',
      clienteRifCedula: 'J-12345678-9',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Producto',
          cantidad: 1,
          precioUnitarioUsd: 10.00,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should accept valid V RIF format', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: 'V-12345678',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Producto',
          cantidad: 1,
          precioUnitarioUsd: 10.00,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should return error for empty items', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: 'V-12345678-9',
      items: [],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('La factura debe tener al menos un producto');
  });

  it('should return error for zero quantity', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: 'V-12345678-9',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 0,
          precioUnitarioUsd: 1.10,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('La cantidad debe ser mayor a 0');
  });

  it('should return error for negative price', () => {
    const input = {
      clienteNombre: 'Juan Pérez',
      clienteRifCedula: 'V-12345678-9',
      items: [
        {
          codigo: 'PROD-001',
          descripcion: 'Harina Pan 1kg',
          cantidad: 1,
          precioUnitarioUsd: -5.00,
        },
      ],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors).toContain('El precio no puede ser negativo');
  });

  it('should return multiple errors for multiple issues', () => {
    const input = {
      clienteNombre: '',
      clienteRifCedula: '',
      items: [],
    } as CreateInvoiceInput;

    const errors = validateInvoiceInput(input);
    expect(errors.length).toBeGreaterThan(1);
  });
});

describe('calculateTotals', () => {
  const tasaBcv = 36.50;

  it('should calculate correct totals for single item with 16% IVA', () => {
    const items: InvoiceItem[] = [
      {
        codigo: 'PROD-001',
        descripcion: 'Harina Pan 1kg',
        cantidad: 2,
        unidad: 'UND',
        precioUnitarioUsd: 1.10,
        tasaBcvItem: tasaBcv,
        alicuotaIva: 16,
        exento: false,
        totalBs: 80.30,
      },
    ];

    const totals = calculateTotals(items, tasaBcv, true, 3);

    expect(totals.subtotalUsd).toBe(2.20);
    expect(totals.baseImponibleBs).toBe(80.30);
    expect(totals.montoIvaBs).toBe(12.85);
    expect(totals.montoExentoBs).toBe(0);
    expect(totals.totalBs).toBeCloseTo(93.15, 2);
    expect(totals.aplicaIgtf).toBe(true);
    expect(totals.montoIgtfBs).toBeCloseTo(2.79, 2);
    expect(totals.totalFinalBs).toBeCloseTo(95.94, 2);
  });

  it('should calculate correct totals for exento items', () => {
    const items: InvoiceItem[] = [
      {
        codigo: 'PROD-001',
        descripcion: 'Producto exento',
        cantidad: 1,
        unidad: 'UND',
        precioUnitarioUsd: 10.00,
        tasaBcvItem: tasaBcv,
        alicuotaIva: 0,
        exento: true,
        totalBs: 365.00,
      },
    ];

    const totals = calculateTotals(items, tasaBcv, false, 3);

    expect(totals.subtotalUsd).toBe(10.00);
    expect(totals.baseImponibleBs).toBe(0);
    expect(totals.montoIvaBs).toBe(0);
    expect(totals.montoExentoBs).toBe(365.00);
    expect(totals.totalBs).toBe(365.00);
    expect(totals.aplicaIgtf).toBe(false);
    expect(totals.montoIgtfBs).toBe(0);
  });

  it('should handle mixed items with different alicuotas', () => {
    const items: InvoiceItem[] = [
      {
        codigo: 'PROD-001',
        descripcion: 'Producto general',
        cantidad: 1,
        unidad: 'UND',
        precioUnitarioUsd: 10.00,
        tasaBcvItem: tasaBcv,
        alicuotaIva: 16,
        exento: false,
        totalBs: 365.00,
      },
      {
        codigo: 'PROD-002',
        descripcion: 'Producto reducida',
        cantidad: 1,
        unidad: 'UND',
        precioUnitarioUsd: 5.00,
        tasaBcvItem: tasaBcv,
        alicuotaIva: 8,
        exento: false,
        totalBs: 182.50,
      },
    ];

    const totals = calculateTotals(items, tasaBcv, false, 3);

    expect(totals.subtotalUsd).toBe(15.00);
    expect(totals.baseImponibleBs).toBeCloseTo(547.50, 2);
    expect(totals.montoIvaBs).toBeCloseTo(73.00, 2);
    expect(totals.totalBs).toBeCloseTo(620.50, 2);
  });

  it('should handle empty items array', () => {
    const items: InvoiceItem[] = [];

    const totals = calculateTotals(items, tasaBcv, true, 3);

    expect(totals.subtotalUsd).toBe(0);
    expect(totals.baseImponibleBs).toBe(0);
    expect(totals.montoIvaBs).toBe(0);
    expect(totals.totalBs).toBe(0);
  });

  it('should not apply IGTF when disabled', () => {
    const items: InvoiceItem[] = [
      {
        codigo: 'PROD-001',
        descripcion: 'Producto',
        cantidad: 1,
        unidad: 'UND',
        precioUnitarioUsd: 100.00,
        tasaBcvItem: tasaBcv,
        alicuotaIva: 16,
        exento: false,
        totalBs: 3650.00,
      },
    ];

    const totals = calculateTotals(items, tasaBcv, false, 3);

    expect(totals.aplicaIgtf).toBe(false);
    expect(totals.montoIgtfBs).toBe(0);
    expect(totals.totalFinalBs).toBe(totals.totalBs);
  });
});

describe('formatRif', () => {
  it('should format RIF with hyphens', () => {
    expect(formatRif('J123456789')).toBe('J-12345678-9');
  });

  it('should return uppercase RIF', () => {
    expect(formatRif('j-12345678-9')).toBe('J-12345678-9');
  });

  it('should not modify already formatted RIF', () => {
    expect(formatRif('J-12345678-9')).toBe('J-12345678-9');
  });
});
