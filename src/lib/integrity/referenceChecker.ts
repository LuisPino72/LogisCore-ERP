import { db } from '@/lib/db';
import { Result, Ok, Err, AppError } from '@/lib/types/result';
import { logger, logCategories } from '@/lib/logger';

export interface ReferenceWarning {
  table: string;
  field: string;
  count: number;
  severity: 'warn' | 'block';
  message: string;
}

export interface ReferenceCheckResult {
  canDelete: boolean;
  warnings: ReferenceWarning[];
}

export async function checkProductReferences(localId: string): Promise<Result<ReferenceCheckResult, AppError>> {
  try {
    const warnings: ReferenceWarning[] = [];
    
    // Check sales for this product
    const salesWithProduct = await db.sales
      .filter(s => s.items.some(item => item.productId === localId))
      .toArray();
    
    if (salesWithProduct.length > 0) {
      warnings.push({
        table: 'sales',
        field: 'items',
        count: salesWithProduct.length,
        severity: 'warn',
        message: `Este producto aparece en ${salesWithProduct.length} venta(s) registrada(s)`,
      });
    }
    
    // Check recipes for this product (as ingredient or finished product)
    const recipesWithProduct = await db.recipes
      .filter(r => 
        r.ingredients.some(ing => ing.productId === localId) ||
        r.productId === localId
      )
      .toArray();
    
    if (recipesWithProduct.length > 0) {
      warnings.push({
        table: 'recipes',
        field: 'ingredients/productId',
        count: recipesWithProduct.length,
        severity: 'block',
        message: `Este producto está usado en ${recipesWithProduct.length} receta(s) activa(s)`,
      });
    }
    
    // Check purchases for this product
    const purchasesWithProduct = await db.purchases
      .filter(p => p.items.some(item => item.productId === localId))
      .toArray();
    
    if (purchasesWithProduct.length > 0) {
      warnings.push({
        table: 'purchases',
        field: 'items',
        count: purchasesWithProduct.length,
        severity: 'warn',
        message: `Este producto aparece en ${purchasesWithProduct.length} compra(s)`,
      });
    }
    
    // Check suspended sales
    const suspendedSalesWithProduct = await db.suspendedSales
      .filter(s => s.cart.some(item => item.productId === localId))
      .toArray();
    
    if (suspendedSalesWithProduct.length > 0) {
      warnings.push({
        table: 'suspendedSales',
        field: 'cart',
        count: suspendedSalesWithProduct.length,
        severity: 'warn',
        message: `Este producto está en ${suspendedSalesWithProduct.length} venta(s) suspendida(s)`,
      });
    }
    
    const canDelete = !warnings.some(w => w.severity === 'block');
    
    return Ok({ canDelete, warnings });
  } catch (error) {
    logger.error('Error checking product references', error instanceof Error ? error : undefined, {
      category: logCategories.DATABASE,
    });
    return Err(new AppError('Error al verificar referencias del producto', 'REFERENCE_CHECK_ERROR', 500));
  }
}

export async function checkCustomerReferences(localId: string): Promise<Result<ReferenceCheckResult, AppError>> {
  try {
    const warnings: ReferenceWarning[] = [];
    
    // Check invoices for this customer
    const invoicesWithCustomer = await db.invoices
      .filter(inv => inv.customerId === localId && inv.estatus === 'EMITIDA')
      .toArray();
    
    if (invoicesWithCustomer.length > 0) {
      warnings.push({
        table: 'invoices',
        field: 'customerId',
        count: invoicesWithCustomer.length,
        severity: 'warn',
        message: `Este cliente tiene ${invoicesWithCustomer.length} factura(s) emitida(s)`,
      });
    }
    
    // Check for ANULADA invoices (these don't block deletion)
    const annulledInvoices = await db.invoices
      .filter(inv => inv.customerId === localId && inv.estatus === 'ANULADA')
      .toArray();
    
    if (annulledInvoices.length > 0) {
      warnings.push({
        table: 'invoices',
        field: 'customerId',
        count: annulledInvoices.length,
        severity: 'warn',
        message: `Este cliente tiene ${annulledInvoices.length} factura(s) anulada(s)`,
      });
    }
    
    // Check sales for this customer
    const salesWithCustomer = await db.sales
      .filter(s => s.customerId === localId)
      .toArray();
    
    if (salesWithCustomer.length > 0) {
      warnings.push({
        table: 'sales',
        field: 'customerId',
        count: salesWithCustomer.length,
        severity: 'warn',
        message: `Este cliente tiene ${salesWithCustomer.length} venta(s) asociada(s)`,
      });
    }
    
    const canDelete = true; // Customers can be deactivated even with invoices
    
    return Ok({ canDelete, warnings });
  } catch (error) {
    logger.error('Error checking customer references', error instanceof Error ? error : undefined, {
      category: logCategories.DATABASE,
    });
    return Err(new AppError('Error al verificar referencias del cliente', 'REFERENCE_CHECK_ERROR', 500));
  }
}

export async function checkRecipeReferences(localId: string): Promise<Result<ReferenceCheckResult, AppError>> {
  try {
    const warnings: ReferenceWarning[] = [];
    
    // Check production logs for this recipe
    const productionLogsWithRecipe = await db.productionLogs
      .filter(log => log.recipeId === localId)
      .toArray();
    
    if (productionLogsWithRecipe.length > 0) {
      warnings.push({
        table: 'production_logs',
        field: 'recipeId',
        count: productionLogsWithRecipe.length,
        severity: 'warn',
        message: `Esta receta tiene ${productionLogsWithRecipe.length} registro(s) de producción`,
      });
    }
    
    const canDelete = true; // Recipes can be deactivated even with production history
    
    return Ok({ canDelete, warnings });
  } catch (error) {
    logger.error('Error checking recipe references', error instanceof Error ? error : undefined, {
      category: logCategories.DATABASE,
    });
    return Err(new AppError('Error al verificar referencias de la receta', 'REFERENCE_CHECK_ERROR', 500));
  }
}

export async function checkSupplierReferences(localId: string): Promise<Result<ReferenceCheckResult, AppError>> {
  try {
    const warnings: ReferenceWarning[] = [];
    
    // Check purchases for this supplier
    const purchasesWithSupplier = await db.purchases
      .filter(p => p.supplierId === localId)
      .toArray();
    
    if (purchasesWithSupplier.length > 0) {
      warnings.push({
        table: 'purchases',
        field: 'supplierId',
        count: purchasesWithSupplier.length,
        severity: 'warn',
        message: `Este proveedor tiene ${purchasesWithSupplier.length} compra(s) asociada(s)`,
      });
    }
    
    const canDelete = true; // Suppliers can be deactivated even with purchases
    
    return Ok({ canDelete, warnings });
  } catch (error) {
    logger.error('Error checking supplier references', error instanceof Error ? error : undefined, {
      category: logCategories.DATABASE,
    });
    return Err(new AppError('Error al verificar referencias del proveedor', 'REFERENCE_CHECK_ERROR', 500));
  }
}
