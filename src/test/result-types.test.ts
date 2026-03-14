import { describe, it, expect } from 'vitest';
import { Ok, Err, isOk, isErr, mapResult, unwrap, unwrapOr, AppError, ValidationError, NotFoundError, UnauthorizedError } from '@/types/result';

describe('Result Type', () => {
  describe('Ok', () => {
    it('debe crear un resultado exitoso con valor', () => {
      const result = Ok('test-value');
      expect(result.ok).toBe(true);
      expect((result as { ok: true; value: string }).value).toBe('test-value');
    });
  });

  describe('Err', () => {
    it('debe crear un resultado de error', () => {
      const error = new Error('test error');
      const result = Err(error);
      expect(result.ok).toBe(false);
      expect((result as { ok: false; error: Error }).error).toBe(error);
    });
  });

  describe('isOk', () => {
    it('debe retornar true para resultados exitosos', () => {
      const result = Ok(42);
      expect(isOk(result)).toBe(true);
    });

    it('debe retornar false para errores', () => {
      const result = Err(new Error('error'));
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr', () => {
    it('debe retornar true para errores', () => {
      const result = Err(new Error('error'));
      expect(isErr(result)).toBe(true);
    });

    it('debe retornar false para resultados exitosos', () => {
      const result = Ok(42);
      expect(isErr(result)).toBe(false);
    });
  });

  describe('mapResult', () => {
    it('debe transformar el valor en resultados exitosos', () => {
      const result = Ok(5);
      const mapped = mapResult(result, (v) => v * 2);
      expect(isOk(mapped)).toBe(true);
      if (isOk(mapped)) expect(mapped.value).toBe(10);
    });

    it('debe mantener el error en resultados fallidos', () => {
      const error = new Error('fail');
      const result = Err(error);
      const mapped = mapResult(result, (v: number) => v * 2);
      expect(isErr(mapped)).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('debe retornar el valor en resultados exitosos', () => {
      const result = Ok('value');
      expect(unwrap(result)).toBe('value');
    });

    it('debe lanzar error en resultados fallidos', () => {
      const result = Err(new Error('error'));
      expect(() => unwrap(result)).toThrow();
    });
  });

  describe('unwrapOr', () => {
    it('debe retornar el valor en resultados exitosos', () => {
      const result = Ok('value');
      expect(unwrapOr(result, 'default')).toBe('value');
    });

    it('debe retornar default en resultados fallidos', () => {
      const result = Err(new Error('error'));
      expect(unwrapOr(result, 'default')).toBe('default');
    });
  });
});

describe('AppError', () => {
  it('debe crear error con código y status', () => {
    const error = new AppError('Test error', 'TEST_CODE', 500);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.name).toBe('AppError');
  });

  it('debe incluir detalles adicionales', () => {
    const error = new AppError('Error', 'CODE', 400, { field: 'value' });
    expect(error.details).toEqual({ field: 'value' });
  });
});

describe('ValidationError', () => {
  it('debe crear error de validación con código 400', () => {
    const error = new ValidationError('Campo requerido');
    expect(error.message).toBe('Campo requerido');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('debe incluir detalles', () => {
    const error = new ValidationError('Invalid', { field: 'name' });
    expect(error.details).toEqual({ field: 'name' });
  });
});

describe('NotFoundError', () => {
  it('debe crear error de no encontrado', () => {
    const error = new NotFoundError('Producto', '123');
    expect(error.message).toBe('Producto not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
    expect(error.details).toEqual({ resource: 'Producto', id: '123' });
  });
});

describe('UnauthorizedError', () => {
  it('debe crear error de autorización', () => {
    const error = new UnauthorizedError();
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('debe usar mensaje personalizado', () => {
    const error = new UnauthorizedError('Debe iniciar sesión');
    expect(error.message).toBe('Debe iniciar sesión');
  });
});
