import { describe, it, expect } from 'vitest';
import { validateCustomerInput, validateRif } from '../services/customers.service';
import type { CreateCustomerInput } from '../types/customers.types';

describe('validateRif', () => {
  it('should accept valid J RIF', () => {
    expect(validateRif('J-12345678-9')).toBe(true);
    expect(validateRif('J123456789')).toBe(true);
    expect(validateRif('j-12345678-9')).toBe(true);
  });

  it('should accept valid V RIF', () => {
    expect(validateRif('V-12345678-9')).toBe(true);
    expect(validateRif('V123456789')).toBe(true);
  });

  it('should accept valid E RIF', () => {
    expect(validateRif('E-12345678-9')).toBe(true);
  });

  it('should accept valid P RIF', () => {
    expect(validateRif('P-12345678-9')).toBe(true);
  });

  it('should accept valid G RIF', () => {
    expect(validateRif('G-12345678-9')).toBe(true);
  });

  it('should reject invalid RIF formats', () => {
    expect(validateRif('12345')).toBe(false);
    expect(validateRif('J-123-45')).toBe(false);
    expect(validateRif('')).toBe(false);
    expect(validateRif('ABC-12345-6')).toBe(false);
  });
});

describe('validateCustomerInput', () => {
  it('should return empty array for valid input', () => {
    const input: CreateCustomerInput = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: 'J-12345678-9',
      email: 'test@test.com',
    };

    const errors = validateCustomerInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should return error for empty name', () => {
    const input = {
      nombreRazonSocial: '',
      rifCedula: 'V-12345678-9',
    } as CreateCustomerInput;

    const errors = validateCustomerInput(input);
    expect(errors).toContain('El nombre o razón social es requerido');
  });

  it('should return error for empty RIF', () => {
    const input = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: '',
    } as CreateCustomerInput;

    const errors = validateCustomerInput(input);
    expect(errors).toContain('El RIF/Cédula es requerido');
  });

  it('should return error for invalid RIF', () => {
    const input = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: '12345',
    } as CreateCustomerInput;

    const errors = validateCustomerInput(input);
    expect(errors).toContain('El formato del RIF/Cédula no es válido');
  });

  it('should return error for invalid email', () => {
    const input = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: 'J-12345678-9',
      email: 'invalid-email',
    };

    const errors = validateCustomerInput(input);
    expect(errors).toContain('El formato del email no es válido');
  });

  it('should not require email', () => {
    const input: CreateCustomerInput = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: 'J-12345678-9',
    };

    const errors = validateCustomerInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional phone', () => {
    const input: CreateCustomerInput = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: 'J-12345678-9',
      telefono: '0412-1234567',
    };

    const errors = validateCustomerInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should accept optional address', () => {
    const input: CreateCustomerInput = {
      nombreRazonSocial: 'Empresa C.A.',
      rifCedula: 'J-12345678-9',
      direccion: 'Av. Principal, Caracas',
    };

    const errors = validateCustomerInput(input);
    expect(errors).toHaveLength(0);
  });

  it('should return multiple errors for multiple issues', () => {
    const input = {
      nombreRazonSocial: '',
      rifCedula: '',
      email: 'invalid',
    } as CreateCustomerInput;

    const errors = validateCustomerInput(input);
    expect(errors.length).toBeGreaterThan(1);
  });
});
